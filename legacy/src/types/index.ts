export interface Project {
  id: string;
  name: string;
  description: string;
  demoUrl: string;       // 演示地址
  repoUrl?: string;      // 仓库地址（可选）
  icon: string;
  category: ProjectCategory;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isPinned: boolean;
  viewCount: number;
  // GitHub 实时数据（前端缓存）
  githubStars?: number;
  githubForks?: number;
  githubLang?: string;
}

export type ProjectCategory =
  | 'tool'
  | 'library'
  | 'website'
  | 'api'
  | 'game'
  | 'other';

export interface CategoryInfo {
  id: ProjectCategory;
  name: string;
  icon: string;
  color: string;
}

export interface AdminCredentials {
  password: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 网站全局配置（存 KV key: "site_config"）
export interface SiteConfig {
  ownerName: string;
  ownerTitle: string;        // e.g. "全栈开发者 / 开源爱好者"
  ownerBio: string;
  location: string;
  githubUsername: string;    // 用于实时拉取数据
  email: string;
  twitterHandle?: string;
  availableForWork: boolean;
  heroTaglines: string[];    // 打字机文字列表
  footerText?: string;
}

// GitHub 聚合统计（Worker 缓存后返回）
export interface GithubStats {
  totalStars: number;
  totalForks: number;
  totalRepos: number;
  followers: number;
  languages: { name: string; bytes: number; color: string }[];
  updatedAt: string;
}

// 单仓库数据
export interface RepoStats {
  stars: number;
  forks: number;
  language: string | null;
  openIssues: number;
  updatedAt: string;
}
