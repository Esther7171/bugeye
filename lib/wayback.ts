import { sendToBackground } from '@/lib/messaging';

// The Wayback CDX endpoint is frequently overloaded and returns 5xx/"temporarily
// offline" pages, so a single request fails intermittently. Retry a couple of
// times with a short backoff, and surface a clear "archive is having trouble"
// message rather than a bare failure when it stays down.
export async function fetchWaybackUrls(domain: string): Promise<{ urls: string[]; error?: string }> {
  const url = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(`${domain}/*`)}&output=json&fl=original&collapse=urlkey&limit=5000`;

  let lastError: string | undefined;
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (attempt > 1) await new Promise((r) => setTimeout(r, 1500 * (attempt - 1)));
    const result = await sendToBackground({ type: 'FETCH_JSON', url });
    if (result.ok && Array.isArray(result.data)) {
      const rows = result.data as string[][];
      const urls = rows.slice(1).map((r) => r[0]).filter((v): v is string => !!v);
      return { urls: Array.from(new Set(urls)) };
    }
    lastError = result.error;
  }

  return {
    urls: [],
    error:
      lastError
        ? `Wayback Machine did not respond (${lastError}). Its CDX service is often temporarily overloaded - try again shortly.`
        : 'Wayback Machine did not respond. Its CDX service is often temporarily overloaded - try again shortly.',
  };
}
