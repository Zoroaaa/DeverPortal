// 内容关系断言：构建期加载全部集合，任一约束不满足即抛错中止构建。
import { getCollection, type CollectionEntry } from 'astro:content';
import {
  assertSnapshotCoverage,
  curated,
  getCuratedItem,
  getSnapshots,
  mergeReleases,
  sortReleaseViews,
  type GithubSnapshot,
  type ReleaseView,
} from './projects';
import { compareVersions, versionInRange } from './versions';

export type { GithubSnapshot, ReleaseView } from './projects';

export type ProductEntry = CollectionEntry<'products'>;
export type ReleaseEntry = CollectionEntry<'releases'>;
export type DocEntry = CollectionEntry<'docs'>;
export type PostEntry = CollectionEntry<'posts'>;

// 空库时不调用 getCollection，避免 Astro 对空集合逐页打印警告。
const hasProductContent = Object.keys(import.meta.glob('../content/products/*/index.mdx')).length > 0;
const hasReleaseContent = Object.keys(import.meta.glob('../content/products/*/releases/*.mdx')).length > 0;
const hasDocContent = Object.keys(import.meta.glob('../content/products/*/docs/**/*.mdx')).length > 0;
const hasPostContent = Object.keys(import.meta.glob('../content/posts/*.mdx')).length > 0;

export interface ProductView {
  slug: string;
  entry: ProductEntry;
  docs: DocEntry[];
  releaseViews: ReleaseView[];
  latestRelease: ReleaseView | undefined;
  snapshot: GithubSnapshot | null;
}

export interface ContentGraph {
  products: ProductView[];
  docs: DocEntry[];
  posts: PostEntry[];
  releaseViews: ReleaseView[];
  drafts: number;
}

export function productSlugOf(entry: ProductEntry): string {
  return entry.id.split('/')[0] ?? '';
}

export function releaseProductSlug(entry: ReleaseEntry): string {
  return entry.id.split('/')[0] ?? '';
}

export function docProductSlug(entry: DocEntry): string {
  return entry.id.split('/')[0] ?? '';
}

export function docPathOf(entry: DocEntry): string {
  return entry.id.split('/').slice(2).join('/').replace(/\.mdx?$/, '');
}

export function postSlugOf(entry: PostEntry): string {
  return entry.id.replace(/\.mdx?$/, '');
}

export function sortReleases(list: ReleaseEntry[]): ReleaseEntry[] {
  return [...list].sort((a, b) => {
    const byDate = b.data.date.getTime() - a.data.date.getTime();
    return byDate !== 0 ? byDate : compareVersions(b.data.version, a.data.version);
  });
}

export function assertContentGraph(graph: {
  products: ProductEntry[];
  releases: ReleaseEntry[];
  docs: DocEntry[];
  posts: PostEntry[];
}): void {
  const errors: string[] = [];
  const productSlugs = new Set(graph.products.map(productSlugOf));

  const releasesByProduct = new Map<string, ReleaseEntry[]>();
  for (const release of graph.releases) {
    const slug = releaseProductSlug(release);
    if (!productSlugs.has(slug)) {
      errors.push(`${release.id}: 所属产品 "${slug}" 不存在`);
    }
    releasesByProduct.set(slug, [...(releasesByProduct.get(slug) ?? []), release]);
  }

  for (const [slug, list] of releasesByProduct) {
    const seen = new Set<string>();
    for (const release of list) {
      if (seen.has(release.data.version)) {
        errors.push(`${release.id}: 产品 "${slug}" 下版本 ${release.data.version} 重复`);
      }
      seen.add(release.data.version);
    }
  }

  const docSections = new Map<string, Set<string>>();
  for (const doc of graph.docs) {
    const slug = docProductSlug(doc);
    if (!productSlugs.has(slug)) {
      errors.push(`${doc.id}: 文档所属产品 "${slug}" 不存在`);
    }
    const key = `${doc.data.section}#${doc.data.order}`;
    const sections = docSections.get(slug) ?? new Set<string>();
    if (sections.has(key)) {
      errors.push(`${doc.id}: 产品 "${slug}" 下 section + order 冲突（${key}）`);
    }
    sections.add(key);
    docSections.set(slug, sections);

    if (doc.data.appliesTo) {
      const versions = (releasesByProduct.get(slug) ?? []).map((item) => item.data.version);
      if (versions.length === 0) {
        errors.push(`${doc.id}: 声明了 appliesTo，但产品 "${slug}" 没有已发布版本`);
      } else {
        try {
          const hit = versions.some((version) => versionInRange(version, doc.data.appliesTo!));
          if (!hit) {
            errors.push(`${doc.id}: appliesTo "${doc.data.appliesTo}" 与产品 "${slug}" 的已发布版本无交集`);
          }
        } catch (error) {
          errors.push(`${doc.id}: ${(error as Error).message}`);
        }
      }
    }
  }

  for (const post of graph.posts) {
    if (post.data.product && !productSlugs.has(post.data.product)) {
      errors.push(`${post.id}: post.product "${post.data.product}" 指向不存在的产品`);
    }
  }

  let featured = 0;
  for (const product of graph.products) {
    if (product.data.featured) featured += 1;

    if (product.data.status === 'live' && !product.data.links.demo) {
      errors.push(`${product.id}: status 为 live 时必须声明 links.demo`);
    }
    if (
      (product.data.status === 'live' || product.data.status === 'beta') &&
      product.data.limitations.length === 0
    ) {
      errors.push(`${product.id}: status 为 ${product.data.status} 时 limitations 至少需要 1 条`);
    }
  }

  if (featured > 6) {
    errors.push(`featured 产品数量为 ${featured}，不能超过 6`);
  }

  if (errors.length > 0) {
    throw new Error(`内容关系断言失败：\n- ${errors.join('\n- ')}`);
  }
}

let graphCache: Promise<ContentGraph> | null = null;

/** 生产构建里每个页面都会调用；内容在一次构建内不变，只算一次。开发模式不缓存，保证热更新。 */
export function loadContentGraph(): Promise<ContentGraph> {
  if (!import.meta.env.PROD) return buildContentGraph();
  graphCache ??= buildContentGraph();
  return graphCache;
}

async function buildContentGraph(): Promise<ContentGraph> {
  const [allProducts, allReleases, allDocs, posts] = await Promise.all([
    hasProductContent ? getCollection('products') : Promise.resolve([] as ProductEntry[]),
    hasReleaseContent ? getCollection('releases') : Promise.resolve([] as ReleaseEntry[]),
    hasDocContent ? getCollection('docs') : Promise.resolve([] as DocEntry[]),
    hasPostContent ? getCollection('posts') : Promise.resolve([] as PostEntry[]),
  ]);

  // 草稿（draft: true）不进入任何列表、详情页、RSS 或 sitemap。
  const products = allProducts.filter((product) => !product.data.draft);
  const publishedSlugs = new Set(products.map(productSlugOf));
  const releases = allReleases.filter((release) => publishedSlugs.has(releaseProductSlug(release)));
  const docs = allDocs.filter(
    (doc) => publishedSlugs.has(docProductSlug(doc)) && !doc.data.draft,
  );

  assertContentGraph({
    products,
    releases,
    docs,
    posts: posts.filter((post) => !post.data.draft),
  });
  assertSnapshotCoverage();

  const snapshots = getSnapshots();
  const sortedReleases = sortReleases(releases);

  const unpublishedWhitelist: string[] = [];
  const knownSlugs = new Set(allProducts.map(productSlugOf));
  for (const item of curated.items) {
    if (!knownSlugs.has(item.slug)) {
      unpublishedWhitelist.push(
        `${item.slug}（白名单条目没有 src/content/products/${item.slug}/index.mdx，可运行 npm run new:drafts 生成草稿）`,
      );
    }
  }
  const productViews: ProductView[] = products
    .map((entry) => {
      const slug = productSlugOf(entry);
      if (!getCuratedItem(slug)) {
        unpublishedWhitelist.push(`${slug}（内容存在但不在 curated.json 白名单）`);
      }
      const snapshot = snapshots.get(slug) ?? null;
      if (!snapshot) {
        unpublishedWhitelist.push(`${slug}（电脑上没有 GitHub 快照）`);
      }
      const manual = sortedReleases
        .filter((release) => releaseProductSlug(release) === slug)
        .map((release) => ({
          version: release.data.version,
          date: release.data.date,
          title: release.data.title,
          summary: release.data.summary,
          highlights: release.data.highlights,
          breaking: release.data.breaking,
          channel: release.data.channel,
        }));
      const releaseViews = mergeReleases(slug, manual, snapshot?.releases ?? []);
      return {
        slug,
        entry,
        docs: [...docs]
          .filter((doc) => docProductSlug(doc) === slug)
          .sort((a, b) => a.data.order - b.data.order),
        releaseViews,
        latestRelease: releaseViews[0],
        snapshot,
      };
    })
    .sort(
      (a, b) =>
        (getCuratedItem(a.slug)?.order ?? a.entry.data.order) -
          (getCuratedItem(b.slug)?.order ?? b.entry.data.order) ||
        a.entry.data.name.localeCompare(b.entry.data.name),
    );

  for (const snapshot of snapshots.values()) {
    if (snapshot.stale || snapshot.missing) {
      console.warn(`! ${snapshot.slug} 使用 stale 快照${snapshot.error ? `：${snapshot.error}` : ''}`);
    }
  }

  if (unpublishedWhitelist.length > 0) {
    throw new Error(
      `内容与白名单不一致：\n- ${unpublishedWhitelist.join('\n- ')}\n请把它们加入 src/data/curated.json 并运行 npm run sync:github，或设置 draft: true。`,
    );
  }

  return {
    products: productViews,
    docs: [...docs].sort((a, b) => a.data.order - b.data.order),
    posts: [...posts].sort((a, b) => b.data.date.getTime() - a.data.date.getTime()),
    releaseViews: sortReleaseViews(productViews.flatMap((product) => product.releaseViews)),
    drafts: allProducts.length - products.length,
  };
}
