# Zoro's Developer Portal

> 一个现代化的个人开发者门户，展示项目作品集与实用工具

![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.2-06B6D4?logo=tailwindcss)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages-F38020?logo=cloudflare)

## 特性

https://github.com/user-attachments/assets/34f97409-56e5-4029-9b58-b66449bb5900

- **动态粒子背景** - 鼠标跟随光效 + 流动渐变
- **打字机效果** - Hero区域动态文字展示
- **GitHub实时统计** - 自动获取Stars、Forks、Repos、Followers
- **项目管理** - 支持增删改查、置顶、分类筛选、标签管理
- **智能搜索** - 按名称、描述、标签搜索
- **浏览计数** - 自动记录项目访问量
- **完全响应式** - 适配所有设备尺寸
- **Cloudflare KV** - 数据持久化存储
- **管理面板** - 密码保护的后台管理

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19.2 | 前端框架 |
| TypeScript | 5.9 | 类型安全 |
| Vite | 6.0 | 构建工具 |
| Tailwind CSS | 4.2 | 样式框架 |
| Framer Motion | 12.x | 动画库 |
| Lucide React | 0.577 | 图标库 |
| Cloudflare Pages | - | 部署平台 |
| Cloudflare KV | - | 数据存储 |

## 安装

```bash
git clone https://github.com/Zoroaaa/zoro.git
cd zoro

npm install

npm run dev
```

## 部署

### Cloudflare Pages

1. Fork 本仓库
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
3. 进入 **Pages** → **Create a project** → **Connect to Git**
4. 选择你的 GitHub 仓库
5. 配置构建设置：
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
6. 点击 **Save and Deploy**

### 配置 KV 命名空间

在 `wrangler.toml` 中配置 KV 命名空间：

```toml
name = "zoro"
compatibility_date = "2024-01-01"
pages_build_output_dir = "dist"

[[kv_namespaces]]
binding = "DB"
id = "your-kv-namespace-id"
```

### 可选：GitHub Token

在 `wrangler.toml` 中配置 GitHub Token 以提高 API 请求限制：

```toml
[vars]
GITHUB_TOKEN = "ghp_your_token_here"
```

## 管理员

### 进入管理面板

1. 鼠标悬停在页面**右下角**的设置按钮上
2. 点击弹出的 **"ADMIN"** 选项
3. 输入管理员密码

### 默认密码

```
zoro2024
```

### 修改密码

密码存储在 Cloudflare KV 中，首次使用默认密码登录后可通过管理面板修改。

## 项目结构

```
zoro/
├── src/
│   ├── components/              # UI 组件
│   │   ├── AboutSection.tsx     # 关于区域
│   │   ├── AdminPanel.tsx       # 管理面板
│   │   ├── Footer.tsx           # 页脚
│   │   ├── Header.tsx           # 导航栏
│   │   ├── HeroSection.tsx      # 首屏区域
│   │   ├── LoginModal.tsx       # 登录弹窗
│   │   ├── ParticleBackground.tsx # 粒子背景
│   │   ├── ProjectCard.tsx      # 项目卡片
│   │   ├── ProjectsSection.tsx  # 项目列表
│   │   └── index.ts             # 组件导出
│   ├── hooks/                   # 自定义 Hooks
│   │   ├── useAdminAuth.ts      # 管理员认证
│   │   ├── useGithubStats.ts    # GitHub统计
│   │   ├── useKVData.ts         # KV数据管理
│   │   ├── useLocalStorage.ts   # 本地存储
│   │   ├── useMousePosition.ts  # 鼠标位置
│   │   └── index.ts             # Hooks导出
│   ├── types/                   # TypeScript 类型
│   │   └── index.ts
│   ├── constants/               # 常量配置
│   │   └── index.ts
│   ├── App.tsx                  # 主应用
│   ├── App.css                  # 应用样式
│   ├── main.tsx                 # 入口文件
│   └── index.css                # 全局样式
├── functions/api/               # Cloudflare Functions
│   ├── auth.ts                  # 认证API
│   ├── config.ts                # 配置API
│   ├── github.ts                # GitHub代理API
│   ├── password.ts              # 密码管理API
│   ├── projects.ts              # 项目管理API
│   └── views.ts                 # 浏览计数API
├── public/                      # 静态资源
│   ├── favicon.svg
│   └── icons.svg
├── wrangler.toml                # Cloudflare 配置
├── vite.config.ts               # Vite 配置
├── tsconfig.json                # TypeScript 配置
├── eslint.config.js             # ESLint 配置
└── package.json                 # 项目配置
```

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/auth` | POST | 管理员登录认证 |
| `/api/config` | GET/POST | 站点配置管理 |
| `/api/github` | GET | GitHub统计数据代理 |
| `/api/password` | POST | 修改管理员密码 |
| `/api/projects` | GET/POST | 项目数据管理 |
| `/api/views` | POST | 项目浏览计数 |

## 功能演示

### 项目管理
- 新增项目
- 编辑项目
- 删除项目
- 置顶项目
- 分类筛选
- 标签管理

### 交互效果
- 粒子背景动画
- 鼠标跟随光效
- 打字机文字效果
- 卡片悬浮效果
- 页面滚动动画
- 平滑过渡动画

## 开发命令

```bash
npm run dev          # 开发模式
npm run build        # 构建生产版本
npm run preview      # 预览生产版本
npm run lint         # 代码检查
npx tsc --noEmit     # 类型检查
```

## License

[MIT](LICENSE) © 2024 Zoro

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/Zoroaaa">Zoro</a>
</p>
