import { sendToBackground } from '@/lib/messaging';

export interface UrlscanHit {
  url: string;
  domain: string;
  ip?: string;
  server?: string;
  country?: string;
  time?: string;
  title?: string;
  scanUrl: string;
  screenshot?: string;
}

export interface UrlscanResponse {
  results: UrlscanHit[];
  total: number;
  domains: string[]; // unique hostnames seen, for feeding SubFinder / BulkOpen
  error?: string;
}

interface RawResult {
  task?: { url?: string; domain?: string; time?: string; uuid?: string };
  page?: { url?: string; domain?: string; ip?: string; server?: string; country?: string; title?: string };
  result?: string;
  screenshot?: string;
}

// urlscan.io's search API is public and key-free (rate-limited). It surfaces
// every URL people have publicly scanned under a domain - a rich, passive
// source of live subdomains, IPs and page metadata.
export async function fetchUrlscan(domain: string): Promise<UrlscanResponse> {
  const clean = domain.trim().toLowerCase().replace(/^www\./, '');
  const url = `https://urlscan.io/api/v1/search/?q=${encodeURIComponent(`domain:${clean}`)}&size=100`;
  const res = await sendToBackground({ type: 'FETCH_JSON', url });
  if (!res.ok || typeof res.data !== 'object' || res.data === null) {
    return { results: [], total: 0, domains: [], error: res.error ?? 'urlscan.io lookup failed.' };
  }

  const data = res.data as { results?: RawResult[]; total?: number };
  const results: UrlscanHit[] = (data.results ?? [])
    .map((r) => {
      const uuid = r.task?.uuid;
      return {
        url: r.task?.url ?? r.page?.url ?? '',
        domain: r.task?.domain ?? r.page?.domain ?? '',
        ip: r.page?.ip,
        server: r.page?.server,
        country: r.page?.country,
        time: r.task?.time,
        title: r.page?.title,
        scanUrl: uuid ? `https://urlscan.io/result/${uuid}/` : '',
        screenshot: r.screenshot,
      };
    })
    .filter((r) => r.url);

  const domains = Array.from(
    new Set(
      results
        .map((r) => r.domain)
        .filter((d): d is string => !!d && (d === clean || d.endsWith(`.${clean}`))),
    ),
  ).sort();

  return { results, total: data.total ?? results.length, domains };
}
