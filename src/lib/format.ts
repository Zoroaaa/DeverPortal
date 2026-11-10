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
