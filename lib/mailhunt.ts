export interface MailSearchLink {
  label: string;
  url: string;
}

export function mailSearchLinks(email: string): MailSearchLink[] {
  const q = encodeURIComponent(`"${email}"`);
  const raw = encodeURIComponent(email);
  const domain = email.split('@')[1] ?? '';
  const domainQ = encodeURIComponent(domain);
  const siteLinkedin = encodeURIComponent(`"${email}" site:linkedin.com`);
  const siteDomain = domain ? encodeURIComponent(`"${email}" site:${domain}`) : '';
  return [
    { label: 'Google', url: `https://www.google.com/search?q=${q}` },
    { label: 'Google: LinkedIn mentions', url: `https://www.google.com/search?q=${siteLinkedin}` },
    ...(siteDomain ? [{ label: `Google: ${domain} mentions`, url: `https://www.google.com/search?q=${siteDomain}` }] : []),
    { label: 'Bing', url: `https://www.bing.com/search?q=${q}` },
    { label: 'DuckDuckGo', url: `https://duckduckgo.com/?q=${q}` },
    { label: 'GitHub code', url: `https://github.com/search?q=${raw}&type=code` },
    { label: 'Hunter domain', url: `https://hunter.io/search/${domainQ}` },
    { label: 'Epieos', url: `https://epieos.com/?q=${raw}` },
    { label: 'IntelX', url: `https://intelx.io/?s=${raw}` },
  ];
}

export interface GravatarAccount {
  domain?: string;
  username?: string;
  url?: string;
  display?: string;
}

export interface GravatarProfile {
  displayName?: string;
  preferredUsername?: string;
  aboutMe?: string;
  currentLocation?: string;
  profileUrl?: string;
  thumbnailUrl?: string;
  emails: string[];
  accounts: GravatarAccount[];
}

interface GravatarJson {
  entry?: {
    displayName?: string;
    preferredUsername?: string;
    aboutMe?: string;
    currentLocation?: string;
    profileUrl?: string;
    thumbnailUrl?: string;
    emails?: { value?: string }[];
    accounts?: GravatarAccount[];
  }[];
}

export function parseGravatarJson(raw: unknown): GravatarProfile | null {
  const entry = (raw as GravatarJson)?.entry?.[0];
  if (!entry) return null;
  return {
    displayName: entry.displayName,
    preferredUsername: entry.preferredUsername,
    aboutMe: entry.aboutMe,
    currentLocation: entry.currentLocation,
    profileUrl: entry.profileUrl,
    thumbnailUrl: entry.thumbnailUrl,
    emails: (entry.emails ?? []).map((e) => e.value ?? '').filter(Boolean),
    accounts: entry.accounts ?? [],
  };
}

export interface GithubUserHit {
  login: string;
  htmlUrl: string;
  type?: string;
}

export interface GithubCommitHit {
  repo?: string;
  message?: string;
  htmlUrl?: string;
  authorLogin?: string;
}

export function parseGithubUserSearch(raw: unknown): GithubUserHit[] {
  const items = (raw as { items?: { login?: string; html_url?: string; type?: string }[] })?.items ?? [];
  return items
    .filter((i) => i.login && i.html_url)
    .map((i) => ({ login: i.login!, htmlUrl: i.html_url!, type: i.type }));
}

export function parseGithubCommitSearch(raw: unknown): GithubCommitHit[] {
  const items =
    (
      raw as {
        items?: {
          html_url?: string;
          repository?: { full_name?: string };
          commit?: { message?: string; author?: { name?: string } };
          author?: { login?: string };
        }[];
      }
    )?.items ?? [];
  return items.slice(0, 8).map((i) => ({
    repo: i.repository?.full_name,
    message: i.commit?.message?.split('\n')[0],
    htmlUrl: i.html_url,
    authorLogin: i.author?.login,
  }));
}

export const EMAIL_FORMAT_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
