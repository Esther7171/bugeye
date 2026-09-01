export interface HstsPreloadResult {
  domain: string;
  status: string;
  preloaded: boolean;
  includeSubdomains?: boolean;
  detail: string;
}

export function parseHstsPreload(domain: string, raw: unknown): HstsPreloadResult {
  const data = (raw ?? {}) as Record<string, unknown>;
  const chrome = (data.chrome ?? data.chromium ?? {}) as Record<string, unknown>;
  const status = String(
    data.status ?? data.preload_list_status ?? chrome.status ?? 'unknown',
  ).toLowerCase();
  const preloaded =
    status === 'preloaded' ||
    data.chrome_preloaded === true ||
    chrome.mode === 'force-https' ||
    String(chrome.mode ?? '').toLowerCase() === 'force-https';
  const includeSubdomains =
    typeof chrome.include_subdomains === 'boolean'
      ? chrome.include_subdomains
      : typeof data.include_subdomains === 'boolean'
        ? data.include_subdomains
        : undefined;

  let detail: string;
  if (preloaded) {
    detail = includeSubdomains
      ? 'On the public HSTS preload list, including subdomains.'
      : 'On the public HSTS preload list.';
  } else if (status === 'pending') {
    detail = 'Submitted and pending; not in browsers yet.';
  } else if (status === 'rejected' || status === 'removed') {
    detail = `Preload status: ${status}.`;
  } else {
    detail = 'Not on the public HSTS preload list (or status unknown).';
  }

  return { domain, status: status || 'unknown', preloaded, includeSubdomains, detail };
}
