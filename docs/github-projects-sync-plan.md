# GitHub 仓库 → 站内「我的项目」同步方案

> 状态：待拍板  
> 配套文档：[personal-site-refactor-plan.md](./personal-site-refactor-plan.md)（站点总体方案，本文只解决"仓库数据怎么进站"）  
> 事实基线：2026-11-10 通过 GitHub REST API 实际拉取 `Zoroaaa` 账号，**公开仓库 15 个，其中 fork 3 个**，star 0–143 不等
> 目标：用 GitHub 仓库数据自动维护项目卡片上的"客观事实"，同时保证策展与手写内容不被机器覆盖。

---

## 0. 结论摘要

| 项 | 结论 |
|---|---|
| 数据源 | GitHub REST API（JSON），构建期抓取；**站内无任何运行时 GitHub 请求** |
| 触发方式 | CI 每日定时 + 手动触发，同步结果走 PR，人工审 diff 后合并 |
| 产物 | `src/data/github/*.json` 快照进 Git；构建时只读，不联网、不依赖 token |
| 策展 | **显式白名单**（`src/data/curated.json`），一个仓库要进站必须被人写进去 |
| 覆盖机制 | **分文件、分字段所有权**：机器只写 `github/*.json` 的自动字段，人只写 `content/projects/*/index.mdx` 的手写字段；同名字段出现在错误一侧 → 构建失败 |
| 版本 | GitHub Releases > tags > 无；缺 release 不造假版本，页面显式显示"仅仓库代码" |
| README | **不自动导入**为使用手册，手册由人写进 docs 集合 |
| 降级 | 快照保留 + `stale` 标记；单个仓库 404 不炸构建；白名单新增但从未抓到 → 构建失败 |
| 工作量 | 5–7 人日（不含视觉） |
| 待拍板 | 5 项，见第 10 章 |

---

## 1. 目标与非目标

**目标**
1. 仓库的客观事实（语言、License、最近提交、Release 版本与日期）不用手抄，永远不会过期。
2. 一个仓库是否成为"作品"、怎么描述它，完全由人决定。
3. 机器同步失败不影响站点构建与上线。
4. 每次同步的变更可读、可回滚（diff 就是评审材料）。

**非目标**
- 不做 GitHub 数据的实时展示（不显示"当前 star 数"，只显示"同步时刻的 star 数"）。
- 不做按仓库自动生成作品页——没有手写内容就没有页面。
- 不引入运行时后端、不新增 KV/D1、不在浏览器里直连 GitHub API。
- 不把 star 数当核心指标；它只作为卡片上的次要佐证。

---

## 2. 为什么不能"自动全量收录"

对 `Zoroaaa` 账号实测的 15 个公开仓库：

| 类别 | 实例 | 能否直接当作品 |
|---|---|---|
| 真正的作品 | Atlas（90★）、it-toolbox（143★）、OmniBox（65★）、personal-blog（54★）、OSSshelf（8★）、cf-bestip（21★）、lingbeast、DeverPortal | 可以，但要人写定位与限制 |
| 个人资料仓库 | `Zoroaaa`（同名仓库，无语言、无描述） | 不能，它是 GitHub Profile 的特殊仓库 |
| fork 仓库 | edgetunnel、cloud-mail、WorkerVless2sub | 不能，不是自己的代码 |
| 工具/实验 | newspulse、node-aggregator、IpCheck（0–1★） | 视情况，需要人判断 |

也就是说：**15 个仓库里只有一半左右应该出现在"我的项目"里**。任何基于元数据的自动规则（fork=false、star≥x、有 description）都会既漏掉该有的、又带进不该有的——"是否值得展示"是编辑判断，不是数据属性。

结论：**策展必须是显式动作，不能是隐式推断。**

---

## 3. 数据源与配额

### 3.1 需要的接口

| 用途 | 接口 | 每次同步调用数 |
|---|---|---|
| 仓库清单与元数据 | `GET /users/{user}/repos?per_page=100&sort=pushed` | 1（15 个仓库一页够） |
| 版本 | `GET /repos/{owner}/{repo}/releases?per_page=20` | 1 / 仓库 |
| 无 release 时的标签 | `GET /repos/{owner}/{repo}/tags?per_page=20`（仅当 releases 为空） | ≤1 / 仓库 |
| 语言分布（可选） | `GET /repos/{owner}/{repo}/languages` | 0–1 / 仓库 |
| 最近提交（可选） | `GET /repos/{owner}/{repo}/commits?per_page=1` | 0–1 / 仓库 |

`list` 返回的 `pushed_at` 已能代表最近活跃时间，**默认不调 commits**，省配额。

### 3.2 配额

- 未认证：60 次/小时。白名单 9 个项目 ≈ 1 + 9×2 = **19 次/次同步**，单次跑完没问题，但一小时跑 3 次就危险。
- CI 里带 token：5,000 次/小时（fine-grained PAT 或 `GITHUB_TOKEN`），实际用量可忽略。
- 所有请求带 `If-None-Match`（ETag）与 `If-Modified-Since`，未变更返回 304 **不计入配额**——这让每日同步的实际消耗接近 0。
- 请求头固定：`User-Agent: deverportal-sync`、`Accept: application/vnd.github+json`、`X-GitHub-Api-Version: 2022-11-28`。
- 限流响应处理：见第 8 章。**绝不在限流时重试轰炸**，直接用上次快照。

---

## 4. 策展机制（核心）

### 4.1 三种可选

| 方案 | 做法 | 优点 | 缺点 |
|---|---|---|---|
| **A. 显式白名单** | 维护 `src/data/curated.json`，一个仓库一条 | 策展即代码，diff 可审；顺序、精选、slug 都能定；与仓库元数据解耦 | 新增作品要手写一条 |
| B. topic 约定 | 仓库打 `site-portfolio` topic 即收录 | 不用改站内文件 | 要跳到 GitHub 改设置，容易忘；topic 是公开信息，改名/被他人打标都会影响；无法表达顺序与 slug |
| C. 规则匹配 | fork=false & archived=false & star≥N | 零维护 | 实测会带进 0★ 实验仓库、漏掉值得展示的新项目；规则永远滞后于判断 |

### 4.2 推荐：A 白名单（+ 自动排除做安全网）

```jsonc
// src/data/curated.json
{
  "owner": "Zoroaaa",
  "items": [
    {
      "repo": "Atlas",              // GitHub 仓库名，改名时只改这里
      "slug": "atlas",              // 站内 URL 标识，一旦发布不再变
      "featured": true,
      "order": 10
    },
    { "repo": "it-toolbox", "slug": "it-toolbox", "featured": true, "order": 20 },
    { "repo": "OmniBox", "slug": "omnibox", "featured": true, "order": 30 }
  ]
}
```

理由：
1. **策展是编辑决策，应该留下编辑痕迹**——`curated.json` 的每一次变更就是一次"我决定把它作为作品展示"的记录。
2. **slug 与 repo 名解耦**：GitHub 改仓库名不会导致站内 URL 变化（URL 一旦发布就要长期可引用）。
3. 顺序、精选、是否展示默认由人排，不受 star 数波动影响。
4. 安全网：即使白名单里误加了 fork 或归档仓库，同步脚本也会拒绝并报错，而不是静默收录。
5. topic 方案（B）可以作为**辅助**：仓库描述里给个提示，但**不作为依据**——否则等于把策展权交给 GitHub 的仓库设置。

### 4.3 白名单不负责什么

不负责内容。白名单只回答"要不要展示、用什么 URL、排第几"，不提供任何文案。缺手写内容的条目 → 构建失败（见 5.3），不会生成空项目页。

---

## 5. 自动字段 vs 手写字段（关键设计）

### 5.1 两个文件，两套所有权

```text
src/content/projects/atlas/index.mdx     ← 人写，只有手写字段
src/data/github/atlas.json               ← 机器写，只有自动字段（文件头标注 GENERATED）
src/data/github/atlas.releases.json      ← 机器写，Release/tag 快照
```

| 自动（机器所有） | 手写（人所有） |
|---|---|
| `stars` / `forks` / `openIssues` | `name`（站内显示名，可与仓库名不同） |
| `language` / `license` | `tagline`（一句话定位） |
| `repoDescription` | `summary` |
| `createdAt` / `pushedAt` / `lastCommitAt` | `why`（为什么做） |
| `repoTopics` | `capabilities` / `boundaries`（能力边界） |
| `homepage`（仓库设置的站点） | `limitations`（已知限制，必填） |
| `archived` / `defaultBranch` | `links.demo` / `links.repo` 的展示文案 |
| `latestRelease`（版本号、日期、url） | `releases/*.mdx`（人工撰写的版本说明） |
| `releaseCount` / `tags` | `docs/**`（使用手册） |
| `readmeExcerpt`（可选，仅 fallback） | `screenshots`、`topics`（站内分类） |

### 5.2 合并机制：字段所有权，而不是"覆盖"

**不是"先同步再让手写覆盖"**——那种做法下，手写内容随时可能被同步任务写坏。这里的所有权是**物理隔离**的：

1. 同步脚本只允许写 `src/data/github/*.json`，**代码层面不打开 `src/content/**` 的写句柄**。
2. 构建期由 `src/lib/projects.ts` 读取两侧，投影成一个只读对象：

```ts
type ProjectView = {
  slug: string;
  // 手写区
  name: string; tagline: string; summary: string;
  why: string; limitations: string[];
  // 自动区（只读，不可在 mdx 里写）
  repo: { stars: number; language: string | null; license: string | null;
          pushedAt: string; archived: boolean; url: string };
  release: { version: string; date: string; url: string } | null;
  dataAsOf: string;   // 快照时间，页面显示"数据更新于 …"
  stale: boolean;
};
```

3. **冲突即错误**：如果有人在 `index.mdx` 里写了 `stars`/`language`/`pushedAt` 这类自动字段，`check-content` 直接失败并提示"该字段由同步脚本维护，请勿手写"。反向同理：同步脚本产出的 JSON 里出现 `tagline`/`limitations` 属于程序 bug，同样失败。
4. 自动字段的 schema 在 `content.config.ts` 中标记为只读来源，页面组件只从 `ProjectView` 取，不直接读 JSON。

这样"手写不被覆盖"不是靠约定，而是**结构上不可能发生**：机器没有写手写文件的路径，人没有写自动字段的入口。

### 5.3 缺手写内容怎么办

白名单里的仓库如果缺 `index.mdx`，或 `limitations` 为空（`live`/`beta`）：
- **构建失败**，报错指向 `curated.json` 的具体条目。
- 理由：宁可拦住一次发布，也不要上线一个"没写清楚是干什么的"项目页。这是本站唯一的硬门槛。
- 新增作品的正确顺序因此是：先在 `curated.json` 加一条 → 构建报错 → 照报错补 `index.mdx` → 通过。报错本身即引导。

---

## 6. Release 映射

### 6.1 三级优先

| 优先级 | 来源 | 使用条件 |
|---|---|---|
| 1 | 手写 `releases/*.mdx` | 文件存在时，该版本以手写为准 |
| 2 | GitHub Release（快照） | 手写未覆盖的版本，取 `name`/`tag_name`/`published_at`/`prerelease`/`html_url` |
| 3 | Git tag | 仓库无任何 Release 但打了 tag，生成"标签条目" |

合并逻辑：以 `version` 为键做并集；同版本手写优先，自动条目不渲染但保留链接。`prerelease: true` → `channel: 'beta'`。

### 6.2 自动条目的正文不导入

GitHub 自动生成的 release notes 通常是 "Full Changelog: …" 加一串 commit 链接，对读者无价值。因此：

- 自动条目**只显示**：版本号、日期、Release 链接、`beta` 标记。
- **不导入** release body。要说明"改了什么"，由人在 `releases/*.mdx` 里写 `summary` 与 `highlights`。
- 页面上一句话区分来源：`来自 GitHub Release` / `人手写`，避免读者误以为自动条目也是精心撰写的。

### 6.3 没有 Release 也没有 tag

- 版本区块**不渲染**，不显示 `v0.0.0` 之类的假版本。
- 产品页首屏的"最近版本"位置显示 `NO RELEASES`，hover 说明"仓库未发布版本，按 commit 维护"。
- 卡片上显示最近提交时间，而不是留空。
- `status: live` 但无 release 是合法的（例如持续部署的 Web 工具），与 `limitations` 必填无关。

### 6.4 归档仓库

`archived: true` → 同步脚本自动把该条目的状态建议为 `archived` 并输出提示；**状态字段仍由手写决定**，因为"停止维护"和"GitHub 归档"不一定同时发生。

---

## 7. README 与使用手册

**推荐：不自动导入 README。**

理由：
1. 受众不同。README 面向"来跑代码的人"（安装、构建、贡献），站内手册面向"来用产品的人"（怎么点、怎么配、报错怎么办）。
2. 稳定性不同。站内文档要求长期可引用；README 随时被改，一旦自动导入，历史链接的内容会漂移。
3. 质量不同。README 常含徽章、HTML、CI 状态图，直接进正文需要清洗，清洗规则本身就是新的维护负担。
4. 文档需要"适用版本"（已有 `appliesTo` 字段），README 没有这个概念。

替代做法：
- README **首段文字**可作为 `summary` 的 fallback **参考值**，写进 `github/*.json` 的 `readmeExcerpt`，只用于人在写 `summary` 时对照，**不上页面**。
- 需要"快速开始"时，人在 `docs/getting-started.mdx` 里写最短可用路径（3–5 步、可直接粘贴的命令），比 README 更短更准。
- 若确实想省事，可加一个 `npm run draft:docs -- <slug>` 把 README 转成**草稿文件输出到 `docs/drafts/`**，人工改写后再放进 `src/content/`。这是工具，不是自动发布。

---

## 8. 失败与降级

原则：**同步失败永远不阻断站点构建**；但"内容缺失"必须阻断。

| 场景 | 行为 | 页面表现 | 构建 |
|---|---|---|---|
| 网络失败 / DNS / 5xx | 保留上次快照，记 `stale: true` + `lastSyncError` | 正常展示，页脚小字"数据更新于 3 天前" | 通过 |
| 触发限流（403 + `X-RateLimit-Remaining: 0`） | 立即停止本次同步，不做重试；13 分钟后再跑也没意义 | 同上 | 通过 |
| 单个仓库 404（改名/删除/转私有） | 该条目标记 `missing: true`，不删除旧快照 | 卡片显示"仓库当前不可访问"，链接置灰不可点 | 通过 |
| 仓库改名 | 404 + 账号仓库列表里找不到旧名 → 报告"可能改名为 X"（靠 `id` 匹配，GitHub repo id 稳定） | 沿用旧快照 | 通过（提示人工改 `curated.json`） |
| 私有 → 公开 | 不会自动出现（白名单是显式的）；同步时输出"发现未收录的公开仓库：xxx" | 无变化 | 通过 |
| 公开 → 私有 | 同 404 处理 | 同上 | 通过 |
| 白名单条目在 GitHub 不存在且从未抓到过快照 | 无法生成任何页面 | — | **失败**（配置错误，必须修） |
| token 缺失或过期 | 降级为未认证（60/h），只同步前 3 个仓库，其余保留旧快照并标记 stale；CI 中视为失败 | 部分数据不新 | 通过 |
| API 字段缺失/改结构 | JSON 解析用可选字段 + 默认值，未知字段忽略 | 对应位置留空 | 通过 |
| 快照文件损坏 | 当作缺失处理 | 同"从未抓到" | 失败并指向文件 |

关键点：**快照进 Git**，所以"GitHub 挂了"与"构建机没网"都不会影响发布——构建只读本地 JSON。

---

## 9. 更新流程

### 9.1 触发

| 方式 | 用途 | 频率 |
|---|---|---|
| **CI 定时** | 日常保鲜 | 每日一次（建议 UTC 02:00，北京时间 10:00） |
| **手动触发** | 发版后立即更新 | 按需（`workflow_dispatch`） |
| 本地运行 | 调试与首次初始化 | 按需，`--dry-run` 打印 diff 不写文件 |

### 9.2 同步产物进 Git（推荐）

- 每个项目一份 JSON，diff 极小（通常只有 `pushedAt` 与几个数字），评审成本低。
- 好处：构建可复现、Pages 构建不依赖 GitHub 可用性、历史可回溯、可 `git revert`。
- 不进的代价：每次构建都要联网 + token 进构建环境，且第三方故障即发布故障。

### 9.3 CI 形态

```text
sync-github.yml
  on: schedule(每日) + workflow_dispatch
  steps:
    1. checkout
    2. node scripts/sync-github.mjs        # 读 curated.json，写 src/data/github/*.json
    3. 若无变更 → 结束（不产生空提交）
    4. 有变更 → 提交 → `git pull --rebase origin main` → 直接推送 main
    5. 推送失败即步骤失败，工作流标红，不会静默成功
```

不再有 PR 环节，也不需要 `pull-requests: write`。人工不需要介入；失败时看工作流日志。

- 变更判定只看真实内容：`fetchedAt` / `etag` / `readmeEtag` 由脚本在写入前剔除比较，内容没变就不重写文件，因此不会产生纯时间戳提交。
- token：优先 fine-grained PAT（`GH_SYNC_TOKEN`，只读 public repo 权限）；没有则用默认 `GITHUB_TOKEN`（限额较低，够用）。
- 仓库需放开 Actions 写权限（见下）。

---

## 10. 需要拍板

| # | 决策 | 推荐 | 代价 / 备选 |
|---|---|---|---|
| **G1** | 策展方式 | **显式白名单 `curated.json`** | 新增作品要手写一条配置；换来顺序、slug、精选完全可控。备选 topic 方案维护更省，但把策展权交给了 GitHub 设置 |
| **G2** | 同步产物是否进 Git | **进** | 仓库里多 9–18 个 JSON 文件；换来可复现构建、可回滚、构建不依赖网络 |
| **G3** | README 是否自动进手册 | **不自动** | 每个产品要人写一篇 getting-started；换来文档稳定、面向使用者、可长期引用 |
| **G4** | 同步触发方式 | **每日 CI + 手动，结果走 PR** | 版本更新最多延迟 24 小时；换来不会有机器人直接改主干 |
| **G5** | 缺手写内容时 | **构建失败（fail-closed）** | 新增仓库需要两步（加白名单 + 写内容）；换来永远没有"半成品"项目页 |

---

## 11. 落地结构（供实现时对照）

```text
src/
├── data/
│   ├── curated.json                 # 人维护：收录哪些、顺序、slug
│   └── github/
│       ├── atlas.json               # 机器生成：仓库事实
│       └── atlas.releases.json      # 机器生成：版本事实
├── content/projects/
│   └── atlas/index.mdx              # 人维护：定位、边界、限制
├── lib/projects.ts                  # 合并两侧 → ProjectView（唯一读取入口）
└── lib/github-snapshot.ts           # JSON 校验与 stale 计算
scripts/
└── sync-github.mjs                  # 同步脚本（--dry-run / --only <slug>）
.github/workflows/sync-github.yml    # 每日定时 + PR
```

需要新增的构建断言（并入现有 `check-content.mjs`）：
1. `curated.json` 每条都要有对应 `index.mdx`，否则失败。
2. `curated.json` 的 slug 唯一，且 `repo` 不重复。
3. `index.mdx` 出现自动字段名 → 失败。
4. `github/*.json` 出现手写字段名 → 失败。
5. 白名单条目若 `archived: true` 而手写 `status` 不是 `archived` → 警告（不失败）。

工作量：同步脚本与合并层 2–3 人日；release 映射 1–2 人日；CI 与 PR 流程 0.5–1 人日；卡片/详情页展示"数据更新于"与来源标注 1 人日。合计 5–7 人日，不含视觉调整。

---

## 12. 与你现有决定的关系

- 不影响"仓库即内容源"：手写内容依然在 Git 里，Markdown/MDX 依然是唯一事实源；GitHub 只提供**事实**，不提供**叙述**。
- 不影响"无运行时后端"：全站仍是静态输出，构建产物不依赖任何外部接口。
- 与作品展示定位一致：卡片展示语言、最近提交、最新版本；**不展示 star 排行榜、不展示 follower 数**，避免变成虚荣指标墙。
