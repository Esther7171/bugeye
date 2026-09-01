export const UNKEYED_PROBE_HEADERS = [
  'X-Forwarded-Host',
  'X-Forwarded-Scheme',
  'X-Original-URL',
  'X-Rewrite-URL',
  'X-Host',
  'X-Forwarded-Port',
  'X-Forwarded-Prefix',
] as const;

export type UnkeyedHeader = (typeof UNKEYED_PROBE_HEADERS)[number];

export function isSharedCacheable(cacheControl: string | undefined, status: number | null): boolean {
  const cc = (cacheControl ?? '').toLowerCase();
  if (!cc && status === 200) return false;
  if (/\bno-store\b/.test(cc)) return false;
  if (/\bprivate\b/.test(cc) && !/\bs-maxage\s*=/.test(cc)) return false;
  if (/\bpublic\b/.test(cc)) return true;
  const maxAge = cc.match(/(?:s-maxage|max-age)\s*=\s*(\d+)/);
  if (maxAge && Number(maxAge[1]) > 0) return true;
  return false;
}

export function varyIncludes(vary: string | undefined, header: string): boolean {
  const keys = (vary ?? '')
    .toLowerCase()
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (keys.includes('*')) return true;
  return keys.includes(header.toLowerCase());
}
