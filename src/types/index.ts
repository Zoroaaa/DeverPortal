export interface Project {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  category: ProjectCategory;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isPinned: boolean;
  viewCount: number;
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
