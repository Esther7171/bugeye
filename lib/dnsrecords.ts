import { sendToBackground, type BgRequest } from '@/lib/messaging';
import { mapLimit } from '@/lib/concurrency';

type DohRecordType = Extract<BgRequest, { type: 'DOH_QUERY' }>['recordType'];
export type DnsType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'NS' | 'TXT' | 'SOA' | 'CAA';

const RECORD_TYPES: DnsType[] = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA', 'CAA'];

const DKIM_SELECTORS = ['default', 'google', 'selector1', 'selector2', 'k1', 's1', 'dkim', 'mail'];

export interface DnsRecordSet {
  domain: string;
  records: Record<DnsType, string[]>;
  spf: string | null;
  dmarc: string | null;
  dkim: { selector: string; value: string }[];
  ptr: string[] | null;
}

async function queryType(domain: string, type: DohRecordType): Promise<string[]> {
  const res = await sendToBackground({ type: 'DOH_QUERY', hostname: domain, recordType: type });
  return res.ok ? res.answers.map((a) => a.data) : [];
}

function ptrHostname(ip: string): string | null {
  const parts = ip.split('.');
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(Number(p)))) return null;
  return `${parts.reverse().join('.')}.in-addr.arpa`;
}

export async function fetchAllDnsRecords(domain: string): Promise<DnsRecordSet> {
  const entries = await Promise.all(RECORD_TYPES.map(async (type) => [type, await queryType(domain, type)] as const));
  const records = Object.fromEntries(entries) as Record<DnsType, string[]>;

  const spf = records.TXT.find((t) => t.replace(/^"|"$/g, '').startsWith('v=spf1')) ?? null;

  const dmarcAnswers = await queryType(`_dmarc.${domain}`, 'TXT');
  const dmarc = dmarcAnswers.find((t) => t.replace(/^"|"$/g, '').startsWith('v=DMARC1')) ?? null;

  const dkimHits = await mapLimit(DKIM_SELECTORS, 4, async (selector) => {
    const answers = await queryType(`${selector}._domainkey.${domain}`, 'TXT');
    const value = answers.find((t) => t.includes('v=DKIM1') || t.includes('p='));
    return value ? { selector, value } : null;
  });
  const dkim = dkimHits.filter((h): h is { selector: string; value: string } => h !== null);

  let ptr: string[] | null = null;
  const firstA = records.A[0];
  if (firstA) {
    const rev = ptrHostname(firstA);
    if (rev) ptr = await queryType(rev, 'PTR');
  }

  return { domain, records, spf, dmarc, dkim, ptr };
}
