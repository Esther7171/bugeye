export interface HeaderRuleDraft {
  id: string;
  name: string;
  value: string;
  enabled: boolean;
}

export function newHeaderRule(): HeaderRuleDraft {
  return { id: crypto.randomUUID(), name: '', value: '', enabled: true };
}

export type UaPresetId = 'desktop' | 'mobile' | 'googlebot' | 'custom';

export interface UaPreset {
  id: UaPresetId;
  label: string;
  value: string;
}

export const UA_PRESETS: UaPreset[] = [
  {
    id: 'desktop',
    label: 'Desktop Chrome (Windows)',
    value:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  },
  {
    id: 'mobile',
    label: 'Mobile Chrome (Android)',
    value:
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  },
  {
    id: 'googlebot',
    label: 'Googlebot',
    value: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  },
  { id: 'custom', label: 'Custom string', value: '' },
];

export interface CommonHeader {
  name: string;
  description: string;
}

// Reference list for HeaderInject's autocomplete + "what does this do" card -
// the ones a pentester actually reaches for when probing access control,
// IP-based restrictions, or origin/route validation.
export const COMMON_REQUEST_HEADERS: CommonHeader[] = [
  { name: 'X-Forwarded-For', description: 'Claims the request originated from another IP - test IP allowlists and rate limits.' },
  { name: 'X-Forwarded-Host', description: 'Claims a different Host for the request - can confuse routing/vhost logic.' },
  { name: 'X-Forwarded-Proto', description: 'Claims http or https - useful against apps that trust this to skip HTTPS checks.' },
  { name: 'X-Real-IP', description: 'Alternate client-IP header some reverse proxies trust instead of X-Forwarded-For.' },
  { name: 'X-Original-URL', description: 'Some frameworks route on this instead of the real path - can bypass path-based access rules.' },
  { name: 'X-Rewrite-URL', description: 'Same idea as X-Original-URL, used by a different set of frameworks/proxies.' },
  { name: 'X-Host', description: 'Another Host-override variant seen on some load balancers and app servers.' },
  { name: 'X-Custom-IP-Authorization', description: 'Seen trusted by a few WAF/IP-allowlist bypass writeups; usually a no-op but cheap to try.' },
  { name: 'Referer', description: 'The page the request claims to have come from - some endpoints gate on this.' },
  { name: 'Origin', description: 'The origin the browser reports for cross-origin requests - relevant to CORS checks.' },
  { name: 'Authorization', description: 'Bearer/Basic credentials - overwrite to test with a different token or role.' },
  { name: 'Cookie', description: 'Session/auth cookies - overwrite to test with a different session value.' },
  { name: 'User-Agent', description: 'Client identity string - some apps branch on this (bot detection, mobile vs desktop).' },
  { name: 'X-Requested-With', description: 'Historically used to mark AJAX requests - some CSRF checks key off its presence.' },
  { name: 'Content-Type', description: 'Declares the body format - mismatching it can sometimes slip past input validation.' },
  { name: 'Accept-Language', description: 'Preferred locale - occasionally affects which backend/CDN edge handles the request.' },
  { name: 'X-Api-Key', description: 'Common convention for an API key header - overwrite to test with a different key.' },
  { name: 'X-Client-IP', description: 'Another client-IP variant some backends read instead of X-Forwarded-For.' },
];

export type RefererMode = 'off' | 'strip' | 'spoof';

export const REFERER_MODES: { id: RefererMode; label: string }[] = [
  { id: 'off', label: 'Leave as-is' },
  { id: 'strip', label: 'Strip (remove header)' },
  { id: 'spoof', label: 'Spoof (set custom value)' },
];
