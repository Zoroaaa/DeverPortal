# 把一个产品从草稿发上线：最短路径

> 现状：6 个产品都已发布（`draft: false`）；缺的是文档、手写版本记录和文章——运行 `npm run content:audit` 可一眼看到缺口。
> 本文是“把一份草稿发上线”的最短路径，适用于之后新增的产品。
> 以 `src/content.config.ts`（schema）和 `src/lib/content-graph.ts`（构建期校验）为准，本文不引入新字段。

---

## 0. 一句话结论

只需要改**一个文件**：`src/content/products/<slug>/index.mdx`。
把 `draft: true` 改成 `false`，补完 7 个字段 + 5 段正文，然后跑 3 条命令。

---

## 1. 要改的文件

```
src/content/products/<slug>/index.mdx      ← 只改这个
```

`<slug>` 取 `src/data/curated.json` 里的 `slug`，目录名必须一致（atlas / it-toolbox / omnibox / personal-blog / ossshelf / cf-bestip）。

### 1.1 frontmatter：改这 5 个字段

| 字段 | 现在 | 要改成 | 约束（schema 原文） |
|---|---|---|---|
| `draft` | `true` | `false` | 布尔值，`false` 才会发布 |
| `tagline` | `"TODO：…"` | 一句话定位 | `z.string().max(80)` |
| `summary` | `"TODO：…"` | 列表/SEO 摘要 | `z.string().max(160)` |
| `status` | `lab` | 见 §4 决策 ⚑ | 只能 `live` / `beta` / `lab` / `archived` |
| `links` | `{}` | 至少可选加 `demo` / `repo` / `download` | 三个都是 `.url().optional()` |
| `limitations` | `[]` | 已知限制字符串数组 | `live` / `beta` 时**至少 1 条**，否则构建报错 |

不要动的字段（脚手架已按真实数据填好）：
`name`、`startedAt`、`featured`、`order`、`topics`、`platforms`、`tech`。

**禁止手写**（会直接报错）：`stars`、`forks`、`language`、`license`、`repo`、`pushedAt`、`latestRelease`、`readmeExcerpt` 等自动字段——它们在 `src/data/facts/<slug>.json` 里，页面自己读。

### 1.2 正文：替换 5 个 TODO 段 + 删掉草稿提示

依次是 `## 一句话定位`、`## 为什么做`、`## 能力边界`、`## 已知限制`、`## 快速开始`，每段下都有一行 `TODO：…`，就地替换成自己的话。

同时删掉正文顶部这两行（否则发布后页面上还挂着“这是草稿”的提示）：

```
> **DRAFT / 草稿**：这个页面还没有写完，不会出现在产品列表、RSS 或 sitemap 中。
> 补全下面四项，把 frontmatter 的 `draft` 改成 `false`，才会发布。
```

`{/* 自动抓取事实… */}` 那段注释可以留着，不会输出到页面。

⚠️ **脚本不会因为正文里还有 `TODO：` 而失败**（构建只查关系与越权字段）。这是唯一的“静默泄漏”口子，发布前必须自己搜一遍（见 §3 第 3 条）。

---

## 2. 执行顺序（照抄）

```powershell
# 1) 编辑内容（手工）
#    src/content/products/atlas/index.mdx

# 2) 构建：schema 校验 + 关系断言（白名单 ↔ 内容 ↔ 快照）+ 静态生成
npm run build

# 3) 本地看效果
npm run preview      # 打开 http://localhost:4321/products/atlas
```

只有在**快照缺失/损坏**时才需要第 5 条（正常情况不要跑，会消耗 GitHub 未认证配额 60 次/小时）：

```powershell
npm run sync:github   # 重新抓 src/data/facts/*.json
```

---

## 3. 怎么判断成功

1. `npm run build` 通过，且该产品出现在 `/products`。
2. `npm run build` 出现新路由：`▶ src/pages/products/[slug]/index.astro` → `└─ /products/atlas/index.html`，且 `astro check` 是 `0 errors`。
3. 扫一遍产物，确认没有 TODO 与草稿提示泄漏：

```powershell
Get-ChildItem dist -Recurse -File | Select-String -Pattern "TODO：|DRAFT / 草稿" -List
```

没有输出 = 干净；有命中 = 对应文件里还有没替换的 TODO。

4. `http://localhost:4321/products/atlas` 上能看到：状态药丸、`LANG`/`STARS`/`LICENSE`（来自快照的真实值）、`UPDATED`、最近版本；页面顶部没有 DRAFT 提示条。
5. 首页与 `/products` 出现该卡片；`dist/sitemap-0.xml` 里多出 `/products/atlas/`。

---

## 4. ⚑ 需要你决策的三处

| 决策 | 选项与后果 |
|---|---|
| ⚑ `status` 选什么 | `live` 会**强制要求** `links.demo`，`live`/`beta` 会**强制要求** `limitations` 至少 1 条；`lab` 两个都不强制，但页面上会显示 LAB。想最快上线又没 demo，就用 `beta`（写 1 条限制）或 `lab`（限制可为空）。 |
| ⚑ `links.demo` 要不要填 | 只有 `status: live` 时必填。可留空，页面会自动用快照里的仓库地址做“源码仓库”按钮。 |
| ⚑ `featured` 与首页 | 首页精选读的是 **MDX 里的 `featured`**（`src/pages/index.astro`），排序读的是 **`curated.json` 的 `order`**。两处不同源：想让某产品上首页就改 MDX；想调顺序就改 JSON。`featured` 超过 6 个会构建失败。 |

另有一处可留空：`topics` / `tech` / `platforms` / `cover` / `gallery` / `seo` 全部有默认值，不填不影响发布（只是页面元素少一些）。

---

## 5. 最常见报错与修法

| 报错（原文片段） | 原因 | 修法 |
|---|---|---|
| `字段 "stars" 由 GitHub 同步维护，请勿手写` | 把自动字段写进了 frontmatter | 删掉该字段；要看值就打开 `src/data/facts/<slug>.json` |
| `status 为 live 时必须声明 links.demo` | `status: live` 但 `links.demo` 为空 | 补 demo URL，或把 `status` 改成 `beta` / `lab` |
| `status 为 live 时 limitations 至少需要 1 条` | `limitations: []` 但状态是 live/beta | 写至少一条真实限制；写不出来说明还不该标 live/beta |
| `tagline` / `summary` 超长（`astro check` 报 `Too big: expected string to have <=80 characters`） | 超出 schema 上限 | 分别压到 80 / 160 字以内 |
| `frontmatter 解析失败` | YAML 写法错，最常见是值里有 ASCII 冒号加空格却没用引号 | 整段用双引号包起来，例如 `tagline: "定位: 一句话"` |
| `白名单条目 atlas 缺少 src/content/products/atlas/index.mdx` | 目录被删或改名 | `npm run new:drafts` 重新生成草稿骨架，或把目录名改回 slug |
| `白名单条目 X（x）没有快照` / `快照 … 没有仓库数据` | `src/data/facts/x.json` 缺失或抓取失败 | `npm run sync:github`（配额超限时等 UTC 整点后重试） |

`npm run build` 已包含全部检查：`astro check` 管 schema 与长度，构建期断言管关系与字段越权（白名单↔内容↔快照、自动/手写字段）。

---

## 6. 当前内容覆盖

以 `npm run content:audit` 的输出为准，不再手工维护待办表。2026-11-24 的基线：

| 项 | 现状 | 目标 |
|---|---|---|
| 产品页 | 6/6 已发布 | — |
| 文档 | 0 篇 | 每个 live 产品 ≥2 篇（快速开始 + FAQ） |
| 手写版本记录 | 0 条 | 每个 live 产品 ≥1 条 |
| 文章 | 0 篇 | ≥3 篇 |
| TODO/草稿提示 | 0 处 | 0 处 |

补齐后运行 `npm run content:audit -- --strict`，全部通过再考虑接进 CI 阻断。文档与版本骨架可以直接用 `npm run new:doc` / `npm run new:release` 生成。

---

## 7. 发布后

```powershell
git add src/content/products/atlas/index.mdx
git commit -m "content: 发布 atlas 产品页"
git push origin main
```

Cloudflare Workers 静态资源按 `wrangler.jsonc` 构建并发布 `dist`；`sync-github.yml` 每天 UTC 02:00 只更新 `src/data/facts` 并直推 main，不会改你的内容文件。
