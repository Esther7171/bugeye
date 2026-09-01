export type UserHuntVerdict = 'found' | 'not_found' | 'unknown';

export interface UserHuntSite {
  id: string;
  name: string;
  origin: string;
  profileUrl: (username: string) => string;
  probeUrl?: (username: string) => string;
  mode: 'status' | 'body';
  notFoundNeedles?: string[];
}

export interface UserHuntHit {
  id: string;
  name: string;
  url: string;
  verdict: UserHuntVerdict;
  status: number | null;
  error?: string;
}

export const USER_HUNT_SITES: UserHuntSite[] = [
  {
    id: 'github',
    name: 'GitHub',
    origin: 'https://github.com/*',
    profileUrl: (u) => `https://github.com/${u}`,
    mode: 'status',
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    origin: 'https://gitlab.com/*',
    profileUrl: (u) => `https://gitlab.com/${u}`,
    mode: 'status',
  },
  {
    id: 'bitbucket',
    name: 'Bitbucket',
    origin: 'https://bitbucket.org/*',
    profileUrl: (u) => `https://bitbucket.org/${u}`,
    mode: 'status',
  },
  {
    id: 'codeberg',
    name: 'Codeberg',
    origin: 'https://codeberg.org/*',
    profileUrl: (u) => `https://codeberg.org/${u}`,
    mode: 'status',
  },
  {
    id: 'reddit',
    name: 'Reddit',
    origin: 'https://www.reddit.com/*',
    profileUrl: (u) => `https://www.reddit.com/user/${u}`,
    probeUrl: (u) => `https://www.reddit.com/user/${u}/about.json`,
    mode: 'status',
  },
  {
    id: 'hackerone',
    name: 'HackerOne',
    origin: 'https://hackerone.com/*',
    profileUrl: (u) => `https://hackerone.com/${u}`,
    mode: 'status',
  },
  {
    id: 'npm',
    name: 'npm',
    origin: 'https://www.npmjs.com/*',
    profileUrl: (u) => `https://www.npmjs.com/~${u}`,
    mode: 'status',
  },
  {
    id: 'pypi',
    name: 'PyPI',
    origin: 'https://pypi.org/*',
    profileUrl: (u) => `https://pypi.org/user/${u}/`,
    mode: 'status',
  },
  {
    id: 'dockerhub',
    name: 'Docker Hub',
    origin: 'https://hub.docker.com/*',
    profileUrl: (u) => `https://hub.docker.com/u/${u}`,
    probeUrl: (u) => `https://hub.docker.com/v2/users/${u}/`,
    mode: 'status',
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    origin: 'https://huggingface.co/*',
    profileUrl: (u) => `https://huggingface.co/${u}`,
    mode: 'status',
  },
  {
    id: 'keybase',
    name: 'Keybase',
    origin: 'https://keybase.io/*',
    profileUrl: (u) => `https://keybase.io/${u}`,
    probeUrl: (u) => `https://keybase.io/_/api/1.0/user/lookup.json?username=${encodeURIComponent(u)}`,
    mode: 'body',
    notFoundNeedles: ['"them": []'],
  },
  {
    id: 'devto',
    name: 'dev.to',
    origin: 'https://dev.to/*',
    profileUrl: (u) => `https://dev.to/${u}`,
    mode: 'status',
  },
  {
    id: 'hashnode',
    name: 'Hashnode',
    origin: 'https://hashnode.com/*',
    profileUrl: (u) => `https://hashnode.com/@${u}`,
    mode: 'status',
  },
  {
    id: 'tryhackme',
    name: 'TryHackMe',
    origin: 'https://tryhackme.com/*',
    profileUrl: (u) => `https://tryhackme.com/p/${u}`,
    mode: 'status',
  },
  {
    id: 'sourceforge',
    name: 'SourceForge',
    origin: 'https://sourceforge.net/*',
    profileUrl: (u) => `https://sourceforge.net/u/${u}/profile/`,
    mode: 'status',
  },
  {
    id: 'aboutme',
    name: 'about.me',
    origin: 'https://about.me/*',
    profileUrl: (u) => `https://about.me/${u}`,
    mode: 'status',
  },
  {
    id: 'linktree',
    name: 'Linktree',
    origin: 'https://linktr.ee/*',
    profileUrl: (u) => `https://linktr.ee/${u}`,
    mode: 'status',
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    origin: 'https://www.pinterest.com/*',
    profileUrl: (u) => `https://www.pinterest.com/${u}/`,
    mode: 'status',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    origin: 'https://www.youtube.com/*',
    profileUrl: (u) => `https://www.youtube.com/@${u}`,
    mode: 'body',
    notFoundNeedles: ['this page isn’t available', "this page isn't available", 'this channel does not exist'],
  },
];

const USERNAME_RE = /^[A-Za-z0-9._-]{1,39}$/;

export function normalizeUsername(input: string): string {
  return input.trim().replace(/^@/, '');
}

export function isValidUsername(input: string): boolean {
  return USERNAME_RE.test(normalizeUsername(input));
}

export function classifyUserProbe(
  site: UserHuntSite,
  status: number | null,
  body: string,
): UserHuntVerdict {
  if (status === 404 || status === 410) return 'not_found';
  if (status === null) return 'unknown';
  if (status === 401 || status === 403) return 'unknown';
  if (status >= 500) return 'unknown';
  if (status >= 200 && status < 400) {
    if (site.mode === 'body') {
      const lower = body.toLowerCase();
      if ((site.notFoundNeedles ?? []).some((n) => lower.includes(n.toLowerCase()))) {
        return 'not_found';
      }
    }
    if (site.id === 'keybase' && /"them"\s*:\s*\[\s*\]/.test(body)) return 'not_found';
    return 'found';
  }
  return 'unknown';
}
