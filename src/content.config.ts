// 内容集合的唯一 schema 定义，字段与 docs/personal-site-refactor-plan.md 4.3 保持一致。
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 判断层的证据引用：构建期只校验 file 是否存在，其余三种只做结构约束。
const evidenceRef = z.union([
  z.object({ file: z.string() }).strict(),
  z.object({ release: z.string() }).strict(),
  z.object({ url: z.string().url() }).strict(),
]);

const capabilitySchema = z
  .object({
    id: z.string(),
    title: z.string(),
    desc: z.string().default(''),
    state: z.enum(['done', 'partial', 'planned']),
    evidence: z.array(evidenceRef).default([]),
  })
  .strict();

const limitationSchema = z
  .object({
    text: z.string(),
    impact: z.enum(['low', 'med', 'high']),
    evidence: z.array(evidenceRef).default([]),
  })
  .strict();

const decisionSchema = z
  .object({
    title: z.string(),
    why: z.string(),
    cost: z.string(),
    alternatives: z.array(z.string()).default([]),
  })
  .strict();

export const products = defineCollection({
  loader: glob({ pattern: '*/index.mdx', base: './src/content/products' }),
  schema: z.object({
    name: z.string(),
    tagline: z.string().max(80),          // 卡片标题下的一句话
    summary: z.string().max(160),         // 列表/SEO 摘要
    status: z.enum(['live', 'beta', 'lab', 'archived']),
    draft: z.boolean().default(false),    // 草稿不进入列表/详情/RSS/sitemap
    featured: z.boolean().default(false),
    order: z.number().default(100),
    startedAt: z.coerce.date(),
    topics: z.array(z.string()).default([]),
    platforms: z.array(z.enum(['web', 'desktop', 'cli', 'self-host', 'cloudflare'])).default([]),
    tech: z.array(z.string()).default([]),
    links: z.object({
      demo: z.string().url().optional(),
      repo: z.string().url().optional(),
      download: z.string().url().optional(),
    }),
    cover: z.string().optional(),
    gallery: z.array(z.object({ src: z.string(), alt: z.string() })).default([]),
    limitations: z.array(limitationSchema).default([]),
    capabilities: z.array(capabilitySchema).default([]),
    audience: z
      .object({ for: z.array(z.string()).default([]), notFor: z.array(z.string()).default([]) })
      .optional(),
    decisions: z.array(decisionSchema).default([]),
    evidence: z.array(evidenceRef).default([]),
    seo: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      ogImage: z.string().optional(),
    }).optional(),
  }).strict(),
});

export const releases = defineCollection({
  loader: glob({ pattern: '*/releases/*.mdx', base: './src/content/products' }),
  schema: z.object({
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    date: z.coerce.date(),
    channel: z.enum(['stable', 'beta']).default('stable'),
    title: z.string(),
    summary: z.string().max(200),
    highlights: z.array(z.string()).default([]),
    breaking: z.boolean().default(false),
  }).strict(),
});

export const docs = defineCollection({
  loader: glob({ pattern: '*/docs/**/*.mdx', base: './src/content/products' }),
  schema: z.object({
    title: z.string(),
    section: z.string().default('指南'),
    order: z.number().default(100),
    description: z.string().max(160).optional(),
    updatedAt: z.coerce.date(),
    appliesTo: z.string().optional(),     // 如 ">=1.2 <2.0"
    draft: z.boolean().default(false),
  }).strict(),
});

export const posts = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string().max(200),
    type: z.enum(['essay', 'note', 'case-study']).default('essay'),
    lang: z.enum(['zh', 'en']).default('zh'),
    tags: z.array(z.string()).default([]),
    product: z.string().optional(),       // 关联产品 slug
    draft: z.boolean().default(false),
    cover: z.string().optional(),
  }).strict(),
});

// Astro 5 通过 collections 汇总导出注册集合，缺这一项会回退到目录自动推断。
export const collections = { products, releases, docs, posts };
