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
