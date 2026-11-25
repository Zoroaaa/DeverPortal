export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** 2026-11-10 → 2026.11.10（界面展示用） */
export function displayDate(date: Date): string {
  return formatDate(date).replaceAll('-', '.');
}

const platformLabels: Record<string, string> = {
  web: 'Web',
  desktop: 'Desktop',
  cli: 'CLI',
  'self-host': 'Self-host',
  cloudflare: 'Cloudflare',
};

export function platformText(platforms: readonly string[]): string {
  return platforms.map((platform) => platformLabels[platform] ?? platform).join(' / ');
}

/**
 * RSS 条目标题：产品名 + 版本 + 可读标题。
 * GitHub Release 的 name 常是「产品名 v1.2.3」，这里去掉重复部分，避免出现「Atlas v1.9.0 · Atlas v1.9.0」。
 */
export function releaseFeedTitle(productName: string, version: string, rawTitle: string): string {
  const base = `${productName} v${version}`;
  let title = (rawTitle ?? '').trim();
  if (!title) return base;
  if (title.toLowerCase().startsWith(productName.toLowerCase())) {
    title = title.slice(productName.length).replace(/^[\s·:：\-–—]+/, '').trim();
  }
  const bare = title.replace(/^v/i, '').trim();
  if (!bare || bare === version || /^v?\d+(\.\d+){0,2}$/.test(bare)) return base;
  return `${base} · ${title}`;
}
