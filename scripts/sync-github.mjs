#!/usr/bin/env node
/**
 * GitHub 公开仓库 → 站内项目快照。
 *
 * 职责边界（重要）：
 *   - 只读 src/data/curated.json，只写 src/data/github/*.json
 *   - 绝不开 src/content/** 的写句柄；手写内容与自动数据物理隔离
 *   - 构建不依赖此脚本；此脚本失败由 stale / missing 标记降级，不阻断发布
 *
 * 用法：
 *   node scripts/sync-github.mjs             # 写入快照
 *   node scripts/sync-github.mjs --dry-run   # 只打印将要发生的变化
 *
 * 环境变量（均可选）：
 *   GH_SYNC_TOKEN / GITHUB_TOKEN  GitHub token，未配置时按未认证 60 次/小时运行
 *   CI=true                        在 CI 中缺少 token 或触发限流时以非 0 退出
 */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

const API = 'https://api.github.com';
const ROOT = process.cwd();
const CURATED_PATH = path.join(ROOT, 'src', 'data', 'curated.json');
const DATA_DIR = path.join(ROOT, 'src', 'data', 'github');
const DRY_RUN = process.argv.includes('--dry-run');
const TOKEN = process.env.GH_SYNC_TOKEN || process.env.GITHUB_TOKEN || '';
const IS_CI = process.env.GITHUB_ACTIONS === 'true';
const NOW = new Date().toISOString();

// 手写字段不允许出现在快照里，出现即视为程序 bug（构建期也会再校验一次）。
const MANUAL_FIELDS = [
  'name',
  'tagline',
  'summary',
  'why',
  'capabilities',
  'boundaries',
  'limitations',
  'status',
  'featured',
];

class RateLimitError extends Error {}

let rateRemaining = null;
let rateReset = null;

function report(line = '') {
  process.stdout.write(`${line}\n`);
}

function compact(text, max) {
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

// 从 tag 里取出版本号：v1.2.0 → 1.2.0，blog_v1.4.0 → 1.4.0，1.0.0-beta.1 保留后缀。
// 取不到数字版本时退回原 tag（去空白），不编造。
function normalizeVersion(tag) {
  const raw = String(tag ?? '').trim();
  const match = /(\d+\.\d+(?:\.\d+)?(?:-[0-9A-Za-z.-]+)?)/.exec(raw);
  return match ? match[1] : raw;
}

function formatDate(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : null;
}

async function gh(endpoint, { etag, raw = false } = {}) {
  const headers = {
    'User-Agent': 'deverportal-sync',
    Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  if (etag) headers['If-None-Match'] = etag;

  const response = await fetch(`${API}${endpoint}`, {
    headers,
    signal: AbortSignal.timeout(20000),
  });

  const remainingHeader = response.headers.get('x-ratelimit-remaining');
  if (remainingHeader !== null) {
    rateRemaining = Number(remainingHeader);
    const resetHeader = response.headers.get('x-ratelimit-reset');
    rateReset = resetHeader ? new Date(Number(resetHeader) * 1000) : null;
  }

  if (response.status === 304) {
    return { status: 304, etag: etag ?? response.headers.get('etag') };
  }

  if (response.status === 404) {
    return { status: 404 };
  }

  if (response.status === 403 || response.status === 429) {
    const body = await response.text();
    if (rateRemaining === 0 || /rate limit/i.test(body)) {
      throw new RateLimitError(
        `GitHub 限流：${rateRemaining ?? '?'} 次剩余${rateReset ? `，重置于 ${rateReset.toISOString()}` : ''}`,
      );
    }
    throw new Error(`GitHub ${response.status} ${endpoint}: ${body.slice(0, 200)}`);
  }

  if (!response.ok) {
    throw new Error(`GitHub ${response.status} ${endpoint}`);
  }

  return {
    status: 200,
    etag: response.headers.get('etag'),
    body: raw ? await response.text() : await response.json(),
  };
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

const changes = { updated: [], unchanged: [], stale: [], missing: [], unlisted: [] };

// 这三个字段每次抓取都会变，不代表内容变化。
// 比较时把它们剔掉：只有真实内容变了才重写文件，避免每天产生时间戳噪音提交。
const VOLATILE_FIELDS = ['fetchedAt', 'etag', 'readmeEtag'];

function stableJson(value) {
  const copy = { ...value };
  for (const field of VOLATILE_FIELDS) delete copy[field];
  return JSON.stringify(copy, null, 2);
}

async function persist(file, value) {
  const previousRaw = await readFile(file, 'utf8').catch(() => null);
  if (previousRaw !== null) {
    let previous = null;
    try {
      previous = JSON.parse(previousRaw);
    } catch {
      previous = null;
    }
    if (previous && stableJson(previous) === stableJson(value)) {
      changes.unchanged.push(path.basename(file));
      return false;
    }
  }
  const json = `${JSON.stringify(value, null, 2)}\n`;
  if (!DRY_RUN) {
    await writeFile(file, json, 'utf8');
  }
  changes.updated.push(path.basename(file));
  return true;
}

function assertNoManualFields(snapshot) {
  for (const field of MANUAL_FIELDS) {
    if (field in snapshot) {
      throw new Error(`快照出现手写字段 "${field}"：同步脚本只能产出自动字段`);
    }
  }
}

async function readmeFor(owner, repo, previous) {
  const fallback = {
    excerpt: previous?.data?.readmeExcerpt ?? null,
    etag: previous?.readmeEtag ?? null,
  };
  try {
    const res = await gh(`/repos/${owner}/${repo}/readme`, {
      raw: true,
      etag: previous?.readmeEtag ?? undefined,
    });
    if (res.status === 304) return fallback;
    if (res.status === 404) return { excerpt: null, etag: null };
    return { excerpt: compact(res.body, 280) || null, etag: res.etag ?? null };
  } catch (error) {
    if (error instanceof RateLimitError) throw error;
    return fallback;
  }
}

async function syncRepo(owner, item) {
  const factsFile = path.join(DATA_DIR, `${item.slug}.json`);
  const releasesFile = path.join(DATA_DIR, `${item.slug}.releases.json`);
  const previousFacts = await readJson(factsFile);
  const previousReleases = await readJson(releasesFile);

  let facts = previousFacts;
  let factsRefreshed = false;

  try {
    const repoRes = await gh(`/repos/${owner}/${item.repo}`, {
      etag: previousFacts?.etag ?? undefined,
    });

    if (repoRes.status === 404) {
      facts = {
        generatedBy: 'scripts/sync-github.mjs',
        owner,
        repo: item.repo,
        slug: item.slug,
        fetchedAt: previousFacts?.fetchedAt ?? null,
        etag: previousFacts?.etag ?? null,
        stale: previousFacts?.stale ?? false,
        error: previousFacts?.error ?? null,
        missing: true,
        data: previousFacts?.data ?? null,
      };
      changes.missing.push(item.slug);
    } else if (repoRes.status === 304) {
      facts = {
        ...(previousFacts ?? {}),
        stale: false,
        error: null,
        missing: false,
      };
      factsRefreshed = false;
    } else {
      const repo = repoRes.body;
      if (repo.fork) {
        throw new Error(`白名单条目 ${item.repo} 是 fork 仓库，拒绝收录`);
      }
      if (String(repo.name).toLowerCase() === String(owner).toLowerCase()) {
        throw new Error(`白名单条目 ${item.repo} 是个人资料仓库，拒绝收录`);
      }
      if (repo.archived) {
        report(`  提示：${item.repo} 已在 GitHub 归档，站内状态仍由手写 status 决定`);
      }
      const readme = await readmeFor(owner, item.repo, previousFacts);
      facts = {
        generatedBy: 'scripts/sync-github.mjs',
        owner,
        repo: item.repo,
        slug: item.slug,
        fetchedAt: NOW,
        etag: repoRes.etag ?? null,
        stale: false,
        error: null,
        missing: false,
        readmeEtag: readme.etag,
        data: {
          id: repo.id ?? null,
          fullName: repo.full_name ?? null,
          url: repo.html_url ?? null,
          description: repo.description ?? null,
          homepage: repo.homepage ?? null,
          stars: repo.stargazers_count ?? null,
          forks: repo.forks_count ?? null,
          openIssues: repo.open_issues_count ?? null,
          language: repo.language ?? null,
          license: repo.license?.spdx_id ?? repo.license?.name ?? null,
          createdAt: formatDate(repo.created_at),
          pushedAt: formatDate(repo.pushed_at),
          archived: Boolean(repo.archived),
          fork: Boolean(repo.fork),
          topics: Array.isArray(repo.topics) ? repo.topics : [],
          defaultBranch: repo.default_branch ?? null,
          readmeExcerpt: readme.excerpt,
        },
      };
      factsRefreshed = true;
    }
  } catch (error) {
    if (error instanceof RateLimitError) throw error;
    facts = {
      generatedBy: 'scripts/sync-github.mjs',
      owner,
      repo: item.repo,
      slug: item.slug,
      fetchedAt: previousFacts?.fetchedAt ?? null,
      etag: previousFacts?.etag ?? null,
      stale: true,
      error: error.message,
      missing: false,
      data: previousFacts?.data ?? null,
      readmeEtag: previousFacts?.readmeEtag ?? null,
    };
    changes.stale.push(item.slug);
  }

  assertNoManualFields(facts);
  await persist(factsFile, facts);

  let releases = previousReleases;
  try {
    const relRes = await gh(`/repos/${owner}/${item.repo}/releases?per_page=30`, {
      etag: previousReleases?.etag ?? undefined,
    });

    if (relRes.status === 200) {
      const list = relRes.body
        .filter((release) => !release.draft)
        .map((release) => ({
          version: normalizeVersion(release.tag_name),
          tag: release.tag_name ?? null,
          name: release.name ?? null,
          date: formatDate(release.published_at),
          url: release.html_url ?? null,
          prerelease: Boolean(release.prerelease),
          source: 'release',
        }));

      if (list.length > 0) {
        releases = {
          generatedBy: 'scripts/sync-github.mjs',
          owner,
          repo: item.repo,
          slug: item.slug,
          fetchedAt: NOW,
          etag: relRes.etag ?? null,
          stale: false,
          error: null,
          source: 'releases',
          releases: list,
        };
      } else {
        const tagRes = await gh(`/repos/${owner}/${item.repo}/tags?per_page=30`);
        const tags =
          tagRes.status === 200
            ? tagRes.body.map((tag) => ({
                version: normalizeVersion(tag.name),
                tag: tag.name ?? null,
                name: null,
                date: null, // tag API 不提供日期，这里留空而不是编造
                url: `https://github.com/${owner}/${item.repo}/releases/tag/${encodeURIComponent(tag.name)}`,
                prerelease: false,
                source: 'tag',
              }))
            : [];
        releases = {
          generatedBy: 'scripts/sync-github.mjs',
          owner,
          repo: item.repo,
          slug: item.slug,
          fetchedAt: NOW,
          etag: relRes.etag ?? null,
          stale: false,
          error: null,
          source: 'tags',
          releases: tags,
        };
      }
    } else if (relRes.status === 404) {
      releases = {
        generatedBy: 'scripts/sync-github.mjs',
        owner,
        repo: item.repo,
        slug: item.slug,
        fetchedAt: previousReleases?.fetchedAt ?? null,
        etag: previousReleases?.etag ?? null,
        stale: false,
        error: null,
        source: previousReleases?.source ?? 'releases',
        releases: previousReleases?.releases ?? [],
      };
    } else {
      releases = {
        ...(previousReleases ?? {
          generatedBy: 'scripts/sync-github.mjs',
          owner,
          repo: item.repo,
          slug: item.slug,
          fetchedAt: null,
          etag: null,
          error: null,
          source: 'releases',
          releases: [],
        }),
        stale: false,
        error: null,
      };
    }
  } catch (error) {
    if (error instanceof RateLimitError) throw error;
    releases = {
      generatedBy: 'scripts/sync-github.mjs',
      owner,
      repo: item.repo,
      slug: item.slug,
      fetchedAt: previousReleases?.fetchedAt ?? null,
      etag: previousReleases?.etag ?? null,
      stale: true,
      error: error.message,
      source: previousReleases?.source ?? 'releases',
      releases: previousReleases?.releases ?? [],
    };
    changes.stale.push(`${item.slug}.releases`);
  }

  assertNoManualFields(releases);
  await persist(releasesFile, releases);

  if (factsRefreshed) {
    report(`  ✓ ${item.slug}  ${facts?.data?.stars ?? '?'}★  ${facts?.data?.language ?? '—'}  ${facts?.data?.pushedAt ?? '—'}`);
  }
}

function markRemainingStale(items, error) {
  for (const item of items) {
    changes.stale.push(`${item.slug}（${error.message}）`);
  }
}

async function markItemStale(owner, item, error) {
  for (const [suffix, extra] of [
    ['.json', {}],
    ['.releases.json', { source: 'releases', releases: [] }],
  ]) {
    const file = path.join(DATA_DIR, `${item.slug}${suffix}`);
    const previous = await readJson(file);
    if (!previous) continue;
    const next = {
      ...previous,
      owner,
      repo: item.repo,
      slug: item.slug,
      stale: true,
      error: error.message,
      ...extra,
      ...(suffix === '.releases.json' ? { releases: previous.releases ?? [] } : {}),
    };
    await persist(file, next);
  }
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  const curated = JSON.parse(await readFile(CURATED_PATH, 'utf8'));
  const owner = curated.owner;
  const items = Array.isArray(curated.items) ? curated.items : [];

  if (!owner || items.length === 0) {
    report('curated.json 为空：没有需要同步的仓库。');
    return;
  }

  if (IS_CI && !TOKEN) {
    report('CI 中缺少 GH_SYNC_TOKEN / GITHUB_TOKEN，无法保证配额，按失败处理。');
    process.exitCode = 1;
    return;
  }

  report(`同步 ${owner} 的 ${items.length} 个白名单仓库${TOKEN ? '（已认证）' : '（未认证，60 次/小时）'}…`);

  // 1 次调用拿到公开仓库清单，用于"发现未收录仓库"
  let publicRepos = [];
  try {
    const listRes = await gh(`/users/${owner}/repos?per_page=100&sort=pushed`);
    if (listRes.status === 200) publicRepos = listRes.body;
  } catch (error) {
    if (error instanceof RateLimitError) throw error;
    report(`  仓库清单获取失败，仅按白名单逐个同步：${error.message}`);
  }

  const curatedRepos = new Set(items.map((item) => item.repo.toLowerCase()));
  changes.unlisted = publicRepos
    .filter((repo) => !repo.fork && String(repo.name).toLowerCase() !== String(owner).toLowerCase())
    .map((repo) => repo.name)
    .filter((name) => !curatedRepos.has(String(name).toLowerCase()));

  const pending = [...items];
  try {
    while (pending.length > 0) {
      const item = pending.shift();
      if (rateRemaining !== null && rateRemaining <= 1) {
        throw new RateLimitError(`配额即将耗尽（剩余 ${rateRemaining}）`);
      }
      await syncRepo(owner, item);
    }
  } catch (error) {
    if (!(error instanceof RateLimitError)) throw error;
    report('');
    report(`同步中止：${error.message}`);
    for (const item of pending) {
      await markItemStale(owner, item, error);
    }
    markRemainingStale(pending, error);
    report('未完成的仓库沿用上次快照并标记 stale；构建不受影响。');
    if (IS_CI) process.exitCode = 1;
  }

  // 目录里多余的快照（白名单已删除）只提示，不自动删除
  const files = await readdir(DATA_DIR);
  const expected = new Set(items.flatMap((item) => [`${item.slug}.json`, `${item.slug}.releases.json`]));
  const orphans = files.filter((file) => file.endsWith('.json') && !expected.has(file));

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
    markRemainingStale([], error);
    if (IS_CI) process.exitCode = 1;
    return;
  }
  console.error(error);
  process.exitCode = 1;
});
