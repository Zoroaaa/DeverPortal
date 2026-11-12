// 站点身份常量，来源为旧站 DEFAULT_SITE_CONFIG。
// GitHub 账号取自仓库 owner；邮箱取仓库提交作者邮箱（已在公开提交记录中）。
export const site = {
  ownerName: 'Zoro',
  role: '全栈开发者 / 开源爱好者',
  title: '作品与产品文档',
  tagline: '做工具，也写清楚每个工具的边界。',
  description: '个人作品站：产品介绍、使用手册与版本记录。每个作品都写清做到什么程度、已知限制与迭代过程。',
  url: 'https://wort.uk',
  location: 'Tokyo, JP',
  bio: '你好，我是 Zoro！一名热爱技术的全栈开发者。我喜欢创造各种实用的小工具，希望能通过这些工具帮助更多人提高效率、解决问题。',
  email: '1121896694@qq.com',
  emailHref: 'mailto:1121896694@qq.com',
  githubUsername: 'Zoroaaa',
  githubUrl: 'https://github.com/Zoroaaa',
  rssHref: '/rss.xml',
} as const;

export interface NavItem {
  label: string;
  href: string;
}

export const nav: NavItem[] = [
  { label: '作品', href: '/products' },
  { label: '文档', href: '/docs' },
  { label: '写作', href: '/writing' },
  { label: '关于', href: '/about' },
];
