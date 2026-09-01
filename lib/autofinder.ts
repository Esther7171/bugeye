import { sendToBackground } from '@/lib/messaging';
import { fetchCrtSh, fetchCrtName, fetchHackerTarget, fetchCertSpotter, fetchOtxPassiveDns } from '@/lib/subfinder';
import { gradeHeaders, type HeaderGradeReport } from '@/lib/headergrade';
import { auditCsp, type CspAuditReport } from '@/lib/cspaudit';
import { assessClickjacking, type ClickjackResult } from '@/lib/clickjack';
import { summarizeCerts, type SslSummary } from '@/lib/ssl';
import { shodanFaviconHash } from '@/lib/mmh3';
import { parseRobots, type RobotsData } from '@/lib/robots';
import { parseSitemap } from '@/lib/sitemap';
import { WELL_KNOWN_PATHS } from '@/lib/wellknown';
import { PANEL_PATHS, looksLikeAdminPath } from '@/lib/panelhunt';
import { GITFINDER_CHECKS } from '@/lib/gitfinder';
import { fetchWaybackUrls } from '@/lib/wayback';
import { fingerprintFromHeaders, type TechHit } from '@/lib/techstack';
import { detectLibrary, type RetireFinding } from '@/lib/retirejs';
import { mapLimit } from '@/lib/concurrency';
import type { CorsCheckResult, HttpMethodsResult } from '@/lib/messaging';

export type AutoFinderTaskId =
  | 'dns'
  | 'subdomains'
  | 'headers'
  | 'csp'
  | 'clickjack'
  | 'cors'
  | 'httpMethods'
  | 'ssl'
  | 'favicon'
  | 'ipgeo'
  | 'shodan'
  | 'robots'
  | 'sitemap'
  | 'wellknown'
  | 'panelhunt'
  | 'gitfinder'
  | 'wayback'
  | 'tech'
  | 'retirejs'
  | 'buckets'
  | 'links'
  | 'jsfiles'
  | 'secrets';

export const AUTOFINDER_TASKS: { id: AutoFinderTaskId; label: string }[] = [
  { id: 'dns', label: 'DNS resolution' },
  { id: 'subdomains', label: 'Subdomains (crt.sh + crt.name + CertSpotter + HackerTarget + OTX)' },
  { id: 'headers', label: 'Response headers' },
  { id: 'csp', label: 'CSP audit' },
  { id: 'clickjack', label: 'Clickjack check' },
  { id: 'cors', label: 'CORS check' },
  { id: 'httpMethods', label: 'HTTP methods' },
  { id: 'ssl', label: 'Certificate info' },
  { id: 'favicon', label: 'Favicon hash' },
  { id: 'ipgeo', label: 'IP geolocation' },
  { id: 'shodan', label: 'Shodan InternetDB' },
  { id: 'robots', label: 'robots.txt' },
  { id: 'sitemap', label: 'sitemap.xml' },
  { id: 'wellknown', label: '.well-known paths' },
  { id: 'panelhunt', label: 'Admin/sensitive paths' },
  { id: 'gitfinder', label: 'Exposed .git/.svn/.env' },
  { id: 'wayback', label: 'Wayback archive' },
  { id: 'tech', label: 'Tech fingerprint' },
  { id: 'retirejs', label: 'Outdated JS libraries' },
  { id: 'buckets', label: 'Cloud storage references' },
  { id: 'links', label: 'Links, scripts and form actions' },
  { id: 'jsfiles', label: 'JavaScript files' },
  { id: 'secrets', label: 'Exposed keys/tokens (best-effort)' },
];

export type TaskStatus = 'pending' | 'running' | 'done' | 'error';
export type ProgressMap = Record<AutoFinderTaskId, { status: TaskStatus; summary?: string }>;

export interface BucketRef {
  type: string;
  url: string;
}

export interface AutoFinderReport {
  domain: string;
  generatedAt: string;
  dns: { addresses: string[]; error?: string };
  subdomains: { list: string[]; error?: string };
  headers: Record<string, string>;
  headerGrade: HeaderGradeReport | null;
  csp: CspAuditReport | null;
  clickjack: ClickjackResult | null;
  cors: CorsCheckResult | null;
  httpMethods: HttpMethodsResult | null;
  ssl: SslSummary | null;
  faviconHash: number | null;
  ip: string | null;
  ipgeo: {
    ok: boolean;
    country?: string;
    region?: string;
    city?: string;
    isp?: string;
    org?: string;
    asn?: string;
    hosting?: boolean | null;
    proxy?: boolean | null;
    error?: string;
  } | null;
  shodan: { ports: number[]; vulns: string[]; hostnames: string[]; tags: string[]; error?: string } | null;
  robots: RobotsData & { found: boolean };
  sitemap: { urls: string[]; sitemapFileCount: number };
  wellknown: { path: string; label: string; found: boolean; status: number | null }[];
  panelhunt: { path: string; label: string; status: number | null; interesting: boolean; looksAdmin: boolean }[];
  gitfinder: { label: string; path: string; exposed: boolean }[];
  wayback: { count: number; sample: string[] };
  techHits: TechHit[];
  techGuesses: string[];
  retireFindings: RetireFinding[];
  buckets: BucketRef[];
  links: { internal: LinkHit[]; external: LinkHit[] };
  jsFiles: string[];
  secrets: SecretHit[];
}

export interface LinkHit {
  url: string;
  tag: string;
}

export interface SecretHit {
  type: string;
  match: string;
  context: string;
}

const BUCKET_PATTERNS: Array<{ type: string; re: RegExp }> = [
  { type: 'S3', re: /[a-z0-9.-]*s3[.-][a-z0-9-]*\.amazonaws\.com\/[a-z0-9._/-]*/gi },
  { type: 'Azure Blob', re: /[a-z0-9-]+\.blob\.core\.windows\.net\/[a-z0-9._/-]*/gi },
  { type: 'GCS', re: /storage\.googleapis\.com\/[a-z0-9._/-]+/gi },
  { type: 'DO Spaces', re: /[a-z0-9-]+\.digitaloceanspaces\.com\/[a-z0-9._/-]*/gi },
];

function findBucketRefs(html: string): BucketRef[] {
  const found = new Map<string, BucketRef>();
  for (const { type, re } of BUCKET_PATTERNS) {
    for (const m of html.match(re) ?? []) {
      const url = /^https?:\/\//i.test(m) ? m : `https://${m}`;
      found.set(url, { type, url });
    }
  }
  return Array.from(found.values());
}

function guessTechFromHtml(html: string): string[] {
  const guesses = new Set<string>();
  const lower = html.toLowerCase();
  if (lower.includes('wp-content') || lower.includes('wp-includes')) guesses.add('WordPress');
  if (lower.includes('__next_data__') || lower.includes('/_next/')) guesses.add('Next.js');
  if (lower.includes('data-reactroot') || lower.includes('react-dom')) guesses.add('React');
  if (lower.includes('ng-version')) guesses.add('Angular');
  if (lower.includes('__nuxt')) guesses.add('Nuxt.js');
  if (lower.includes('shopify')) guesses.add('Shopify');
  if (lower.includes('drupal')) guesses.add('Drupal');
  if (lower.includes('joomla')) guesses.add('Joomla');
  const generatorMatch = lower.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/);
  if (generatorMatch) guesses.add(generatorMatch[1]!);
  return Array.from(guesses);
}

function extractScriptSrcs(html: string, baseUrl: string): string[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const srcs: string[] = [];
  doc.querySelectorAll('script[src]').forEach((el) => {
    const src = el.getAttribute('src');
    if (!src) return;
    try {
      srcs.push(new URL(src, baseUrl).href);
    } catch {
      // ignore unparsable src
    }
  });
  return srcs;
}

// Mirrors LinkGrab's scanPageForLinks, but reads the already-fetched static
// HTML (via DOMParser) instead of chrome.scripting.executeScript against a
// live tab. That means it only sees what the server actually sent, not
// anything added by client-side JS after render - the tradeoff that lets
// this run from just a domain string, no open tab required, consistent with
// the rest of AutoFinder.
function extractLinks(html: string, baseUrl: string, domain: string): { internal: LinkHit[]; external: LinkHit[] } {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const found = new Map<string, LinkHit>();
  const add = (raw: string | null, tag: string) => {
    if (!raw) return;
    try {
      const resolved = new URL(raw, baseUrl).href;
      if (!found.has(resolved)) found.set(resolved, { url: resolved, tag });
    } catch {
      // ignore unparsable URLs (mailto without value, javascript:, etc.)
    }
  };
  doc.querySelectorAll('a[href]').forEach((el) => add(el.getAttribute('href'), 'a'));
  doc.querySelectorAll('img[src]').forEach((el) => add(el.getAttribute('src'), 'img'));
  doc.querySelectorAll('script[src]').forEach((el) => add(el.getAttribute('src'), 'script'));
  doc.querySelectorAll('link[href]').forEach((el) => add(el.getAttribute('href'), 'link'));
  doc.querySelectorAll('form[action]').forEach((el) => add(el.getAttribute('action'), 'form'));

  const all = Array.from(found.values());
  const internal: LinkHit[] = [];
  const external: LinkHit[] = [];
  for (const hit of all) {
    try {
      (new URL(hit.url).hostname === domain ? internal : external).push(hit);
    } catch {
      external.push(hit);
    }
  }
  return { internal, external };
}

// Mirrors SecretScan's scanPageForSecrets, same static-HTML tradeoff as
// extractLinks above - inline <script> content is still part of the raw
// HTML, so this catches the same inline-secret cases, just not anything
// injected only by client-side JS after load.
const SECRET_PATTERNS: Array<{ type: string; re: RegExp }> = [
  { type: 'AWS Access Key', re: /AKIA[0-9A-Z]{16}/g },
  { type: 'Google API Key', re: /AIza[0-9A-Za-z\-_]{35}/g },
  { type: 'Slack Token', re: /xox[baprs]-[0-9a-zA-Z-]{10,}/g },
  { type: 'JWT', re: /eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/g },
  { type: 'Bearer token', re: /Bearer\s+[A-Za-z0-9\-_.=]{10,}/g },
  { type: 'Generic api_key', re: /api[_-]?key["'\s]*[:=]\s*["'][a-zA-Z0-9_\-]{12,}["']/gi },
  { type: 'Generic secret', re: /secret["'\s]*[:=]\s*["'][^"'\s]{8,}["']/gi },
];

function extractSecrets(html: string): SecretHit[] {
  const found = new Map<string, SecretHit>();
  for (const { type, re } of SECRET_PATTERNS) {
    for (const m of html.matchAll(re)) {
      const match = m[0];
      const index = m.index ?? 0;
      const context = html.slice(Math.max(0, index - 30), index + match.length + 30).replace(/\s+/g, ' ');
      const key = `${type}:${match}`;
      if (!found.has(key)) found.set(key, { type, match, context });
    }
  }
  return Array.from(found.values());
}

export async function runAutoFinder(
  domain: string,
  onProgress: (id: AutoFinderTaskId, patch: { status: TaskStatus; summary?: string }) => void,
): Promise<AutoFinderReport> {
  const homeUrl = `https://${domain}/`;
  const run = async <T>(id: AutoFinderTaskId, fn: () => Promise<T>, summarize: (v: T) => string | undefined): Promise<T | undefined> => {
    onProgress(id, { status: 'running' });
    try {
      const value = await fn();
      onProgress(id, { status: 'done', summary: summarize(value) });
      return value;
    } catch (err) {
      onProgress(id, { status: 'error', summary: err instanceof Error ? err.message : String(err) });
      return undefined;
    }
  };

  // --- Phase 1: independent fetches ---
  const [dohResult, crt, otx, headersRes, homepageRes, certsRes, faviconRes] = await Promise.all([
    run('dns', () => sendToBackground({ type: 'DOH_RESOLVE', hostname: domain }), (r) => (r.ok ? `${r.addresses?.length ?? 0} address(es)` : r.error)),
    run(
      'subdomains',
      async () => {
        const [crtRes, crtNameRes, hackerTargetRes, certSpotterRes] = await Promise.all([
          fetchCrtSh(domain),
          fetchCrtName(domain),
          fetchHackerTarget(domain),
          fetchCertSpotter(domain),
        ]);
        const merged = Array.from(
          new Set([...crtRes.hostnames, ...crtNameRes.hostnames, ...hackerTargetRes.hostnames, ...certSpotterRes.hostnames]),
        ).sort();
        return {
          hostnames: merged,
          crtError: crtRes.error,
          crtNameError: crtNameRes.error,
          hackerTargetError: hackerTargetRes.error,
          certSpotterError: certSpotterRes.error,
        };
      },
      (r) => (r.hostnames.length ? `${r.hostnames.length} found` : r.crtError ?? r.crtNameError ?? r.hackerTargetError ?? r.certSpotterError ?? 'none found'),
    ),
    fetchOtxPassiveDns(domain).catch(() => [] as string[]),
    run('headers', () => sendToBackground({ type: 'GET_URL_HEADERS', url: homeUrl }), (r) => (Object.keys(r.headers).length ? `${Object.keys(r.headers).length} headers` : r.error)),
    sendToBackground({ type: 'FETCH_TEXT', url: homeUrl }).catch(() => ({ ok: false, data: undefined, status: undefined, error: 'fetch failed' }) as const),
    run('ssl', () => sendToBackground({ type: 'FETCH_CRTSH_CERTS', domain }), (r) => (r.ok ? `${r.entries.length} cert entries` : r.error)),
    run('favicon', () => sendToBackground({ type: 'FETCH_FAVICON', url: `${homeUrl}favicon.ico` }), (r) => (r.ok ? 'fetched' : r.error)),
  ]);

  const headers = headersRes?.headers ?? {};
  const html = homepageRes.ok && homepageRes.data ? homepageRes.data : '';
  const addresses = dohResult?.ok ? (dohResult.addresses ?? []) : [];
  const ip = addresses[0] ?? null;

  const hasHeaders = Object.keys(headers).length > 0;
  const headerGrade = hasHeaders ? gradeHeaders(headers) : null;

  const csp = hasHeaders
    ? auditCsp(Object.entries(headers).find(([k]) => k.toLowerCase() === 'content-security-policy')?.[1])
    : null;
  onProgress('csp', { status: 'done', summary: csp ? `grade ${csp.grade}` : 'no headers' });

  const clickjack = hasHeaders ? assessClickjacking(headers) : null;
  onProgress('clickjack', { status: 'done', summary: clickjack?.verdict });

  const ssl = certsRes?.ok ? summarizeCerts(domain, certsRes.entries) : null;

  const faviconHash = faviconRes?.ok && faviconRes.base64 ? shodanFaviconHash(faviconRes.base64) : null;

  // --- Phase 2: dependent on phase 1 ---
  async function runIpTask<T>(id: AutoFinderTaskId, fn: () => Promise<T>, summarize: (v: T) => string | undefined): Promise<T | undefined> {
    if (!ip) {
      onProgress(id, { status: 'error', summary: 'no IP resolved' });
      return undefined;
    }
    return run(id, fn, summarize);
  }

  const [corsRes, methodsRes, ipgeoRes, shodanRes, robotsResRaw] = await Promise.all([
    run('cors', () => sendToBackground({ type: 'CORS_CHECK', url: homeUrl }), (r) => (r.reflected ? 'origin reflected' : 'not reflected')),
    run('httpMethods', () => sendToBackground({ type: 'HTTP_METHODS_CHECK', url: homeUrl }), (r) => (r.allow ? r.allow.join(',') : r.error)),
    runIpTask('ipgeo', () => sendToBackground({ type: 'FETCH_IPGEO', ip: ip! }), (r) => (r.ok ? `${r.country ?? '?'}, ${r.org ?? '?'}` : r.error)),
    runIpTask('shodan', () => sendToBackground({ type: 'FETCH_SHODAN_INTERNETDB', ip: ip! }), (r) => (r.ok ? `${r.ports?.length ?? 0} ports` : r.error)),
    run('robots', () => sendToBackground({ type: 'FETCH_TEXT', url: `https://${domain}/robots.txt` }), (r) => (r.ok ? 'found' : 'not found')),
  ]);

  const robotsData = robotsResRaw?.ok && robotsResRaw.data ? parseRobots(robotsResRaw.data) : { disallow: [], sitemaps: [] };
  const robots = { ...robotsData, found: !!(robotsResRaw?.ok && robotsResRaw.data) };

  const sitemap = await run(
    'sitemap',
    async () => {
      const sitemapUrl = robots.sitemaps[0] ?? `https://${domain}/sitemap.xml`;
      const res = await sendToBackground({ type: 'FETCH_TEXT', url: sitemapUrl });
      if (!res.ok || !res.data) return { urls: [], sitemapFileCount: 0 };
      const parsed = parseSitemap(res.data);
      return { urls: parsed.urls, sitemapFileCount: 1 + parsed.nestedSitemaps.length };
    },
    (r) => `${r.urls.length} URLs`,
  );

  // --- Phase 3: multi-request probes ---
  const wellknown = await run(
    'wellknown',
    () =>
      mapLimit(WELL_KNOWN_PATHS, 5, async (def) => {
        const res = await sendToBackground({ type: 'HEAD_PROBE', url: `https://${domain}${def.path}` });
        return { path: def.path, label: def.label, found: res.ok, status: res.status };
      }),
    (r) => `${r.filter((x) => x.found).length}/${r.length} found`,
  );

  const panelhunt = await run(
    'panelhunt',
    () => {
      // Merge the curated admin-path list with whatever robots.txt discloses:
      // e.g. WordPress always Disallows /wp-admin/, which is exactly the
      // kind of hit this check is looking for anyway.
      const known = new Set(PANEL_PATHS.map((p) => p.path));
      const combined = [...PANEL_PATHS];
      for (const path of robots.disallow.slice(0, 40)) {
        if (!known.has(path)) {
          known.add(path);
          combined.push({ path, label: 'From robots.txt' });
        }
      }
      return mapLimit(combined, 5, async (def) => {
        const res = await sendToBackground({ type: 'HEAD_PROBE', url: `https://${domain}${def.path}` });
        const interesting = res.status !== null && [200, 301, 302, 401, 403].includes(res.status);
        return { path: def.path, label: def.label, status: res.status, interesting, looksAdmin: looksLikeAdminPath(def.path) };
      });
    },
    (r) => `${r.filter((x) => x.interesting).length} interesting`,
  );

  const gitfinder = await run(
    'gitfinder',
    () =>
      mapLimit(GITFINDER_CHECKS, 4, async (check) => {
        const res = await sendToBackground({ type: 'FETCH_TEXT', url: `https://${domain}${check.path}` });
        const exposed = res.ok && !!res.data && check.validate(res.data);
        return { label: check.label, path: check.path, exposed };
      }),
    (r) => `${r.filter((x) => x.exposed).length} exposed`,
  );

  const wayback = await run(
    'wayback',
    async () => {
      const r = await fetchWaybackUrls(domain);
      return { count: r.urls.length, sample: r.urls.slice(0, 50) };
    },
    (r) => `${r.count} URLs`,
  );

  const techHits = await run('tech', async () => fingerprintFromHeaders(headers), (r) => `${r.length} signals`);
  const techGuesses = guessTechFromHtml(html);

  const allJsFiles = html ? extractScriptSrcs(html, homeUrl) : [];

  const retireFindings = await run(
    'retirejs',
    async () => {
      if (!html) return [];
      const srcs = allJsFiles.slice(0, 20);
      const results = await mapLimit(srcs, 5, async (url) => {
        try {
          const res = await sendToBackground({ type: 'FETCH_TEXT', url });
          return detectLibrary(url, res.ok ? (res.data ?? null) : null);
        } catch {
          return null;
        }
      });
      return results.filter((r): r is RetireFinding => r !== null);
    },
    (r) => `${r.length} vulnerable`,
  );

  const buckets = await run('buckets', async () => findBucketRefs(html), (r) => `${r.length} found`);

  const links = await run(
    'links',
    async () => extractLinks(html, homeUrl, domain),
    (r) => `${r.internal.length} internal, ${r.external.length} external`,
  );

  const jsFiles = await run('jsfiles', async () => allJsFiles, (r) => `${r.length} files`);

  const secrets = await run('secrets', async () => extractSecrets(html), (r) => `${r.length} possible hit(s)`);

  return {
    domain,
    generatedAt: new Date().toISOString(),
    dns: { addresses, error: dohResult?.error },
    subdomains: {
      list: Array.from(new Set([...(crt?.hostnames ?? []), ...otx])).sort(),
      error: crt?.crtError ?? crt?.crtNameError ?? crt?.hackerTargetError ?? crt?.certSpotterError,
    },
    headers,
    headerGrade: headerGrade ?? null,
    csp,
    clickjack,
    cors: corsRes ?? null,
    httpMethods: methodsRes ?? null,
    ssl,
    faviconHash,
    ip,
    ipgeo: ipgeoRes ?? null,
    shodan: shodanRes ? { ports: shodanRes.ports ?? [], vulns: shodanRes.vulns ?? [], hostnames: shodanRes.hostnames ?? [], tags: shodanRes.tags ?? [], error: shodanRes.error } : null,
    robots,
    sitemap: sitemap ?? { urls: [], sitemapFileCount: 0 },
    wellknown: wellknown ?? [],
    panelhunt: panelhunt ?? [],
    gitfinder: gitfinder ?? [],
    wayback: wayback ?? { count: 0, sample: [] },
    techHits: techHits ?? [],
    techGuesses,
    retireFindings: retireFindings ?? [],
    buckets: buckets ?? [],
    links: links ?? { internal: [], external: [] },
    jsFiles: jsFiles ?? [],
    secrets: secrets ?? [],
  };
}

export function autoFinderToMarkdown(r: AutoFinderReport): string {
  const lines: string[] = [
    `# AutoFinder report - ${r.domain}`,
    '',
    `Generated: ${r.generatedAt}`,
    '',
    '## DNS',
    r.dns.addresses.length ? r.dns.addresses.map((a) => `- ${a}`).join('\n') : `_None resolved.${r.dns.error ? ` (${r.dns.error})` : ''}_`,
    '',
    `## Subdomains (${r.subdomains.list.length})`,
    r.subdomains.list.length ? r.subdomains.list.slice(0, 300).map((s) => `- ${s}`).join('\n') : `_None found.${r.subdomains.error ? ` (${r.subdomains.error})` : ''}_`,
    '',
    '## Security headers',
    r.headerGrade ? `Grade: ${r.headerGrade.grade} (${r.headerGrade.score}/100)\n\n${r.headerGrade.checks.map((c) => `- **${c.label}**: ${c.state.toUpperCase()} - ${c.detail}`).join('\n')}` : '_Could not fetch headers._',
    '',
    '## CSP audit',
    r.csp ? `${r.csp.present ? `Grade: ${r.csp.grade} (${r.csp.score}/100)` : 'No CSP header present.'}\n\n${r.csp.findings.map((f) => `- **${f.directive}**: ${f.state.toUpperCase()} - ${f.detail}`).join('\n')}` : '_Not evaluated._',
    '',
    '## Clickjacking',
    r.clickjack ? `${r.clickjack.verdict}: ${r.clickjack.detail}` : '_Not evaluated._',
    '',
    '## CORS',
    r.cors ? `Reflected: ${r.cors.reflected ? 'yes' : 'no'}. ACAO: ${r.cors.acao ?? '(none)'}. Credentials: ${r.cors.acac ?? '(none)'}.` : '_Not evaluated._',
    '',
    '## HTTP methods',
    r.httpMethods?.allow ? r.httpMethods.allow.join(', ') : '_Not disclosed via OPTIONS._',
    '',
    '## TLS certificate',
    r.ssl ? `Issuer: ${r.ssl.latest.issuerName}\nValid until: ${r.ssl.latest.notAfter} (${r.ssl.daysUntilExpiry}d)\nSANs: ${r.ssl.sans.length}` : '_No CT log entries found._',
    '',
    '## Favicon hash',
    r.faviconHash !== null ? `${r.faviconHash} - https://www.shodan.io/search?query=http.favicon.hash%3A${r.faviconHash}` : '_Could not fetch favicon._',
    '',
    '## IP + geolocation',
    r.ip ? `IP: ${r.ip}` : '_Not resolved._',
    r.ipgeo?.ok ? `${r.ipgeo.country ?? '?'}, ${r.ipgeo.region ?? '?'}, ${r.ipgeo.city ?? '?'} - ${r.ipgeo.isp ?? r.ipgeo.org ?? '?'} (ASN ${r.ipgeo.asn ?? '?'})${r.ipgeo.hosting ? ' [hosting]' : ''}${r.ipgeo.proxy ? ' [proxy]' : ''}` : '',
    '',
    '## Shodan InternetDB',
    r.shodan ? `Ports: ${r.shodan.ports.join(', ') || 'none'}\nCVEs: ${r.shodan.vulns.join(', ') || 'none'}\nTags: ${r.shodan.tags.join(', ') || 'none'}` : '_Not available._',
    '',
    '## robots.txt',
    r.robots.found ? `Found. ${r.robots.disallow.length} Disallow rules. Sitemaps: ${r.robots.sitemaps.join(', ') || 'none listed'}` : '_Not found._',
    '',
    '## sitemap.xml',
    r.sitemap.urls.length ? `${r.sitemap.urls.length} URLs across ${r.sitemap.sitemapFileCount} file(s).` : '_Not found or empty._',
    '',
    `## .well-known paths (${r.wellknown.filter((w) => w.found).length}/${r.wellknown.length} found)`,
    r.wellknown.filter((w) => w.found).map((w) => `- ${w.path} (${w.status})`).join('\n') || '_None found._',
    '',
    `## Admin/sensitive paths (${r.panelhunt.filter((p) => p.interesting).length} interesting)`,
    r.panelhunt.filter((p) => p.interesting).map((p) => `- ${p.path} - ${p.status}${p.looksAdmin ? ' [admin?]' : ''} (${p.label})`).join('\n') || '_Nothing interesting found._',
    '',
    '## Exposed .git/.svn/.env',
    r.gitfinder.filter((g) => g.exposed).map((g) => `- **${g.label}** (${g.path})`).join('\n') || '_Nothing exposed._',
    '',
    `## Wayback archive (${r.wayback.count} URLs)`,
    r.wayback.sample.slice(0, 30).map((u) => `- ${u}`).join('\n') || '_None found._',
    '',
    '## Tech fingerprint',
    [...r.techHits.map((h) => `- ${h.name} (${h.source})`), ...r.techGuesses.map((g) => `- ${g} (page markup)`)].join('\n') || '_Nothing detected._',
    '',
    '## Outdated JS libraries',
    r.retireFindings.length
      ? r.retireFindings.map((f) => `- **${f.library} v${f.version}**: ${f.vulnerabilities.map((v) => v.cves.join(',')).join('; ')} - ${f.url}`).join('\n')
      : '_None of the checked libraries matched known-vulnerable versions._',
    '',
    '## Cloud storage references',
    r.buckets.length ? r.buckets.map((b) => `- [${b.type}] ${b.url}`).join('\n') : '_None found on homepage._',
    '',
    `## Links (${r.links.internal.length} internal, ${r.links.external.length} external)`,
    '_From the static homepage HTML only, not a live-rendered page - see LinkGrab on an open tab for the fuller, post-JS picture._',
    '',
    '### Internal',
    r.links.internal.slice(0, 100).map((l) => `- [${l.tag}] ${l.url}`).join('\n') || '_None found._',
    '',
    '### External',
    r.links.external.slice(0, 100).map((l) => `- [${l.tag}] ${l.url}`).join('\n') || '_None found._',
    '',
    `## JavaScript files (${r.jsFiles.length})`,
    r.jsFiles.slice(0, 100).map((u) => `- ${u}`).join('\n') || '_None found._',
    '',
    `## Exposed keys/tokens, best-effort (${r.secrets.length})`,
    '_Pattern matching only - expect false positives (test fixtures, docs, minified noise). Verify every hit manually._',
    '',
    r.secrets.length ? r.secrets.map((s) => `- **${s.type}**: \`${s.match}\``).join('\n') : '_None found._',
  ];
  return lines.join('\n');
}
