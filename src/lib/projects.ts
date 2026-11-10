// 构建期把「自动字段」（GitHub 快照）与「手写字段」（MDX）投影成只读视图。
// 数据所有权是物理隔离的：本文件只读 src/data/github/*.json 与 curated.json，不写任何文件。
import curatedFile from '../data/curated.json';
import { compareVersions } from './versions';

export interface CuratedItem {
  repo: string;
  slug: string;
  featured?: boolean;
  order?: number;
}

export interface CuratedFile {
  owner: string;
  items: CuratedItem[];
}

export interface GithubRepoFacts {
  id: number | null;
  fullName: string | null;
  url: string | null;
  description: string | null;
  homepage: string | null;
  stars: number | null;
  forks: number | null;
  openIssues: number | null;
  language: string | null;
  license: string | null;
  createdAt: string | null;
  pushedAt: string | null;
  archived: boolean;
  fork: boolean;
  topics: string[];
  defaultBranch: string | null;
  readmeExcerpt: string | null;
}

export interface SnapshotRelease {
  version: string;
  tag: string | null;
  name: string | null;
  date: string | null;
  url: string | null;
  prerelease: boolean;
  source: 'release' | 'tag';
}

export interface GithubSnapshot {
  slug: string;
  repo: string;
  fetchedAt: string | null;
  stale: boolean;
  error: string | null;
  missing: boolean;
  data: GithubRepoFacts | null;
  releases: SnapshotRelease[];
  releasesFetchedAt: string | null;
  releasesStale: boolean;
  releaseSource: 'releases' | 'tags';
}

export interface ReleaseView {
  productSlug: string;
  version: string;
  date: Date | null;
  title: string;
  summary: string | null;
  highlights: string[];
  breaking: boolean;
  channel: 'stable' | 'beta';
  source: 'manual' | 'release' | 'tag';
  url: string | null;
  href: string;
}

export interface ManualReleaseInput {
  version: string;
  date: Date;
  title: string;
  summary: string;
  highlights: string[];
  breaking: boolean;
  channel: 'stable' | 'beta';
}

// 手写字段清单：出现在快照里即视为同步脚本越权，直接失败。
const MANUAL_FIELDS = [
  'tagline',
  'summary',
  'why',
  'capabilities',
  'boundaries',
  'limitations',
  'status',
  'featured',
  'startedAt',
];

type JsonObject = Record<string, unknown>;

const factsModules = import.meta.glob<JsonObject>('../data/github/*.json', {
  eager: true,
  import: 'default',
});
const releaseModules = import.meta.glob<JsonObject>('../data/github/*.releases.json', {
  eager: true,
  import: 'default',
});

function basename(file: string): string {
  return file.split('/').pop() ?? file;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function assertNoManualFields(raw: JsonObject, label: string): void {
  for (const field of MANUAL_FIELDS) {
    if (field in raw) {
      throw new Error(
        `${label} 出现手写字段 "${field}"：同步快照只能包含自动字段，请检查 scripts/sync-github.mjs`,
      );
    }
  }
}

function parseFacts(slug: string, raw: JsonObject): GithubSnapshot {
  assertNoManualFields(raw, `src/data/github/${slug}.json`);
  const data = isObject(raw.data) ? raw.data : null;
  if (data) assertNoManualFields(data, `src/data/github/${slug}.json#data`);

  const releaseRaw = releaseModules[`../data/github/${slug}.releases.json`];
  const releases: SnapshotRelease[] = [];
  if (isObject(releaseRaw)) {
    assertNoManualFields(releaseRaw, `src/data/github/${slug}.releases.json`);
    if (Array.isArray(releaseRaw.releases)) {
      for (const item of releaseRaw.releases) {
        if (!isObject(item)) continue;
        const version = asString(item.version);
        if (!version) continue;
        releases.push({
          version,
          tag: asString(item.tag),
          name: asString(item.name),
          date: asString(item.date),
          url: asString(item.url),
          prerelease: item.prerelease === true,
          source: item.source === 'tag' ? 'tag' : 'release',
        });
      }
    }
  }

  return {
    slug,
    repo: asString(raw.repo) ?? '',
    fetchedAt: asString(raw.fetchedAt),
    stale: raw.stale === true,
    error: asString(raw.error),
    missing: raw.missing === true,
    data: data
      ? {
          id: asNumber(data.id),
          fullName: asString(data.fullName),
          url: asString(data.url),
          description: asString(data.description),
          homepage: asString(data.homepage),
          stars: asNumber(data.stars),
          forks: asNumber(data.forks),
          openIssues: asNumber(data.openIssues),
          language: asString(data.language),
          license: asString(data.license),
          createdAt: asString(data.createdAt),
          pushedAt: asString(data.pushedAt),
          archived: data.archived === true,
          fork: data.fork === true,
          topics: Array.isArray(data.topics) ? data.topics.filter((t): t is string => typeof t === 'string') : [],
          defaultBranch: asString(data.defaultBranch),
          readmeExcerpt: asString(data.readmeExcerpt),
        }
      : null,
    releases,
    releasesFetchedAt: isObject(releaseRaw) ? asString(releaseRaw.fetchedAt) : null,
    releasesStale: isObject(releaseRaw) ? releaseRaw.stale === true : false,
    releaseSource: isObject(releaseRaw) && releaseRaw.source === 'tags' ? 'tags' : 'releases',
  };
}

let snapshotCache: Map<string, GithubSnapshot> | null = null;

export function getSnapshots(): Map<string, GithubSnapshot> {
  if (snapshotCache) return snapshotCache;
  const map = new Map<string, GithubSnapshot>();
  for (const [file, raw] of Object.entries(factsModules)) {
    const name = basename(file);
    if (name.endsWith('.releases.json')) continue;
    if (!isObject(raw)) continue;
    const slug = name.replace(/\.json$/, '');
    map.set(slug, parseFacts(slug, raw));
  }
  snapshotCache = map;
  return map;
}

export const curated = curatedFile as CuratedFile;

export function getCuratedItem(slug: string): CuratedItem | undefined {
  return curated.items.find((item) => item.slug === slug);
}

/**
 * 构建期硬约束：
 *  - 每个白名单条目必须有快照，且快照里有真实仓库数据；
 *  - 快照的仓库全名必须与白名单一致（改名后必须重新同步并改白名单）。
 * 快照缺失/损坏 → 构建失败；网络失败只会让快照带上 stale 标记。
 */
export function assertSnapshotCoverage(): void {
  const snapshots = getSnapshots();
  const errors: string[] = [];

  const seenSlugs = new Set<string>();
  for (const item of curated.items) {
    if (!item.repo || !item.slug) {
      errors.push(`curated.json 条目缺少 repo 或 slug：${JSON.stringify(item)}`);
      continue;
    }
    if (seenSlugs.has(item.slug)) errors.push(`curated.json: slug "${item.slug}" 重复`);
    seenSlugs.add(item.slug);

    const snapshot = snapshots.get(item.slug);
    if (!snapshot) {
      errors.push(
        `白名单条目 ${item.repo}（${item.slug}）没有快照：先运行 npm run sync:github 生成 src/data/github/${item.slug}.json`,
      );
      continue;
    }
    if (!snapshot.data) {
      errors.push(
        `快照 src/data/github/${item.slug}.json 没有仓库数据（${snapshot.error ?? '未知原因'}）：请重新运行 npm run sync:github`,
      );
      continue;
    }
    for (const release of snapshot.releases) {
      if (release.date !== null && Number.isNaN(new Date(release.date).getTime())) {
        errors.push(`快照 ${item.slug}.releases.json: 版本 ${release.version} 的日期无法解析`);
      }
    }
    const expected = `${curated.owner}/${item.repo}`.toLowerCase();
    if (snapshot.data.fullName && snapshot.data.fullName.toLowerCase() !== expected) {
      errors.push(
        `快照 ${item.slug} 指向 ${snapshot.data.fullName}，与白名单 ${curated.owner}/${item.repo} 不一致：请确认仓库是否改名，并重新同步`,
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(`GitHub 快照校验失败：\n- ${errors.join('\n- ')}`);
  }
}

/** 按日期从新到旧；同日按版本号。无日期（tag）排最后。 */
export function sortReleaseViews(list: ReleaseView[]): ReleaseView[] {
  return [...list].sort((a, b) => {
    const at = a.date?.getTime() ?? 0;
    const bt = b.date?.getTime() ?? 0;
    if (bt !== at) return bt - at;
    return compareVersions(b.version, a.version);
  });
}

function releaseHref(slug: string, version: string): string {
  return `/products/${slug}/releases#${slug}-${version}`;
}

/**
 * Release 三级合并：手写 releases/*.mdx > GitHub Release > Git tag。
 * 同版本以手写为准；自动条目只保留版本号/日期/链接/预发布标记，不导入 release body。
 */
export function mergeReleases(
  productSlug: string,
  manual: ManualReleaseInput[],
  snapshotReleases: SnapshotRelease[],
): ReleaseView[] {
  const manualViews: ReleaseView[] = manual.map((release) => ({
    productSlug,
    version: release.version,
    date: release.date,
    title: release.title,
    summary: release.summary,
    highlights: release.highlights,
    breaking: release.breaking,
    channel: release.channel,
    source: 'manual',
    url: null,
    href: releaseHref(productSlug, release.version),
  }));

  const manualVersions = new Set(manualViews.map((release) => release.version));
  const seen = new Set<string>();
  const autoViews: ReleaseView[] = [];

  for (const release of snapshotReleases) {
    if (manualVersions.has(release.version) || seen.has(release.version)) continue;
    seen.add(release.version);
    autoViews.push({
      productSlug,
      version: release.version,
      date: release.date ? new Date(release.date) : null,
      title: release.name ?? (release.source === 'tag' ? release.tag ?? release.version : release.version),
      summary: null,
      highlights: [],
      breaking: false,
      channel: release.prerelease ? 'beta' : 'stable',
      source: release.source,
      url: release.url,
      href: releaseHref(productSlug, release.version),
    });
  }

  return sortReleaseViews([...manualViews, ...autoViews]);
}
