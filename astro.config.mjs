import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
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

// sitemap 的 lastmod 只从仓库内 GitHub 快照推导（构建期不联网、不用手工维护日期）。
const FACTS_DIR = 'src/data/facts';

function loadProductLastmod() {
  const map = new Map();
  if (!existsSync(FACTS_DIR)) return map;
  for (const name of readdirSync(FACTS_DIR)) {
    if (!name.endsWith('.json')) continue;
    try {
      const facts = JSON.parse(readFileSync(path.join(FACTS_DIR, name), 'utf8'));
      const dates = [facts?.data?.pushedAt, ...(facts?.releases?.items ?? []).map((item) => item.date)]
        .filter((value) => typeof value === 'string')
        .map((value) => new Date(value))
        .filter((date) => !Number.isNaN(date.getTime()));
      if (dates.length > 0) {
        map.set(name.slice(0, -5), new Date(Math.max(...dates.map((date) => date.getTime()))));
      }
    } catch {
      // 单个快照损坏不阻断构建；内容层会给出更明确的错误。
    }
  }
  return map;
}

const productLastmod = loadProductLastmod();
const siteLastmod = [...productLastmod.values()].reduce(
  (max, date) => (max === null || date > max ? date : max),
  null,
);

function lastmodFor(pathname) {
  if (pathname === '/' || pathname === '/products/' || pathname === '/changelog/') return siteLastmod;
  const match = /^\/products\/([^/]+)\/(releases\/)?$/.exec(pathname);
  if (match) return productLastmod.get(match[1]) ?? null;
  return null;
}

// 正文末尾的 `> 证据：…` 行改为默认折叠的 details，正文只看叙事。
function textOf(node) {
  if (node.type === 'text') return node.value;
  if (!Array.isArray(node.children)) return '';
  return node.children.map(textOf).join('');
}

function rehypeEvidenceDetails() {
  return (tree) => {
    const walk = (node) => {
      if (!Array.isArray(node.children)) return;
      node.children = node.children.map((child) => {
        const isEvidence = child.type === 'element' && child.tagName === 'blockquote' && textOf(child).trim().startsWith('证据');
        if (isEvidence) {
          return {
            type: 'element',
            tagName: 'details',
            properties: { className: ['evidence'] },
            children: [
              {
                type: 'element',
                tagName: 'summary',
                properties: {},
                children: [{ type: 'text', value: '证据来源' }],
              },
              {
                type: 'element',
                tagName: 'div',
                properties: { className: ['evidence-body'] },
                children: child.children,
              },
            ],
          };
        }
        walk(child);
        return child;
      });
    };
    walk(tree);
  };
}

export default defineConfig({
  site: 'https://wort.uk',
  output: 'static',
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => {
        const pathname = new URL(page).pathname;
        // 空状态页与站内搜索页不进 sitemap。
        return !emptyPaths.includes(pathname) && pathname !== '/search/';
      },
      serialize: (item) => {
        const lastmod = lastmodFor(new URL(item.url).pathname);
        return lastmod ? { ...item, lastmod: lastmod.toISOString() } : item;
      },
    }),
  ],
  markdown: {
    shikiConfig: { theme: 'github-light' },
    rehypePlugins: [rehypeEvidenceDetails],
  },
});
