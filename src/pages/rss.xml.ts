import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { site } from '../data/site';
import { loadContentGraph, postSlugOf } from '../lib/content-graph';

export async function GET(context: APIContext) {
  const { products, releaseViews, posts } = await loadContentGraph();
  const nameBySlug = new Map(products.map((product) => [product.slug, product.entry.data.name]));

  const items = [
    ...posts
      .filter((post) => !post.data.draft)
      .map((post) => ({
        title: post.data.title,
        pubDate: post.data.date,
        description: post.data.summary,
        link: `/writing/${postSlugOf(post)}`,
      })),
    // tag 来源没有真实日期，不编造日期，也就不进 RSS。
    ...releaseViews
      .filter((release) => release.date !== null)
      .map((release) => ({
        title: `${nameBySlug.get(release.productSlug) ?? release.productSlug} v${release.version} · ${release.title}`,
        pubDate: release.date as Date,
        description: release.summary ?? '来自 GitHub Release 的版本记录',
        link: `/products/${release.productSlug}/releases#${release.productSlug}-${release.version}`,
      })),
  ].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: `${site.ownerName} · 更新与写作`,
    description: site.description,
    site: context.site ?? site.url,
    items,
    customData: '<language>zh-CN</language>',
  });
}
