import { browser } from 'wxt/browser';
import type { AliveCheckResult, UrlHeadersResult, TabHeadersResult } from '@/types';

export type BgRequest =
  | { type: 'PING' }
  | { type: 'FETCH_JSON'; url: string }
  | { type: 'FETCH_TEXT'; url: string }
  | { type: 'ALIVE_CHECK'; url: string; timeoutMs?: number }
  | { type: 'HEAD_PROBE'; url: string }
  | { type: 'DOH_RESOLVE'; hostname: string }
  | { type: 'FETCH_CRTSH'; domain: string }
  | { type: 'FETCH_CRTNAME'; domain: string }
  | { type: 'FETCH_HACKERTARGET'; domain: string }
  | { type: 'FETCH_CERTSPOTTER'; domain: string }
  | { type: 'FETCH_SUBDOMAINCENTER'; domain: string }
  | { type: 'FETCH_RDAP'; domain: string }
  | { type: 'FETCH_HACKERTARGET_WHOIS'; domain: string }
  | { type: 'HTTP_PROBE'; url: string }
  | { type: 'FETCH_GITHUB_EMAIL'; email: string }
  | { type: 'GET_URL_HEADERS'; url: string }
  | { type: 'GET_TAB_HEADERS'; tabId: number; url: string }
  | { type: 'OPEN_TABS'; urls: string[]; delayMs: number; newWindow: boolean; groupTitle?: string }
  | {
      type: 'SET_HEADER_RULES';
      tabId: number;
      rules: { name: string; value: string; enabled: boolean }[];
    }
  | { type: 'SET_UA_RULE'; tabId: number; enabled: boolean; value: string }
  | { type: 'SET_REFERER_RULE'; tabId: number; mode: 'off' | 'strip' | 'spoof'; spoofValue: string }
  | { type: 'GET_REQUEST_LOG'; tabId: number }
  | { type: 'CLEAR_REQUEST_LOG'; tabId: number }
  | { type: 'SET_REQUEST_LOGGING'; tabId: number; enabled: boolean }
  | { type: 'FETCH_FAVICON'; url: string }
  | { type: 'FETCH_CRTSH_CERTS'; domain: string }
  | { type: 'FETCH_IPGEO'; ip: string }
  | { type: 'FETCH_SHODAN_INTERNETDB'; ip: string }
  | { type: 'FETCH_SHODAN_HOST'; ip: string; apiKey: string }
  | { type: 'CORS_CHECK'; url: string }
  | { type: 'HTTP_METHODS_CHECK'; url: string }
  | { type: 'REDIRECT_TRACE'; url: string }
  | {
      type: 'DOH_QUERY';
      hostname: string;
      recordType: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'NS' | 'TXT' | 'SOA' | 'CAA' | 'PTR' | 'DNSKEY' | 'DS';
    }
  | { type: 'CACHE_POISON_PROBE'; url: string }
  | { type: 'BREACH_CHECK'; email: string; hibpApiKey?: string }
  | { type: 'HTTP_POST_PROBE'; url: string; body: string; contentType?: string }
  | { type: 'AUTH_DIFF_PROBE'; url: string }
  | { type: 'FETCH_GREYNOISE'; ip: string };

export interface RequestLogEntry {
  id: string;
  method: string;
  url: string;
  status: number | null;
  type: string;
  timeStamp: number;
}

export interface CrtShCertEntry {
  commonName: string;
  issuerName: string;
  notBefore: string;
  notAfter: string;
  nameValue: string;
}

export interface IpGeoResult {
  ok: boolean;
  source?: 'ipwho.is' | 'ip-api.com';
  ip: string;
  country?: string;
  region?: string;
  city?: string;
  isp?: string;
  org?: string;
  asn?: string;
  hosting?: boolean | null;
  proxy?: boolean | null;
  lat?: number;
  lon?: number;
  error?: string;
}

export interface CorsCheckResult {
  ok: boolean;
  status?: number;
  requestOrigin: string;
  acao?: string;
  acac?: string;
  reflected: boolean;
  wildcardWithCredentials: boolean;
  blockedByCors?: boolean;
  error?: string;
}

export interface CachePoisonResult {
  ok: boolean;
  canary: string;
  status: number | null;
  cacheControl?: string;
  vary?: string;
  location?: string;
  cacheable: boolean;
  reflected: string[];
  unkeyedNotInVary: string[];
  error?: string;
}

export interface HttpMethodsResult {
  ok: boolean;
  status?: number;
  allow?: string[];
  accessControlAllowMethods?: string[];
  error?: string;
}

export interface RedirectHopWire {
  url: string;
  status: number;
  location?: string;
}

export interface RedirectTraceResult {
  ok: boolean;
  hops: RedirectHopWire[];
  truncated: boolean;
  error?: string;
}

export interface DohAnswer {
  name: string;
  type: number;
  data: string;
}

export interface DohQueryResult {
  ok: boolean;
  answers: DohAnswer[];
  authenticData?: boolean;
  error?: string;
}

export interface BreachRecord {
  name: string;
  domain?: string;
  breachDate?: string;
}

export interface BreachCheckResult {
  ok: boolean;
  source: 'hibp' | 'xposedornot';
  breached: boolean;
  breaches: BreachRecord[];
  error?: string;
}

export interface GreyNoiseResult {
  ok: boolean;
  ip: string;
  observed: boolean; // whether GreyNoise has seen this IP scanning the internet
  noise?: boolean;
  riot?: boolean; // "Rule It Out" - a known benign/common business service
  classification?: string; // benign | suspicious | malicious | unknown
  name?: string;
  lastSeen?: string;
  link?: string;
  error?: string;
}

export interface AuthDiffSide {
  status: number | null;
  finalUrl?: string;
  length?: number;
  body?: string;
  contentType?: string;
  error?: string;
}

export interface ShodanInternetDbResult {
  ok: boolean;
  ip: string;
  ports?: number[];
  vulns?: string[];
  hostnames?: string[];
  tags?: string[];
  cpes?: string[];
  error?: string;
}

export interface BgResponseMap {
  PING: { ok: true };
  FETCH_JSON: { ok: boolean; data?: unknown; status?: number; error?: string };
  FETCH_TEXT: { ok: boolean; data?: string; status?: number; error?: string };
  ALIVE_CHECK: AliveCheckResult;
  HEAD_PROBE: { ok: boolean; status: number | null; error?: string };
  DOH_RESOLVE: { ok: boolean; addresses?: string[]; error?: string };
  FETCH_CRTSH: { ok: boolean; hostnames: string[]; status: number | null; error?: string };
  FETCH_CRTNAME: { ok: boolean; hostnames: string[]; status: number | null; error?: string };
  FETCH_HACKERTARGET: { ok: boolean; hostnames: string[]; status: number | null; error?: string };
  FETCH_CERTSPOTTER: { ok: boolean; hostnames: string[]; status: number | null; error?: string };
  FETCH_SUBDOMAINCENTER: { ok: boolean; hostnames: string[]; status: number | null; error?: string };
  FETCH_RDAP: { ok: boolean; status: number | null; raw?: unknown; tldUnsupported?: boolean; error?: string };
  FETCH_HACKERTARGET_WHOIS: { ok: boolean; text?: string; status: number | null; error?: string };
  HTTP_PROBE: { ok: boolean; status: number | null; finalUrl?: string; body?: string; error?: string };
  FETCH_GITHUB_EMAIL: {
    ok: boolean;
    users?: unknown;
    commits?: unknown;
    usersError?: string;
    commitsError?: string;
    error?: string;
  };
  GET_URL_HEADERS: UrlHeadersResult;
  GET_TAB_HEADERS: TabHeadersResult;
  OPEN_TABS: { opened: number };
  SET_HEADER_RULES: { ok: boolean; error?: string };
  SET_UA_RULE: { ok: boolean; error?: string };
  SET_REFERER_RULE: { ok: boolean; error?: string };
  GET_REQUEST_LOG: { entries: RequestLogEntry[]; logging: boolean };
  CLEAR_REQUEST_LOG: { ok: true };
  SET_REQUEST_LOGGING: { ok: true; logging: boolean };
  FETCH_FAVICON: { ok: boolean; base64?: string; contentType?: string; error?: string };
  FETCH_CRTSH_CERTS: { ok: boolean; entries: CrtShCertEntry[]; status: number | null; error?: string };
  FETCH_IPGEO: IpGeoResult;
  FETCH_SHODAN_INTERNETDB: ShodanInternetDbResult;
  FETCH_SHODAN_HOST: { ok: boolean; data?: unknown; error?: string };
  CORS_CHECK: CorsCheckResult;
  CACHE_POISON_PROBE: CachePoisonResult;
  HTTP_METHODS_CHECK: HttpMethodsResult;
  REDIRECT_TRACE: RedirectTraceResult;
  DOH_QUERY: DohQueryResult;
  BREACH_CHECK: BreachCheckResult;
  HTTP_POST_PROBE: { ok: boolean; status: number | null; body?: string; error?: string };
  AUTH_DIFF_PROBE: { ok: boolean; authed?: AuthDiffSide; anon?: AuthDiffSide; error?: string };
  FETCH_GREYNOISE: GreyNoiseResult;
}

export async function sendToBackground<T extends BgRequest>(
  message: T,
): Promise<BgResponseMap[T['type']]> {
  return browser.runtime.sendMessage(message);
}
