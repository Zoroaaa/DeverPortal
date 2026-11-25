import rss from '@astrojs/rss';
import type { APIContext, GetStaticPaths } from 'astro';
import { loadContentGraph, type ProductView } from '../../../lib/content-graph';
import { releaseFeedTitle } from '../../../lib/format';
import { site } from '../../../data/site';

export const getStaticPaths = (async () => {
  const { products } = await loadContentGraph();
  // 没有任何版本记录的产品不生成空 feed。
  return products
    .filter((product) => product.releaseViews.length > 0)
    .map((product) => ({ params: { slug: product.slug }, props: { product } }));
}) satisfies GetStaticPaths;

export async function GET(context: APIContext) {
  const { product } = context.props as { product: ProductView };
  const productName = product.entry.data.name;
  const items = product.releaseViews
    .filter((release) => release.date !== null)
    .map((release) => ({
      title: releaseFeedTitle(productName, release.version, release.title),
      pubDate: release.date as Date,
      description: release.summary ?? '来自 GitHub Release 的版本记录',
      link: release.href,
    }));

  return rss({
    title: `${product.entry.data.name} · 版本记录`,
    description: product.entry.data.summary,
    site: context.site ?? site.url,
    items,
    customData: '<language>zh-CN</language>',
  });
}
