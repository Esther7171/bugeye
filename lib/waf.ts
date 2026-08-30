export type WafSignatureType = 'header' | 'cookie' | 'body';

export interface WafEvidence {
  vendor: string;
  type: WafSignatureType;
  evidenceLabel: string;
  detail: string;
}

interface HeaderSignature {
  vendor: string;
  evidenceLabel: string;
  generic?: boolean;
  test: (name: string, value: string) => boolean;
}

interface CookieSignature {
  vendor: string;
  evidenceLabel: string;
  namePattern: RegExp;
}

interface BodySignature {
  vendor: string;
  evidenceLabel: string;
  pattern: RegExp;
}

// Passive fingerprints only: header names/values, cookie names, and
// block-page body text. No requests are crafted to trigger a WAF - this is
// the observational half of what a tool like wafw00f does actively.
const HEADER_SIGNATURES: HeaderSignature[] = [
  { vendor: 'Cloudflare', evidenceLabel: 'server: cloudflare', test: (n, v) => n === 'server' && /cloudflare/i.test(v) },
  { vendor: 'Cloudflare', evidenceLabel: 'cf-ray header', test: (n) => n === 'cf-ray' },
  { vendor: 'Cloudflare', evidenceLabel: 'cf-cache-status header', test: (n) => n === 'cf-cache-status' },
  { vendor: 'Akamai', evidenceLabel: 'server: akamai', test: (n, v) => n === 'server' && /akamai/i.test(v) },
  { vendor: 'Akamai', evidenceLabel: 'x-akamai-* header', test: (n) => n.startsWith('x-akamai') },
  { vendor: 'Akamai', evidenceLabel: 'akamai-grn header', test: (n) => n === 'akamai-grn' },
  { vendor: 'Imperva / Incapsula', evidenceLabel: 'x-iinfo header', test: (n) => n === 'x-iinfo' },
  { vendor: 'Imperva / Incapsula', evidenceLabel: 'x-cdn: Incapsula', test: (n, v) => n === 'x-cdn' && /incapsula/i.test(v) },
  { vendor: 'AWS WAF / ALB', evidenceLabel: 'server: awselb', test: (n, v) => n === 'server' && /awselb/i.test(v) },
  { vendor: 'AWS WAF / ALB', evidenceLabel: 'x-amzn-* header', test: (n) => n.startsWith('x-amzn-') },
  { vendor: 'AWS CloudFront', evidenceLabel: 'x-amz-cf-id header', test: (n) => n === 'x-amz-cf-id' },
  { vendor: 'Sucuri', evidenceLabel: 'server: sucuri / cloudproxy', test: (n, v) => n === 'server' && /sucuri|cloudproxy/i.test(v) },
  { vendor: 'Sucuri', evidenceLabel: 'x-sucuri-id header', test: (n) => n === 'x-sucuri-id' },
  { vendor: 'Sucuri', evidenceLabel: 'x-sucuri-cache header', test: (n) => n === 'x-sucuri-cache' },
  { vendor: 'F5 BIG-IP ASM', evidenceLabel: 'x-waf-* header', test: (n) => n.startsWith('x-waf-') },
  { vendor: 'F5 BIG-IP ASM', evidenceLabel: 'server: BigIP', test: (n, v) => n === 'server' && /bigip/i.test(v) },
  { vendor: 'Barracuda', evidenceLabel: 'server: barracuda', test: (n, v) => n === 'server' && /barracuda/i.test(v) },
  { vendor: 'Fortinet FortiWeb', evidenceLabel: 'server: fortiweb', test: (n, v) => n === 'server' && /fortiweb/i.test(v) },
  { vendor: 'Generic WAF/CDN', evidenceLabel: 'x-cdn header', generic: true, test: (n) => n === 'x-cdn' },
  { vendor: 'Generic WAF/CDN', evidenceLabel: 'x-waf header', generic: true, test: (n) => n === 'x-waf' },
  { vendor: 'Generic WAF/CDN', evidenceLabel: 'x-protected-by header', generic: true, test: (n) => n === 'x-protected-by' },
  { vendor: 'Generic WAF/CDN', evidenceLabel: 'x-firewall header', generic: true, test: (n) => n === 'x-firewall' },
];

const COOKIE_SIGNATURES: CookieSignature[] = [
  { vendor: 'Cloudflare', evidenceLabel: '__cfduid cookie', namePattern: /^__cfduid$/i },
  { vendor: 'Cloudflare', evidenceLabel: 'cf_clearance cookie', namePattern: /^cf_clearance$/i },
  { vendor: 'Cloudflare', evidenceLabel: '__cf_bm cookie', namePattern: /^__cf_bm$/i },
  { vendor: 'Imperva / Incapsula', evidenceLabel: 'incap_ses_* cookie', namePattern: /^incap_ses_/i },
  { vendor: 'Imperva / Incapsula', evidenceLabel: 'visid_incap_* cookie', namePattern: /^visid_incap_/i },
  { vendor: 'Imperva / Incapsula', evidenceLabel: 'nlbi_* cookie', namePattern: /^nlbi_/i },
  { vendor: 'AWS WAF / ALB', evidenceLabel: 'AWSALB cookie', namePattern: /^AWSALB$/i },
  { vendor: 'AWS WAF / ALB', evidenceLabel: 'AWSALBCORS cookie', namePattern: /^AWSALBCORS$/i },
  { vendor: 'F5 BIG-IP ASM', evidenceLabel: 'BIGipServer* cookie', namePattern: /^BIGipServer/i },
  { vendor: 'F5 BIG-IP ASM', evidenceLabel: 'TS01* (TrustShield) cookie', namePattern: /^TS01/i },
  { vendor: 'Barracuda', evidenceLabel: 'barra_counter_session cookie', namePattern: /^barra_counter_session$/i },
  { vendor: 'Fortinet FortiWeb', evidenceLabel: 'cookiesession1 cookie', namePattern: /^cookiesession1$/i },
];

const BODY_SIGNATURES: BodySignature[] = [
  { vendor: 'Cloudflare', evidenceLabel: '"Attention Required" block page', pattern: /Attention Required/i },
  { vendor: 'Cloudflare', evidenceLabel: 'Ray ID error page', pattern: /Ray ID:/i },
  { vendor: 'Cloudflare', evidenceLabel: '"Please enable cookies" challenge', pattern: /Please enable cookies/i },
  { vendor: 'Cloudflare', evidenceLabel: 'cf-error-details marker', pattern: /cf-error-details/i },
  { vendor: 'Akamai', evidenceLabel: '"Access Denied" + Akamai reference', pattern: /Access Denied[\s\S]{0,500}Reference #/i },
  { vendor: 'Imperva / Incapsula', evidenceLabel: '"Powered by Incapsula"', pattern: /Powered by Incapsula/i },
  { vendor: 'Imperva / Incapsula', evidenceLabel: '"Request unsuccessful. Incapsula"', pattern: /Request unsuccessful\.?\s*Incapsula/i },
  { vendor: 'Sucuri', evidenceLabel: '"Sucuri WebSite Firewall - Access Denied"', pattern: /Sucuri WebSite Firewall/i },
  { vendor: 'Wordfence', evidenceLabel: '"Generated by Wordfence"', pattern: /Generated by Wordfence/i },
  { vendor: 'Wordfence', evidenceLabel: '"Your access to this site has been limited"', pattern: /Your access to this site has been limited/i },
];

export function analyzeHeaders(headers: Record<string, string>): WafEvidence[] {
  const evidence: WafEvidence[] = [];
  const claimed = new Set<string>();
  const entries = Object.entries(headers).map(([n, v]) => [n.toLowerCase(), v] as const);

  for (const [name, value] of entries) {
    for (const sig of HEADER_SIGNATURES) {
      if (sig.generic) continue;
      if (sig.test(name, value)) {
        evidence.push({ vendor: sig.vendor, type: 'header', evidenceLabel: sig.evidenceLabel, detail: `${name}: ${value}` });
        claimed.add(name);
      }
    }
  }
  for (const [name, value] of entries) {
    if (claimed.has(name)) continue;
    for (const sig of HEADER_SIGNATURES) {
      if (!sig.generic) continue;
      if (sig.test(name, value)) {
        evidence.push({ vendor: sig.vendor, type: 'header', evidenceLabel: sig.evidenceLabel, detail: `${name}: ${value}` });
      }
    }
  }
  return evidence;
}

export function analyzeCookies(cookies: { name: string; value: string }[]): WafEvidence[] {
  const evidence: WafEvidence[] = [];
  for (const c of cookies) {
    for (const sig of COOKIE_SIGNATURES) {
      if (sig.namePattern.test(c.name)) {
        evidence.push({ vendor: sig.vendor, type: 'cookie', evidenceLabel: sig.evidenceLabel, detail: c.name });
      }
    }
  }
  return evidence;
}

export function analyzeBody(body: string): WafEvidence[] {
  const evidence: WafEvidence[] = [];
  for (const sig of BODY_SIGNATURES) {
    const m = body.match(sig.pattern);
    if (m) evidence.push({ vendor: sig.vendor, type: 'body', evidenceLabel: sig.evidenceLabel, detail: m[0].slice(0, 160) });
  }
  return evidence;
}

export interface WafVendorGroup {
  vendor: string;
  evidence: WafEvidence[];
}

export function groupByVendor(evidence: WafEvidence[]): WafVendorGroup[] {
  const byVendor = new Map<string, WafEvidence[]>();
  for (const e of evidence) {
    if (!byVendor.has(e.vendor)) byVendor.set(e.vendor, []);
    byVendor.get(e.vendor)!.push(e);
  }
  return Array.from(byVendor.entries())
    .map(([vendor, items]) => ({ vendor, evidence: items }))
    .sort((a, b) => b.evidence.length - a.evidence.length);
}

export function wafwoofCommand(domain: string, allPlugins = false): string {
  return allPlugins ? `wafw00f -a ${domain}` : `wafw00f ${domain}`;
}

export interface WafReport {
  target: string;
  checkedHeaders: boolean;
  checkedCookies: boolean;
  checkedBody: boolean;
  evidence: WafEvidence[];
  vendors: WafVendorGroup[];
  generatedAt: string;
}

export function wafReportToMarkdown(r: WafReport): string {
  const lines = [
    `# WAFDetect report - ${r.target}`,
    '',
    `Generated: ${r.generatedAt}`,
    '',
    r.vendors.length > 0
      ? r.vendors
          .map((v) => `**WAF detected: ${v.vendor}** - via ${v.evidence.map((e) => e.evidenceLabel).join(', ')}`)
          .join('\n\n')
      : '**No WAF signature found (passive check).**',
    '',
    '## Evidence',
    r.evidence.length
      ? r.evidence.map((e) => `- [${e.type}] **${e.vendor}**: ${e.evidenceLabel} (${e.detail})`).join('\n')
      : '_None._',
    '',
    '## Caveat',
    'Passive detection only. A missing signature does NOT prove there is no WAF, many WAFs are silent until a malicious request triggers them. For active confirmation, run wafw00f in your terminal.',
    '',
    '## Active confirmation',
    '```',
    wafwoofCommand(r.target),
    wafwoofCommand(r.target, true),
    '```',
  ];
  return lines.join('\n');
}
