import { sendToBackground } from '@/lib/messaging';

export interface CrtShResult {
  hostnames: string[];
  status: number | null;
  error?: string;
}

// Delegates to the background service worker (entrypoints/background.ts),
// which owns the crt.sh query, retry/timeout handling and diagnostic logging.
// Both SubFinder and AutoFinder go through this single helper.
export async function fetchCrtSh(domain: string): Promise<CrtShResult> {
  const result = await sendToBackground({ type: 'FETCH_CRTSH', domain });
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
