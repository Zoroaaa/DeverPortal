# 🚀 Zoro's Developer Portal

> 一个现代化的个人开发者首页，展示实用工具和有趣项目

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.2-06B6D4?logo=tailwindcss)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages-F38020?logo=cloudflare)

## ✨ 特性

- 🎨 **动态粒子背景** - 鼠标跟随光效 + 流动渐变
- 🌈 **玻璃态设计** - 现代化 UI + 流畅动画
- 📦 **项目管理** - 支持增删改查、置顶、分类筛选
- 🔍 **智能搜索** - 按名称、描述、标签搜索
- 📱 **完全响应式** - 适配所有设备尺寸
- ⚡ **Cloudflare Pages** - 全球 CDN 加速部署
- 🔐 **管理面板** - 密码保护的后台管理

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| React 19 | 前端框架 |
| TypeScript | 类型安全 |
| Vite 6 | 构建工具 |
| Tailwind CSS 4 | 样式框架 |
| Framer Motion | 动画库 |
| Lucide React | 图标库 |
| Cloudflare Pages | 部署平台 |

## 📦 安装

```bash
# 克隆仓库
git clone https://github.com/Zoroaaa/zoro.git
cd zoro

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 🚀 部署

### Cloudflare Pages

1. Fork 本仓库
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
3. 进入 **Pages** → **Create a project** → **Connect to Git**
4. 选择你的 GitHub 仓库
5. 配置构建设置：
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
6. 点击 **Save and Deploy**

## 🔐 管理员

### 进入管理面板

1. 鼠标悬停在页面**右下角**的圆形按钮上
2. 点击弹出的 **"管理面板"** 选项
3. 输入管理员密码

### 默认密码

```
zoro2024
```

### 修改密码

编辑 `src/hooks/useAdminAuth.ts` 文件：

```typescript
const ADMIN_PASSWORD = 'zoro2024';  // 改成你的密码
```

## 📁 项目结构

```
zoro/
├── src/
│   ├── components/          # UI 组件
│   │   ├── ParticleBackground.tsx
│   │   ├── Header.tsx
│   │   ├── HeroSection.tsx
│   │   ├── ProjectCard.tsx
│   │   ├── ProjectsSection.tsx
│   │   ├── AboutSection.tsx
│   │   ├── Footer.tsx
│   │   ├── LoginModal.tsx
│   │   └── AdminPanel.tsx
│   ├── hooks/               # 自定义 Hooks
│   ├── types/               # TypeScript 类型
│   ├── constants/           # 常量配置
│   ├── App.tsx
│   └── main.tsx
├── functions/api/           # Cloudflare Functions
├── public/                  # 静态资源
└── wrangler.toml            # Cloudflare 配置
```

## 🎯 功能演示

### 项目管理
- ✅ 新增项目
- ✅ 编辑项目
- ✅ 删除项目
- ✅ 置顶项目
- ✅ 分类筛选
- ✅ 标签管理

### 交互效果
- ✅ 粒子背景动画
- ✅ 鼠标跟随光效
- ✅ 卡片悬浮效果
- ✅ 页面滚动动画
- ✅ 平滑过渡动画

## 📝 开发命令

```bash
# 开发模式
npm run dev

# 类型检查
npx tsc --noEmit

# 构建生产版本
npm run build

# 预览生产版本
npm run preview

# 代码检查
npm run lint
```

## 📄 License

MIT License © 2024 Zoro

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/Zoroaaa">Zoro</a>
</p>
