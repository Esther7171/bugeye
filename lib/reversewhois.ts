export interface ReverseWhoisDomain {
  domain: string;
  createDate?: string;
  expiryDate?: string;
}

export interface ReverseWhoisResult {
  ok: boolean;
  domains: ReverseWhoisDomain[];
  totalResults?: number;
  error?: string;
  // Set when the response parsed as JSON but didn't match the expected
  // Whoxy shape (their schema isn't independently verified here without a
  // live paid key) - the raw payload is shown instead of silently dropping it.
  unrecognizedShape?: boolean;
  raw?: unknown;
}

interface WhoxyReverseResponse {
  status?: number;
  status_reason?: string;
  total_results?: number;
  search_result?: Array<{
    domain_name?: string;
    create_date?: string;
    expiry_date?: string;
  }>;
}

export function parseReverseWhois(raw: unknown): ReverseWhoisResult {
  const data = raw as WhoxyReverseResponse;

  if (typeof data?.status !== 'number') {
    return { ok: false, domains: [], unrecognizedShape: true, raw, error: 'Unrecognized response shape.' };
  }
  if (data.status !== 1) {
    return { ok: false, domains: [], error: data.status_reason ?? 'Reverse WHOIS query failed.' };
  }
  if (!Array.isArray(data.search_result)) {
    return { ok: false, domains: [], unrecognizedShape: true, raw, error: 'Unrecognized response shape.' };
  }

  const domains = data.search_result
    .map((r) => ({ domain: r.domain_name ?? '', createDate: r.create_date, expiryDate: r.expiry_date }))
    .filter((d) => d.domain);

  return { ok: true, domains, totalResults: data.total_results };
}
