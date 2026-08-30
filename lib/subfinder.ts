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

export async function fetchOtxPassiveDns(domain: string): Promise<string[]> {
  const result = await sendToBackground({
    type: 'FETCH_JSON',
    url: `https://otx.alienvault.com/api/v1/indicators/domain/${encodeURIComponent(domain)}/passive_dns`,
  });
  if (!result.ok || typeof result.data !== 'object' || result.data === null) return [];
  const records = (result.data as { passive_dns?: Array<{ hostname?: string }> }).passive_dns ?? [];
  const names = new Set<string>();
  for (const r of records) {
    const hostname = r.hostname?.toLowerCase().trim();
    if (hostname && hostname.endsWith(domain)) names.add(hostname);
  }
  return Array.from(names).sort();
}
