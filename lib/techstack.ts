export interface TechHit {
  name: string;
  detail?: string;
  source: 'header' | 'cookie' | 'meta' | 'script';
}

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
  if (server) hits.push({ name: server, source: 'header', detail: 'Server header' });

  const poweredBy = get(headers, 'x-powered-by');
  if (poweredBy) hits.push({ name: poweredBy, source: 'header', detail: 'X-Powered-By header' });

  const generator = get(headers, 'x-generator');
  if (generator) hits.push({ name: generator, source: 'header', detail: 'X-Generator header' });

  const cms = get(headers, 'x-drupal-cache') ? 'Drupal' : undefined;
  if (cms) hits.push({ name: cms, source: 'header', detail: 'X-Drupal-Cache header' });

  const setCookie = get(headers, 'set-cookie') ?? '';
  for (const sig of COOKIE_SIGNATURES) {
    if (sig.pattern.test(setCookie)) hits.push({ name: sig.name, source: 'cookie', detail: 'Session cookie name' });
  }

  return hits;
}
