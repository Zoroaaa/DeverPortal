# 内容录入说明

内容全部是仓库里的 MDX 文件：改文件就是改站点。`npm run build` 通过，才能发布。

## 0. 先记住四条

1. 只改 `src/content/`，不改 `src/` 下的代码。
2. 字段以 `src/content.config.ts` 为准；本说明只是它的翻译。
3. **不要手写 star、语言、license、版本、日期这类自动字段**——它们来自 `src/data/github/*.json` 快照，手写会让构建失败。
4. 构建报错时先看冒号前的文件路径，再对照第 6 节。

## 1. 目录、文件名与 slug

```text
src/content/
├── products/
│   └── <slug>/
│       ├── index.mdx           产品（必须有）
│       ├── releases/
│       │   └── 0.1.0.mdx       版本记录
│       └── docs/
│           └── getting-started.mdx
└── posts/
    └── <slug>.mdx
```

- 产品 slug = `products/` 下一级目录名，同时是 URL：`/products/<slug>`。只用小写字母、数字、连字符；改目录名等于改 URL。
- release 的归属由目录决定：`products/<slug>/releases/`，文件里不写产品字段。
- 文档的归属也由目录决定：`products/<slug>/docs/`。`docs/` 之后的相对路径就是 URL 后缀，例如 `docs/guide/install.mdx` → `/docs/<slug>/guide/install`，可以建子目录。
- 文章必须直接放在 `posts/` 下，不能建子目录；文件名去掉 `.mdx` 就是 slug：`my-note.mdx` → `/writing/my-note`。
- 产品只认 `products/<slug>/index.mdx`；同一目录下散放的其他 mdx 不会被当成产品。
- release 只认 `releases/` 下一层；文档可以多层。

## 2. 四个集合的字段

类型写法与 `src/content.config.ts` 一致。"页面位置"只说当前模板真的会显示的地方；标"不显示"的字段只做记录或校验，填了页面也看不到。

### 2.1 products — `products/<slug>/index.mdx`

| 字段 | 类型 | 必填 / 默认 | 含义 | 页面位置 |
|---|---|---|---|---|
| `name` | `string` | 必填 | 产品名 | 卡片标题、产品页 h1、面包屑 |
| `tagline` | `string`（≤80 字符） | 必填 | 一句话定位 | 卡片标题下、产品页标题下 |
| `summary` | `string`（≤160 字符） | 必填 | 列表 / SEO 摘要 | 产品页标题下说明段；meta description 的兜底 |
| `status` | `'live' \| 'beta' \| 'lab' \| 'archived'` | 必填 | 维护状态 | 卡片与产品页的 LIVE / BETA / LAB / ARCHIVED 标签 |
| `draft` | `boolean` | 选填，默认 `false` | 草稿标记 | `true` 时不进列表、不生成详情页、不进 RSS / sitemap，也不参与发布断言 |
| `featured` | `boolean` | 选填，默认 `false` | 是否首页精选 | 不显示；首页"图纸目录"优先取 `true`，最多 6 个 |
| `order` | `number` | 选填，默认 `100` | 排序权重 | 不显示；产品列表与首页按数值升序，同值按 `name` |
| `startedAt` | date | 必填 | 开始做的时间 | 不显示 |
| `topics` | `string[]` | 选填，默认 `[]` | 主题标签 | 产品页底部标签行 |
| `platforms` | `('web' \| 'desktop' \| 'cli' \| 'self-host' \| 'cloudflare')[]` | 选填，默认 `[]` | 运行平台 | 卡片 PLATFORM 行、产品页 eyebrow、规格表 PLATFORM |
| `tech` | `string[]` | 选填，默认 `[]` | 技术栈 | 产品页底部标签行（与 `topics` 同一行） |
| `links` | `object` | 必填（可为空对象 `{}`） | 外链容器 | 不显示 |
| `links.demo` | `string`（URL） | 选填 | 在线演示地址 | 产品页"打开 Demo"按钮；`status: live` 时必填 |
| `links.repo` | `string`（URL） | 选填 | 源码地址 | 产品页"源码仓库"按钮 |
| `links.download` | `string`（URL） | 选填 | 下载地址 | 产品页"下载"按钮 |
| `cover` | `string` | 选填 | 封面图路径 | 不显示（当前没有模板读取） |
| `gallery` | `{ src: string; alt: string }[]` | 选填，默认 `[]` | 截图集 | 不显示（当前没有模板读取） |
| `limitations` | `string[]` | 选填，默认 `[]` | 已知限制 | 产品页"现状与已知限制"区块；`live` / `beta` 至少 1 条 |
| `seo` | `object` | 选填 | 页面元信息 | 不直接显示 |
| `seo.title` | `string` | 选填 | 浏览器标题 | `<title>`，不写则用 `name` |
| `seo.description` | `string` | 选填 | 搜索摘要 | meta description，不写则用 `summary` |
| `seo.ogImage` | `string` | 选填 | 分享图路径 | `og:image` |

### 2.2 releases — `products/<slug>/releases/<文件名>.mdx`

| 字段 | 类型 | 必填 / 默认 | 含义 | 页面位置 |
|---|---|---|---|---|
| `version` | `string`，格式 `x.y.z` | 必填 | 版本号 | 条目的 `v0.1.0`、锚点 `#0.1.0`、产品规格表 VERSION（取最新一条） |
| `date` | date | 必填 | 发布日期 | 条目日期；决定"最近版本"和全站排序 |
| `channel` | `'stable' \| 'beta'` | 选填，默认 `stable` | 发布通道 | `beta` 显示 "BETA CHANNEL"；`stable` 不显示 |
| `title` | `string` | 必填 | 版本标题 | 条目标题 |
| `summary` | `string`（≤200 字符） | 必填 | 一句话说明 | 条目下方的说明 |
| `highlights` | `string[]` | 选填，默认 `[]` | 变更要点 | 条目下方的要点列表 |
| `breaking` | `boolean` | 选填，默认 `false` | 是否破坏性变更 | 显示 "BREAKING / 破坏性变更" |

### 2.3 docs — `products/<slug>/docs/**/*.mdx`

| 字段 | 类型 | 必填 / 默认 | 含义 | 页面位置 |
|---|---|---|---|---|
| `title` | `string` | 必填 | 文档标题 | 文档页 h1、文档索引、左侧目录 |
| `section` | `string` | 选填，默认 `'指南'` | 分组名 | 文档索引右侧的分组文字；与 `order` 组成唯一键 |
| `order` | `number` | 选填，默认 `100` | 排序权重 | 文档目录排序；产品页"快速开始"取第一条 |
| `description` | `string`（≤160 字符） | 选填 | 摘要 | 文档页标题下说明；meta description |
| `updatedAt` | date | 必填 | 最后更新日期 | 不显示 |
| `appliesTo` | `string` | 选填 | 适用版本区间，如 `">=0.1.0 <2.0.0"` | 不显示；只做构建校验 |
| `draft` | `boolean` | 选填，默认 `false` | 草稿标记 | `true` 时不生成页面，也不进文档索引 |

### 2.4 posts — `posts/<slug>.mdx`

| 字段 | 类型 | 必填 / 默认 | 含义 | 页面位置 |
|---|---|---|---|---|
| `title` | `string` | 必填 | 文章标题 | 列表与详情 h1 |
| `date` | date | 必填 | 发布日期 | 列表日期；按时间从新到旧排序 |
| `summary` | `string`（≤200 字符） | 必填 | 摘要 | 列表摘要；meta description |
| `type` | `'essay' \| 'note' \| 'case-study'` | 选填，默认 `'essay'` | 文章类型 | 列表与详情上的类型文字 |
| `lang` | `'zh' \| 'en'` | 选填，默认 `'zh'` | 语言 | 不显示（预留） |
| `tags` | `string[]` | 选填，默认 `[]` | 标签 | 列表与详情标签行 |
| `product` | `string` | 选填 | 关联产品 slug | 详情页"关联产品"链接；必须是已存在的目录名，且目标产品不能是草稿（文章也得是草稿） |
| `draft` | `boolean` | 选填，默认 `false` | 草稿标记 | `true` 时不出现在列表、首页、RSS，也不生成详情页 |
| `cover` | `string` | 选填 | 封面图路径 | 不显示（当前没有模板读取） |

## 3. 从零添加一个产品（5 步）

本站产品来自 GitHub 白名单，先从白名单开始：

1. 在 `src/data/curated.json` 加一条：`{ "repo": "仓库名", "slug": "站内 slug", "featured": false, "order": 100 }`。`slug` 定下后不要改（等于 URL）。
2. 运行 `npm run sync:github` 抓快照，再运行 `npm run new:drafts` 生成草稿骨架 `src/content/products/<slug>/index.mdx`。
3. 打开草稿，补全所有 TODO：`tagline`、`summary`、正文三段；把 `draft` 改成 `false`。`beta` / `live` 必须保留至少 1 条 `limitations`，`live` 必须有 `links.demo`。
4. 本地预览：`npm run dev`，打开 `http://localhost:4321/products/<slug>`。
5. 构建校验：`npm run build`。看到 `✓ 内容检查通过` 且最后 `Complete!` 才算通过。

需要版本记录或文档时，再把 `release.mdx`、`doc.mdx` 复制到 `<slug>/releases/`、`<slug>/docs/`。手写 release 会覆盖 GitHub 同版本号条目；文档的 `appliesTo` 必须与已有 release 版本有交集，否则删掉该行。

**草稿不会上线**：`draft: true` 的产品不生成页面，也不进列表、RSS、sitemap，但仍要求白名单与快照存在。

## 4. 图片与外链

图片统一放 `public/images/<slug>/`，用站点绝对路径引用：

```md
![文件列表界面](/images/sample-tool/list.webp)
```

- 文件名用小写英文和连字符，不要空格与中文。
- 正文里的 `![]()` 会正常显示；`cover`、`gallery` 目前没有模板读取，填了也不显示。
- `seo.ogImage` 也用同样的 `/images/...` 路径，会出现在分享卡片。
- 不写相对路径，不用 `src/assets` 导入；当前内容模板没有接图片组件。

外链写在 `links` 下，必须是完整 URL（含 `https://`）：

```yaml
links:
  demo: https://example.com/demo
  repo: https://github.com/your-name/your-repo
```

`/demo` 这类相对路径会被拒绝；`status: live` 时 `links.demo` 不能为空。

## 5. 写作提示

三段各回答一个问题，不要互相替代：

- **为什么做**：具体的麻烦、场景、你原来怎么凑合。写事实，不写愿景。
- **能力边界**：能做什么，以及明确不做什么。边界越具体，读者越信。
- **已知限制**：没做完的、会出错的、只在某些平台成立的、是否还维护。`limitations` 列表写条目，正文解释影响。

正例 1（为什么做）："客户导出的 CSV 经常混着全角逗号和空行，每次手动清理要十几分钟。这个工具把这段固定动作压成一次拖拽。"

正例 2（能力边界）："支持 CSV / TSV 的列裁剪与去重；不做 Excel 公式计算，也不替你判断该保留哪一列。"

反例（不要这样写）："基于先进架构，性能提升 300%，一键解决所有数据处理难题。" —— 没有依据的数字、没有边界的全能、纯营销词。

统一要求：不写"赋能 / 极致 / 颠覆 / 一站式"，不吹未验证的数据，没做完的就写没做完。

## 6. 常见失败

`npm run build` 分两步：先 `astro check` 查字段类型 / 长度 / 枚举，再生成页面；生成时执行内容关系断言（白名单↔内容↔快照、自动/手写字段越权、版本重复等，规则在 `src/lib/content-graph.ts` 与 `src/lib/projects.ts`）。任何一步失败都会中止。

关系检查的输出格式固定为：

```text
✗ 内容检查失败：
  - src/content/products/sample-tool/releases/0.1.0.mdx: 产品 "sample-tool" 下版本 0.1.0 重复
```

冒号前是文件，冒号后是原因。字段类型、长度、枚举错误则由 `astro check` 或构建阶段报出，信息里带字段名。

最常犯的四个错误：

| 报错 | 原因 | 修法 |
|---|---|---|
| `status 为 beta 时 limitations 至少需要 1 条` | `live` / `beta` 没写限制 | 在 `limitations` 补至少 1 条真实限制 |
| `产品 "xxx" 下版本 1.0.0 重复` | 同产品下 `version` 重复或不是 `x.y.z` | 每个版本号唯一，严格三段数字 |
| `所属产品 "xxx" 不存在` / `appliesTo ... 无交集` | 目录名与引用不一致，或文档声明的版本没有对应 release | 检查 `products/` 下的目录名；`post.product` 写目录名；`appliesTo` 与已有版本对齐或删除 |
| `字段 "stars" 由 GitHub 同步维护` | 把自动字段写进了 frontmatter | 删掉该字段；数据在 `src/data/github/<slug>.json` |

另外几条容易忘：`status: live` 必须有 `links.demo`；同一产品下文档的 `section + order` 不能完全相同；白名单条目必须有快照（先跑 `npm run sync:github`）。

## 7. 发布流程

1. 改 `src/content/` 下的 MDX。
2. `npm run build` 必须通过。
3. `git add src/content`，提交并推送。
4. Cloudflare Pages 监听仓库，推送后自动执行 `npm run build` 并部署 `dist/`。
5. 线上打开发布页确认：标题、状态、最近版本、限制段落都在。

构建不通过就不要提交；线上只会得到和本地一样的失败结果。
