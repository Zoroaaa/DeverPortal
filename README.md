# DeverPortal

> 个人作品站：用 Markdown 维护产品说明、版本记录与使用手册，用 GitHub 快照自动维护 star / 语言 / license / 版本等客观事实。

线上：<https://wort.uk/>

## 技术栈

| 技术 | 用途 |
|---|---|
| Astro 5（纯静态输出） | 页面与内容集合；零客户端框架、零运行时接口 |
| MDX + Content Collections | 手写内容唯一事实源，构建期 Zod 校验 |
| 原生 CSS + 语义 token | 极简明亮：白底 + 单一暖橙强调色；组件只引用 `src/styles/tokens.css` 的语义 token |
| Cloudflare Workers 静态资源 | 托管 `dist/`（`wrangler.jsonc` 的 `assets`），无 Worker 脚本、无 KV |
| Pagefind | 构建期生成静态搜索索引，搜索不经过服务器 |
| GitHub Actions | 每日同步 GitHub 公开数据，直推 main |

## 本地开发

```bash
npm install
npm run dev          # 开发服务器
npm run build        # astro check（类型）+ 静态构建（内容关系断言）+ Pagefind 搜索索引
npm run preview      # 预览 dist/
```

构建**不联网、不需要 token**：所有 GitHub 数据都从仓库内快照读取。

## 站内搜索

`npm run build` 会在 `dist/pagefind/` 生成静态索引，`/search` 页在浏览器里直接查询索引：没有服务端、没有外部搜索服务，也不需要单独部署。开发模式（`npm run dev`）不生成索引，搜索页会提示先构建；本地验证用 `npm run build && npm run preview`。索引覆盖作品页、版本记录、文档与文章（正文与首个 h1 标题）。

作品列表支持按状态 / 平台 / 技术筛选与排序（筛选条件写在 URL 里，可分享）；每个有版本记录的产品另有 `/products/<slug>/rss.xml` 订阅源。

## 内容维护

| 集合 | 位置 | 用途 |
|---|---|---|
| products | `src/content/products/<slug>/index.mdx` | 产品定义与详情正文 |
| releases | `src/content/products/<slug>/releases/*.mdx` | 手写版本说明 |
| docs | `src/content/products/<slug>/docs/**/*.mdx` | 使用手册 |
| posts | `src/content/posts/*.mdx` | 文章 |

录入说明与可复制模板见 [docs/content-guide/README.md](./docs/content-guide/README.md)。

产品分两种状态：

- **草稿**：frontmatter 写 `draft: true`，不进入列表、详情页、RSS、sitemap，也不参与发布断言。`npm run new:drafts` 会为白名单里缺内容的仓库生成带 TODO 的草稿骨架。
- **已发布**：`draft: false`。`live` / `beta` 必须写 `limitations`，`live` 必须有 `links.demo`。

## GitHub 项目数据

`src/data/curated.json` 是**人维护的白名单**：哪些仓库算作品、站内用什么 slug、排序与精选，全在这里。仓库名与 slug 解耦，GitHub 改名不影响站内 URL。

```bash
npm run sync:github              # 抓公开 API，写 src/data/facts/*.json
npm run sync:github -- --dry-run # 只看变化，不写文件
npm run new:drafts               # 为白名单缺内容的仓库生成草稿 MDX
npm run content:audit            # 内容覆盖体检：文档 / 手写版本 / 文章 / TODO 泄漏
npm run new:release -- <slug> 1.2.0 "标题"  # 生成手写版本记录骨架
npm run new:doc -- <slug> getting-started   # 生成文档骨架
npm run new:post -- why-i-build-tools       # 生成文章骨架
```

自动字段（star / fork / language / license / 最近提交 / Release / tag / README 首段 / Release 正文与版本规模）只由同步脚本写入 `src/data/facts/*.json`；手写字段只存在于 `src/content/**`。任何一侧写了对方的字段，构建都会失败。

同步失败不会阻断构建：保留上次快照并标 `stale`，页面显示“数据同步失败，当前沿用上次快照”。白名单新增但从未抓到过快照 → 构建失败，提示先跑 `sync:github`。

GitHub Actions（`.github/workflows/sync-github.yml`）每天 UTC 02:00 同步一次，有真实内容变更时先 `pull --rebase` 再直接提交并推送到 `main`（不开 PR、不建分支）。`fetchedAt` / `etag` / `readmeEtag` 这类每次都变的字段只在内容变化时才重写，不会单独造成提交。可选 Secret：`GH_SYNC_TOKEN`（fine-grained PAT，只读公开仓库）；没有则用 `GITHUB_TOKEN`。

完整设计见 [docs/github-projects-sync-plan.md](./docs/github-projects-sync-plan.md)。

## 目录结构

```text
src/
├── content.config.ts        # 4 个集合的 schema
├── content/                 # 手写内容（product / release / doc / post）
├── data/
│   ├── curated.json         # GitHub 白名单
│   └── facts/               # 机器生成的仓库与版本快照
├── lib/
│   ├── content-graph.ts     # 关系断言 + 草稿过滤 + 发布视图
│   └── projects.ts          # 手写与快照合并、字段所有权校验
├── components/              # site / product / release / docs / ui
├── layouts/                 # Base / Docs
└── pages/                   # 路由与 rss / robots / sitemap
assets/
└── fonts/                   # 构建期 OG 渲染字体（不发布到 dist）
public/                      # 直接发布的静态资源：favicon / og.png / _headers
scripts/
├── sync-github.ts          # GitHub 公开 API → 快照（只写 src/data/facts）
├── scaffold-projects.mjs    # 生成草稿 MDX 骨架（只写 content）
├── new-content.mjs          # new:doc / new:release / new:post 脚手架
├── content-audit.mjs        # content:audit 内容覆盖体检
└── prune-pagefind.mjs       # 构建后清掉 Pagefind 未使用的官方 UI 资源
docs/
├── personal-site-refactor-plan.md
├── github-projects-sync-plan.md
├── content-guide/           # 录入说明与模板
```

## 部署

Cloudflare **Workers 静态资源**（配置见 `wrangler.jsonc`）：

- Build command: `npm run build`
- Build output directory: `dist`（`assets.directory`）
- 部署：`npm run deploy`（即 `wrangler deploy`；本地首次需 `npx wrangler login`）
- 无需环境变量、无需 KV/D1 绑定、无 Worker 脚本

## License

[MIT](LICENSE)
