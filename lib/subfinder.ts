import { sendToBackground } from '@/lib/messaging';

export interface SubdomainSourceResult {
  hostnames: string[];
  status: number | null;
  error?: string;
}

// Delegates to the background service worker (entrypoints/background.ts),
// which owns the crt.sh query, retry/timeout handling and diagnostic logging.
// Both SubFinder and AutoFinder go through this single helper.
export async function fetchCrtSh(domain: string): Promise<SubdomainSourceResult> {
  const result = await sendToBackground({ type: 'FETCH_CRTSH', domain });
  return { hostnames: result.hostnames, status: result.status, error: result.error };
}

// High-value subdomain labels a tester usually cares about first. Bulk sources
// like subdomain.center return thousands of machine-generated names; surfacing
// the recognizable ones (api, admin, dev, vpn, mail, git...) up top makes the
// list usable instead of alphabetical noise.
const INTERESTING_LABELS = new Set([
  'api', 'admin', 'administrator', 'dev', 'develop', 'development', 'staging', 'stage', 'stg',
  'test', 'testing', 'uat', 'qa', 'sandbox', 'preprod', 'prod', 'production', 'beta', 'demo',
  'vpn', 'proxy', 'gateway', 'gw', 'remote', 'rdp', 'ssh', 'citrix',
  'mail', 'smtp', 'imap', 'webmail', 'email', 'exchange', 'owa', 'autodiscover',
  'portal', 'dashboard', 'internal', 'intranet', 'corp', 'private',
  'sso', 'auth', 'login', 'oauth', 'idp', 'id', 'account', 'accounts', 'secure', 'vault',
  'git', 'gitlab', 'github', 'bitbucket', 'jenkins', 'ci', 'cd', 'jira', 'confluence',
  'grafana', 'kibana', 'prometheus', 'status', 'health', 'monitor', 'metrics', 'logs', 'elastic', 'splunk',
  'db', 'database', 'sql', 'mysql', 'postgres', 'mongo', 'redis', 'phpmyadmin', 'pma', 'adminer',
  'ftp', 'sftp', 'backup', 'old', 'legacy', 'new', 'app', 'apps', 'mobile',
  'cdn', 'assets', 'static', 'img', 'images', 'media', 'files', 'download', 'uploads',
  'store', 'shop', 'pay', 'payment', 'billing', 'checkout',
  'support', 'help', 'docs', 'wiki', 'blog', 'careers', 'jobs', 'hr', 'crm', 'erp',
  'ns', 'ns1', 'ns2', 'dns', 'mx', 'ldap', 'ad', 'cpanel', 'plesk', 'whm',
]);

export function subdomainInterestScore(host: string, apex: string): number {
  if (host === apex) return 1000; // the apex itself
  const sub = host.endsWith(`.${apex}`) ? host.slice(0, -(apex.length + 1)) : host;
  if (!sub) return 1000;
  const labels = sub.split('.');
  let score = 0;
  for (const label of labels) if (INTERESTING_LABELS.has(label)) score += 40;
  if (sub === 'www') score += 30;
  if (labels.length === 1) score += 12; // single-label subs are usually the primary services
  score += Math.max(0, 6 - labels.length); // shallower = more likely a real host
  return score;
}

export function isInterestingHost(host: string, apex: string): boolean {
  return subdomainInterestScore(host, apex) >= 40 || host === apex || host === `www.${apex}`;
}

// Sorts recognizable/high-value subdomains first, then everything else
// alphabetically, so the useful names aren't buried under generated noise.
export function sortByInterest(hosts: string[], apex: string): string[] {
  return [...hosts].sort(
    (a, b) => subdomainInterestScore(b, apex) - subdomainInterestScore(a, apex) || a.localeCompare(b),
  );
}

// crt.name is a second, independent certificate-transparency search source
// used to cross-check crt.sh - its own log coverage sometimes surfaces
// subdomains crt.sh's index misses, and vice versa.
export async function fetchCrtName(domain: string): Promise<SubdomainSourceResult> {
  const result = await sendToBackground({ type: 'FETCH_CRTNAME', domain });
  return { hostnames: result.hostnames, status: result.status, error: result.error };
}

// HackerTarget's free hostsearch API: DNS-derived, not certificate-log
// derived, so it's a genuinely different discovery method from crt.sh/
// crt.name (catches subdomains that never got a public TLS cert).
export async function fetchHackerTarget(domain: string): Promise<SubdomainSourceResult> {
  const result = await sendToBackground({ type: 'FETCH_HACKERTARGET', domain });
  return { hostnames: result.hostnames, status: result.status, error: result.error };
}

// SSLMate CertSpotter: a fourth, independently-operated certificate
// transparency search source.
export async function fetchCertSpotter(domain: string): Promise<SubdomainSourceResult> {
  const result = await sendToBackground({ type: 'FETCH_CERTSPOTTER', domain });
  return { hostnames: result.hostnames, status: result.status, error: result.error };
}

// api.subdomain.center: a free passive-DNS/aggregator source, independent of
// the certificate-transparency logs above. Useful as a fallback when crt.sh
// is throwing 502s or rate-limiting, which it does intermittently.
export async function fetchSubdomainCenter(domain: string): Promise<SubdomainSourceResult> {
  const result = await sendToBackground({ type: 'FETCH_SUBDOMAINCENTER', domain });
  return { hostnames: result.hostnames, status: result.status, error: result.error };
}

