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

// api.subdomain.center: a free passive-DNS/aggregator source, independent of
// the certificate-transparency logs above. Useful as a fallback when crt.sh
// is throwing 502s or rate-limiting, which it does intermittently.
export async function fetchSubdomainCenter(domain: string): Promise<SubdomainSourceResult> {
  const result = await sendToBackground({ type: 'FETCH_SUBDOMAINCENTER', domain });
  return { hostnames: result.hostnames, status: result.status, error: result.error };
}

