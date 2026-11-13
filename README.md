# DeverPortal

> 个人作品站：用 Markdown 维护产品说明、版本记录与使用手册，用 GitHub 快照自动维护 star / 语言 / license / 版本等客观事实。

线上：<https://wort.uk/>

## 技术栈

| 技术 | 用途 |
|---|---|
| Astro 5（纯静态输出） | 页面与内容集合；零客户端框架、零运行时接口 |
| MDX + Content Collections | 手写内容唯一事实源，构建期 Zod 校验 |
| 原生 CSS + 语义 token | 极简明亮：白底 + 单一暖橙强调色；组件只引用 `src/styles/tokens.css` 的语义 token |
| Cloudflare Pages | 托管 `dist/`，无 Functions、无 KV |
| GitHub Actions | 每日同步 GitHub 公开数据，变更开 PR |

## 本地开发

```bash
npm install
npm run dev          # 开发服务器
npm run build        # astro check（类型）+ 静态构建（构建期执行内容关系断言）
npm run preview      # 预览 dist/
```

构建**不联网、不需要 token**：所有 GitHub 数据都从仓库内快照读取。

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
```

自动字段（star / fork / language / license / 最近提交 / Release / tag / README 首段）只由同步脚本写入 `src/data/facts/*.json`；手写字段只存在于 `src/content/**`。任何一侧写了对方的字段，构建都会失败。

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
│   └── github/              # 机器生成的仓库与版本快照
├── lib/
│   ├── content-graph.ts     # 关系断言 + 草稿过滤 + 发布视图
│   └── projects.ts          # 手写与快照合并、字段所有权校验
├── components/              # site / product / release / docs / ui
├── layouts/                 # Base / Docs
└── pages/                   # 路由与 rss / robots / sitemap
scripts/
├── sync-github.ts          # GitHub 公开 API → 快照（只写 data/github）
└── scaffold-projects.mjs    # 生成草稿 MDX 骨架（只写 content）
docs/
├── personal-site-refactor-plan.md
├── github-projects-sync-plan.md
├── content-guide/           # 录入说明与模板
```

## 部署

Cloudflare Pages 连接本仓库：

- Build command: `npm run build`
- Build output directory: `dist`
- 无需环境变量、无需 KV 绑定、无需 Functions

## License

[MIT](LICENSE)
