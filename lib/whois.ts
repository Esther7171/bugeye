export interface WhoisContact {
  role: string;
  name?: string;
  org?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface WhoisResult {
  domain: string;
  found: boolean;
  registrar?: string;
  registrarAbuseEmail?: string;
  createdAt?: string;
  expiresAt?: string;
  lastChangedAt?: string;
  daysUntilExpiry?: number;
  status: string[];
  nameservers: string[];
  dnssecSigned?: boolean;
  contacts: WhoisContact[];
}

interface RdapVcardItem extends Array<unknown> {
  0: string;
  3: unknown;
}

interface RdapEntity {
  roles?: string[];
  vcardArray?: [string, RdapVcardItem[]];
  entities?: RdapEntity[];
}

interface RdapEvent {
  eventAction: string;
  eventDate: string;
}

interface RdapNameserver {
  ldhName?: string;
}

interface RdapResponse {
  status?: string[];
  entities?: RdapEntity[];
  events?: RdapEvent[];
  nameservers?: RdapNameserver[];
  secureDNS?: { delegationSigned?: boolean };
}

function vcardField(entity: RdapEntity, field: string): string | undefined {
  const items = entity.vcardArray?.[1];
  if (!items) return undefined;
  const match = items.find((item) => item[0] === field);
  if (!match) return undefined;
  const value = match[3];
  if (typeof value === 'string') return value;
  // "adr" (address) fields come back as an array of address components
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  return undefined;
}

const CONTACT_ROLES = ['registrant', 'administrative', 'technical'];

function parseContact(entity: RdapEntity): WhoisContact | null {
  const role = entity.roles?.find((r) => CONTACT_ROLES.includes(r));
  if (!role) return null;
  const name = vcardField(entity, 'fn');
  const org = vcardField(entity, 'org');
  const email = vcardField(entity, 'email');
  const phone = vcardField(entity, 'tel');
  const address = vcardField(entity, 'adr');
  // Most registries redact all of these behind privacy proxies; only
  // surface a contact if the registry actually published something.
  if (!name && !org && !email && !phone && !address) return null;
  return { role, name, org, email, phone, address };
}

export function parseRdap(domain: string, raw: unknown): WhoisResult {
  const data = (raw ?? {}) as RdapResponse;

  const registrarEntity = data.entities?.find((e) => e.roles?.includes('registrar'));
  const registrar = registrarEntity ? vcardField(registrarEntity, 'fn') : undefined;
  const abuseEntity = registrarEntity?.entities?.find((e) => e.roles?.includes('abuse'));
  const registrarAbuseEmail = abuseEntity ? vcardField(abuseEntity, 'email') : undefined;

  const contacts = (data.entities ?? [])
    .map(parseContact)
    .filter((c): c is WhoisContact => c !== null);

  const events = data.events ?? [];
  const createdAt = events.find((e) => e.eventAction === 'registration')?.eventDate;
  const expiresAt = events.find((e) => e.eventAction === 'expiration')?.eventDate;
  const lastChangedAt = events.find((e) => e.eventAction === 'last changed')?.eventDate;

  let daysUntilExpiry: number | undefined;
  if (expiresAt) {
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    daysUntilExpiry = Math.floor(diffMs / 86400000);
  }

  return {
    domain,
    found: true,
    registrar,
    registrarAbuseEmail,
    createdAt,
    expiresAt,
    lastChangedAt,
    daysUntilExpiry,
    status: data.status ?? [],
    nameservers: (data.nameservers ?? []).map((ns) => ns.ldhName ?? '').filter(Boolean),
    dnssecSigned: data.secureDNS?.delegationSigned,
    contacts,
  };
}

export function domainNotFoundResult(domain: string): WhoisResult {
  return { domain, found: false, status: [], nameservers: [], contacts: [] };
}

export interface RegistrarLink {
  label: string;
  url: string;
}

export function registrarSearchLinks(domain: string): RegistrarLink[] {
  const encoded = encodeURIComponent(domain);
  return [
    { label: 'Namecheap', url: `https://www.namecheap.com/domains/registration/results/?domain=${encoded}` },
    { label: 'Porkbun', url: `https://porkbun.com/checkout/search?q=${encoded}` },
    { label: 'GoDaddy', url: `https://www.godaddy.com/domainsearch/find?domainToCheck=${encoded}` },
  ];
}

export type WhoisSourceId = 'rdap' | 'hackertarget' | 'whois_web';

export interface WhoisSourceRecord {
  id: WhoisSourceId;
  label: string;
  ok: boolean;
  error?: string;
  raw?: string;
  parsed?: WhoisResult;
}

const WHOIS_EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function whoisField(text: string, names: string[]): string | undefined {
  for (const name of names) {
    const re = new RegExp(`^[\\t ]*${name}[\\t ]*:[\\t ]*(.+)$`, 'im');
    const m = text.match(re);
    const value = m?.[1]?.trim();
    if (!value) continue;
    if (/^(redacted for privacy|redacted|not disclosed|privacy protected|please query|data protected|withheld)/i.test(value)) {
      continue;
    }
    return value;
  }
  return undefined;
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '');
}

export function extractWhoisFromHtml(html: string): string {
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const nodes = Array.from(
      doc.querySelectorAll('pre, .queryResponseBodyTxt, #registrarData, .whois-data, .df-raw'),
    );
    const best = nodes
      .map((el) => (el.textContent ?? '').trim())
      .sort((a, b) => b.length - a.length)[0];
    if (best && best.length > 40) return best;
  }
  const blocks = [...html.matchAll(/<pre[^>]*>([\s\S]*?)<\/pre>/gi)].map((m) =>
    decodeHtmlEntities(m[1] ?? '').trim(),
  );
  return blocks.sort((a, b) => b.length - a.length)[0] ?? '';
}

export function parseWhoisText(domain: string, raw: string): WhoisResult {
  const text = raw.replace(/\r\n/g, '\n').trim();
  const head = text.slice(0, 800);
  const missing =
    /no match|not found|no entries found|no data found|no object found|error check your search/i.test(
      head,
    );
  const looksLikeRecord = /domain name\s*:/i.test(text) || /nserver\s*:/i.test(text);
  if (!text || missing || !looksLikeRecord) {
    return domainNotFoundResult(domain);
  }

  const nameservers = [
    ...text.matchAll(/^[ \t]*(?:Name Server|nserver|Name servers)[ \t]*:[ \t]*(\S+)/gim),
  ]
    .map((m) => (m[1] ?? '').replace(/\.$/, '').toLowerCase())
    .filter(Boolean);
  const uniqueNs = [...new Set(nameservers)];

  const emails = [...new Set((text.match(WHOIS_EMAIL_RE) ?? []).map((e) => e.toLowerCase()))];
  const contacts: WhoisContact[] = [];
  const registrant = whoisField(text, ['Registrant Name', 'Registrant']);
  const registrantOrg = whoisField(text, ['Registrant Organization', 'Registrant Org']);
  const registrantEmail = whoisField(text, ['Registrant Email', 'Registrant E-mail']);
  const registrantPhone = whoisField(text, ['Registrant Phone', 'Registrant Phone Number']);
  if (registrant || registrantOrg || registrantEmail) {
    contacts.push({
      role: 'registrant',
      name: registrant,
      org: registrantOrg,
      email: registrantEmail,
      phone: registrantPhone,
    });
  }
  for (const email of emails) {
    if (contacts.some((c) => c.email === email)) continue;
    contacts.push({ role: 'published', email });
  }

  const expiresAt = whoisField(text, [
    'Registry Expiry Date',
    'Registrar Registration Expiration Date',
    'Expiration Date',
    'Expiry Date',
    'paid-till',
  ]);
  let daysUntilExpiry: number | undefined;
  if (expiresAt) {
    const ts = Date.parse(expiresAt);
    if (!Number.isNaN(ts)) daysUntilExpiry = Math.floor((ts - Date.now()) / 86400000);
  }

  const statusLine = whoisField(text, ['Domain Status', 'Status']);
  const status = statusLine
    ? statusLine.split(/\s+/).filter((s) => s.length > 2 && !/^https?:/i.test(s))
    : [];

  return {
    domain,
    found: true,
    registrar: whoisField(text, ['Registrar', 'Registrar Name', 'registrar']),
    registrarAbuseEmail: whoisField(text, ['Registrar Abuse Contact Email', 'Abuse Email']),
    createdAt: whoisField(text, ['Creation Date', 'Created Date', 'created', 'Created On']),
    expiresAt,
    lastChangedAt: whoisField(text, ['Updated Date', 'Last Updated', 'last-modified', 'Changed']),
    daysUntilExpiry,
    status,
    nameservers: uniqueNs,
    dnssecSigned: /dnssec\s*:\s*(signed|yes|true)/i.test(text)
      ? true
      : /dnssec\s*:\s*(unsigned|no|false|unsigned)/i.test(text)
        ? false
        : undefined,
    contacts,
  };
}

export function emailsFromWhoisSources(sources: WhoisSourceRecord[]): string[] {
  const set = new Set<string>();
  for (const src of sources) {
    if (src.raw) {
      for (const e of src.raw.match(WHOIS_EMAIL_RE) ?? []) set.add(e.toLowerCase());
    }
    for (const c of src.parsed?.contacts ?? []) {
      if (c.email) set.add(c.email.toLowerCase());
    }
  }
  return [...set].sort();
}
