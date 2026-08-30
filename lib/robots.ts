export interface RobotsData {
  disallow: string[];
  sitemaps: string[];
}

export function parseRobots(text: string): RobotsData {
  const disallow = new Set<string>();
  const sitemaps = new Set<string>();

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split('#')[0]?.trim() ?? '';
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (!value) continue;
    if (key === 'disallow') disallow.add(value);
    if (key === 'sitemap') sitemaps.add(value);
  }

  return { disallow: Array.from(disallow), sitemaps: Array.from(sitemaps) };
}
