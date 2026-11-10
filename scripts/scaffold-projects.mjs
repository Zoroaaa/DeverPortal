#!/usr/bin/env node
/**
 * 为白名单里还没有手写内容的仓库生成「草稿态」MDX 骨架。
 *
 * - 只生成缺失的文件，绝不覆盖已存在的 index.mdx
 * - 草稿带 draft: true，不会进入列表 / 详情 / RSS / sitemap
 * - 手写字段全部是显式 TODO，不编造定位、限制或平台
 * - startedAt 取自 GitHub 仓库创建时间（真实值）
 *
 * 用法：node scripts/scaffold-projects.mjs [--force]
 *   --force  连已存在的草稿也重新生成（仍然不会碰非草稿文件）
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const curated = JSON.parse(await readFile(path.join(ROOT, 'src', 'data', 'curated.json'), 'utf8'));
const DATA_DIR = path.join(ROOT, 'src', 'data', 'github');
const PRODUCTS_DIR = path.join(ROOT, 'src', 'content', 'products');
const FORCE = process.argv.includes('--force');

const TAGLINE = 'TODO：一句话定位（≤80 字，写明为谁解决什么问题）';
const SUMMARY = 'TODO：一句话摘要（≤160 字，用于列表与 SEO）';

function template(item, repo) {
  const startedAt = repo.createdAt ?? null;
  if (!startedAt) return null;

  const facts = [
    `仓库：${repo.fullName ?? item.repo}`,
    `创建：${repo.createdAt ?? '—'}`,
    `最近提交：${repo.pushedAt ?? '—'}`,
    `语言：${repo.language ?? '—'}`,
    `License：${repo.license ?? '未声明'}`,
    `Star：${repo.stars ?? '—'}`,
  ].join('\n');

  return `---
# 草稿由 scripts/scaffold-projects.mjs 生成。
# 补全所有 TODO 后把 draft 改为 false，并确认 status / links / limitations。
# 自动字段（star / 语言 / license / 版本 / 日期 / 链接）由 src/data/github/${item.slug}.json 提供，
# 不要写进这里：构建会把手写自动字段视为错误。
draft: true
name: ${JSON.stringify(repo.fullName?.split('/').pop() ?? item.repo)}
tagline: ${JSON.stringify(TAGLINE)}
summary: ${JSON.stringify(SUMMARY)}
status: lab
featured: ${item.featured === true}
order: ${Number.isFinite(item.order) ? item.order : 100}
startedAt: ${startedAt}
topics: []
platforms: []
tech: []
links: {}
limitations: []
---

{/* 自动抓取事实（只读参考，删除也不影响页面）：
${facts}
*/}

> **DRAFT / 草稿**：这个页面还没有写完，不会出现在产品列表、RSS 或 sitemap 中。
> 补全下面四项，把 frontmatter 的 \`draft\` 改成 \`false\`，才会发布。

## 一句话定位

TODO：它是什么、给谁用、解决什么问题。不要复述仓库描述，写你希望访客记住的那一句。

## 为什么做

TODO：当时的动机、替代方案哪里不够好、为什么值得自己写一遍。

## 能力边界

TODO：它擅长什么、明确不做什么。写清楚边界比罗列功能更能建立信任。

## 已知限制

TODO：当前明确没做到或做得不够好的地方。status 为 live / beta 时至少写 1 条。

## 快速开始

TODO：最短可用路径（3–5 步，可直接粘贴的命令）。完整手册写到 \`docs/\` 目录，不在这里展开。
`;
}

async function main() {
  const items = Array.isArray(curated.items) ? curated.items : [];
  if (items.length === 0) {
    console.log('curated.json 为空：没有需要生成骨架的仓库。');
    return;
  }

  await mkdir(PRODUCTS_DIR, { recursive: true });
  let created = 0;
  let skipped = 0;

  for (const item of items) {
    let facts;
    try {
      facts = JSON.parse(await readFile(path.join(DATA_DIR, `${item.slug}.json`), 'utf8'));
    } catch {
      console.log(`! ${item.slug}: 没有快照，跳过（先运行 npm run sync:github）`);
      continue;
    }
    if (!facts.data) {
      console.log(`! ${item.slug}: 没有仓库数据，跳过（先运行 npm run sync:github）`);
      continue;
    }

    const dir = path.join(PRODUCTS_DIR, item.slug);
    const file = path.join(dir, 'index.mdx');
    const existing = await readFile(file, 'utf8').catch(() => null);
    if (existing !== null && !FORCE) {
      skipped += 1;
      continue;
    }
    if (existing !== null && !/^draft:\s*true$/m.test(existing)) {
      console.log(`! ${item.slug}: 已存在非草稿内容，拒绝覆盖`);
      continue;
    }

    const content = template(item, facts.data);
    if (!content) {
      console.log(`! ${item.slug}: 快照缺少仓库创建时间，跳过`);
      continue;
    }

    await mkdir(dir, { recursive: true });
    await writeFile(file, content, 'utf8');
    console.log(`✓ 生成草稿 src/content/products/${item.slug}/index.mdx`);
    created += 1;
  }

  console.log(`\n完成：新建 ${created} 个草稿，跳过 ${skipped} 个已有内容。`);
  if (created > 0) {
    console.log('下一步：补全每个草稿的 TODO，把 draft 改成 false 后运行 npm run build。');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
