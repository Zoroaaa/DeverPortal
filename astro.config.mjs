import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// 空状态页（还没有文档 / 文章）不进 sitemap；页面本身另有 noindex。
// 这里只数 mdx 文件是否存在，不解析内容；规则与页面的空状态判断保持同一口径。
function hasMdx(dir) {
  if (!existsSync(dir)) return false;
  return readdirSync(dir).some((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? hasMdx(full) : name.endsWith('.mdx');
  });
}

const productsDir = 'src/content/products';
const hasDocs =
  existsSync(productsDir) &&
  readdirSync(productsDir).some((slug) => hasMdx(path.join(productsDir, slug, 'docs')));
const hasPosts = hasMdx('src/content/posts');

const emptyPaths = [!hasDocs && '/docs/', !hasPosts && '/writing/'].filter(Boolean);

export default defineConfig({
  site: 'https://wort.uk',
  output: 'static',
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  integrations: [
    mdx(),
    sitemap({ filter: (page) => !emptyPaths.includes(new URL(page).pathname) }),
  ],
  markdown: {
    shikiConfig: { theme: 'github-light' },
  },
});
