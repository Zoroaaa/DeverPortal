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
    sitemap({ filter: (page) => !emptyPaths.includes(new URL(page).pathname) }),
  ],
  markdown: {
    shikiConfig: { theme: 'github-light' },
    rehypePlugins: [rehypeEvidenceDetails],
  },
});
