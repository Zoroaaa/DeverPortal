import type { CategoryInfo, Project, SiteConfig } from '../types';

export const CATEGORIES: CategoryInfo[] = [
  { id: 'tool',    name: '工具',  icon: 'Wrench',   color: 'from-amber-500 to-yellow-500' },
  { id: 'library', name: '库',    icon: 'Package',  color: 'from-emerald-500 to-teal-500' },
  { id: 'website', name: '网站',  icon: 'Globe',    color: 'from-blue-500 to-indigo-500' },
  { id: 'api',     name: 'API',   icon: 'Code',     color: 'from-orange-500 to-amber-500' },
  { id: 'game',    name: '游戏',  icon: 'Gamepad2', color: 'from-rose-500 to-pink-500' },
  { id: 'other',   name: '其他',  icon: 'Sparkles', color: 'from-violet-500 to-purple-500' },
];

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  ownerName: 'Zoro',
  ownerTitle: '全栈开发者 / 开源爱好者',
  ownerBio: '你好，我是 Zoro！一名热爱技术的全栈开发者。我喜欢创造各种实用的小工具，希望能通过这些工具帮助更多人提高效率、解决问题。',
  location: 'Tokyo, JP',
  githubUsername: 'zoro',
  email: 'zoro@example.com',
  twitterHandle: 'zoro',
  availableForWork: true,
  heroTaglines: ['全栈开发者', '开源爱好者', '工具制造者', 'Cloudflare Dev'],
  footerText: '全栈开发者，热爱创造各种实用工具。希望这些小工具能帮助到你！',
};

export const DEFAULT_PROJECTS: Project[] = [
  {
    id: '1',
    name: 'JSON 格式化工具',
    description: '在线 JSON 格式化、压缩、校验工具，支持语法高亮和错误提示',
    demoUrl: 'https://json.zoro.dev',
    repoUrl: 'https://github.com/zoro/json-formatter',
    icon: 'Braces',
    category: 'tool',
    tags: ['JSON', '开发工具', '在线工具'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPinned: true,
    viewCount: 1280,
  },
  {
    id: '2',
    name: '代码片段收藏',
    description: '收藏和管理常用代码片段，支持多种编程语言和语法高亮',
    demoUrl: 'https://snippets.zoro.dev',
    repoUrl: 'https://github.com/zoro/snippets',
    icon: 'Code2',
    category: 'tool',
    tags: ['代码片段', '收藏', '开发效率'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPinned: true,
    viewCount: 856,
  },
  {
    id: '3',
    name: 'Markdown 编辑器',
    description: '实时预览的 Markdown 编辑器，支持导出 PDF 和 HTML',
    demoUrl: 'https://md.zoro.dev',
    repoUrl: 'https://github.com/zoro/md-editor',
    icon: 'FileText',
    category: 'tool',
    tags: ['Markdown', '编辑器', '文档'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPinned: false,
    viewCount: 642,
  },
  {
    id: '4',
    name: '个人博客',
    description: '技术博客，分享开发经验和学习笔记',
    demoUrl: 'https://blog.zoro.dev',
    repoUrl: 'https://github.com/zoro/blog',
    icon: 'BookOpen',
    category: 'website',
    tags: ['博客', '技术分享', '学习'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPinned: true,
    viewCount: 2341,
  },
];

export const ADMIN_SESSION_KEY = 'zoro_admin_auth';
export const PROJECTS_STORAGE_KEY = 'zoro_projects';
export const CONFIG_STORAGE_KEY = 'zoro_site_config';
