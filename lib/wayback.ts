import { sendToBackground } from '@/lib/messaging';

export async function fetchWaybackUrls(domain: string): Promise<{ urls: string[]; error?: string }> {
  const url = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(`${domain}/*`)}&output=json&fl=original&collapse=urlkey&limit=5000`;
  const result = await sendToBackground({ type: 'FETCH_JSON', url });
  if (!result.ok || !Array.isArray(result.data)) {
    return { urls: [], error: result.error ?? 'Wayback CDX lookup failed.' };
  }
  const rows = result.data as string[][];
  const urls = rows.slice(1).map((r) => r[0]).filter((v): v is string => !!v);
  return { urls: Array.from(new Set(urls)) };
}
