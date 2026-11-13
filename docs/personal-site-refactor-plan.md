# DeverPortal 个人网站重构方案

> 状态：**已执行（2026-11-10）**——本文保留为总体方案与改造前审计记录。  
> 适用范围：`d:\user\DeverPortal`（线上 https://wort.uk/）  
> 站点定位：**作品展示型个人网站**——给"想了解我个人开发作品的人"看  
> 目标形态：作品集（Portfolio）+ 产品中心（Products / Docs / Releases / Writing）  
> 配套文档：[github-projects-sync-plan.md](./github-projects-sync-plan.md)（GitHub 仓库数据怎么进站，已实现）  
> **现状提示**：第 1、2 章是改造前的事实审计，不是当前状态；KV 导出已放弃，`/api/github` 运行时接口未保留，GitHub 数据改为构建期抓取 + 仓库内快照。

---

## 0. 结论摘要（先看这段）

| 项 | 结论 |
|---|---|
| 站点性质 | 作品展示站：产品是主角，介绍 / 版本记录 / 使用手册是核心资产；不是简历站，也不是获客站 |
| 改造前工程（历史） | React 19 + Vite 6 的**单页 SPA**，无路由；内容 100% 存在 Cloudflare KV，仓库内只有假数据 |
| 推荐架构 | **Astro 5（静态输出）+ 仓库内 MDX 内容集合 + 构建期 GitHub 快照 + Cloudflare Pages** |
| 实际实现 | 零客户端框架、零 Tailwind、零运行时接口；视觉为 B「工程蓝图」；构建不联网、不依赖 token |
| 内容来源 | 仓库即内容（Git 为唯一事实源），构建期 Zod 校验；不保留自建后台 |
| GitHub 数据 | `curated.json` 白名单 + `scripts/sync-github.ts` 抓公开 API → `src/data/facts/*.json` 快照进 Git；构建只读快照 |
| 保留的后端 | **无**。站点无运行时 API、无 KV/D1；只有 GitHub Actions 每日同步并开 PR |
| 工作量 | 工程 23–31 人日（含 15% 缓冲 26–36）；内容撰写另计 6–9 人日 |

**不做**（v1 明确排除，防止范围膨胀）：
- 与定位冲突的：转化漏斗、注册/登录引导、定价与销售页、营销落地页、简历式技能条/求职 CTA、AB 测试与转化埋点。
- 与定位无关的：用户系统、评论、站内 CMS 后台、**暗色主题**（v1 只做明亮，见第 6 章）、多语言全量翻译、实时数据看板、搜索服务端。
- 视觉上不做：白底灰字的通用模板、圆角+柔和阴影的 SaaS 卡片堆、深色主题切换。

---

## 1. 事实审计

### 1.1 工程与依赖事实

| 事实 | 证据 |
|---|---|
| 构建链：`tsc -b && vite build`，输出 `dist` | `package.json` |
| 依赖：React 19.2.4、Vite ^6、Tailwind ^4.2.1、framer-motion ^12.36、lucide-react ^0.577 | `package.json` |
| Tailwind 已安装但几乎未使用，样式以**内联 style + CSS 变量**为主 | `src/components/*.tsx`、`src/index.css` |
| 无路由库、无 History API 调用 | 全仓 grep `react-router|wouter|pushState` 无结果 |
| 无 lockfile，且 `package-lock.json` 被 `.gitignore` 忽略；`.npmrc` 设 `legacy-peer-deps=true` | `.gitignore`、`.npmrc`、git log（3 次"移除 package-lock"提交） |
| 无测试、无 CI 配置 | 仓库无 `.github/`、无 test 脚本 |
| `functions/` 不在 `tsconfig.app.json` 的 `include`（仅 `src`），也无 `@cloudflare/workers-types` | `tsconfig.app.json` |
| 生产构建开启 `sourcemap: true` | `vite.config.ts` |
| 源码规模：31 个文件、约 190 KB；其中 `AdminPanel.tsx` 单文件 615 行 | 统计 |

### 1.2 运行与部署事实

| 事实 | 证据 |
|---|---|
| Cloudflare **Pages** 部署，`pages_build_output_dir = "dist"`，Functions 目录为 `functions/` | `wrangler.toml` |
| KV 绑定名 `DB`，命名空间 id 硬编码在仓库 | `wrangler.toml` |
| 接口共 6 个：`/api/auth`、`/api/config`、`/api/github`、`/api/password`、`/api/projects`、`/api/views` | `functions/api/*.ts` |
| 本地开发用 `vite`，Functions 本地**不运行**；此时前端走 localStorage + 硬编码密码兜底 | `package.json`、`useKVData.ts`、`useAdminAuth.ts` |
| 所有接口 `Access-Control-Allow-Origin: *` | 各 `functions/api/*.ts` |
| 无 `_routes.json`、无 404 页面（Pages SPA fallback 会返回 200 空壳） | 目录结构 |

### 1.3 内容与数据事实

| 事实 | 证据 |
|---|---|
| 内容存 KV：`projects`（数组）、`site_config`（对象）、`admin_token`、`admin_password` | `functions/api/*.ts` |
| 仓库内 `DEFAULT_PROJECTS` 只有 4 条占位数据，`ownerName = Zoro`、`email = zoro@example.com` | `src/constants/index.ts` |
| 线上真实项目（codesdeek / FileConverter / OmniBox / it-toolbox / cf-bestip / personal-blog 等）**仅存在于 KV** | `demo.png` 与实际站点截图 |
| `Project` 字段：`id/name/description/demoUrl/repoUrl/icon/category/tags/createdAt/updatedAt/isPinned/viewCount` | `src/types/index.ts` |
| 无 `slug`、无长描述、无截图集、无版本、无文档关联 | 同上 |
| 保存语义是**整表覆盖**（POST 整个数组），无版本号/乐观锁 | `useKVData.ts`、`projects.ts` |
| 浏览计数：前端先改本地再 `saveProjects`，同时又匿名 POST `/api/views`，两条链路各加 1 | `App.tsx#L48-L63`、`functions/api/views.ts` |
| `/api/views` 每次请求都从 KV 读整个 `projects` 数组再写回 | `functions/api/views.ts` |
| 认证：密码明文存 KV；无密码时回退 `zoro2024`；token 为 KV 中**唯一一个** `admin_token` 键（24h） | `functions/api/auth.ts` |
| 前端也硬编码 `zoro2024` 与 `local-dev-token` 兜底 | `useAdminAuth.ts#L33-L37` |
| README 公开默认密码 `zoro2024` | `README.md#L95-L99` |

### 1.4 资产盘点（改造前，历史）

**可复用（保留并改造）**
- 版式骨架：超大标题 + 1px 发丝线 + 等宽小标签 + 角标的结构化排版习惯（`src/index.css`、`demo.png`）。**配色（暗金）与整体气质不再沿用**，见第 6 章。
- 组件视觉实现：`Header`、`HeroSection`、`AboutSection`、`Footer`、`ProjectCard`、`ProjectsSection` 的布局与文案结构。
- 部署链路：Cloudflare Pages 静态托管（**Functions 已删除**，不保留运行时接口）。
- 静态资源：`public/favicon.svg`、`public/icons.svg`。

**负债（删除或重写）**
- 全部后台体系：`AdminPanel`、`LoginModal`、`useAdminAuth`、`useKVData`，以及 `auth/password/projects/config/views` 五个接口。
- 死代码/无效实现：`ParticleBackground`（空实现返回 `null`）、`useLocalStorage`（无引用）、`useMousePosition`（无引用）、`App.css`（空文件）。
- 内容层假数据：`DEFAULT_PROJECTS`、`DEFAULT_SITE_CONFIG`（迁移完成后删除）。
- 工程负债：Google Fonts `@import`、`import * as Icons`、生产 sourcemap、缺失 lockfile、README 失实。

---

## 2. 现状问题 → 影响 → 处理方式

按严重度排序。P0 = 会丢数据或可直接被利用；P1 = 阻碍目标形态；P2 = 工程质量与体验。

| # | 问题（事实） | 影响 | 处理方式 | 级别 |
|---|---|---|---|---|
| 1 | 内容只存在 KV，仓库无真实内容 | 换框架/改代码即等于删站；无历史、无 diff、无法回滚 | **已终止 KV 迁移**：旧内容不导出、不迁移；改为按 `src/data/curated.json` 白名单从 GitHub 公开 API 重建项目事实，手写定位与限制重新撰写。旧代码保留 `legacy-spa` tag 可回退 | 已关闭 |
| 2 | 默认密码 `zoro2024` 硬编码在 Worker + 前端 + README | 任何人可登录后台并整表覆盖内容 | 删除整套后台与认证接口；改密接口一并删除；README 重写 | P0 |
| 3 | `/api/views` 匿名 POST，对 `projects` 整表读改写 | 可无限刷量；并发写入会互相覆盖、可能回退/丢项目 | 删除计数功能与接口；如需数据用 Cloudflare Web Analytics | P0 |
| 4 | `CORS: *` + 全量覆盖写入 | 任意站点可代发写请求（配合泄露 token） | 随后台一起下线；保留的接口限定方法与来源 | P0 |
| 5 | 单页 SPA、无路由、首屏 HTML 为空 | 产品详情/文档/更新日志无处承载；搜索引擎与分享卡片拿不到内容 | Astro 文件路由 + 静态生成，每页输出完整 HTML | P1 |
| 6 | 内容模型只有"名字+一句话+链接" | 无法表达版本、手册、截图、适用版本等产品中心必需信息 | 新内容模型：产品/发布/文档/文章，Zod 构建期校验 | P1 |
| 7 | 本地 `vite` 不跑 Functions，且前端硬编码兜底密码 | 本地看到的成功是假的，线上才暴露问题 | 静态站开发不依赖接口；GitHub 岛做失败降级 | P1 |
| 8 | 无 i18n 基础设施，中英混排硬编码 | 后续做英文站需重写全部文案与路由 | v1 单语 zh-CN，内容 schema 预留 `lang`，路由预留 `/en/` | P1 |
| 9 | 无 lockfile + `legacy-peer-deps` | 构建不可复现，CI 与本地可能装出不同依赖 | 提交 lockfile、改 `npm ci`、移除 `legacy-peer-deps` | P1 |
| 10 | `import * as Icons from 'lucide-react'`（ProjectCard/AdminPanel） | 整图标库进入 bundle，首屏明显变慢 | 建立图标注册表，只 import 用到的图标 | P1 |
| 11 | Google Fonts 用 CSS `@import` 引入三套字体 | 阻塞首屏渲染；国内不可达；隐私合规问题 | 拉丁字体自托管子集 + 中文走系统字体栈 | P1 |
| 12 | 视觉可访问性：`div onClick` 当卡片、图标按钮无 `aria-label`、无 `focus-visible`、`onMouseEnter` 改内联样式、未处理 `prefers-reduced-motion` | 键盘与读屏不可用；动效引发眩晕 | 语义化 `<a>/<button>`、焦点环、动效降级、aria 标注 | P1 |
| 13 | `--text-dim #4a4840` 在 `#0a0a0b` 上对比度约 2.1:1 | 元信息与正文低于 WCAG AA（4.5:1），阅读困难 | 重定 token，正文 ≥ 4.5:1，大字 ≥ 3:1 | P1 |
| 14 | 无 SEO 基建：单份静态 meta、无 OG、无 canonical、无 sitemap/robots、无结构化数据；`theme-color` 与实际配色不符 | 搜索结果与社交分享表现差 | Astro SEO 组件 + `@astrojs/sitemap` + JSON-LD + RSS | P1 |
| 15 | 无 404 处理（SPA fallback 返回 200 空壳） | 软 404 污染索引 | 静态 `404.astro` + `_routes` 正确回 404 | P2 |
| 16 | 无 CI/测试/preview | 重构回归只能手工发现 | GitHub Actions：typecheck + lint + build + 链接与体积检查；PR 预览部署 | P2 |
| 17 | `functions/` 不参与类型检查 | Worker 线上错误只能靠 500 发现 | 保留的接口改为 Astro endpoint（同一 tsconfig 内类型检查） | P2 |
| 18 | 生产 sourcemap 直接随 `dist` 公开 | 源码泄露、产物体积变大 | 关闭；如需错误监控单独上传 | P2 |
| 19 | 每张卡片各自调用 `useRepoStats` → N+1 请求 | 首页请求数随项目数线性增长 | GitHub 数据集中一次取，或构建期取；岛内共享缓存 | P2 |
| 20 | README 描述与实际不符（粒子背景、管理面板、目录树、默认密码） | 误导后续开发与外部访问者 | 重写 README，只描述真实架构与内容维护流程 | P2 |
| 21 | `demo.png` 600 KB 入库、无图片优化 | 仓库与带宽负担 | 移到 `docs/assets/` 并压缩，站点图片走 Astro assets 优化 | P2 |
| 22 | 导航/页脚信息架构只有"项目/关于" | 无法组织产品、文档、写作 | 新 IA（第 3 章） | P1 |

---

## 3. 目标定位与信息架构

### 3.1 定位：作品展示，不是简历，也不是获客

读者是**想了解我个人开发作品的人**。他们不一定会用这个工具，也不一定在招人；他们要回答的是四个问题：这是什么、做到什么程度、怎么用、迭代了什么。

三个检验标准（后续所有 IA 与内容决策都用它衡量）：

1. 陌生人能否在 30 秒内说出每个作品是做什么的。
2. 不看源码，能否判断完成度（状态、版本节奏、已知限制）。
3. 能否在站内找到用法与变更，并且每个结论都有可长期引用的 URL。

**明确不做的事（与定位直接冲突）：**

- 不是简历站：不做技能进度条、任职时间线、求职入口、"下载简历"按钮；`/about` 只交代背景、在做的事与联系方式。
- 不是获客/营销站：不做注册、试用申请、定价、销售页、客户案例墙、转化漏斗与 CTA 运营；外部 demo/repo 直接链接即可。
- 不做数据吹嘘：GitHub Stars/粉丝数只作为作品佐证出现在次要位置，不占据首屏，不作为核心指标。

四类读者意图与对应入口：

| 读者意图 | 想知道 | 入口 |
|---|---|---|
| 第一次来 | 这人做过什么、哪个值得点开 | 首页作品索引、`/products` |
| 对某个作品感兴趣 | 它解决什么、做到什么程度、有什么限制 | `/products/[slug]` |
| 想上手使用 | 怎么装、怎么配、怎么排错 | `/docs/[product]/...` |
| 关注进展 | 最近改了什么、是否还在维护 | `/changelog`、`/products/[slug]/releases` |

### 3.2 路由与页面树

```text
/                                 首页
├── /products                     产品中心（全部产品，含 lab/archived）
│   └── /products/[slug]          产品详情
│       └── /products/[slug]/releases   该产品版本历史
├── /changelog                    全站更新流（跨产品聚合）
├── /docs/[product]/[...page]     使用手册与文档
├── /writing                      写作列表
│   └── /writing/[slug]           文章详情
├── /about                        关于（含联系方式锚点 #contact）
├── /404                          未找到
├── /rss.xml                      订阅
└── /sitemap-index.xml            站点地图
```

**取舍（及理由）**
1. **作品集与产品中心合并为一个实体**：现有 6 个项目既是作品也是产品，分开会产生两套重复维护的卡片。实验性项目用 `status: lab` 表达，仍可被 `/products` 检索，但不进首页精选。
2. **文档从属于产品**（`/docs/[product]/...`），不做全站通用文档区：避免第二套导航与"文档属于谁"的歧义。
3. **更新日志双入口、单数据源**：产品页看单产品历史，`/changelog` 看全站流水，均来自同一 `releases` 集合，不重复录入。
4. **写作与发布记录分开**：文章是叙述性长文（`posts`），发布记录是结构化版本条目（`releases`），混流会让两者都变差。
5. **不建独立 `/contact` 页**：信息量不足一页，联系方式放 `/about#contact` 与页脚；不做表单即不做线索收集。
6. **不建 Skills / Resume 页**：简历内容与"看懂作品"无直接关系，且会与 `/about` 重复。
7. **不建订阅邮件/试用申请**：唯一的订阅手段是 RSS——它服务"关注进展"，不收集线索。

### 3.3 产品详情页的信息骨架（核心模板）

这是全站最重要的页面，顺序按"看不懂 → 看懂"组织，而不是按营销逻辑：

1. **首屏**：产品名、`tagline`、`status`、最近版本与日期、平台、`demo`/`repo` 外链。
2. **它是什么**：`summary` + 封面/截图（1 张主图 + 可选画廊）。
3. **为什么做**：要解决的具体问题与场景（正文）。
4. **能力与边界**：能做什么、明确不做什么。
5. **实现要点**：技术栈与关键取舍（可折叠，服务"做到什么程度"）。
6. **现状与已知限制**：必填段落，写清楚不完善之处、已知问题、停止维护的原因（若有）。
7. **快速开始**：指向文档首篇，给出最短可用路径。
8. **版本记录**：最近 3 条 release + "查看全部"。
9. **相关文章**（可选）。

硬性要求：首屏必须同时出现"一句话定位 + 状态 + 最近更新"，不允许把这三项藏到折叠区。

### 3.4 首页：作品索引的封面

1. **Hero**：姓名 + 一句话说明做什么类型的作品 + 当前在做的作品（链到该产品）。
2. **作品索引**：精选 4–6 个（`featured` + `order`），卡片必须含 `status` 与最近版本。
3. **最近更新**：跨产品 release 5 条，点击进入对应产品版本历史。
4. **近期文章** 2–3 篇。
5. **关于条**：两句话 + 联系方式链接 + 页脚。

首页不放：统计数字墙、客户/合作 logo、价格表、"立即开始"类按钮。它不是营销页，是目录。

GitHub 数据降级为项目卡片与产品页右侧规格表的次要事实（star / 语言 / license / 最近提交），不占据首屏与 LCP；不展示全站聚合 star 数。

### 3.5 可检索与可引用

产品、文档、版本记录是长期资产，因此"找得到"和"引得了"是硬要求：

- 站内搜索暂不做（内容量不足，且会引入额外索引产物）；内容规模上来后再接 Pagefind（仍是构建期索引）。
- 每个产品、每篇文档、每条 release 都有稳定 URL，可被外部直接引用；release 锚点形如 `/products/omnibox/releases#omnibox-1.2.0`。
- 产品列表暂为静态全量列表（不引入客户端筛选）；条目增多后再评估纯 CSS 或轻量岛方案。
- 不做登录、收藏、评论——检索与引用不需要账号。

### 3.6 导航

- 桌面：`Products / Docs / Writing / About`；右侧仅一个轻量外链（GitHub），不设营销按钮。
- 文档页使用独立 `DocsLayout`：左侧产品文档目录、右侧页内 TOC、顶部面包屑。
- 移动端：`md` 以下折叠为抽屉；文档目录变抽屉，正文单列。
- 页脚：产品、文档、写作、更新日志、RSS、社交、版权。

---

## 4. 内容模型

### 4.1 实体与关系

```text
Product 1 ──< Release        （版本历史）
       1 ──< DocPage        （使用手册）
       1 ──< Post (optional)（相关文章 / 案例）
```

- **Product**：产品身份的唯一定义（名称、定位、状态、链接、截图、技术栈、已知限制）。它是站点的主角，其余实体都围绕它组织。
- **Release**：不可变的版本事件，带 semver 与日期，聚合为 changelog。回答"迭代了什么"。
- **DocPage**：面向使用者的操作说明，按 `section + order` 组成目录树。回答"怎么用"。
- **Post**：叙述性内容（随笔、笔记、案例），可挂到某个产品。服务"怎么做的"，但不替代产品详情。

内容优先级：产品详情 > 版本记录 > 使用手册 > 文章。首页只做索引，不承载长文。

### 4.2 目录结构（内容与代码同仓）

```text
src/content/
├── products/
│   └── omnibox/
│       ├── index.mdx              # 产品定义 + 详情正文
│       ├── cover.webp
│       ├── releases/
│       │   ├── 1.2.0.mdx
│       │   └── 1.1.0.mdx
│       └── docs/
│           ├── getting-started.mdx
│           ├── configuration.mdx
│           └── faq.mdx
└── posts/
    ├── why-i-build-small-tools.mdx
    └── cloudflare-kv-lessons.mdx
```

产品目录名即 slug（`omnibox` → `/products/omnibox`）；发布与文档的归属由**目录位置**决定，不由 frontmatter 决定，避免手写 slug 不一致。

`slug` 与 GitHub 仓库名解耦：对应关系写在 `src/data/curated.json`（如 `OmniBox → omnibox`），仓库改名不影响站内 URL。自动字段（star / 语言 / license / 版本 / 日期）不进 frontmatter，由 `src/data/facts/*.json` 快照提供。

### 4.3 Schema（构建期强校验）

```ts
// src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

export const products = defineCollection({
  loader: glob({ pattern: '*/index.mdx', base: './src/content/products' }),
  schema: z.object({
    name: z.string(),
    tagline: z.string().max(80),          // 卡片标题下的一句话
    summary: z.string().max(160),         // 列表/SEO 摘要
    status: z.enum(['live', 'beta', 'lab', 'archived']),
    draft: z.boolean().default(false),    // true 时不出现在列表/详情/RSS/sitemap
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
    limitations: z.array(z.string()).default([]), // 已知限制，服务"做到什么程度"
    seo: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      ogImage: z.string().optional(),
    }).optional(),
  }),
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
  }),
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
  }),
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
  }),
});
```

### 4.4 关系与一致性校验（自写脚本，构建时执行）

`src/lib/content-graph.ts` 负责以下断言，任一失败即**构建失败**（不允许带病上线）：

- 每个 `release` 的父目录必须存在于 `products`。
- 同一产品下 `version` 不得重复。
- 文档路径中的 product 必须存在；`section + order` 不得冲突。
- `post.product` 若存在，必须指向真实产品。
- 产品 `links.demo` 若声明 `status: live`，必须非空。
- `status` 为 `live` / `beta` 的产品，`limitations` 至少 1 条（迫使写清边界，避免把作品写成广告）。
- `featured: true` 的产品数量 ≤ 6（首页布局约束）。
- 文档引用的 `appliesTo` 版本区间必须与该产品已发布的版本有交集。
- `curated.json` 的每个条目必须有 `index.mdx` 与 GitHub 快照；已发布产品必须出现在白名单里。
- 手写 frontmatter 出现自动字段（star / language / license / pushedAt 等）→ 失败；快照出现手写字段 → 失败。
- `draft: true` 的产品及其 release / docs 不参与上述发布断言，也不进入任何页面、RSS、sitemap。

### 4.5 内容来源与发布流程

| 环节 | 做法 |
|---|---|
| 事实源 | Git 仓库（`src/content/**`） |
| 编辑 | 本地 `npm run dev` 预览 → 改 MDX → 提交 PR |
| 校验 | CI：`astro check` + 构建 + 关系断言 + 死链检查 |
| 预览 | 每个 PR 自动生成 Cloudflare Pages 预览 URL |
| 发布 | 合并 `main` → 自动构建 → 生产 |
| 回滚 | Pages 控制台回滚到上一部署，或 revert 提交（内容与代码同一提交历史） |
| 维护者 | 你本人。若未来交给他人编辑，接 **Keystatic（Git-based CMS）**，而不是重建一套 KV 后台 |

不选外部 CMS（Sanity/Contentful/Notion）的理由：单人站点，内容量在百篇量级，外部 CMS 带来账号、额度、构建钩子、降级路径四类运维成本，换来的"网页编辑"能力用 Git PR 已能覆盖。若出现"手机端改文案"的硬需求，再评估。

### 4.6 KV → 内容迁移映射（已放弃，仅留档）

> 决策：不导出、不迁移 KV。旧内容（含浏览量与后台密码）不再进入新站；项目事实改为从 GitHub 公开 API 抓取。下表只用于解释为什么旧字段没有对应到新模型。

| 旧字段（KV `projects[]`） | 新归属 | 说明 |
|---|---|---|
| `id` | 目录名 `slug` | 需人工取可读英文 slug（旧 id 是随机串） |
| `name` | `product.name` | 直接迁移 |
| `description` | `tagline` + `summary` | 拆成一句话标题与列表摘要 |
| `demoUrl` | `links.demo` | 直接迁移 |
| `repoUrl` | `links.repo` | 直接迁移 |
| `icon` | 产品标识 | 弃用 lucide 动态名；改为产品首字母或本地 SVG |
| `category` | `topics` / `platforms` | `tool/library/website/api/game/other` 里的平台语义上移 |
| `tags` | `topics` | 直接迁移 |
| `createdAt` | `startedAt` | 直接迁移 |
| `updatedAt` | 由 release 最新日期推导 | 不再手写 |
| `isPinned` | `featured` | 直接映射 |
| `viewCount` | 丢弃 | 无产品价值，且是数据完整性风险源 |
| `githubStars/Forks` | 丢弃 | 由 GitHub 代理实时/构建期获取 |

`site_config` → 迁到 `src/data/site.ts` 的类型化常量（姓名、标题、简介、社交、邮箱、状态）。它是站点身份，变动频率极低，不值得进数据库。

---

## 5. 技术选型与架构

### 5.1 选型结论

**Astro 5 静态输出 + 仓库内 MDX 内容集合 + Cloudflare Pages。实际未使用 React islands，也未引入 Tailwind。**

| 备选 | 不选的原因 |
|---|---|
| 维持现有 SPA + 加路由 | SEO 与首屏问题依旧；文档站需要静态 HTML；仍要自建内容层 |
| React Router 7 框架模式（prerender） | 可行，但内容集合、MDX、文档目录、搜索、sitemap 都要自行拼装；生态收益低于 Astro |
| Next.js + OpenNext on Cloudflare | 引入 Node 运行时假设与适配层；RSC/ISR 对本场景无收益，运维面最大 |
| 纯手写 Vite SSG | 等于自己实现 Astro 的内容层，长期维护成本最高 |

选择 Astro 的具体理由：
- 内容型站点 90% 是静态文本，静态生成把渲染成本从"每位访客"移到"每次构建"。
- Content Collections + Zod 直接解决"内容模型 + 构建期校验"，这正是当前最缺的。
- MDX 原生支持文档与长文，Shiki 代码高亮开箱可用。
- 页面用 `.astro` 组件即可覆盖全部需求，**没有引入客户端框架**；少一层运行时，首屏 JS 为零。
- 样式用原生 CSS + 语义 token（`src/styles/tokens.css`），没有 Tailwind 构建层。
- 输出纯静态目录，Cloudflare Pages 部署方式不变；**`functions/` 已删除，不保留函数运行时**。

### 5.2 架构图

```text
                 PR / push main                   每日 02:00 UTC（或手动）
GitHub ─────────────────────────────► GitHub Actions ──────────────► scripts/sync-github.ts
        │                               │ astro check                    │ GitHub REST API（公开数据）
        │                               │ 内容断言 / 快照校验             ▼
        │                               ▼                          src/data/facts/*.json
        │                          astro build → dist/                   │
        │                               │                               │ 变更开 PR，人工合并
        │                               ▼                               │
        │                     Cloudflare Pages（纯静态） ◄───────────────┘
        │                               │
        └── 访客 ──── HTML/CSS ─────────┘

内容事实源：src/content/**（手写） + src/data/facts/**（自动快照）
运行时数据库 / 接口：无
构建期网络依赖：无（只读仓库内快照，不需要 token）
```

### 5.3 渲染与数据加载

| 数据 | 加载时机 | 方式 |
|---|---|---|
| 产品 / 发布 / 文档 / 文章 | 构建期 | `getCollection()`，页面直接输出 HTML |
| 产品列表筛选 | 不做客户端筛选 | 静态列表；条目增多时再评估纯 CSS/`<details>` 方案 |
| 文档目录 / TOC / 上下篇 | 构建期 | 由集合排序生成 |
| 站内搜索 | 暂不做 | 内容达到一定规模后接 Pagefind（仍是构建期索引） |
| 产品自动字段（star / 语言 / license / 版本 / 日期） | 构建期 | 读 `src/data/facts/*.json` 快照，与手写 MDX 合并；**运行时不请求 GitHub** |
| 阅读量 / 浏览量 | 不做 | 需要时用 Cloudflare Web Analytics（无 cookie） |

### 5.4 运行时接口（已取消）

**没有运行时接口。** 原 `/api/github` 代理随 `functions/` 一起删除；GitHub 数据在构建期由 `scripts/sync-github.ts` 抓取并落快照，站点只读本地 JSON。详见 [github-projects-sync-plan.md](./github-projects-sync-plan.md)。

### 5.5 多语言

v1 只做 zh-CN。理由：单人维护，双语意味着每篇文档与每次发布都要写两遍；当前读者以中文为主。但保留升级路径：

- 内容 schema 已有 `lang` 字段。
- 路由按 `/{lang}/...` 预留，默认语言不带前缀。
- 未来加英文时，只翻译 `products` 的 `tagline/summary` 与 `docs` 正文，不需改架构。

代价评估：若上线后再加英文，约 2–3 人日工程 + 翻译工作量；若现在双语，工程 +2 人日但内容维护成本长期翻倍。推荐前者。

---

## 6. 设计系统与视觉（明亮基调）

### 6.1 已定约束（不再讨论）

D5 已改为**明亮基调 + 要求有冲击力与记忆点**，并明确排除"白底灰字 + 圆角卡片 + 柔和阴影"的通用模板。由此得到 6 条不可协商的约束，任何候选方向都必须满足：

| # | 约束 | 原因 |
|---|---|---|
| 1 | 只有一套主题，v1 不做亮暗切换 | 两套主题 = 两倍对比度与视觉回归维护；语义 token 先行，暗色留作 v2 增量 |
| 2 | 正文对比度 ≥ 7:1，次要文本 ≥ 4.5:1 | 明亮底上"弱化色"极易跌破 4.5；这是深色改浅色最常见的翻车点 |
| 3 | 强调色 ≤ 1 主 + 1 辅（色块方向放宽到 4，但必须一色一义） | 颜色一多就廉价；记忆点应来自结构与尺度，而不是堆颜色 |
| 4 | 文档/长文区必须有"降噪模式" | 主视觉装饰进入正文会毁掉可读性，而手册是本站核心资产 |
| 5 | 没有产品截图时版面也成立 | 仓库当前 0 张产品截图；视觉不能依赖图，只能靠排版、编号、几何 |
| 6 | 首屏 CSS ≤ 25KB gzip、字体 ≤ 2 族 latin 子集、无大图 | 第 7.4 节性能预算是硬指标 |

### 6.2 三个候选方向（已选定 B）

> 2026-11-10 决策：选 **B 工程蓝图**。A 与 C 仅留样张备查，不再做兼容分支。

三个方向都做成了**可直接双击打开**的真实首页样张，用站内真实产品（codesdeek / OmniBox / it-toolbox / FileConverter / cf-bestip / personal-blog / DeverPortal）填充，代码在 `docs/visual-drafts/`。**对照页入口：[index.html](file:///d:/user/DeverPortal/docs/visual-drafts/index.html)**（含主张、适用气质、代价与维度打分，两分钟可选定）。

| 文件 | 方向 | 视觉主张 | 记忆点 | 主要代价 |
|---|---|---|---|---|
| [a-printed-paper.html](file:///d:/user/DeverPortal/docs/visual-drafts/a-printed-paper.html) | A 纸本印刷（Editorial） | 把网页当一本高端印刷刊物：纸白底、超大字、严格栅格、单色印刷红 | 撑满视口的巨型标题 + 编号列表式作品索引，hover 整行反色 | 信息密度低；产品变多后列表很长（必须有筛选）；靠字体与留白撑场，离开大标题就显得素 |
| [b-blueprint.html](file:///d:/user/DeverPortal/docs/visual-drafts/b-blueprint.html) | B 工程蓝图（Blueprint） | 网站是一份产品图纸：米色纸、细蓝网格、图号/规格表/标注线 | 每件作品是一张"FIG."图纸，页脚有图纸信息栏（SHEET/REV/SCALE） | 实现与维护成本最高；装饰多易吵；文档区必须能"关掉蓝图"，否则干扰阅读 |
| [c-hard-edge.html](file:///d:/user/DeverPortal/docs/visual-drafts/c-hard-edge.html) | C 硬边色块（Neo-brutalist） | 每个作品占据一块高饱和色卡，黑色硬边、无圆角、偏移实心阴影 | 一作品一色 + 相互作用时卡片抬起、硬阴影加深 | 长文与文档阅读疲劳；色彩纪律一松就变廉价；气质偏"玩"，会削弱工程严肃感；色块卡塞不下截图 |

**推荐：B 工程蓝图。** 理由：它与"开发者作品 + 使用手册 + 版本记录"的定位同构（图纸 ↔ 说明书），记忆点来自页面结构而不是贴上去的装饰，换成文档页仍然成立；代价是实现成本（我承担）与文档区需降噪（已在 6.8 给出规则）。

次选 A：最耐看、最省维护、扩展性最好，但气质偏"设计工作室作品集"，与你"做工具"的身份略有错位。C 只有在你要"强品牌、敢冒险"时才选——它最抓眼，也最容易三年后看起来过时。

选定后本节的其余内容（tokens 值、字体族、组件具体形态）按方向补齐。

### 6.3 Design Tokens（语义名先定，值待方向冻结）

```css
/* src/styles/tokens.css —— 组件只允许引用语义 token，禁止直接写 hex */
:root {
  /* 底色层级 */
  --bg:          ;  /* 页面底：纸白，不用纯 #fff（眩光） */
  --bg-sunken:   ;  /* 次级区块 */
  --surface:     ;  /* 卡片/面板 */
  --line:        ;  /* 1px 分隔，alpha 建议 12–18% */
  --line-strong: ;

  /* 文本 */
  --ink:         ;  /* 正文，对比度 ≥ 7:1 */
  --ink-muted:   ;  /* 次要，≥ 4.5:1 */
  --ink-faint:   ;  /* 元信息，≥ 4.5:1，仅 ≥14px 或等宽大写 */
  --ink-inverse: ;  /* 反色块上的文字 */

  /* 强调（一主一辅；方向 C 才启用 --sig-*） */
  --accent:      ;
  --accent-ink:  ;  /* 强调底上的文字色 */
  --sig-1: ; --sig-2: ; --sig-3: ; --sig-4: ;

  /* 状态（亮底重新取色，不复用深色版） */
  --status-live: ; --status-beta: ; --status-lab: ; --status-archived: ;
  --danger: ;

  /* 排版 */
  --font-display: ;  /* 1 族，拉丁自托管子集 */
  --font-body: 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
  --font-mono: ;     /* 1 族，仅标签/编号/版本号/代码 */

  /* 尺度与节奏 */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-6: 24px; --space-8: 32px; --space-12: 48px; --space-16: 64px; --space-24: 96px;
  --w-content: 1200px; --w-prose: 68ch; --w-docs: 1320px;

  /* 动效 */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --dur-fast: 150ms; --dur-base: 220ms;
}
```

### 6.4 字体策略

- 两族封顶：1 个 display（拉丁自托管 `woff2` 子集，`font-display: swap`，只 preload 首屏字重）+ 1 个 mono（用于标签、编号、版本号、代码）。
- 中文**不引入 Web 字体**，走系统栈。理由：完整中文子集动辄数 MB，对首屏是灾难；系统黑体在目标平台足够。代价是跨平台字重略有差异——大标题用 800/900 时需在 Windows 上实测，必要时把字距调到 `-0.02em` 以内避免糊字。
- 移除现有 Google Fonts `@import`，全部改本地 `@font-face`。

### 6.5 排版与布局

- 首页 Hero 是唯一允许"超大"的地方：`clamp(44px, 8.5vw, 124px)` / 行高 `0.9` / 字距 `-0.04em`。这是冲击力的主要来源，必须一次给足。
- 内页 `h1 clamp(2rem, 4vw, 3.25rem)`，`h2 clamp(1.5rem, 2.6vw, 2.25rem)`，`h3 1.25rem`；不要让内页标题继承 Hero 尺度。
- 正文 16px / 1.7；文档正文 17px / 1.8 / 最大 `--w-prose`（约 68 字符）。
- 栅格：内容 1200px；文档三栏（目录 240 / 正文自适应 / TOC 200），`lg` 以下单栏 + 抽屉。
- 断点 `sm 640 / md 768 / lg 1024 / xl 1280`，移动优先；样张里的横向列表在 `md` 以下必须重排为块（不能横向滚动正文）。
- 表格：文档内表格允许横向滚动，不压缩字号。

### 6.6 组件清单（需实现并统一状态）

| 组件 | 关键状态 |
|---|---|
| `Button`（primary/ghost/icon） | hover / active / focus-visible / disabled / loading |
| `ProductCard` / `ProductIndexRow` | 默认 / hover / lab / archived（方向 A 用行，B/C 用卡） |
| `ProductMeta` | 状态 + 最近版本 + 平台（首屏三要素，永不折叠） |
| `LimitationsList` | 已知限制（详情页必填区块） |
| `StatusPill` | live / beta / lab / archived（色 + 文案，亮底专用色） |
| `Tag` | 静态 / 可点击（筛选） |
| `SectionHeader` | 编号 + 标题 + 描述 + 发丝线 |
| `SpecRow` | 键值对（方向 B 的规格表基础单元） |
| `ReleaseItem` | stable / beta / breaking |
| `Timeline` | 聚合 changelog |
| `Prose` | 文档与文章正文（标题、列表、引用、代码、表格、图片） |
| `Callout` | info / warn / danger |
| `CodeBlock` | Shiki 高亮 + 复制按钮 + 文件名标签 |
| `Breadcrumb` / `TOC` / `DocsNav` | 当前项高亮、滚动跟随 |
| `EmptyState` | 空搜索 / 无内容 |
| `Skeleton` | 仅 GitHub 岛使用，固定高度避免 CLS |

### 6.7 动效与响应式

- 入场：`opacity + translateY(12px)`，180–260ms，`--ease-out`；同屏不超过 3 个延迟序列。
- 卡片 hover：A/B 只改底色与描边；C 允许 `translate(-4px,-4px)` + 硬阴影加深。位移与阴影属方向性 token，写入设计规范，避免各页各写一套。
- 跑马灯/滚动字幕仅在 A 出现，`prefers-reduced-motion: reduce` 时停止动画并静态展示首屏可见部分。
- 移动端禁止 hover-only 信息（现有"悬停才出现的 ADMIN"这类交互彻底删除）。

### 6.8 明亮版可读性红线

1. 大面积背景不用纯白，用纸白（如 `#F6F3EC` / `#F1EEE4`）降低眩光。
2. 弱化文本不得低于 `--ink-faint`（在纸白上约 6:1）；"看起来更雅"的浅灰是明亮主题第一大坑。
3. 强调色不用于 ≤14px 常规正文，只用于链接、当前项、状态与装饰块。
4. 层级用 1px 线与底色差表达，不用柔和阴影；硬阴影仅方向 C，且必须有明确交互反馈含义。
5. 高饱和色块面积 ≤ 视口 30%，且不承载正文。
6. 主视觉装饰（网格、刻度、标注、跑马灯）一律不得进入 `Prose`：文档区降级为纯纸底 + 文字层级。

### 6.9 主题

v1 只有明亮一套。tokens 全部语义化，`html[data-theme]` 预留但不实现切换入口；若 v2 要加暗色，只新增一组值，不改组件。**不提供跟随系统的自动切换**——那等于把两套主题都维护起来。

---

## 7. 工程与质量

### 7.1 目标目录结构

```text
/
├── astro.config.mjs
├── package.json
├── package-lock.json                # 必须提交
├── public/
│   ├── favicon.svg
│   └── robots.txt
├── src/
│   ├── content.config.ts
│   ├── content/                     # 见 4.2：手写内容，唯一内容事实源
│   ├── data/
│   │   ├── site.ts                  # 站点身份、导航、社交
│   │   ├── curated.json             # 人维护的 GitHub 白名单（repo ↔ slug 解耦）
│   │   └── github/                  # 机器生成快照，构建只读
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   ├── MarketingLayout.astro
│   │   └── DocsLayout.astro
│   ├── components/
│   │   ├── ui/                      # Button/Tag/Callout/Prose...
│   │   ├── site/                    # Header/Footer/Hero/SectionHeader
│   │   ├── product/                 # ProductCard/StatusPill/Gallery/Meta
│   │   ├── release/                 # ReleaseItem/Timeline
│   │   └── docs/                    # DocsNav/TOC/Breadcrumb/Pager
│   ├── lib/
│   │   ├── seo.ts
│   │   ├── content-graph.ts         # 关系断言 + 草稿过滤
│   │   ├── projects.ts              # 手写 + 快照合并、字段所有权校验
│   │   └── format.ts
│   ├── pages/                       # 见 3.2
│   └── styles/
│       ├── tokens.css
│       ├── base.css
│       └── prose.css
├── docs/
│   ├── personal-site-refactor-plan.md
│   ├── github-projects-sync-plan.md
│   ├── content-guide/               # 录入说明 + 模板
│   └── visual-drafts/
├── .github/workflows/sync-github.yml
└── scripts/
    ├── sync-github.ts              # GitHub 公开 API → 快照
    ├── scaffold-projects.mjs        # 生成草稿 MDX 骨架
    └── check-content.mjs            # 构建前内容与快照校验
```

### 7.2 状态与数据层

- 不引入全局状态库，也没有客户端框架；页面全部在构建期渲染成 HTML。
- 自动字段（star / 语言 / license / 版本 / 日期 / 链接）来自 `src/data/facts/*.json` 快照，手写字段来自 `src/content/**`；两侧物理隔离，同名冲突即构建失败。
- **运行时不请求 GitHub**；快照由 GitHub Actions 每日同步，变更走 PR，人工合并后部署。
- 删除 `useKVData` 的"本地缓存优先 + 后台覆盖"逻辑：KV 不再参与任何读写。

### 7.3 SEO 与元信息

- `BaseLayout` 接收 `title / description / canonical / ogImage / type`，标题模板 `%s · Zoro`。
- 每页唯一 `h1`；产品页 `h1` 为产品名；文档页 `h1` 为文档标题。
- Open Graph + Twitter Card；默认 OG 图 `public/og-default.png`，产品可用 `cover` 生成。
- JSON-LD：首页 `Person`，产品页 `SoftwareApplication`，文档页 `TechArticle`，文章页 `BlogPosting`，面包屑 `BreadcrumbList`。
- `@astrojs/sitemap` 生成 sitemap；`robots.txt` 指向 sitemap；`/rss.xml` 聚合文章与发布。
- 301 映射：`/#projects → /products`、`/#about → /about`、`/#hero → /`；旧站无深链，迁移风险低。
- `lang="zh-CN"`，`theme-color` 为 `#F1EEE4`（纸底）。

### 7.4 性能预算（CI 强制）

| 指标 | 上限 |
|---|---|
| 单页 JS（gzip） | 目标 0 KB；若未来引入交互岛，上限 80 KB |
| 单页 CSS（gzip） | ≤ 30 KB |
| 字体总量 | ≤ 120 KB（仅拉丁子集） |
| LCP（移动 4G） | ≤ 2.0 s |
| CLS | ≤ 0.05 |
| INP | ≤ 200 ms |
| Lighthouse | Performance / A11y / SEO / Best Practices ≥ 95 |

实现手段：零 JS 页面；图片用 Astro `<Image>` 输出 `webp` + 显式宽高；图标本地 SVG；CI 中跑 `lighthouse-ci` 与体积检查（`scripts/check-size.mjs`）。

### 7.5 可访问性

- 所有可点击元素为 `<a>` 或 `<button>`；禁止 `div onClick`。
- 图标按钮必须有 `aria-label`；装饰图标 `aria-hidden`。
- 全局 `:focus-visible` 焦点环（2px `--gold` + 2px offset），不得 `outline: none`。
- 颜色对比度：正文 ≥ 4.5:1，大字 ≥ 3:1；状态不只靠颜色（`StatusPill` 带文案）。
- `prefers-reduced-motion` 关闭打字机与入场位移。
- 跳过导航链接（skip link）；文档页 TOC 可用键盘操作。
- 表单/搜索有可见 label 或 `aria-label`。

### 7.6 构建、部署与 CI

```text
GitHub Actions（PR）
  1. npm ci
  2. astro check（含 .astro/.ts 类型检查）
  3. 关系断言 + 死链检查
  4. astro build
  5. Lighthouse CI + 体积预算
  6. wrangler pages deploy dist --branch=pr-<n>（预览）

GitHub Actions（main 合并）
  同上 1–5 → wrangler pages deploy dist --branch=main（生产）
```

- `GITHUB_TOKEN` 等敏感值走 Cloudflare Pages Secrets / GitHub Secrets，不入库。
- 回滚：Pages 控制台一键回滚到上一部署（秒级），或 revert 内容提交后重新构建。
- 移除 `.gitignore` 中的 `package-lock.json`；删除 `.npmrc` 的 `legacy-peer-deps`（升级依赖时若仍有 peer 冲突，单独解决而不是全局放宽）。
- 生产构建关闭 sourcemap。

### 7.7 错误处理

| 场景 | 策略 |
|---|---|
| 内容 schema 不合法 / 关系断裂 | 构建失败，错误信息指明文件与字段 |
| 未知路由 | 静态 `404.astro`，HTTP 404 |
| GitHub API 超时/限流 | 同步脚本中止并保留上次快照，标记 `stale`；构建只读快照，不受影响 |
| 图片缺失 | 构建期报错（引用的 `src` 必须存在） |
| 搜索无结果 | `EmptyState`，给出清除筛选入口 |
| 外部链接失效 | CI 死链检查告警（非阻断），每月复查 |

---

## 8. 迁移与实施路线

### 8.1 阶段总览

| 阶段 | 目标 | 产出 | 验收标准 | 依赖 | 人日 |
|---|---|---|---|---|---|
| **M0 内容保全（已终止）** | ~~先把线上 KV 数据拿到手~~ | 决策改为不迁移：旧内容不导出；旧代码已打 `legacy-spa` tag | 不适用（KV 导出被放弃） | 无 | 0 |
| **M1 基座与内容管线** | 新站点能构建、能预览 | Astro 工程、tokens、content 集合、CI、Pages 预览 | `npm run build` 通过；改一篇 MDX 能在预览环境看到；schema 错误能让构建失败 | 无 | 3–4 |
| **M2 信息架构与模板** | 主要页面可访问 | 首页、产品列表/详情、changelog、about、404、导航页脚 | 5 个主路由静态 HTML 完整；移动端无横向滚动；Lighthouse ≥ 90 | M1 | 7–9 |
| **M3 产品中心深度** | 文档、版本、写作可用 | DocsLayout + 目录/TOC、releases 页、writing 列表/详情、RSS | 文档可从产品页进入；changelog 聚合正确 | M2 | 6–8 |
| **M4 设计与质量收口** | 产品级观感与指标达标 | 组件状态补齐、a11y 修复、SEO/OG/JSON-LD、性能预算 | 第 7 章全部预算达标；对比度与键盘走查通过 | M2 起并行 | 4–6 |
| **M5 切换与下线** | 新站上线，旧债清除 | 301、生产分支切换、删除旧后台代码、README 重写 | 生产域名全部路由 200/301 正确；无 KV 绑定、无运行时接口 | M3、M4 | 1.5–2.5 |
| **合计** | | | | | **22.5–31** |

含 15% 缓冲：**26–36 人日**。内容撰写（每个产品的"为什么做 / 能力边界 / 已知限制"、每产品 3–5 篇文档、发布记录补录）另计 **6–9 人日**，不计入工程。这部分是作品展示站的真实成本，不能省。

### 8.2 各阶段执行清单

**M0（已终止，不再执行）**

> 决策变更：KV 导出不执行、不迁移、不等待 wrangler 登录。旧后台密码、浏览量等数据不进入新站。
> 旧代码仍打了 `legacy-spa` tag 可回退；`scripts/migrate-kv.mjs`、`backup/`、KV 绑定与 `functions/` 均已删除。
> 项目事实改为 GitHub 公开 API 抓取，见 [github-projects-sync-plan.md](./github-projects-sync-plan.md)。

**M1**
- `npm create astro@latest`（minimal + TypeScript strict），加 `@astrojs/mdx`、`@astrojs/sitemap`；**不引入 React、不引入 Tailwind**。
- 迁移 `tokens.css`，删除 Google Fonts `@import`，落地本地字体。
- 写 `content.config.ts`，产品内容先保持空库；空集合必须能构建。
- 配 GitHub Actions 与 Pages 预览项目。
- 验收：故意写错一个必填字段，构建必须失败并指出文件。

**M2**
- `BaseLayout` / `MarketingLayout`；`Header`、`Footer`（纯 Astro，无客户端 JS）。
- 首页五模块；`/products` 静态列表；`/products/[slug]` 详情；`/changelog`；`/about`；`404`。
- 产品内容由 `curated.json` + 草稿骨架起步，手写文案补齐后才发布。
- 验收：直接访问任意深链（非首页）能拿到完整 HTML 与正确 `<title>`。

**M3**
- `DocsLayout`：目录树、TOC、上一篇/下一篇、面包屑、代码高亮、Callout。
- `/products/[slug]/releases`、`/changelog` 聚合、`/writing`、`/rss.xml`；release 三级合并（手写 > GitHub Release > tag）。
- 验收：新增一条 release，changelog 与产品页同时出现，排序正确。

**M4**
- 组件状态补齐（hover/focus/disabled）；对比度与键盘走查；`prefers-reduced-motion`。
- SEO 组件、OG 图、JSON-LD、sitemap、robots、301。
- 图片优化与预加载策略；Lighthouse CI 接入。
- 验收：第 7.4 节所有预算在 CI 中为通过状态。

**M5**
- 在 Cloudflare 配置 301（`_redirects` 或 Pages 规则）。
- 生产分支指向新构建；保留旧部署 30 天可回滚。
- 后台组件、hooks、`functions/`、`wrangler.toml`、KV 绑定均已删除，无需二次清理。
- 重写 README（架构、内容维护流程、部署流程），删除默认密码与 KV 说明。
- 验收：旧接口全部 404；`/`、`/products`、`/about` 正常；RSS 与 sitemap 可用。

### 8.3 旧代码处置清单（历史记录，已执行）

| 文件/目录 | 处置 | 原因 |
|---|---|---|
| `src/App.tsx` | 删除 | 由 `pages/` 路由取代 |
| `src/components/AdminPanel.tsx` | 删除 | 后台整体下线 |
| `src/components/LoginModal.tsx` | 删除 | 同上 |
| `src/hooks/useAdminAuth.ts` | 删除 | 同上 |
| `src/hooks/useKVData.ts` | 删除 | 内容改构建期 |
| `src/hooks/useLocalStorage.ts` | 删除 | 无引用 |
| `src/hooks/useMousePosition.ts` | 删除 | 无引用 |
| `src/components/ParticleBackground.tsx` | 删除 | 空实现 |
| `src/App.css` | 删除 | 空文件 |
| `src/constants/index.ts` | 迁移后删除 | `DEFAULT_*` 假数据；分类并入内容 schema |
| `src/types/index.ts` | 重写 | 新模型由 Zod 推导 |
| `src/components/Header.tsx` | 改造 | 新导航 + 移动端岛 |
| `src/components/HeroSection.tsx` | 改造 | 去 GitHub 主视觉，打字机降级 |
| `src/components/AboutSection.tsx` | 改造 → `pages/about` | 内容改为 MDX |
| `src/components/Footer.tsx` | 改造 | 新导航与新链接 |
| `src/components/ProjectCard.tsx` | 改造 → `ProductCard` | 新字段与状态 |
| `src/components/ProjectsSection.tsx` | 改造 → 筛选岛 | 逻辑保留，渲染改静态 |
| `src/hooks/useGithubStats.ts` | 删除 | GitHub 统计改为构建期读快照，不再有运行时请求 |
| `src/index.css` | 拆分 | 拆为 `tokens.css` / `base.css` / `prose.css` |
| `functions/` | 已删除 | 不保留任何运行时接口；GitHub 数据走同步脚本 |
| `wrangler.toml` | 已删除 | 无 KV、无 Functions，Pages 直接托管 `dist/` |
| `.gitignore` | 修改 | 取消忽略 lockfile |
| `.npmrc` | 删除 | 不再全局放宽 peer 依赖 |
| `README.md` | 重写 | 与实现对齐 |
| `demo.png` | 移到 `docs/assets/` | 仓库根目录减负；压缩 |
| `public/favicon.svg`、`icons.svg` | 保留 | 品牌资源 |

### 8.4 风险与应对

| 风险 | 触发信号 | 应对 | 回滚 |
|---|---|---|---|
| KV 内容丢失/导错 | — | 已关闭：不再导出/迁移 KV | 旧代码 tag `legacy-spa` |
| Astro 与 Cloudflare Pages 兼容 | 预览环境构建失败 | 纯静态输出，无 Functions 依赖；PR 预览验证 | 回退上一部署 |
| 文档量估算不足 | M3 中期文档篇数超预期 | 先保证"每产品 3 篇"，其余按需补；文档不阻塞上线 | 降级为"快速开始 + FAQ"两篇 |
| 字体/图片拖慢 LCP | Lighthouse < 90 | 中文不引 Web 字体；图片全部 `webp` + 宽高；首图 preload | 去掉非关键字体字重 |
| GitHub API 限流 | 同步脚本报 403、快照被标记 stale | token + ETag 条件请求；失败保留旧快照，构建不读网络 | 手动触发或次日自动重试 |
| 设计回归（观感变平） | M4 走查发现层级弱 | 以 B 蓝图 tokens 为基准做走查；保留发丝线/图号/大字标题 | 逐区块对比修正 |
| 范围膨胀（想加功能） | 出现用户系统/评论/主题切换需求 | 一律进 backlog，不进 v1 | 不适用 |

### 8.5 关键决策点（时间顺序）

1. **已完成**：第 10 章 D1–D5 均已拍板（MDX / Astro / 全删后台 / 单语 / B 蓝图）。
2. **已完成**：Astro 静态构建与 Pages 部署验证；`functions/` 不保留。
3. **M2 结束**：产品 slug 与 URL 方案定稿（含 301 映射），之后不再改。
4. **M3 中期**：文档范围定稿（每产品最少篇目）。
5. **已完成**：KV 不导出、不下线等待；`legacy-spa` tag 保留可回退。

---

## 9. 上线验收清单

- [ ] 所有一级/二级路由直接访问返回 200，且 HTML 内含完整正文与唯一 `<h1>`。
- [ ] 未知路径返回 404 状态码，而非 200 空壳。
- [ ] `/products/[slug]`、`/products/[slug]/releases`、`/docs/[product]/...` 三者的数据一致（同源）。
- [ ] 产品详情首屏同时可见"一句话定位 + 状态 + 最近版本与日期"。
- [ ] 每个 `live` / `beta` 产品都有"现状与已知限制"段落，且至少 1 条。
- [ ] 全站无注册/定价/试用/营销 CTA，无简历式技能条与求职入口。
- [ ] 草稿（`draft: true`）不出现在列表、详情、RSS 与 sitemap 中。
- [ ] RSS 与 sitemap 可访问且条目正确。
- [ ] OG 卡片在至少两个平台预览正常。
- [ ] Lighthouse 移动端四项 ≥ 95；JS/CSS/字体体积在预算内。
- [ ] 键盘 Tab 可走完导航、文档目录；焦点可见。
- [ ] 正文与元信息对比度达标。
- [ ] `prefers-reduced-motion` 下无位移动画。
- [ ] 无 `/api/*` 运行时接口；无 KV 绑定；`legacy-spa` tag 存在。
- [ ] 白名单条目都有快照；同步失败时页面显示 stale 且构建仍通过。
- [ ] README 无默认密码、无失实描述。
- [ ] 一次内容发布（新增 release + 一篇文章）能在 10 分钟内从提交走到线上。

---

## 10. 关键决策（已全部拍板）

以下 5 项决定工作量与维护方式，已于 2026-11-10 定稿。

### D1. 内容源：仓库内 MDX（已选）

**结论：仓库内 MDX，Git 为唯一事实源。**
理由：内容可 review、可回滚、构建期校验；单人维护，改内容本来就是改文件；同时消灭整表覆盖与匿名写入两个数据风险。代价是改内容需要提交代码——对你本人不构成负担。

### D2. 框架：Astro 静态生成（已选）

**结论：Astro 5 静态输出，不引入 React islands、不引入 Tailwind。**
理由：90% 内容是静态文本，静态生成直接解决 SEO 与首屏；Content Collections + Zod 正好补上当前最缺的内容校验；页面用 `.astro` 即可，运行时 JS 为零；Cloudflare Pages 部署方式不变。

### D3. 后台与浏览计数：全部下线（已选）

**结论：后台、认证、浏览计数全部删除。**
理由：浏览计数对产品决策无价值，却是当前唯一可被匿名写入的数据路径；后台是安全面最大、复用价值最低的模块（615 行，仅服务一个人）。删除后 KV 可整体下线，运维面归零。

若你确实想要访问数据，用 Cloudflare Web Analytics（无 cookie、无前端 JS 依赖、无写入接口）。

### D4. 语言：先 zh-CN 单语、schema 预留（已选）

**结论：先单语，预留 `/en/` 与 `lang` 字段。**
理由：双语会让每篇文档、每次发布都写两遍，长期维护成本翻倍；而你的读者以中文为主。预留结构后，未来加英文是纯增量工作（约 2–3 人日工程 + 翻译）。首发双语只在"明确要面向英文读者"时成立。

### D5. 视觉：B 工程蓝图（已选并落地）

**结论：B 工程蓝图。**
已冻结 tokens（纸底 `#F1EEE4` / 墨 `#14202E` / 蓝图蓝 `#1E4C8A`，24 + 120px 网格，零圆角，FIG. 图号），并已落到全部页面。A/C 样张只留档，不做兼容分支。

---

## 11. 附录

### A. GitHub 同步脚本职责（`scripts/sync-github.ts` / `scripts/scaffold-projects.mjs`）

> 原 `scripts/migrate-kv.mjs` 已随 KV 方案一起删除，职责由下面两个脚本取代。

`sync-github.ts`
1. 只读 `src/data/curated.json` 与 `src/data/facts/*.json` 旧快照。
2. 调 GitHub 公开 REST API 拉仓库事实、Release / tag、README 首段；带 ETag 条件请求。
3. 只写 `src/data/facts/*.json`，**不碰 `src/content/**`**。
4. 失败/限流时保留旧快照并标 `stale`；`--dry-run` 只打印变更。
5. 输出同步报告（写入、未变化、stale、404、未收录仓库），供 CI PR 描述使用。

`scaffold-projects.mjs`
1. 为白名单里缺内容的仓库生成 `src/content/products/<slug>/index.mdx` 草稿。
2. 只填空缺，不覆盖已有文件；已有非草稿内容时拒绝写入。
3. 手写字段全部是显式 TODO，`draft: true`；`startedAt` 取仓库创建时间这一真实值。
4. 生成后由人补全 TODO 并把 `draft` 改为 `false` 才发布。

### B. URL 迁移映射

| 旧地址 | 新地址 | 类型 |
|---|---|---|
| `/` | `/` | 200 |
| `/#hero` | `/` | 301 |
| `/#projects` | `/products` | 301 |
| `/#about` | `/about` | 301 |
| 其他（不存在深链） | `/products` | 301 |

### C. 内容撰写最小集（上线门槛）

- 每个在线产品：`tagline`、`summary`、`limitations`（`live`/`beta` 必填）；`links.demo` 或仓库链接（仓库链接缺失时用快照里的真实仓库地址）。
- 每个产品详情正文：必须包含"为什么做""能力与边界""现状与已知限制"三段；封面可选，不强制截图。
- 每个 `live` 产品：文档 ≥ 2 篇（快速开始 + FAQ）。
- 每条 release：`version`、`date`、`title`、`summary`、≥1 条 `highlights`。
- 文章：≥3 篇（用于验证列表、详情、RSS 链路）。
