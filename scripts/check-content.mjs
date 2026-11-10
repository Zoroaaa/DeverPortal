#!/usr/bin/env node
// 独立内容检查：用 gray-matter 读取 MDX frontmatter，执行方案文档 4.4 的关系断言，
// 并校验 curated.json 白名单与 src/data/github/*.json 快照的对应关系。
// 与 src/lib/content-graph.ts 的断言保持一致；npm run build 会先跑这个脚本，再做 astro check。
// 空集合（没有产品）视为合法状态，构建不因此失败。
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const root = process.cwd();
const contentRoot = path.join(root, 'src', 'content');
const productsRoot = path.join(contentRoot, 'products');
const postsRoot = path.join(contentRoot, 'posts');
const curatedPath = path.join(root, 'src', 'data', 'curated.json');
const githubRoot = path.join(root, 'src', 'data', 'github');
const errors = [];
const warnings = [];

// 自动字段：由同步脚本维护，手写 frontmatter 里出现即视为越权。
const AUTO_FIELDS = [
  'stars',
  'forks',
  'openIssues',
  'language',
  'license',
  'repoDescription',
  'repoTopics',
  'homepage',
  'archived',
  'defaultBranch',
  'pushedAt',
  'lastCommitAt',
  'latestRelease',
  'releaseCount',
  'readmeExcerpt',
  'repo',
];

// 手写字段：快照里出现即视为同步脚本越权。
const MANUAL_FIELDS = ['tagline', 'summary', 'why', 'capabilities', 'boundaries', 'limitations', 'status', 'featured'];

async function listMdx(dir) {
  const result = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return result;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await listMdx(full)));
    } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
      result.push(full);
    }
  }
  return result;
}

async function readFrontmatter(file) {
  let raw;
  try {
    raw = await readFile(file, 'utf8');
  } catch {
    return null;
  }
  try {
    return matter(raw).data;
  } catch (error) {
    errors.push(`${path.relative(root, file)}: frontmatter 解析失败：${error.message}`);
    return null;
  }
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

function compareVersions(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function parseVersionRange(raw) {
  const range = {};
  const tokens = String(raw).trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) throw new Error('appliesTo 为空');
  for (const token of tokens) {
    const match = /^(>=|<=|>|<|=)?v?(\d+\.\d+(?:\.\d+)?)$/.exec(token);
    if (!match) throw new Error(`无法解析的版本约束 "${token}"`);
    const op = match[1] ?? '=';
    const value = (match[2] ?? '').split('.').length === 2 ? `${match[2]}.0` : (match[2] ?? '');
    if (op === '>=' || op === '>') {
      if (!range.lower || compareVersions(value, range.lower.value) > 0) {
        range.lower = { value, inclusive: op === '>=' };
      }
    } else if (op === '<=' || op === '<') {
      if (!range.upper || compareVersions(value, range.upper.value) < 0) {
        range.upper = { value, inclusive: op === '<=' };
      }
    } else {
      range.lower = { value, inclusive: true };
      range.upper = { value, inclusive: true };
    }
  }
  return range;
}

function versionInRange(version, rawRange) {
  const range = parseVersionRange(rawRange);
  if (range.lower) {
    const diff = compareVersions(version, range.lower.value);
    if (diff < 0 || (diff === 0 && !range.lower.inclusive)) return false;
  }
  if (range.upper) {
    const diff = compareVersions(version, range.upper.value);
    if (diff > 0 || (diff === 0 && !range.upper.inclusive)) return false;
  }
  return true;
}

function checkAutoFieldLeak(file, data) {
  const rel = path.relative(root, file);
  for (const field of AUTO_FIELDS) {
    if (field in data) {
      errors.push(`${rel}: 字段 "${field}" 由 GitHub 同步维护，请勿手写（数据在 src/data/github/ 快照里）`);
    }
  }
}

async function checkSnapshots(curated) {
  const items = Array.isArray(curated.items) ? curated.items : [];
  const slugs = new Set();

  for (const item of items) {
    const label = `${item.repo}（${item.slug}）`;
    if (!item.repo || !item.slug) {
      errors.push(`curated.json: 条目缺少 repo 或 slug：${JSON.stringify(item)}`);
      continue;
    }
    if (slugs.has(item.slug)) errors.push(`curated.json: slug "${item.slug}" 重复`);
    slugs.add(item.slug);

    const facts = await readJson(path.join(githubRoot, `${item.slug}.json`));
    if (!facts) {
      errors.push(`curated.json: ${label} 没有快照，先运行 npm run sync:github`);
      continue;
    }
    for (const field of MANUAL_FIELDS) {
      if (field in facts) {
        errors.push(`src/data/github/${item.slug}.json: 出现手写字段 "${field}"，同步脚本只能产出自动字段`);
      }
    }
    if (!facts.data) {
      errors.push(
        `src/data/github/${item.slug}.json: 没有仓库数据（${facts.error ?? '未知原因'}），重新运行 npm run sync:github`,
      );
      continue;
    }
    const expected = `${curated.owner}/${item.repo}`.toLowerCase();
    if (facts.data.fullName && String(facts.data.fullName).toLowerCase() !== expected) {
      errors.push(
        `src/data/github/${item.slug}.json: 指向 ${facts.data.fullName}，与白名单 ${curated.owner}/${item.repo} 不一致`,
      );
    }
    if (facts.stale || facts.missing) {
      warnings.push(`${label} 使用 stale 快照${facts.error ? `：${facts.error}` : ''}`);
    }

    const releases = await readJson(path.join(githubRoot, `${item.slug}.releases.json`));
    if (!releases) {
      warnings.push(`${item.slug}: 没有 release 快照，页面上不会显示自动版本记录`);
    } else if (Array.isArray(releases.releases)) {
      for (const release of releases.releases) {
        if (!release.version) errors.push(`src/data/github/${item.slug}.releases.json: 存在缺少 version 的记录`);
        if (release.date !== null && Number.isNaN(new Date(release.date).getTime())) {
          errors.push(`src/data/github/${item.slug}.releases.json: 版本 ${release.version} 的日期无法解析`);
        }
      }
    }
  }

  return slugs;
}

async function main() {
  const curated = await readJson(curatedPath);
  if (!curated || !curated.owner) {
    errors.push('src/data/curated.json: 缺失或缺少 owner 字段');
  }
  const curatedSlugs = curated ? await checkSnapshots(curated) : new Set();

  const productDirs = [];
  try {
    const entries = await readdir(productsRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const indexFile = path.join(productsRoot, entry.name, 'index.mdx');
      const data = await readFrontmatter(indexFile);
      if (data) productDirs.push({ slug: entry.name, file: indexFile, data, draft: data.draft === true });
    }
  } catch {
    // 目录缺失或为空集合都视为合法状态，构建不因此失败。
  }

  const productSlugs = new Set(productDirs.map((item) => item.slug));
  const published = productDirs.filter((item) => !item.draft);

  // 白名单与内容必须双向对应：白名单条目要落地文件，已发布产品必须在白名单里。
  for (const slug of curatedSlugs) {
    if (!productSlugs.has(slug)) {
      errors.push(`curated.json: 白名单条目 ${slug} 缺少 src/content/products/${slug}/index.mdx（可运行 npm run new:drafts 生成草稿骨架）`);
    }
  }
  for (const product of published) {
    if (!curatedSlugs.has(product.slug)) {
      errors.push(`${product.slug}/index.mdx: 已发布产品不在 curated.json 白名单里（请加入白名单或设置 draft: true）`);
    }
  }

  const releasesByProduct = new Map();

  for (const product of productDirs) {
    checkAutoFieldLeak(product.file, product.data);

    if (!product.draft) {
      if (product.data.status === 'live' && !(product.data.links && product.data.links.demo)) {
        errors.push(`${product.slug}/index.mdx: status 为 live 时必须声明 links.demo`);
      }
      if (
        (product.data.status === 'live' || product.data.status === 'beta') &&
        (!Array.isArray(product.data.limitations) || product.data.limitations.length === 0)
      ) {
        errors.push(`${product.slug}/index.mdx: status 为 ${product.data.status} 时 limitations 至少需要 1 条`);
      }
    }

    const releaseFiles = await listMdx(path.join(productsRoot, product.slug, 'releases'));
    const seenVersions = new Set();
    const versions = [];
    for (const file of releaseFiles) {
      const data = await readFrontmatter(file);
      if (!data) continue;
      const rel = path.relative(root, file);
      if (seenVersions.has(data.version)) {
        errors.push(`${rel}: 产品 "${product.slug}" 下版本 ${data.version} 重复`);
      }
      seenVersions.add(data.version);
      versions.push(data.version);
      releasesByProduct.set(product.slug, [
        ...(releasesByProduct.get(product.slug) ?? []),
        { file: rel, data },
      ]);
    }

    const docFiles = await listMdx(path.join(productsRoot, product.slug, 'docs'));
    const sections = new Set();
    for (const file of docFiles) {
      const data = await readFrontmatter(file);
      if (!data) continue;
      const rel = path.relative(root, file);
      const key = `${data.section ?? '指南'}#${data.order ?? 100}`;
      if (sections.has(key)) {
        errors.push(`${rel}: 产品 "${product.slug}" 下 section + order 冲突（${key}）`);
      }
      sections.add(key);
      if (data.appliesTo) {
        if (versions.length === 0) {
          errors.push(`${rel}: 声明了 appliesTo，但产品 "${product.slug}" 没有已发布版本`);
        } else {
          try {
            if (!versions.some((version) => versionInRange(version, data.appliesTo))) {
              errors.push(`${rel}: appliesTo "${data.appliesTo}" 与产品 "${product.slug}" 的已发布版本无交集`);
            }
          } catch (error) {
            errors.push(`${rel}: ${error.message}`);
          }
        }
      }
    }
  }

  const postFiles = await listMdx(postsRoot);
  const publishedSlugs = new Set(published.map((item) => item.slug));
  for (const file of postFiles) {
    const data = await readFrontmatter(file);
    if (!data) continue;
    if (data.product && !productSlugs.has(data.product)) {
      errors.push(`${path.relative(root, file)}: post.product "${data.product}" 指向不存在的产品`);
    }
    if (data.product && data.draft !== true && !publishedSlugs.has(data.product)) {
      errors.push(
        `${path.relative(root, file)}: post.product "${data.product}" 是草稿产品，已发布文章会指向不存在的页面（请把文章设为 draft 或先发布产品）`,
      );
    }
  }

  const featured = published.filter((item) => item.data.featured === true).length;
  if (featured > 6) {
    errors.push(`featured 产品数量为 ${featured}，不能超过 6`);
  }

  if (errors.length > 0) {
    console.error('✗ 内容检查失败：');
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }

  for (const warning of warnings) console.warn(`! ${warning}`);

  const releaseCount = [...releasesByProduct.values()].reduce((n, list) => n + list.length, 0);
  console.log(
    `✓ 内容检查通过：${published.length} 个已发布产品 / ${productDirs.length - published.length} 个草稿 / ${releaseCount} 条手写 release / ${postFiles.length} 篇文章`,
  );
}

main().catch((error) => {
  console.error(`✗ 内容检查异常：${error.stack ?? error.message}`);
  process.exit(1);
});
