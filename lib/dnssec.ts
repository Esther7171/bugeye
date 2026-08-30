import { sendToBackground } from '@/lib/messaging';

export type DnssecVerdict = 'enabled' | 'partial' | 'disabled';

export interface DnssecResult {
  domain: string;
  dnskeyRecords: string[];
  dsRecords: string[];
  authenticData: boolean;
  verdict: DnssecVerdict;
  detail: string;
}

export async function checkDnssec(domain: string): Promise<DnssecResult> {
  const [dnskeyRes, dsRes] = await Promise.all([
    sendToBackground({ type: 'DOH_QUERY', hostname: domain, recordType: 'DNSKEY' }),
    sendToBackground({ type: 'DOH_QUERY', hostname: domain, recordType: 'DS' }),
  ]);
  const dnskeyRecords = dnskeyRes.ok ? dnskeyRes.answers.map((a) => a.data) : [];
  const dsRecords = dsRes.ok ? dsRes.answers.map((a) => a.data) : [];
  const authenticData = !!(dnskeyRes.ok && dnskeyRes.authenticData) || !!(dsRes.ok && dsRes.authenticData);

  let verdict: DnssecVerdict;
  let detail: string;
  if (dnskeyRecords.length > 0 && authenticData) {
    verdict = 'enabled';
    detail = "DNSSEC is enabled and the resolver validated the domain's chain of trust (AD flag set).";
  } else if (dnskeyRecords.length > 0 || dsRecords.length > 0) {
    verdict = 'partial';
    detail =
      'DNSSEC records are published, but the resolver did not report successful validation for this query. This can mean a broken chain of trust, or simply that this specific query type was not validated.';
  } else {
    verdict = 'disabled';
    detail = 'No DNSKEY or DS records found. DNSSEC does not appear to be enabled for this domain.';
  }

  return { domain, dnskeyRecords, dsRecords, authenticData, verdict, detail };
}
