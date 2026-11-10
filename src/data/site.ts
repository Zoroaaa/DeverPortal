// 站点身份常量，来源为旧站 DEFAULT_SITE_CONFIG。
// TODO: 邮箱与 GitHub 账号尚无真实值，下列字段为中性占位，上线前必须替换。
export const site = {
  ownerName: 'Zoro',
  role: '全栈开发者 / 开源爱好者',
  title: '作品与产品文档',
  tagline: '做工具，也写清楚每个工具的边界。',
  description: '个人作品站：产品介绍、使用手册与版本记录。每个作品都写清做到什么程度、已知限制与迭代过程。',
  url: 'https://neutronx.uk',
  location: 'Tokyo, JP',
  bio: '你好，我是 Zoro！一名热爱技术的全栈开发者。我喜欢创造各种实用的小工具，希望能通过这些工具帮助更多人提高效率、解决问题。',
  email: 'hello@example.com',
  emailHref: 'mailto:hello@example.com',
  githubUsername: 'your-github-handle',
  githubUrl: 'https://github.com/your-github-handle',
  rssHref: '/rss.xml',
} as const;

export interface NavItem {
  label: string;
  href: string;
  external?: boolean;
}

export const nav: NavItem[] = [
  { label: '产品', href: '/products' },
  { label: '文档', href: '/docs' },
  { label: '写作', href: '/writing' },
  { label: '关于', href: '/about' },
];

export const footerNav: NavItem[] = [
  { label: '产品', href: '/products' },
  { label: '文档', href: '/docs' },
  { label: '写作', href: '/writing' },
  { label: '更新日志', href: '/changelog' },
  { label: 'RSS', href: '/rss.xml' },
];

export const socials: NavItem[] = [
  { label: 'GitHub', href: 'https://github.com/your-github-handle', external: true },
  { label: 'Email', href: 'mailto:hello@example.com', external: true },
];
