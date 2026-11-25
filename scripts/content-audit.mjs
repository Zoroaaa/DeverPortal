#!/usr/bin/env node
/**
 * 内容覆盖体检：只读扫描 src/content 与 src/data/facts，输出 Markdown 报表。
 * 默认报告模式（退出码 0）；加 --strict 后，发布门槛不达标即退出 1。
 *
 * 用法：
 *   npm run content:audit
 *   npm run content:audit -- --strict
 */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, 'src', 'content');
const PRODUCTS_DIR = path.join(CONTENT_DIR, 'products');
const POSTS_DIR = path.join(CONTENT_DIR, 'posts');
const FACTS_DIR = path.join(ROOT, 'src', 'data', 'facts');
const CURATED_PATH = path.join(ROOT, 'src', 'data', 'curated.json');
const STRICT = process.argv.includes('--strict');

// 与 publish-checklist 的静默泄漏口径一致：发布内容里出现这些词即视为未写完。
const TODO_RE = /TODO[:：]|DRAFT\s*\/\s*草稿/g;

async function readText(file) {
  try {
    return await readFile(file, 'utf8');
  } catch {
    return null;
  }
}

async function listFiles(dir, suffix = '.mdx') {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listFiles(full, suffix)));
    else if (entry.isFile() && entry.name.endsWith(suffix)) out.push(full);
  }
  return out.sort();
}

function frontmatter(text) {
  if (!text) return '';
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  return match?.[1] ?? '';
}

function isDraft(text) {
  return /(^|\n)\s*draft:\s*true\s*(\n|$)/.test(frontmatter(text));
}

function field(text, name) {
  const match = new RegExp('(?:^|\\n)' + name + ':\\s*"?([^"\\n]+)"?').exec(frontmatter(text));
  return match?.[1]?.trim() ?? '';
}

function todoCount(text) {
  return text ? (text.match(TODO_RE) ?? []).length : 0;
}

async function countSnapshots() {
  try {
    const entries = await readdir(FACTS_DIR, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile() && entry.name.endsWith('.json')).length;
  } catch {
    return 0;
  }
}

const curated = JSON.parse(await readFile(CURATED_PATH, 'utf8'));
const curatedSlugs = new Set((curated.items ?? []).map((item) => item.slug));
const productDirs = (await readdir(PRODUCTS_DIR, { withFileTypes: true }).catch(() => []))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const rows = [];
const gaps = [];
let todoTotal = 0;
let snapshotCount = 0;

for (const slug of productDirs) {
  const dir = path.join(PRODUCTS_DIR, slug);
  const indexFile = path.join(dir, 'index.mdx');
  const text = await readText(indexFile);
  if (!text) continue;

  const status = field(text, 'status') || '—';
  const draft = isDraft(text);

  const docFiles = await listFiles(path.join(dir, 'docs'));
  const docTexts = await Promise.all(docFiles.map(readText));
  const publishedDocs = docFiles.filter((_, index) => docTexts[index] && !isDraft(docTexts[index]));

  const releaseFiles = await listFiles(path.join(dir, 'releases'));
  const releaseTexts = await Promise.all(releaseFiles.map(readText));
  const publishedReleases = releaseFiles.filter((_, index) => releaseTexts[index]);

  let facts = null;
  try {
    facts = JSON.parse((await readText(path.join(FACTS_DIR, slug + '.json'))) ?? 'null');
  } catch {
    facts = null;
  }
  const hasFacts = Boolean(facts?.data) && !facts?.missing;
  if (hasFacts) snapshotCount += 1;

  const todos =
    todoCount(text) +
    docTexts.reduce((sum, value) => sum + todoCount(value), 0) +
    releaseTexts.reduce((sum, value) => sum + todoCount(value), 0);
  todoTotal += todos;

  rows.push({
    slug,
    status,
    draft,
    docs: publishedDocs.length,
    docTotal: docFiles.length,
    releases: publishedReleases.length,
    facts: hasFacts,
    stale: Boolean(facts?.stale) || !hasFacts,
    todos,
  });

  if (!curatedSlugs.has(slug)) gaps.push(slug + '：内容存在但不在 curated.json 白名单');
  if (draft) gaps.push(slug + '：产品仍是 draft:true（不会发布）');
  if (!hasFacts) gaps.push(slug + '：缺可用的 GitHub 快照（先跑 npm run sync:github）');
  if (facts?.stale) gaps.push(slug + '：快照是 stale 状态');
  if (status === 'live' || status === 'beta') {
    if (publishedDocs.length < 2) {
      gaps.push(slug + '：已发布文档 ' + publishedDocs.length + ' 篇（发布门槛 ≥2：快速开始 + FAQ）');
    }
    if (publishedReleases.length < 1) {
      gaps.push(slug + '：手写版本记录 ' + publishedReleases.length + ' 条（发布门槛 ≥1）');
    }
  }
  if (todos > 0) gaps.push(slug + '：还有 ' + todos + ' 处 TODO/草稿提示');
}

const missingContent = [...curatedSlugs].filter((slug) => !productDirs.includes(slug));
for (const slug of missingContent) gaps.push(slug + '：白名单有、src/content/products/' + slug + '/index.mdx 缺失');

const postFiles = await listFiles(POSTS_DIR);
const postTexts = await Promise.all(postFiles.map(readText));
const publishedPosts = postFiles.filter((_, index) => postTexts[index] && !isDraft(postTexts[index]));
const postTodos = postTexts.reduce((sum, value) => sum + todoCount(value), 0);
todoTotal += postTodos;
if (publishedPosts.length < 3) gaps.push('posts：已发布文章 ' + publishedPosts.length + ' 篇（发布门槛 ≥3）');
if (postTodos > 0) gaps.push('posts：还有 ' + postTodos + ' 处 TODO/草稿提示');

const links = await countSnapshots();

const stamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
console.log('# 内容覆盖体检');
console.log('');
console.log('> ' + stamp + ' · `npm run content:audit`');
console.log('');
console.log('## 产品');
console.log('');
console.log('| slug | 状态 | 产品页 | 文档（已发布/全部） | 手写版本 | 快照 | TODO |');
console.log('|---|---|---|---|---|---|---|');
for (const row of rows) {
  console.log(
    '| [' + row.slug + '](/products/' + row.slug + ') | ' + row.status + ' | ' + (row.draft ? '❌ 草稿' : '✅') +
      ' | ' + (row.docs > 0 ? '✅' : '⚠️') + ' ' + row.docs + '/' + row.docTotal +
      ' | ' + (row.releases > 0 ? '✅' : '⚠️') + ' ' + row.releases +
      ' | ' + (row.facts ? (row.stale ? '⚠️ stale' : '✅') : '❌ 缺失') +
      ' | ' + (row.todos > 0 ? '⚠️ ' + row.todos : '—') + ' |',
  );
}
console.log('');
console.log('## 文章');
console.log('');
console.log('- 已发布：' + publishedPosts.length + ' 篇');
console.log('- 全部文件：' + postFiles.length + ' 个');
console.log('- TODO/草稿提示：' + postTodos + ' 处');
console.log('');
console.log('## 缺口');
console.log('');
if (gaps.length === 0) {
  console.log('无。');
} else {
  for (const gap of gaps) console.log('- ' + gap);
}
console.log('');
console.log('## 汇总');
console.log('');
console.log(
  '- 产品：' + rows.length + ' 个（白名单 ' + curatedSlugs.size + ' 个），快照文件 ' + links + ' 个',
);
console.log('- 文档：' + rows.reduce((sum, row) => sum + row.docs, 0) + ' 篇已发布');
console.log('- 手写版本：' + rows.reduce((sum, row) => sum + row.releases, 0) + ' 条');
console.log('- 文章：' + publishedPosts.length + ' 篇已发布');
console.log('- TODO/草稿提示总计：' + todoTotal + ' 处');
console.log('');
console.log(STRICT ? 'strict 模式：有缺口即失败。' : '报告模式；加 --strict 可让内容门槛失败时退出 1。');
if (STRICT && gaps.length > 0) process.exitCode = 1;
