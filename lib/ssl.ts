import type { CrtShCertEntry } from '@/lib/messaging';

export interface SslSummary {
  latest: CrtShCertEntry;
  daysUntilExpiry: number;
  expired: boolean;
  sans: string[];
}

export function summarizeCerts(domain: string, entries: CrtShCertEntry[]): SslSummary | null {
  if (entries.length === 0) return null;

  const sorted = [...entries].sort(
    (a, b) => new Date(b.notBefore).getTime() - new Date(a.notBefore).getTime(),
  );
  const latest = sorted[0]!;

  const now = Date.now();
  const expiry = new Date(latest.notAfter).getTime();
  const daysUntilExpiry = Math.ceil((expiry - now) / 86400000);

  const sans = new Set<string>();
  for (const entry of entries) {
    for (const line of entry.nameValue.split('\n')) {
      const clean = line.trim().toLowerCase().replace(/^\*\./, '');
      if (clean && clean !== domain.toLowerCase()) sans.add(clean);
    }
  }

  return { latest, daysUntilExpiry, expired: daysUntilExpiry < 0, sans: Array.from(sans).sort() };
}

export function sslReportToMarkdown(domain: string, summary: SslSummary): string {
  const lines = [
    `# SSLInspect report - ${domain}`,
    '',
    `Issuer: ${summary.latest.issuerName}`,
    `Valid from: ${summary.latest.notBefore}`,
    `Valid until: ${summary.latest.notAfter}`,
    `Days until expiry: ${summary.daysUntilExpiry}${summary.expired ? ' (EXPIRED)' : ''}`,
    '',
    '## Subject Alternative Names (from CT logs)',
    ...(summary.sans.length ? summary.sans.map((s) => `- ${s}`) : ['_None found._']),
  ];
  return lines.join('\n');
}
