#!/usr/bin/env node
/**
 * GitHub 公开仓库 → 站内事实快照（src/data/facts/<slug>.json）。
 *
 * 职责边界（重要）：
 *   - 只读 src/data/curated.json，只写 src/data/facts/*.json
 *   - 绝不开 src/content/** 的写句柄；手写判断与自动事实物理隔离
 *   - 构建不依赖此脚本；此脚本失败由 stale / missing 标记降级，不阻断发布
 *
 * 用法：
 *   npm run sync:github              # 写入快照
 *   npm run sync:github -- --dry-run # 只打印将要发生的变化
 *
 * 环境变量：
 *   GH_SYNC_TOKEN / GITHUB_TOKEN  GraphQL 必须带 token；CI 里用 GITHUB_TOKEN
 *   GITHUB_ACTIONS=true           在 CI 中缺少 token 或触发限流时以非 0 退出
 */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { factsSchema, type FactsFile } from '../src/lib/facts-schema';

const API = 'https://api.github.com';
const ROOT = process.cwd();
const CURATED_PATH = path.join(ROOT, 'src', 'data', 'curated.json');
const DATA_DIR = path.join(ROOT, 'src', 'data', 'facts');
const DRY_RUN = process.argv.includes('--dry-run');
const TOKEN = process.env.GH_SYNC_TOKEN || process.env.GITHUB_TOKEN || '';
const IS_CI = process.env.GITHUB_ACTIONS === 'true';
const NOW = new Date().toISOString();
const SCHEMA_VERSION = 1 as const;
const RELEASE_BODY_LIMIT = 4096;
const RELEASE_STATS_COUNT = 3;

class RateLimitError extends Error {}
class AuthError extends Error {}

let rateRemaining: number | null = null;
let rateReset: Date | null = null;

function report(line = ''): void {
  process.stdout.write(`${line}\n`);
}

function compact(text: unknown, max: number): string {
  const value = String(text ?? '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[`*_>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function normalizeVersion(tag: unknown): string {
  const raw = String(tag ?? '').trim();
  const match = /(\d+\.\d+(?:\.\d+)?(?:-[0-9A-Za-z.-]+)?)/.exec(raw);
  return match ? match[1] : raw;
}

function formatDate(value: unknown): string | null {
  return value ? new Date(value as string).toISOString().slice(0, 10) : null;
}

function prune(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(prune);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (item === undefined) continue;
      out[key] = prune(item);
    }
    return out;
  }
  return value;
}

// ── HTTP ────────────────────────────────────────────────────────────────

function trackRate(headers: Headers): void {
  const remaining = headers.get('x-ratelimit-remaining');
  if (remaining !== null) rateRemaining = Number(remaining);
  const reset = headers.get('x-ratelimit-reset');
  if (reset) rateReset = new Date(Number(reset) * 1000);
}

function commonHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': 'deverportal-sync',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  return headers;
}

async function gql(query: string, variables: Record<string, unknown>): Promise<any> {
  if (!TOKEN) {
    throw new AuthError('GraphQL 需要 token：请设置 GH_SYNC_TOKEN 或 GITHUB_TOKEN。');
  }
  const response = await fetch(`${API}/graphql`, {
    method: 'POST',
    headers: { ...commonHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(30000),
  });
  trackRate(response.headers);
  const payload: any = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403) {
    const message = payload?.message ?? `HTTP ${response.status}`;
    if (/bad credentials|requires authentication/i.test(message)) throw new AuthError(message);
    if (rateRemaining === 0 || /rate limit/i.test(message)) throw new RateLimitError(`GitHub 限流：${message}`);
    throw new Error(`GraphQL 失败：${message}`);
  }
  if (!response.ok) throw new Error(`GraphQL ${response.status}：${JSON.stringify(payload).slice(0, 200)}`);
  if (payload.errors?.length) {
    const message = payload.errors.map((e: any) => e.message).join('; ');
    // 仓库被删、改名或转私有：按「不可访问」处理，保留上次快照，不当作故障。
    if (/Could not resolve to a Repository/i.test(message)) return { repository: null };
    throw new Error(`GraphQL 错误：${message}`);
  }
  return payload.data;
}

type RestResult =
  | { status: 304; etag: string | null }
  | { status: 404 }
  | { status: 202 }
  | { status: 200; etag: string | null; body: any };

async function rest(endpoint: string, options: { etag?: string; raw?: boolean } = {}): Promise<RestResult> {
  const headers: Record<string, string> = {
    ...commonHeaders(),
    Accept: options.raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
  };
  if (options.etag) headers['If-None-Match'] = options.etag;

  const response = await fetch(`${API}${endpoint}`, { headers, signal: AbortSignal.timeout(20000) });
  trackRate(response.headers);

  if (response.status === 304) return { status: 304, etag: options.etag ?? response.headers.get('etag') };
  if (response.status === 404) return { status: 404 };
  if (response.status === 202) return { status: 202 };

  if (response.status === 403 || response.status === 429) {
    const body = await response.text();
    if (rateRemaining === 0 || /rate limit/i.test(body)) {
      throw new RateLimitError(
        `GitHub 限流：${rateRemaining ?? '?'} 次剩余${rateReset ? `，重置于 ${rateReset.toISOString()}` : ''}`,
      );
    }
    throw new Error(`GitHub ${response.status} ${endpoint}: ${body.slice(0, 200)}`);
  }

  if (!response.ok) throw new Error(`GitHub ${response.status} ${endpoint}`);

  return {
    status: 200,
    etag: response.headers.get('etag'),
    body: options.raw ? await response.text() : await response.json(),
  };
}

// ── 从仓库文件推导事实（不手写）────────────────────────────────────────

function parseTechDeps(packageTexts: string[], requirementTexts: string[] = []): { name: string; scope: 'prod' | 'dev' }[] {
  const found = new Map<string, 'prod' | 'dev'>();

  for (const text of packageTexts) {
    try {
      const pkg = JSON.parse(text);
      for (const name of Object.keys(pkg.dependencies ?? {})) found.set(name, 'prod');
      for (const name of Object.keys(pkg.peerDependencies ?? {})) if (!found.has(name)) found.set(name, 'prod');
      for (const name of Object.keys(pkg.devDependencies ?? {})) if (!found.has(name)) found.set(name, 'dev');
    } catch {
      // 单个 package.json 解析失败不影响其它
    }
  }

  // Python 仓库：从 requirements.txt 取包名，版本号不落库
  for (const text of requirementTexts) {
    for (const line of text.split(/\r?\n/)) {
      const match = /^\s*([A-Za-z0-9_.-]+)\s*([=<>!~]=?|@)/.exec(line);
      if (match && !found.has(match[1])) found.set(match[1].toLowerCase(), 'prod');
    }
  }

  return [...found.entries()]
    .map(([name, scope]) => ({ name, scope }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function detectCloudflare(texts: string[]) {
  if (texts.length === 0) return null;
  const value = texts.join('\n').toLowerCase();
  const has = (pattern: RegExp) => pattern.test(value);
  const result = {
    d1: has(/d1_databases|d1-databases/),
    kv: has(/kv_namespaces|kv_namespace/),
    r2: has(/r2_buckets|r2-buckets/),
    vectorize: has(/vectorize/),
    ai: has(/\[ai\]|"ai"\s*:/),
    queues: has(/queues|queue\s*=/),
    durableObjects: has(/durable_objects|durableobjects|migrations\s*=\s*\[/),
  };
  return Object.values(result).some(Boolean) ? result : null;
}

function parseEnvKeys(texts: string[]): string[] {
  const keys = new Set<string>();
  for (const text of texts) {
    for (const line of text.split(/\r?\n/)) {
      const match = /^\s*(?:export\s+)?([A-Z][A-Z0-9_]{2,})\s*=/.exec(line);
      if (match) keys.add(match[1]);
    }
  }
  return [...keys].sort();
}

function detectFiles(entries: string[]) {
  const lower = entries.map((entry) => entry.toLowerCase());
  const any = (test: (entry: string) => boolean) => lower.some(test);
  return {
    license: any((entry) => /^license(\.|$)/.test(entry)),
    ci: any((entry) => entry.startsWith('.github/workflows/')),
    tests: any(
      (entry) =>
        /(^|\/)(__tests__|tests?)\//.test(entry) ||
        /\.(test|spec)\.[a-z]+$/.test(entry),
    ),
    changelog: any((entry) => /^changelog(\.|$)/.test(entry)),
    dockerfile: any((entry) => /^dockerfile/.test(entry)),
    envExample: any((entry) => entry === '.env.example' || entry.endsWith('/.env.example')),
    wrangler: any((entry) => /(^|\/)wrangler\.(toml|jsonc|json)$/.test(entry)),
  };
}

function languagesFrom(edges: { size: number; node: { name: string } }[]) {
  return edges
    .map((edge) => ({ name: edge.node?.name ?? '', bytes: Number(edge.size ?? 0) }))
    .filter((item) => item.name && item.bytes > 0)
    .sort((a, b) => b.bytes - a.bytes);
}

function buildRepoQuery(manifests: string[]): string {
  // 每个 manifest 一个 GraphQL 别名，一次请求取回全部文本（monorepo 靠 curated.json 声明）。
  const objects = manifests
    .map((manifest, index) => `m${index}: object(expression: "HEAD:${manifest}") { ... on Blob { text } }`)
    .join('\n    ');
  return `
query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    createdAt pushedAt isArchived description homepageUrl
    stargazerCount forkCount
    licenseInfo { spdxId }
    openIssues: issues(states: OPEN) { totalCount }
    openPRs: pullRequests(states: OPEN) { totalCount }
    repositoryTopics(first: 20) { nodes { topic { name } } }
    languages(first: 8, orderBy: {field: SIZE, direction: DESC}) { edges { size node { name } } }
    releases(first: 20, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes { tagName name publishedAt isPrerelease url description }
    }
    defaultBranchRef { name target { ... on Commit { oid history { totalCount } } } }
    ${objects}
  }
}`;
}

async function commitActivity(owner: string, repo: string): Promise<number[]> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await rest(`/repos/${owner}/${repo}/stats/commit_activity`);
      if (res.status === 200 && Array.isArray(res.body)) {
        return res.body.slice(-52).map((week: any) => Number(week.total ?? 0));
      }
      if (res.status === 404) return [];
    } catch (error) {
      if (error instanceof RateLimitError) throw error;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  // stats 接口可能长期返回 202（GitHub 还在算）。退回到最近 100 次提交，按周分桶，不做外推。
  try {
    const res = await rest(`/repos/${owner}/${repo}/commits?per_page=100`);
    if (res.status === 200 && Array.isArray(res.body)) {
      const buckets = new Array(52).fill(0);
      const now = Date.now();
      for (const commit of res.body) {
        const date = commit?.commit?.author?.date ?? commit?.commit?.committer?.date;
        if (!date) continue;
        const weeksAgo = Math.floor((now - new Date(date).getTime()) / (7 * 86400000));
        const index = 51 - weeksAgo;
        if (index >= 0 && index < 52) buckets[index] += 1;
      }
      return buckets;
    }
  } catch (error) {
    if (error instanceof RateLimitError) throw error;
  }
  return [];
}

async function compareStats(owner: string, repo: string, from: string, to: string) {
  try {
    const res = await rest(`/repos/${owner}/${repo}/compare/${encodeURIComponent(from)}...${encodeURIComponent(to)}`);
    if (res.status !== 200) return null;
    return {
      commits: Array.isArray(res.body.commits) ? res.body.commits.length : null,
      filesChanged: Array.isArray(res.body.files) ? res.body.files.length : null,
      additions: typeof res.body.additions === 'number' ? res.body.additions : null,
      deletions: typeof res.body.deletions === 'number' ? res.body.deletions : null,
    };
  } catch (error) {
    if (error instanceof RateLimitError) throw error;
    return null;
  }
}

async function readmeFor(owner: string, repo: string, previous: FactsFile | null) {
  const fallback = {
    excerpt: previous?.data?.readmeExcerpt ?? null,
    etag: previous?.readmeEtag ?? null,
  };
  try {
    const res = await rest(`/repos/${owner}/${repo}/readme`, {
      raw: true,
      etag: previous?.readmeEtag ?? undefined,
    });
    if (res.status === 304) return fallback;
    if (res.status === 404) return { excerpt: null, etag: null };
    if (res.status !== 200) return fallback;
    return { excerpt: compact(res.body, 280) || null, etag: res.etag ?? null };
  } catch (error) {
    if (error instanceof RateLimitError) throw error;
    return fallback;
  }
}

// ── 判断层证据校验 ──────────────────────────────────────────────────────

/** 从 MDX frontmatter 里取出所有 evidence.file 引用。只读取，不写入内容目录。 */
async function evidencePathsFor(slug: string): Promise<string[]> {
  const file = path.join(ROOT, 'src', 'content', 'products', slug, 'index.mdx');
  const text = await readFile(file, 'utf8').catch(() => null);
  if (!text) return [];
  const start = text.indexOf('---\n');
  const end = text.indexOf('\n---\n', start + 4);
  if (start < 0 || end < 0) return [];
  const frontmatter = text.slice(start + 4, end);
  const paths = new Set<string>();
  for (const line of frontmatter.split(/\r?\n/)) {
    const match = /^\s*-\s*file:\s*"?(.+?)"?\s*$/.exec(line) ?? /^\s*file:\s*"?(.+?)"?\s*$/.exec(line);
    if (match) paths.add(match[1].trim());
  }
  return [...paths].sort();
}

// ── 落盘 ────────────────────────────────────────────────────────────────

async function readJson(file: string): Promise<FactsFile | null> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as FactsFile;
  } catch {
    return null;
  }
}

const changes = {
  updated: [] as string[],
  unchanged: [] as string[],
  stale: [] as string[],
  missing: [] as string[],
  unlisted: [] as string[],
};

function stableJson(value: FactsFile): string {
  const { fetchedAt, etag, readmeEtag, releases, ...rest } = value;
  const rel = releases ? { ...releases, fetchedAt: undefined, etag: undefined } : releases;
  return JSON.stringify(prune({ ...rest, releases: rel }), null, 2);
}

async function persist(file: string, value: FactsFile): Promise<boolean> {
  const checked = factsSchema.parse(prune(value)) as FactsFile;

  const previousRaw = await readFile(file, 'utf8').catch(() => null);
  if (previousRaw !== null) {
    try {
      const previous = JSON.parse(previousRaw) as FactsFile;
      if (stableJson(previous) === stableJson(checked)) {
        changes.unchanged.push(path.basename(file));
        return false;
      }
    } catch {
      // 旧文件损坏：直接覆盖
    }
  }
  const json = `${JSON.stringify(checked, null, 2)}\n`;
  if (!DRY_RUN) await writeFile(file, json, 'utf8');
  changes.updated.push(path.basename(file));
  return true;
}

// ── 主流程 ──────────────────────────────────────────────────────────────

function emptyReleases(previous: FactsFile | null): FactsFile['releases'] {
  return {
    fetchedAt: previous?.releases?.fetchedAt ?? null,
    etag: previous?.releases?.etag ?? null,
    stale: false,
    error: null,
    source: previous?.releases?.source ?? 'releases',
    items: previous?.releases?.items ?? [],
  };
}

async function syncRepo(
  owner: string,
  item: { repo: string; slug: string; manifests?: string[] },
): Promise<void> {
  const file = path.join(DATA_DIR, `${item.slug}.json`);
  const previous = await readJson(file);
  const manifests =
    Array.isArray(item.manifests) && item.manifests.length > 0
      ? item.manifests
      : ['package.json', 'wrangler.toml', 'wrangler.jsonc', '.env.example'];

  let data = previous?.data ?? null;
  let activity = previous?.activity ?? [];
  let evidence = previous?.evidence ?? null;
  let fetchedAt = previous?.fetchedAt ?? null;
  let readmeEtag = previous?.readmeEtag ?? null;
  let stale = false;
  let error: string | null = null;
  let missing = false;
  let refreshed = false;
  let releases = emptyReleases(previous);

  try {
    const result = await gql(buildRepoQuery(manifests), { owner, name: item.repo });
    const repo = result?.repository;

    if (!repo) {
      missing = true;
      changes.missing.push(item.slug);
    } else {
      if (repo.isArchived) {
        report(`  提示：${item.repo} 已在 GitHub 归档，站内状态仍由手写 status 决定`);
      }

      const readme = await readmeFor(owner, item.repo, previous);
      const treeRes = await rest(`/repos/${owner}/${item.repo}/git/trees/HEAD?recursive=1`);
      const entries: string[] =
        treeRes.status === 200 && Array.isArray(treeRes.body?.tree)
          ? treeRes.body.tree.map((node: any) => node.path)
          : [];

      const manifestTexts: { path: string; text: string }[] = manifests
        .map((manifest, index) => ({ path: manifest, text: repo[`m${index}`]?.text ?? null }))
        .filter((entry): entry is { path: string; text: string } => typeof entry.text === 'string');

      const packageTexts = manifestTexts.filter((entry) => entry.path.endsWith('package.json')).map((entry) => entry.text);
      const requirementTexts = manifestTexts
        .filter((entry) => entry.path.endsWith('requirements.txt'))
        .map((entry) => entry.text);
      const wranglerTexts = manifestTexts
        .filter((entry) => /wrangler\.(toml|jsonc|json)$/.test(entry.path))
        .map((entry) => entry.text);
      const envTexts = manifestTexts.filter((entry) => entry.path.endsWith('.env.example')).map((entry) => entry.text);

      fetchedAt = NOW;
      readmeEtag = readme.etag;
      activity = await commitActivity(owner, item.repo);

      // 证据校验：判断层声明的文件路径，在仓库当前 HEAD 里是否存在。
      const evidencePaths = await evidencePathsFor(item.slug);
      const treeSet = new Set(entries);
      evidence = Object.fromEntries(evidencePaths.map((entry) => [entry, treeSet.has(entry)]));

      data = {
        id: null,
        fullName: `${owner}/${item.repo}`,
        url: `https://github.com/${owner}/${item.repo}`,
        description: repo.description ?? null,
        homepage: repo.homepageUrl ?? null,
        stars: repo.stargazerCount ?? null,
        forks: repo.forkCount ?? null,
        openIssues: repo.openIssues?.totalCount ?? null,
        openPRs: repo.openPRs?.totalCount ?? null,
        language: languagesFrom(repo.languages?.edges ?? [])[0]?.name ?? null,
        license: repo.licenseInfo?.spdxId ?? null,
        createdAt: formatDate(repo.createdAt),
        pushedAt: formatDate(repo.pushedAt),
        archived: Boolean(repo.isArchived),
        fork: false,
        topics: (repo.repositoryTopics?.nodes ?? []).map((node: any) => node.topic?.name).filter(Boolean),
        defaultBranch: repo.defaultBranchRef?.name ?? null,
        readmeExcerpt: readme.excerpt,
        commitCount: repo.defaultBranchRef?.target?.history?.totalCount ?? null,
        languages: languagesFrom(repo.languages?.edges ?? []),
        techDeps: parseTechDeps(packageTexts, requirementTexts),
        envKeys: parseEnvKeys(envTexts),
        files: detectFiles(entries),
        cloudflare: detectCloudflare(wranglerTexts),
      };

      const releaseItems = (repo.releases?.nodes ?? [])
        .filter((release: any) => release.tagName)
        .map((release: any) => ({
          version: normalizeVersion(release.tagName),
          tag: release.tagName ?? null,
          name: release.name ?? null,
          date: formatDate(release.publishedAt),
          url: release.url ?? null,
          prerelease: Boolean(release.isPrerelease),
          source: 'release' as const,
          body: release.description ? String(release.description).slice(0, RELEASE_BODY_LIMIT) : null,
          stats: null,
        }));

      let items = releaseItems;
      let source: 'releases' | 'tags' = 'releases';

      // 只打 tag、没建 Release 的仓库：退回 tags，日期留空而不是编造。
      if (items.length === 0) {
        const tagRes = await rest(`/repos/${owner}/${item.repo}/tags?per_page=30`);
        if (tagRes.status === 200 && Array.isArray(tagRes.body)) {
          items = tagRes.body.map((tag: any) => ({
            version: normalizeVersion(tag.name),
            tag: tag.name ?? null,
            name: null,
            date: null,
            url: `https://github.com/${owner}/${item.repo}/releases/tag/${encodeURIComponent(tag.name)}`,
            prerelease: false,
            source: 'tag' as const,
            body: null,
            stats: null,
          }));
          source = 'tags';
        }
      }

      releases = { fetchedAt: NOW, etag: null, stale: false, error: null, source, items };
      refreshed = true;
    }
  } catch (err) {
    if (err instanceof RateLimitError || err instanceof AuthError) throw err;
    stale = true;
    error = (err as Error).message;
    changes.stale.push(item.slug);
  }

  if (!stale && !missing) {
    // 最近几个版本的体量：拿相邻两个 tag 做 compare；失败就留空，不编造。
    const withTags = releases.items.filter((entry) => entry.tag);
    for (let index = 0; index < Math.min(RELEASE_STATS_COUNT, withTags.length - 1); index += 1) {
      const current = withTags[index];
      const previousTag = withTags[index + 1].tag!;
      const stats = await compareStats(owner, item.repo, previousTag, current.tag!);
      if (stats) current.stats = stats;
    }
  }

  await persist(file, {
    schemaVersion: SCHEMA_VERSION,
    slug: item.slug,
    owner,
    repo: item.repo,
    fetchedAt,
    etag: null,
    readmeEtag,
    stale,
    error,
    missing,
    data,
    activity,
    evidence,
    releases,
  });

  if (refreshed) {
    report(
      `  ✓ ${item.slug}  ${data?.stars ?? '?'}★  ${data?.language ?? '—'}  ${data?.pushedAt ?? '—'}  ${activity.length} 周活动`,
    );
  }
}

async function markItemStale(owner: string, item: { repo: string; slug: string }, err: Error): Promise<void> {
  const file = path.join(DATA_DIR, `${item.slug}.json`);
  const previous = await readJson(file);
  if (!previous) return;
  await persist(file, { ...previous, owner, repo: item.repo, slug: item.slug, stale: true, error: err.message });
}

async function main(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const curated = JSON.parse(await readFile(CURATED_PATH, 'utf8'));
  const owner: string = curated.owner;
  const items: { repo: string; slug: string; manifests?: string[] }[] = Array.isArray(curated.items)
    ? curated.items
    : [];

  if (!owner || items.length === 0) {
    report('curated.json 为空：没有需要同步的仓库。');
    return;
  }

  if (!TOKEN) {
    report('缺少 GH_SYNC_TOKEN / GITHUB_TOKEN：GraphQL 必须认证，本次不采集。');
    if (IS_CI) process.exitCode = 1;
    return;
  }

  report(`同步 ${owner} 的 ${items.length} 个白名单仓库（GraphQL + REST 补充）…`);

  let publicRepos: any[] = [];
  try {
    const listRes = await rest(`/users/${owner}/repos?per_page=100&sort=pushed`);
    if (listRes.status === 200) publicRepos = listRes.body as any[];
  } catch (err) {
    if (err instanceof RateLimitError) throw err;
    report(`  仓库清单获取失败，仅按白名单逐个同步：${(err as Error).message}`);
  }

  const curatedRepos = new Set(items.map((item) => item.repo.toLowerCase()));
  changes.unlisted = publicRepos
    .filter((repo) => !repo.fork && String(repo.name).toLowerCase() !== String(owner).toLowerCase())
    .map((repo) => repo.name as string)
    .filter((name) => !curatedRepos.has(String(name).toLowerCase()));

  const pending = [...items];
  try {
    while (pending.length > 0) {
      const item = pending.shift()!;
      if (rateRemaining !== null && rateRemaining <= 2) {
        throw new RateLimitError(`配额即将耗尽（剩余 ${rateRemaining}）`);
      }
      await syncRepo(owner, item);
    }
  } catch (err) {
    if (!(err instanceof RateLimitError)) {
      if (err instanceof AuthError) {
        report('');
        report(`同步中止：${err.message}`);
        process.exitCode = 1;
        return;
      }
      throw err;
    }
    report('');
    report(`同步中止：${err.message}`);
    for (const item of pending) await markItemStale(owner, item, err);
    changes.stale.push(...pending.map((item) => item.slug));
    report('未完成的仓库沿用上次快照并标记 stale；构建不受影响。');
    if (IS_CI) process.exitCode = 1;
  }

  const files = await readdir(DATA_DIR);
  const expected = new Set(items.map((item) => `${item.slug}.json`));
  const orphans = files.filter((name) => name.endsWith('.json') && !expected.has(name));

  report('');
  report('## GitHub 同步报告');
  report('');
  report(`- 写入：${changes.updated.length ? [...new Set(changes.updated)].join(', ') : '无'}`);
  report(`- 未变化：${changes.unchanged.length} 个文件`);
  if (changes.stale.length) report(`- 降级为 stale：${[...new Set(changes.stale)].join(', ')}`);
  if (changes.missing.length) report(`- 仓库不可访问：${[...new Set(changes.missing)].join(', ')}`);
  if (changes.unlisted.length) report(`- 发现未收录的公开仓库：${changes.unlisted.join(', ')}`);
  if (orphans.length) report(`- 快照存在但白名单已移除：${orphans.join(', ')}（需手动删除）`);
  report(`- 配额剩余：${rateRemaining ?? '未知'}`);
  if (DRY_RUN) report('- dry-run：未写入任何文件');
}

main().catch((error) => {
  if (error instanceof RateLimitError) {
    report('');
    report(`同步中止：${error.message}`);
    report('已同步的仓库保留最新快照，其余仓库沿用上次快照并标记 stale；构建不受影响。');
    if (IS_CI) process.exitCode = 1;
    return;
  }
  console.error(error);
  process.exitCode = 1;
});
