// 结构化数据（JSON-LD）构造器：页面把对象传给 BaseLayout 统一输出。
import { site } from '../data/site';

type BreadcrumbItem = { label: string; href?: string };

export function breadcrumbJsonLd(items: BreadcrumbItem[], base: string | URL = site.url): Record<string, unknown> {
  const baseUrl = new URL(base);
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: new URL(item.href, baseUrl).href } : {}),
    })),
  };
}

export function softwareApplicationJsonLd(input: {
  name: string;
  description: string;
  url: string;
  repoUrl?: string | null;
  demoUrl?: string | null;
  datePublished?: Date;
  language?: string | null;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: input.name,
    description: input.description,
    url: input.url,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    author: { '@type': 'Person', name: site.ownerName, url: site.url },
    isAccessibleForFree: true,
    ...(input.repoUrl ? { codeRepository: input.repoUrl } : {}),
    ...(input.demoUrl ? { sameAs: input.demoUrl } : {}),
    ...(input.datePublished ? { datePublished: input.datePublished.toISOString().slice(0, 10) } : {}),
    ...(input.language ? { programmingLanguage: input.language } : {}),
  };
}

export function techArticleJsonLd(input: {
  title: string;
  description?: string;
  url: string;
  updatedAt: Date;
  productName: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: input.title,
    ...(input.description ? { description: input.description } : {}),
    url: input.url,
    dateModified: input.updatedAt.toISOString().slice(0, 10),
    author: { '@type': 'Person', name: site.ownerName, url: site.url },
    isPartOf: { '@type': 'WebSite', name: `${site.ownerName} · ${site.title}`, url: site.url },
    about: { '@type': 'SoftwareApplication', name: input.productName },
  };
}

export function blogPostingJsonLd(input: {
  title: string;
  description?: string;
  url: string;
  datePublished: Date;
  tags?: string[];
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: input.title,
    ...(input.description ? { description: input.description } : {}),
    url: input.url,
    datePublished: input.datePublished.toISOString().slice(0, 10),
    author: { '@type': 'Person', name: site.ownerName, url: site.url },
    ...(input.tags && input.tags.length > 0 ? { keywords: input.tags.join(', ') } : {}),
  };
}
