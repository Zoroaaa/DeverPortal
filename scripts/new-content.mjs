#!/usr/bin/env node
/**
 * 内容脚手架：生成 doc / release / post 的 MDX 骨架，只填空缺，不覆盖已有文件。
 *
 * 用法：
 *   npm run new:doc -- <slug> <路径>             例：npm run new:doc -- atlas getting-started
 *   npm run new:release -- <slug> <版本> [标题]   例：npm run new:release -- atlas 1.7.0 "搜索提速"
 *   npm run new:post -- <文件名> [标题]           例：npm run new:post -- why-i-build-tools
 *
 * 注意：releases 没有 draft 字段，生成后必须先把 TODO 写完再提交；docs / posts 默认 draft:true。
 */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const PRODUCTS_DIR = path.join(ROOT, 'src', 'content', 'products');
const POSTS_DIR = path.join(ROOT, 'src', 'content', 'posts');
const CURATED_PATH = path.join(ROOT, 'src', 'data', 'curated.json');

const [kind, ...args] = process.argv.slice(2);

function usage() {
  console.log('用法：');
  console.log('  npm run new:doc -- <slug> <路径>             例：npm run new:doc -- atlas getting-started');
  console.log('  npm run new:release -- <slug> <版本> [标题]   例：npm run new:release -- atlas 1.7.0 "搜索提速"');
  console.log('  npm run new:post -- <文件名> [标题]           例：npm run new:post -- why-i-build-tools');
  process.exit(kind ? 1 : 0);
}

async function exists(file) {
  try {
    await readFile(file);
    return true;
  } catch {
    return false;
  }
}

async function countMdx(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map(async (entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return countMdx(full);
        return entry.isFile() && entry.name.endsWith('.mdx') ? 1 : 0;
      }),
    );
    return nested.reduce((sum, value) => sum + value, 0);
  } catch {
    return 0;
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function titleFrom(value) {
  return value
    .replace(/\.mdx$/i, '')
    .split(/[/\\-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

async function loadCurated() {
  const curated = JSON.parse(await readFile(CURATED_PATH, 'utf8'));
  return new Set((curated.items ?? []).map((item) => item.slug));
}

async function createDoc(slug, target) {
  if (!slug || !target) usage();
  const slugs = await loadCurated();
  if (!slugs.has(slug)) {
    console.error('✗ ' + slug + ' 不在 src/data/curated.json 白名单里');
    process.exit(1);
  }
  const relative = target.replace(/\.mdx$/i, '') + '.mdx';
  const file = path.join(PRODUCTS_DIR, slug, 'docs', relative);
  if (await exists(file)) {
    console.error('✗ 已存在，未覆盖：' + path.relative(ROOT, file));
    process.exit(1);
  }
  const docsDir = path.join(PRODUCTS_DIR, slug, 'docs');
  const order = ((await countMdx(docsDir)) + 1) * 10;
  const title = titleFrom(relative);
  const body = `---
# 待改写：生成后补全内容，并把 draft 改成 false 才会发布。
title: "${title}（待改写）"
section: "指南"
order: ${order}
description: "TODO：一句话说明这篇文档解决什么问题（≤160 字）"
updatedAt: ${today()}
draft: true
---

TODO：这篇文档还没写。

## 安装

TODO：写清楚最短可用路径（3–5 步，可直接粘贴的命令）。

## 常见问题

TODO：列出使用者最可能卡住的两三个点。
`;
  await mkdir(docsDir, { recursive: true });
  await writeFile(file, body, 'utf8');
  console.log('✓ 已生成 ' + path.relative(ROOT, file).replaceAll('\\', '/'));
  console.log('  下一步：补完正文与 description，把 draft 改成 false，再运行 npm run build。');
}

async function createRelease(slug, version, title) {
  if (!slug || !version) usage();
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    console.error('✗ 版本号必须是 x.y.z，例如 1.2.0');
    process.exit(1);
  }
  const slugs = await loadCurated();
  if (!slugs.has(slug)) {
    console.error('✗ ' + slug + ' 不在 src/data/curated.json 白名单里');
    process.exit(1);
  }
  const releasesDir = path.join(PRODUCTS_DIR, slug, 'releases');
  const file = path.join(releasesDir, version + '.mdx');
  if (await exists(file)) {
    console.error('✗ 已存在，未覆盖：' + path.relative(ROOT, file));
    process.exit(1);
  }
  const body = `---
version: ${version}
date: ${today()}
channel: stable
title: "${title ?? 'v' + version}"
summary: "TODO：一句话概括这个版本（≤200 字）"
highlights:
  - "TODO：一条用户能感知的变化"
breaking: false
---

TODO：写发布背景、升级注意事项或已知问题。
`;
  await mkdir(releasesDir, { recursive: true });
  await writeFile(file, body, 'utf8');
  console.log('✓ 已生成 ' + path.relative(ROOT, file).replaceAll('\\', '/'));
  console.log('  ⚠ 版本记录没有 draft 字段：写完 TODO 再提交，否则会直接发布到 /changelog 与 RSS。');
}

async function createPost(name, title) {
  if (!name) usage();
  const slug = name.replace(/\.mdx$/i, '');
  if (!/^[a-z0-9-]+$/.test(slug)) {
    console.error('✗ 文章文件名只允许小写字母、数字、连字符，例如 why-i-build-tools');
    process.exit(1);
  }
  const file = path.join(POSTS_DIR, slug + '.mdx');
  if (await exists(file)) {
    console.error('✗ 已存在，未覆盖：' + path.relative(ROOT, file));
    process.exit(1);
  }
  const body = `---
# 待改写：生成后补全内容，并把 draft 改成 false 才会发布。
title: "${title ?? titleFrom(slug)}（待改写）"
date: ${today()}
summary: "TODO：一句话摘要（≤200 字）"
type: essay
tags: []
draft: true
---

TODO：开始写正文。写清做法、取舍与踩坑，不写宣传。
`;
  await mkdir(POSTS_DIR, { recursive: true });
  await writeFile(file, body, 'utf8');
  console.log('✓ 已生成 ' + path.relative(ROOT, file).replaceAll('\\', '/'));
  console.log('  下一步：补完正文与 summary，把 draft 改成 false，再运行 npm run build。');
}

switch (kind) {
  case 'doc':
    await createDoc(args[0], args[1]);
    break;
  case 'release':
    await createRelease(args[0], args[1], args[2]);
    break;
  case 'post':
    await createPost(args[0], args[1]);
    break;
  default:
    usage();
}
