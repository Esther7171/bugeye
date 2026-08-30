export interface TechHit {
  name: string;
  detail?: string;
  source: 'header' | 'cookie' | 'meta' | 'script' | 'dom';
  category?: string;
}

export const OTHER_CATEGORY = 'Other / raw signals';
export const SERVER_CATEGORY = 'Server / backend';

const COOKIE_SIGNATURES: { pattern: RegExp; name: string }[] = [
  { pattern: /PHPSESSID/i, name: 'PHP' },
  { pattern: /JSESSIONID/i, name: 'Java (Servlet/JSP)' },
  { pattern: /laravel_session/i, name: 'Laravel' },
  { pattern: /wordpress_logged_in|wp-settings/i, name: 'WordPress' },
  { pattern: /csrftoken/i, name: 'Django' },
  { pattern: /ASP\.NET_SessionId/i, name: 'ASP.NET' },
  { pattern: /connect\.sid/i, name: 'Express.js (Node)' },
  { pattern: /_rails_session/i, name: 'Ruby on Rails' },
  { pattern: /CAKEPHP/i, name: 'CakePHP' },
];

function get(headers: Record<string, string>, name: string): string | undefined {
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : undefined;
}

export function fingerprintFromHeaders(headers: Record<string, string>): TechHit[] {
  const hits: TechHit[] = [];

  const server = get(headers, 'server');
  if (server) hits.push({ name: server, source: 'header', detail: 'Server header', category: OTHER_CATEGORY });

  const poweredBy = get(headers, 'x-powered-by');
  if (poweredBy) hits.push({ name: poweredBy, source: 'header', detail: 'X-Powered-By header', category: OTHER_CATEGORY });

  const generator = get(headers, 'x-generator');
  if (generator) hits.push({ name: generator, source: 'header', detail: 'X-Generator header', category: OTHER_CATEGORY });

  const cms = get(headers, 'x-drupal-cache') ? 'Drupal' : undefined;
  if (cms) hits.push({ name: cms, source: 'header', detail: 'X-Drupal-Cache header', category: 'CMS / Ecommerce' });

  const setCookie = get(headers, 'set-cookie') ?? '';
  for (const sig of COOKIE_SIGNATURES) {
    if (sig.pattern.test(setCookie)) {
      hits.push({ name: sig.name, source: 'cookie', detail: 'Session cookie name (response header)', category: SERVER_CATEGORY });
    }
  }

  return hits;
}

// Matches real cookie names (from browser.cookies.getAll) rather than parsing
// a Set-Cookie response header, which a simple unauthenticated GET may not
// even receive.
export function matchCookieSignatures(cookieNames: string[]): TechHit[] {
  const hits: TechHit[] = [];
  for (const sig of COOKIE_SIGNATURES) {
    const hit = cookieNames.find((n) => sig.pattern.test(n));
    if (hit) hits.push({ name: sig.name, source: 'cookie', detail: `Cookie: ${hit}`, category: SERVER_CATEGORY });
  }
  return hits;
}
