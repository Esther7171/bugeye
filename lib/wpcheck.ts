import { buildCveLinks, type CveLink } from '@/lib/cve';

export interface WpComponentHit {
  slug: string;
  version: string | null;
}

export interface WpScanResult {
  isWordPress: boolean;
  coreVersion: string | null;
  plugins: WpComponentHit[];
  themes: WpComponentHit[];
}

// WPScan's public vulnerability-database pages follow this exact singular
// path (confirmed live: wpscan.com/plugin/<slug>/, wpscan.com/theme/<slug>/) -
// no API key needed to view them, unlike their scan API.
export function wpscanPluginUrl(slug: string): string {
  return `https://wpscan.com/plugin/${encodeURIComponent(slug)}/`;
}

export function wpscanThemeUrl(slug: string): string {
  return `https://wpscan.com/theme/${encodeURIComponent(slug)}/`;
}

// WPScan has no discoverable public deep-link for a specific WordPress core
// version, so core gets the same generic CVE-search links CVELookup already
// uses for any tech + version.
export function coreVersionCveLinks(version: string): CveLink[] {
  return buildCveLinks(`WordPress ${version}`);
}

export function pluginCveLinks(slug: string, version: string | null): CveLink[] {
  return buildCveLinks(`WordPress plugin ${slug}${version ? ` ${version}` : ''}`);
}

export function themeCveLinks(slug: string, version: string | null): CveLink[] {
  return buildCveLinks(`WordPress theme ${slug}${version ? ` ${version}` : ''}`);
}

export function wpResultToMarkdown(target: string, r: WpScanResult): string {
  const lines: string[] = [`# WordPress check - ${target}`, ''];
  if (!r.isWordPress) {
    lines.push('_No WordPress generator tag or wp-content/wp-includes paths detected on this page._');
    return lines.join('\n');
  }
  lines.push(
    `**Core version:** ${r.coreVersion ?? 'not detected'}`,
    '',
    `## Plugins (${r.plugins.length})`,
    r.plugins.length
      ? r.plugins.map((p) => `- **${p.slug}** ${p.version ?? '(version not detected)'} - ${wpscanPluginUrl(p.slug)}`).join('\n')
      : '_None detected from page markup._',
    '',
    `## Themes (${r.themes.length})`,
    r.themes.length
      ? r.themes.map((t) => `- **${t.slug}** ${t.version ?? '(version not detected)'} - ${wpscanThemeUrl(t.slug)}`).join('\n')
      : '_None detected from page markup._',
  );
  return lines.join('\n');
}
