// 构建期把「自动字段」（GitHub 快照）与「手写字段」（MDX）投影成只读视图。
// 数据所有权是物理隔离的：本文件只读 src/data/facts/*.json 与 curated.json，不写任何文件。
import curatedFile from '../data/curated.json';
import techMapFile from '../data/tech-map.json';
import { factsSchema } from './facts-schema';
import { compareVersions } from './versions';

const TECH_MAP = techMapFile as Record<string, string | null>;

/** 依赖 → 展示名。只认 tech-map.json 里登记过的依赖，未登记的直接忽略，不猜。 */
export function deriveTech(deps: { name: string }[]): string[] {
  const out = new Set<string>();
  for (const dep of deps) {
    const label = TECH_MAP[dep.name];
    if (label) out.add(label);
  }
  return [...out];
}

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

// 事实字段形状来自 facts-schema.ts，这里只做类型别名，不重复声明。
export type GithubRepoFacts = import('./facts-schema').FactsData;

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
  activity: number[];
  evidence: Record<string, boolean> | null;
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

// 事实层的形状由 facts-schema.ts 唯一定义：同步脚本写入前校验，这里读取时再校验一次。
const factsModules = import.meta.glob<unknown>('../data/facts/*.json', {
  eager: true,
  import: 'default',
});

function parseFacts(file: string, raw: unknown): GithubSnapshot {
  const result = factsSchema.safeParse(raw);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(
      `事实快照 ${file} 不符合 schema：${detail}\n` +
        '同步脚本与构建共用 src/lib/facts-schema.ts，出现此错误说明快照被手改过或脚本版本不一致。',
    );
  }
  const facts = result.data;
  return {
    slug: facts.slug,
    repo: facts.repo,
    fetchedAt: facts.fetchedAt,
    stale: facts.stale,
    error: facts.error,
    missing: facts.missing,
    data: facts.data,
    activity: facts.activity,
    evidence: facts.evidence,
    releases: facts.releases.items,
    releasesFetchedAt: facts.releases.fetchedAt,
    releasesStale: facts.releases.stale,
    releaseSource: facts.releases.source,
  };
}

let snapshotCache: Map<string, GithubSnapshot> | null = null;

export function getSnapshots(): Map<string, GithubSnapshot> {
  if (snapshotCache) return snapshotCache;
  const map = new Map<string, GithubSnapshot>();
  for (const [file, raw] of Object.entries(factsModules)) {
    const slug = (file.split('/').pop() ?? '').replace(/\.json$/, '');
    const snapshot = parseFacts(file, raw);
    if (snapshot.slug !== slug) {
      throw new Error(`事实快照 ${file} 的 slug 字段是 "${snapshot.slug}"，与文件名不一致`);
    }
    map.set(slug, snapshot);
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
        `白名单条目 ${item.repo}（${item.slug}）没有快照：先运行 npm run sync:github 生成 src/data/facts/${item.slug}.json`,
      );
      continue;
    }
    if (!snapshot.data) {
      errors.push(
        `快照 src/data/facts/${item.slug}.json 没有仓库数据（${snapshot.error ?? '未知原因'}）：请重新运行 npm run sync:github`,
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
