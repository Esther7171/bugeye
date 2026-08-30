import { browser } from 'wxt/browser';
import type { Browser } from 'wxt/browser';
import type { BgRequest, BgResponseMap, RequestLogEntry } from '@/lib/messaging';
import type { AliveCheckResult, UrlHeadersResult, TabHeadersResult } from '@/types';

function toOriginPattern(origin: string): string {
  return origin.endsWith('/*') ? origin : `${origin}/*`;
}

// Distinguishes rate-limiting and other non-2xx statuses in one place so every
// external-API handler surfaces the same, informative wording instead of a
// generic "request failed".
function httpStatusMessage(status: number): string {
  if (status === 429) return `Rate limited (HTTP 429). Try again in a moment.`;
  if (status === 401 || status === 403) return `Access denied (HTTP ${status}).`;
  if (status === 404) return `Not found (HTTP 404).`;
  if (status >= 500) return `Server error (HTTP ${status}).`;
  return `Request failed (HTTP ${status}).`;
}

function describeFetchError(err: unknown): string {
  if (err instanceof DOMException && err.name === 'AbortError') return 'Request timed out.';
  return err instanceof Error ? err.message : String(err);
}

async function hasHostPermission(origin: string): Promise<boolean> {
  try {
    return await browser.permissions.contains({ origins: [toOriginPattern(origin)] });
  } catch {
    return false;
  }
}

async function requestHostPermission(origin: string): Promise<boolean> {
  try {
    return await browser.permissions.request({ origins: [toOriginPattern(origin)] });
  } catch {
    return false;
  }
}

async function hasHostPermissions(origins: string[]): Promise<boolean> {
  try {
    return await browser.permissions.contains({ origins: origins.map(toOriginPattern) });
  } catch {
    return false;
  }
}

async function requestHostPermissions(origins: string[]): Promise<boolean> {
  try {
    return await browser.permissions.request({ origins: origins.map(toOriginPattern) });
  } catch {
    return false;
  }
}

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function handleAliveCheck(url: string, timeoutMs = 7000): Promise<AliveCheckResult> {
  const start = performance.now();
  try {
    const res = await fetchWithTimeout(url, { method: 'GET', redirect: 'follow' }, timeoutMs);
    const ms = Math.round(performance.now() - start);
    return {
      url,
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      category: res.status > 0 ? 'live' : 'dead',
      ms,
    };
  } catch (err) {
    const ms = Math.round(performance.now() - start);
    const message = describeFetchError(err);
    const blocked = /NetworkError|Failed to fetch|CORS/i.test(message);
    return {
      url,
      ok: false,
      status: null,
      statusText: message,
      category: blocked ? 'blocked' : 'dead',
      ms,
    };
  }
}

interface CrtShEntryRaw {
  name_value?: string;
  common_name?: string;
  issuer_name?: string;
  not_before?: string;
  not_after?: string;
}

async function fetchCrtShOnce(domain: string, timeoutMs: number) {
  const url = `https://crt.sh/?q=${encodeURIComponent(`%.${domain}`)}&output=json`;
  const res = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } }, timeoutMs);
  const text = await res.text();
  console.log(
    `[BugEye] crt.sh status=${res.status} domain=${domain} bodyPreview=`,
    text.slice(0, 500),
  );
  return { status: res.status, text };
}

interface CrtShJsonResult {
  status: number | null;
  json: CrtShEntryRaw[] | null;
  error?: string;
}

async function fetchCrtShJson(rawDomain: string): Promise<CrtShJsonResult> {
  const domain = rawDomain.trim().toLowerCase().replace(/^www\./, '');
  if (!domain) return { status: null, json: null, error: 'Empty domain' };

  let status: number | null = null;
  let text = '';
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= 2; attempt++) {
    if (attempt > 1) {
      // crt.sh rate-limits (429) and 502s under load; back off before retrying
      // instead of hammering it immediately.
      const backoffMs = status === 429 ? 5000 : 2000;
      await new Promise((r) => setTimeout(r, backoffMs));
    }
    try {
      const result = await fetchCrtShOnce(domain, 15000);
      status = result.status;
      text = result.text;
      if (result.status >= 200 && result.status < 300 && result.text.trim().length > 0) break;
      lastError = `crt.sh: ${httpStatusMessage(result.status)}`;
    } catch (err) {
      lastError = describeFetchError(err);
      console.log(`[BugEye] crt.sh attempt ${attempt} for ${domain} failed:`, lastError);
    }
  }

  if (!text.trim()) {
    return { status, json: null, error: lastError ?? 'No response from crt.sh' };
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    console.log(`[BugEye] crt.sh response for ${domain} was not valid JSON (status ${status})`);
    return { status, json: null, error: 'crt.sh response was not valid JSON' };
  }

  if (!Array.isArray(json)) {
    return { status, json: null, error: 'Unexpected crt.sh response shape' };
  }

  return { status, json: json as CrtShEntryRaw[] };
}

async function handleFetchCrtsh(rawDomain: string): Promise<BgResponseMap['FETCH_CRTSH']> {
  const domain = rawDomain.trim().toLowerCase().replace(/^www\./, '');
  const { status, json, error } = await fetchCrtShJson(rawDomain);
  if (!json) return { ok: false, hostnames: [], status, error };

  const names = new Set<string>();
  for (const entry of json) {
    const fields = [entry.name_value, entry.common_name].filter((v): v is string => !!v);
    for (const field of fields) {
      for (const line of field.split('\n')) {
        const clean = line.trim().toLowerCase().replace(/^\*\./, '');
        if (clean && (clean === domain || clean.endsWith(`.${domain}`))) names.add(clean);
      }
    }
  }

  const hostnames = Array.from(names).sort();
  console.log(
    `[BugEye] crt.sh parsed ${hostnames.length} unique hostnames for ${domain} (status ${status}, ${json.length} raw entries)`,
  );
  return { ok: true, hostnames, status };
}

async function handleFetchCrtshCerts(rawDomain: string): Promise<BgResponseMap['FETCH_CRTSH_CERTS']> {
  const { status, json, error } = await fetchCrtShJson(rawDomain);
  if (!json) return { ok: false, entries: [], status, error };

  const entries = json
    .filter((e) => e.not_before && e.not_after)
    .map((e) => ({
      commonName: e.common_name ?? '',
      issuerName: e.issuer_name ?? 'Unknown issuer',
      notBefore: e.not_before!,
      notAfter: e.not_after!,
      nameValue: e.name_value ?? '',
    }));
  return { ok: true, entries, status };
}

async function handleGetUrlHeaders(url: string): Promise<UrlHeadersResult> {
  try {
    const res = await fetchWithTimeout(url, { method: 'GET', redirect: 'follow' }, 8000);
    return { url, status: res.status, headers: headersToRecord(res.headers) };
  } catch (err) {
    return {
      url,
      status: null,
      headers: {},
      error: describeFetchError(err),
    };
  }
}

async function handleGetTabHeaders(tabId: number, url: string): Promise<TabHeadersResult> {
  const origin = new URL(url).origin;
  const has = await hasHostPermission(origin);
  if (!has) {
    return handleGetUrlHeaders(url).then((r) => ({
      url,
      status: r.status,
      headers: r.headers,
      method: 'fetch' as const,
      error: r.error ?? 'No host permission granted for webRequest capture; used fetch fallback.',
    }));
  }

  return new Promise<TabHeadersResult>((resolve) => {
    let settled = false;
    const timer = setTimeout(async () => {
      if (settled) return;
      settled = true;
      browser.webRequest.onHeadersReceived.removeListener(listener);
      const fallback = await handleGetUrlHeaders(url);
      resolve({
        url,
        status: fallback.status,
        headers: fallback.headers,
        method: 'fetch',
        error: fallback.error ?? 'webRequest capture timed out; used fetch fallback.',
      });
    }, 9000);

    function listener(details: Browser.webRequest.OnHeadersReceivedDetails): undefined {
      if (details.tabId !== tabId || details.type !== 'main_frame') return undefined;
      if (settled) return undefined;
      settled = true;
      clearTimeout(timer);
      browser.webRequest.onHeadersReceived.removeListener(listener);
      const headers: Record<string, string> = {};
      for (const h of details.responseHeaders ?? []) {
        if (h.name) headers[h.name.toLowerCase()] = h.value ?? '';
      }
      resolve({ url: details.url, status: details.statusCode, headers, method: 'webrequest' });
      return undefined;
    }

    browser.webRequest.onHeadersReceived.addListener(
      listener,
      { urls: ['<all_urls>'], types: ['main_frame'] },
      ['responseHeaders', 'extraHeaders'],
    );

    browser.tabs.reload(tabId).catch(async () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      browser.webRequest.onHeadersReceived.removeListener(listener);
      const fallback = await handleGetUrlHeaders(url);
      resolve({ url, status: fallback.status, headers: fallback.headers, method: 'fetch', error: fallback.error });
    });
  });
}

async function handleOpenTabs(urls: string[], delayMs: number, newWindow: boolean, groupTitle?: string) {
  let opened = 0;
  let windowId: number | undefined;
  const tabIds: number[] = [];

  for (const url of urls) {
    if (newWindow && windowId === undefined) {
      const win = await browser.windows.create({ url, focused: false });
      windowId = win?.id;
      if (win?.tabs?.[0]?.id) tabIds.push(win.tabs[0].id);
    } else {
      const tab = await browser.tabs.create({ url, windowId, active: false });
      if (tab.id) tabIds.push(tab.id);
    }
    opened += 1;
    if (delayMs > 0 && opened < urls.length) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  if (groupTitle && browser.tabs.group && tabIds.length > 0) {
    try {
      const groupId = await browser.tabs.group({ tabIds: tabIds as [number, ...number[]] });
      await browser.tabGroups.update(groupId, { title: groupTitle });
    } catch {
      // tab groups unsupported (e.g. Firefox) - ignore
    }
  }

  return { opened };
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

async function handleFetchFavicon(url: string): Promise<BgResponseMap['FETCH_FAVICON']> {
  try {
    const res = await fetchWithTimeout(url, {}, 8000);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0) return { ok: false, error: 'Empty response (no favicon at this path)' };
    return {
      ok: true,
      base64: bytesToBase64(new Uint8Array(buf)),
      contentType: res.headers.get('content-type') ?? undefined,
    };
  } catch (err) {
    return { ok: false, error: describeFetchError(err) };
  }
}

interface IpWhoIsResponse {
  success?: boolean;
  message?: string;
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  connection?: { isp?: string; org?: string; asn?: number | string };
  security?: { proxy?: boolean; hosting?: boolean };
}

interface IpApiResponse {
  status: string;
  message?: string;
  country?: string;
  regionName?: string;
  city?: string;
  isp?: string;
  org?: string;
  as?: string;
  proxy?: boolean;
  hosting?: boolean;
  lat?: number;
  lon?: number;
}

async function handleFetchIpGeo(ip: string): Promise<BgResponseMap['FETCH_IPGEO']> {
  let primaryError: string | undefined;
  try {
    const res = await fetchWithTimeout(`https://ipwho.is/${encodeURIComponent(ip)}`, {}, 8000);
    if (!res.ok) {
      primaryError = `ipwho.is: ${httpStatusMessage(res.status)}`;
    } else {
      const json = (await res.json()) as IpWhoIsResponse;
      if (json.success === false) {
        primaryError = `ipwho.is: ${json.message ?? 'lookup failed'}`;
      } else {
        return {
          ok: true,
          source: 'ipwho.is',
          ip,
          country: json.country,
          region: json.region,
          city: json.city,
          isp: json.connection?.isp,
          org: json.connection?.org,
          asn: json.connection?.asn !== undefined ? String(json.connection.asn) : undefined,
          hosting: json.security?.hosting ?? null,
          proxy: json.security?.proxy ?? null,
          lat: json.latitude,
          lon: json.longitude,
        };
      }
    }
  } catch (err) {
    primaryError = `ipwho.is: ${describeFetchError(err)}`;
  }

  try {
    const res = await fetchWithTimeout(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,regionName,city,isp,org,as,proxy,hosting,lat,lon`,
      {},
      8000,
    );
    if (!res.ok) {
      return { ok: false, ip, error: `${primaryError} | ip-api.com fallback: ${httpStatusMessage(res.status)}` };
    }
    const json = (await res.json()) as IpApiResponse;
    if (json.status !== 'success') {
      return { ok: false, ip, error: `${primaryError} | ip-api.com fallback: ${json.message ?? 'lookup failed'}` };
    }
    return {
      ok: true,
      source: 'ip-api.com',
      ip,
      country: json.country,
      region: json.regionName,
      city: json.city,
      isp: json.isp,
      org: json.org,
      asn: json.as,
      hosting: json.hosting ?? null,
      proxy: json.proxy ?? null,
      lat: json.lat,
      lon: json.lon,
    };
  } catch (err) {
    return { ok: false, ip, error: `${primaryError} | ip-api.com fallback: ${describeFetchError(err)}` };
  }
}

interface ShodanInternetDbRaw {
  ip?: string;
  ports?: number[];
  vulns?: string[];
  hostnames?: string[];
  tags?: string[];
  cpes?: string[];
  detail?: string;
}

async function handleFetchShodanInternetDb(ip: string): Promise<BgResponseMap['FETCH_SHODAN_INTERNETDB']> {
  try {
    const res = await fetchWithTimeout(`https://internetdb.shodan.io/${encodeURIComponent(ip)}`, {}, 8000);
    if (res.status === 404) return { ok: false, ip, error: 'No InternetDB record for this IP.' };
    if (!res.ok) return { ok: false, ip, error: httpStatusMessage(res.status) };
    const json = (await res.json()) as ShodanInternetDbRaw;
    return {
      ok: true,
      ip,
      ports: json.ports ?? [],
      vulns: json.vulns ?? [],
      hostnames: json.hostnames ?? [],
      tags: json.tags ?? [],
      cpes: json.cpes ?? [],
    };
  } catch (err) {
    return { ok: false, ip, error: describeFetchError(err) };
  }
}

async function handleFetchShodanHost(ip: string, apiKey: string): Promise<BgResponseMap['FETCH_SHODAN_HOST']> {
  try {
    const res = await fetchWithTimeout(
      `https://api.shodan.io/shodan/host/${encodeURIComponent(ip)}?key=${encodeURIComponent(apiKey)}`,
      {},
      10000,
    );
    if (!res.ok) {
      const json = await res.json().catch(() => undefined);
      const message = (json as { error?: string } | undefined)?.error ?? httpStatusMessage(res.status);
      return { ok: false, error: message };
    }
    return { ok: true, data: await res.json() };
  } catch (err) {
    return { ok: false, error: describeFetchError(err) };
  }
}

async function handleDohQuery(
  hostname: string,
  recordType: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'NS' | 'TXT' | 'SOA' | 'CAA' | 'PTR' | 'DNSKEY' | 'DS',
): Promise<BgResponseMap['DOH_QUERY']> {
  try {
    const res = await fetchWithTimeout(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=${recordType}&do=1`,
      { headers: { Accept: 'application/dns-json' } },
      8000,
    );
    if (!res.ok) return { ok: false, answers: [], error: httpStatusMessage(res.status) };
    const json = await res.json();
    const answers = ((json.Answer ?? []) as { name: string; type: number; data: string }[]).map((a) => ({
      name: a.name,
      type: a.type,
      data: a.data,
    }));
    return { ok: true, answers, authenticData: !!json.AD };
  } catch (err) {
    return { ok: false, answers: [], error: describeFetchError(err) };
  }
}

interface XposedOrNotResponse {
  breaches?: string[][];
  Error?: string;
}

async function fetchXposedOrNot(email: string): Promise<BgResponseMap['BREACH_CHECK']> {
  try {
    const res = await fetchWithTimeout(
      `https://api.xposedornot.com/v1/check-email/${encodeURIComponent(email)}`,
      {},
      10000,
    );
    if (res.status === 404) return { ok: true, source: 'xposedornot', breached: false, breaches: [] };
    if (!res.ok) return { ok: false, source: 'xposedornot', breached: false, breaches: [], error: httpStatusMessage(res.status) };
    const json = (await res.json()) as XposedOrNotResponse;
    const names = json.breaches?.[0] ?? [];
    return {
      ok: true,
      source: 'xposedornot',
      breached: names.length > 0,
      breaches: names.map((name) => ({ name })),
    };
  } catch (err) {
    return { ok: false, source: 'xposedornot', breached: false, breaches: [], error: describeFetchError(err) };
  }
}

interface HibpBreach {
  Name: string;
  Domain?: string;
  BreachDate?: string;
}

async function fetchHibp(email: string, apiKey: string): Promise<BgResponseMap['BREACH_CHECK']> {
  try {
    const res = await fetchWithTimeout(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`,
      { headers: { 'hibp-api-key': apiKey } },
      10000,
    );
    if (res.status === 404) return { ok: true, source: 'hibp', breached: false, breaches: [] };
    if (!res.ok) return { ok: false, source: 'hibp', breached: false, breaches: [], error: `HIBP: ${httpStatusMessage(res.status)}` };
    const json = (await res.json()) as HibpBreach[];
    return {
      ok: true,
      source: 'hibp',
      breached: json.length > 0,
      breaches: json.map((b) => ({ name: b.Name, domain: b.Domain, breachDate: b.BreachDate })),
    };
  } catch (err) {
    return { ok: false, source: 'hibp', breached: false, breaches: [], error: `HIBP: ${describeFetchError(err)}` };
  }
}

async function handleBreachCheck(email: string, hibpApiKey?: string): Promise<BgResponseMap['BREACH_CHECK']> {
  if (hibpApiKey?.trim()) {
    const hibpResult = await fetchHibp(email, hibpApiKey.trim());
    if (hibpResult.ok) return hibpResult;
  }
  return fetchXposedOrNot(email);
}

async function handleCorsCheck(url: string): Promise<BgResponseMap['CORS_CHECK']> {
  const requestOrigin = browser.runtime.getURL('').replace(/\/$/, '');
  try {
    const res = await fetchWithTimeout(url, { mode: 'cors', credentials: 'include' }, 8000);
    const acao = res.headers.get('access-control-allow-origin') ?? undefined;
    const acac = res.headers.get('access-control-allow-credentials') ?? undefined;
    const reflected = !!acao && (acao === '*' || acao.toLowerCase() === requestOrigin.toLowerCase());
    const wildcardWithCredentials = acao === '*' && acac?.toLowerCase() === 'true';
    return { ok: true, status: res.status, requestOrigin, acao, acac, reflected, wildcardWithCredentials };
  } catch (err) {
    const message = describeFetchError(err);
    const blockedByCors = /Failed to fetch|NetworkError|Load failed/i.test(message);
    return {
      ok: false,
      requestOrigin,
      reflected: false,
      wildcardWithCredentials: false,
      blockedByCors,
      error: blockedByCors
        ? 'Request was blocked by the browser (no permissive CORS headers returned). This is the expected, safe outcome.'
        : message,
    };
  }
}

async function handleHttpMethodsCheck(url: string): Promise<BgResponseMap['HTTP_METHODS_CHECK']> {
  try {
    const res = await fetchWithTimeout(url, { method: 'OPTIONS' }, 8000);
    const allowHeader = res.headers.get('allow');
    const acamHeader = res.headers.get('access-control-allow-methods');
    return {
      ok: true,
      status: res.status,
      allow: allowHeader ? allowHeader.split(',').map((m) => m.trim().toUpperCase()) : undefined,
      accessControlAllowMethods: acamHeader ? acamHeader.split(',').map((m) => m.trim().toUpperCase()) : undefined,
    };
  } catch (err) {
    return { ok: false, error: describeFetchError(err) };
  }
}

async function handleRedirectTrace(startUrl: string): Promise<BgResponseMap['REDIRECT_TRACE']> {
  const MAX_HOPS = 15;
  return new Promise((resolve) => {
    const hops: { url: string; status: number; location?: string }[] = [];
    let settled = false;

    function onBeforeRedirect(details: Browser.webRequest.OnBeforeRedirectDetails) {
      if (details.tabId !== -1) return;
      hops.push({ url: details.url, status: details.statusCode, location: details.redirectUrl });
      if (hops.length >= MAX_HOPS) finish(true);
    }
    function onCompleted(details: Browser.webRequest.OnCompletedDetails) {
      if (details.tabId !== -1) return;
      hops.push({ url: details.url, status: details.statusCode });
      finish(false);
    }
    function onErrorOccurred(details: Browser.webRequest.OnErrorOccurredDetails) {
      if (details.tabId !== -1) return;
      finish(false);
    }

    function cleanup() {
      browser.webRequest.onBeforeRedirect.removeListener(onBeforeRedirect);
      browser.webRequest.onCompleted.removeListener(onCompleted);
      browser.webRequest.onErrorOccurred.removeListener(onErrorOccurred);
      clearTimeout(timer);
    }
    function finish(truncated: boolean) {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ ok: hops.length > 0, hops, truncated });
    }

    const timer = setTimeout(() => finish(hops.length >= MAX_HOPS), 12000);

    browser.webRequest.onBeforeRedirect.addListener(onBeforeRedirect, { urls: ['<all_urls>'] });
    browser.webRequest.onCompleted.addListener(onCompleted, { urls: ['<all_urls>'] });
    browser.webRequest.onErrorOccurred.addListener(onErrorOccurred, { urls: ['<all_urls>'] });

    fetch(startUrl, { redirect: 'follow', mode: 'no-cors' }).catch(() => finish(false));
  });
}

// Session rule ids are namespaced per tab (mod 1000) so each tab's rule set can be
// replaced independently without touching other tabs' active rules.
const HEADER_RULES_PER_TAB = 50;
function headerRuleIds(tabId: number): number[] {
  const base = 10000 + (tabId % 1000) * HEADER_RULES_PER_TAB;
  return Array.from({ length: HEADER_RULES_PER_TAB }, (_, i) => base + i);
}
function uaRuleId(tabId: number): number {
  return 60000 + (tabId % 1000);
}
function refererRuleId(tabId: number): number {
  return 70000 + (tabId % 1000);
}

async function handleSetHeaderRules(
  tabId: number,
  rules: { name: string; value: string; enabled: boolean }[],
): Promise<BgResponseMap['SET_HEADER_RULES']> {
  try {
    const ids = headerRuleIds(tabId);
    const addRules = rules
      .filter((r) => r.enabled && r.name.trim())
      .slice(0, HEADER_RULES_PER_TAB)
      .map((r, i) => ({
        id: ids[i]!,
        priority: 1,
        action: {
          type: 'modifyHeaders' as const,
          requestHeaders: [{ header: r.name.trim(), operation: 'set' as const, value: r.value }],
        },
        condition: { tabIds: [tabId] },
      }));
    await browser.declarativeNetRequest.updateSessionRules({ removeRuleIds: ids, addRules });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: describeFetchError(err) };
  }
}

async function handleSetUaRule(
  tabId: number,
  enabled: boolean,
  value: string,
): Promise<BgResponseMap['SET_UA_RULE']> {
  try {
    const id = uaRuleId(tabId);
    const addRules =
      enabled && value.trim()
        ? [
            {
              id,
              priority: 1,
              action: {
                type: 'modifyHeaders' as const,
                requestHeaders: [{ header: 'User-Agent', operation: 'set' as const, value }],
              },
              condition: { tabIds: [tabId] },
            },
          ]
        : [];
    await browser.declarativeNetRequest.updateSessionRules({ removeRuleIds: [id], addRules });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: describeFetchError(err) };
  }
}

async function handleSetRefererRule(
  tabId: number,
  mode: 'off' | 'strip' | 'spoof',
  spoofValue: string,
): Promise<BgResponseMap['SET_REFERER_RULE']> {
  try {
    const id = refererRuleId(tabId);
    let addRules: Browser.declarativeNetRequest.Rule[] = [];
    if (mode === 'strip') {
      addRules = [
        {
          id,
          priority: 1,
          action: {
            type: 'modifyHeaders',
            requestHeaders: [{ header: 'Referer', operation: 'remove' }],
          },
          condition: { tabIds: [tabId] },
        },
      ];
    } else if (mode === 'spoof' && spoofValue.trim()) {
      addRules = [
        {
          id,
          priority: 1,
          action: {
            type: 'modifyHeaders',
            requestHeaders: [{ header: 'Referer', operation: 'set', value: spoofValue.trim() }],
          },
          condition: { tabIds: [tabId] },
        },
      ];
    }
    await browser.declarativeNetRequest.updateSessionRules({ removeRuleIds: [id], addRules });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: describeFetchError(err) };
  }
}

const REQUEST_LOG_LIMIT = 300;
const requestLogs = new Map<number, RequestLogEntry[]>();
const loggingTabs = new Set<number>();

function recordRequest(tabId: number, entry: RequestLogEntry) {
  if (!loggingTabs.has(tabId)) return;
  const list = requestLogs.get(tabId) ?? [];
  list.push(entry);
  if (list.length > REQUEST_LOG_LIMIT) list.splice(0, list.length - REQUEST_LOG_LIMIT);
  requestLogs.set(tabId, list);
}

export default defineBackground(() => {
  browser.webRequest.onCompleted.addListener(
    (details) => {
      recordRequest(details.tabId, {
        id: details.requestId,
        method: details.method,
        url: details.url,
        status: details.statusCode,
        type: details.type,
        timeStamp: details.timeStamp,
      });
    },
    { urls: ['<all_urls>'] },
  );

  browser.webRequest.onErrorOccurred.addListener(
    (details) => {
      recordRequest(details.tabId, {
        id: details.requestId,
        method: details.method,
        url: details.url,
        status: null,
        type: details.type,
        timeStamp: details.timeStamp,
      });
    },
    { urls: ['<all_urls>'] },
  );

  // Traffic-rule and request-log state is keyed by tabId; when a tab closes,
  // its session rules and captured requests are unreachable but would
  // otherwise sit around until the browser session ends. Clean them up
  // immediately so nothing lingers past the tab's lifetime.
  browser.tabs.onRemoved.addListener((tabId) => {
    const removeRuleIds = [...headerRuleIds(tabId), uaRuleId(tabId), refererRuleId(tabId)];
    browser.declarativeNetRequest.updateSessionRules({ removeRuleIds }).catch(() => {});
    requestLogs.delete(tabId);
    loggingTabs.delete(tabId);
  });

  if (browser.sidePanel) {
    browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  }

  browser.runtime.onMessage.addListener((message: BgRequest, _sender, sendResponse) => {
    (async () => {
      switch (message.type) {
        case 'PING':
          sendResponse({ ok: true });
          break;
        case 'FETCH_JSON': {
          try {
            const res = await fetchWithTimeout(message.url);
            const data = await res.json().catch(() => undefined);
            sendResponse({
              ok: res.ok,
              data,
              status: res.status,
              error: res.ok ? undefined : httpStatusMessage(res.status),
            });
          } catch (err) {
            sendResponse({ ok: false, error: describeFetchError(err) });
          }
          break;
        }
        case 'FETCH_TEXT': {
          try {
            const res = await fetchWithTimeout(message.url);
            const data = await res.text();
            sendResponse({
              ok: res.ok,
              data,
              status: res.status,
              error: res.ok ? undefined : httpStatusMessage(res.status),
            });
          } catch (err) {
            sendResponse({ ok: false, error: describeFetchError(err) });
          }
          break;
        }
        case 'ALIVE_CHECK':
          sendResponse(await handleAliveCheck(message.url, message.timeoutMs));
          break;
        case 'HEAD_PROBE': {
          try {
            const res = await fetchWithTimeout(message.url, { method: 'HEAD' }, 6000);
            sendResponse({ ok: res.ok, status: res.status });
          } catch (err) {
            sendResponse({ ok: false, status: null, error: describeFetchError(err) });
          }
          break;
        }
        case 'DOH_RESOLVE': {
          try {
            const res = await fetchWithTimeout(
              `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(message.hostname)}&type=A`,
              { headers: { Accept: 'application/dns-json' } },
              6000,
            );
            const json = await res.json();
            const addresses = (json.Answer ?? [])
              .filter((a: { type: number }) => a.type === 1)
              .map((a: { data: string }) => a.data);
            sendResponse({ ok: true, addresses });
          } catch (err) {
            sendResponse({ ok: false, error: describeFetchError(err) });
          }
          break;
        }
        case 'FETCH_CRTSH':
          sendResponse(await handleFetchCrtsh(message.domain));
          break;
        case 'GET_URL_HEADERS':
          sendResponse(await handleGetUrlHeaders(message.url));
          break;
        case 'GET_TAB_HEADERS':
          sendResponse(await handleGetTabHeaders(message.tabId, message.url));
          break;
        case 'REQUEST_HOST_PERMISSION':
          sendResponse({ granted: await requestHostPermission(message.origin) });
          break;
        case 'HAS_HOST_PERMISSION':
          sendResponse({ granted: await hasHostPermission(message.origin) });
          break;
        case 'REQUEST_HOST_PERMISSIONS':
          sendResponse({ granted: await requestHostPermissions(message.origins) });
          break;
        case 'HAS_HOST_PERMISSIONS':
          sendResponse({ granted: await hasHostPermissions(message.origins) });
          break;
        case 'OPEN_TABS':
          sendResponse(
            await handleOpenTabs(message.urls, message.delayMs, message.newWindow, message.groupTitle),
          );
          break;
        case 'SET_HEADER_RULES':
          sendResponse(await handleSetHeaderRules(message.tabId, message.rules));
          break;
        case 'SET_UA_RULE':
          sendResponse(await handleSetUaRule(message.tabId, message.enabled, message.value));
          break;
        case 'SET_REFERER_RULE':
          sendResponse(await handleSetRefererRule(message.tabId, message.mode, message.spoofValue));
          break;
        case 'GET_REQUEST_LOG':
          sendResponse({
            entries: requestLogs.get(message.tabId) ?? [],
            logging: loggingTabs.has(message.tabId),
          });
          break;
        case 'CLEAR_REQUEST_LOG':
          requestLogs.delete(message.tabId);
          sendResponse({ ok: true });
          break;
        case 'SET_REQUEST_LOGGING':
          if (message.enabled) loggingTabs.add(message.tabId);
          else loggingTabs.delete(message.tabId);
          sendResponse({ ok: true, logging: message.enabled });
          break;
        case 'FETCH_FAVICON':
          sendResponse(await handleFetchFavicon(message.url));
          break;
        case 'FETCH_CRTSH_CERTS':
          sendResponse(await handleFetchCrtshCerts(message.domain));
          break;
        case 'FETCH_IPGEO':
          sendResponse(await handleFetchIpGeo(message.ip));
          break;
        case 'FETCH_SHODAN_INTERNETDB':
          sendResponse(await handleFetchShodanInternetDb(message.ip));
          break;
        case 'FETCH_SHODAN_HOST':
          sendResponse(await handleFetchShodanHost(message.ip, message.apiKey));
          break;
        case 'CORS_CHECK':
          sendResponse(await handleCorsCheck(message.url));
          break;
        case 'HTTP_METHODS_CHECK':
          sendResponse(await handleHttpMethodsCheck(message.url));
          break;
        case 'REDIRECT_TRACE':
          sendResponse(await handleRedirectTrace(message.url));
          break;
        case 'DOH_QUERY':
          sendResponse(await handleDohQuery(message.hostname, message.recordType));
          break;
        case 'BREACH_CHECK':
          sendResponse(await handleBreachCheck(message.email, message.hibpApiKey));
          break;
        default:
          sendResponse({ ok: false, error: 'Unknown message type' });
      }
    })();
    return true;
  });
});
