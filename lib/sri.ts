export interface SriResource {
  tag: 'script' | 'link';
  url: string;
  host: string;
  crossOriginAttr: string | null;
  integrity: string | null;
  crossOriginResource: boolean;
}

export type SriVerdict = 'missing' | 'no-cors-attr' | 'ok' | 'same-origin';

export function classifySri(pageHost: string, res: SriResource): SriVerdict {
  if (!res.crossOriginResource) return 'same-origin';
  if (!res.integrity) return 'missing';
  // SRI on a cross-origin URL requires CORS (the crossorigin attribute)
  // or the browser ignores the integrity check.
  if (!res.crossOriginAttr) return 'no-cors-attr';
  return 'ok';
}

export function sriNeedsAttention(verdict: SriVerdict): boolean {
  return verdict === 'missing' || verdict === 'no-cors-attr';
}
