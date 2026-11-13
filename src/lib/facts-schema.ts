// 事实层的唯一 schema：同步脚本写入前校验，构建读取时再校验一次。
// 两边共用同一份定义，手写字段一旦混进快照会直接失败。
import { z } from 'zod';

const nullableDate = z.string().nullable();

export const languageSchema = z
  .object({ name: z.string(), bytes: z.number() })
  .strict();

export const techDepSchema = z
  .object({ name: z.string(), scope: z.enum(['prod', 'dev']) })
  .strict();

// 从仓库根文件推断，不手写。布尔值只表示「文件/配置存在」。
export const filesSchema = z
  .object({
    license: z.boolean(),
    ci: z.boolean(),
    tests: z.boolean(),
    changelog: z.boolean(),
    dockerfile: z.boolean(),
    envExample: z.boolean(),
    wrangler: z.boolean(),
  })
  .strict();

export const cloudflareSchema = z
  .object({
    d1: z.boolean(),
    kv: z.boolean(),
    r2: z.boolean(),
    vectorize: z.boolean(),
    ai: z.boolean(),
    queues: z.boolean(),
    durableObjects: z.boolean(),
  })
  .strict();

export const factsDataSchema = z
  .object({
    id: z.number().nullable(),
    fullName: z.string().nullable(),
    url: z.string().nullable(),
    description: z.string().nullable(),
    homepage: z.string().nullable(),
    stars: z.number().nullable(),
    forks: z.number().nullable(),
    openIssues: z.number().nullable(),
    openPRs: z.number().nullable().default(null),
    language: z.string().nullable(),
    license: z.string().nullable(),
    createdAt: nullableDate,
    pushedAt: nullableDate,
    archived: z.boolean(),
    fork: z.boolean(),
    topics: z.array(z.string()),
    defaultBranch: z.string().nullable(),
    readmeExcerpt: z.string().nullable(),
    commitCount: z.number().nullable().default(null),
    languages: z.array(languageSchema).default([]),
    techDeps: z.array(techDepSchema).default([]),
    envKeys: z.array(z.string()).default([]),
    files: filesSchema.nullable().default(null),
    cloudflare: cloudflareSchema.nullable().default(null),
  })
  .strict();

export const releaseStatsSchema = z
  .object({
    commits: z.number().nullable(),
    filesChanged: z.number().nullable(),
    additions: z.number().nullable(),
    deletions: z.number().nullable(),
  })
  .strict();

export const snapshotReleaseSchema = z
  .object({
    version: z.string(),
    tag: z.string().nullable(),
    name: z.string().nullable(),
    date: nullableDate,
    url: z.string().nullable(),
    prerelease: z.boolean(),
    source: z.enum(['release', 'tag']),
    body: z.string().nullable().default(null),
    stats: releaseStatsSchema.nullable().default(null),
  })
  .strict();

export const releasesBlockSchema = z
  .object({
    fetchedAt: z.string().nullable(),
    etag: z.string().nullable(),
    stale: z.boolean(),
    error: z.string().nullable(),
    source: z.enum(['releases', 'tags']),
    items: z.array(snapshotReleaseSchema),
  })
  .strict();

export const factsSchema = z
  .object({
    schemaVersion: z.literal(1),
    slug: z.string(),
    owner: z.string(),
    repo: z.string(),
    fetchedAt: z.string().nullable(),
    etag: z.string().nullable(),
    readmeEtag: z.string().nullable(),
    stale: z.boolean(),
    error: z.string().nullable(),
    missing: z.boolean(),
    data: factsDataSchema.nullable(),
    activity: z.array(z.number()).default([]),
    // 前端 frontmatter 里声明的 evidence.file → 该路径在仓库中是否存在。null 表示本次未校验。
    evidence: z.record(z.string(), z.boolean()).nullable().default(null),
    releases: releasesBlockSchema,
  })
  .strict();

export type FactsFile = z.infer<typeof factsSchema>;
export type FactsData = z.infer<typeof factsDataSchema>;
export type SnapshotRelease = z.infer<typeof snapshotReleaseSchema>;
