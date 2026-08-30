import { useState } from 'react';
import { Loader2, ExternalLink, ShieldCheck, ShieldAlert } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { ModuleNote } from '@/components/shell/ModuleNote';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTarget } from '@/components/shell/TargetProvider';
import { sendToBackground } from '@/lib/messaging';
import { normalizeDomain } from '@/lib/utils';
import { parseRdap, domainNotFoundResult, registrarSearchLinks, type WhoisResult } from '@/lib/whois';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

export function WhoisLookup({ onBack }: ModuleComponentProps) {
  const { target } = useTarget();
  const [domain, setDomain] = useState(target);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WhoisResult | null>(null);
  const [tldUnsupported, setTldUnsupported] = useState(false);
  const [note, setNote] = useState('');

  async function run() {
    const clean = normalizeDomain(domain);
    if (!clean) return;
    setLoading(true);
    setNote('');
    setResult(null);
    setTldUnsupported(false);
    try {
      const res = await sendToBackground({ type: 'FETCH_RDAP', domain: clean });
      if (!res.ok) {
        setNote(res.error ?? 'Lookup failed.');
        return;
      }
      if (res.status === 404) {
        if (res.tldUnsupported) {
          setTldUnsupported(true);
        } else {
          setResult(domainNotFoundResult(clean));
        }
        return;
      }
      setResult(parseRdap(clean, res.raw));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="WhoisLookup"
        description="Domain registration, expiry and nameservers via RDAP, the modern HTTP/JSON replacement for WHOIS. No permission needed."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex gap-2">
          <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com" />
          <Button size="sm" onClick={run} disabled={loading || !domain}>
            {loading ? <Loader2 className="size-3 animate-spin" /> : null}
            Look up
          </Button>
        </div>

        {note && <ModuleNote tone="error">{note}</ModuleNote>}

        {tldUnsupported && (
          <div className="flex flex-col gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
            <p>
              RDAP is not offered for this domain's TLD at all (confirmed against IANA's own RDAP
              registry), a registry-side limitation, not a failed lookup. This does NOT mean the domain
              is unregistered. The legacy WHOIS protocol might still have this data, but it needs a raw
              TCP connection on port 43, which no browser can open.
            </p>
            <a
              href={`https://who.is/whois/${encodeURIComponent(normalizeDomain(domain) || domain)}`}
              target="_blank"
              rel="noreferrer"
              className="flex w-fit items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="size-3" /> Check who.is instead (does the legacy WHOIS query server-side)
            </a>
          </div>
        )}

        {result?.found === false && (
          <>
            <div className="flex items-start gap-2 rounded-md border border-success/30 bg-success/10 p-2 text-[11px] text-success">
              <ShieldCheck className="size-3.5 shrink-0" />
              <p>{result.domain} does not appear to be registered (RDAP returned no record).</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium">Check availability / register</p>
              <div className="flex flex-wrap gap-2">
                {registrarSearchLinks(result.domain).map((l) => (
                  <a
                    key={l.label}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-primary hover:underline"
                  >
                    <ExternalLink className="size-3" /> {l.label}
                  </a>
                ))}
              </div>
            </div>
          </>
        )}

        {result?.found && (
          <>
            <Card>
              <CardContent className="flex flex-col gap-2 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">{result.registrar ?? 'Registrar unknown'}</p>
                  {result.daysUntilExpiry !== undefined &&
                    (result.daysUntilExpiry < 0 ? (
                      <Badge variant="destructive" className="gap-1">
                        <ShieldAlert className="size-2.5" /> expired
                      </Badge>
                    ) : (
                      <Badge variant={result.daysUntilExpiry < 30 ? 'warning' : 'success'} className="gap-1">
                        <ShieldCheck className="size-2.5" /> {result.daysUntilExpiry}d left
                      </Badge>
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span>Registered</span>
                  <span>{result.createdAt ?? 'unknown'}</span>
                  <span>Expires</span>
                  <span>{result.expiresAt ?? 'unknown'}</span>
                  <span>Last changed</span>
                  <span>{result.lastChangedAt ?? 'unknown'}</span>
                  <span>DNSSEC</span>
                  <span>{result.dnssecSigned ? 'signed' : 'not signed'}</span>
                  {result.registrarAbuseEmail && (
                    <>
                      <span>Abuse contact</span>
                      <span>{result.registrarAbuseEmail}</span>
                    </>
                  )}
                </div>
                {result.status.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {result.status.map((s) => (
                      <Badge key={s} variant="outline" className="normal-case">
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}
                {result.nameservers.length > 0 && (
                  <div>
                    <p className="mb-1 text-[11px] font-medium text-foreground">Nameservers</p>
                    <p className="text-[11px] text-muted-foreground">{result.nameservers.join(', ')}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {result.contacts.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Registrant / admin / technical contacts
                </p>
                {result.contacts.map((c, i) => (
                  <Card key={`${c.role}-${i}`}>
                    <CardContent className="flex flex-col gap-1 p-2.5 text-[11px]">
                      <Badge variant="outline" className="w-fit normal-case">
                        {c.role}
                      </Badge>
                      {c.name && <p>{c.name}</p>}
                      {c.org && <p className="text-muted-foreground">{c.org}</p>}
                      {c.email && <p className="text-muted-foreground">{c.email}</p>}
                      {c.phone && <p className="text-muted-foreground">{c.phone}</p>}
                      {c.address && <p className="text-muted-foreground">{c.address}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                No registrant/admin/technical contact details published, most registrars redact these by
                default.
              </p>
            )}

            <Button size="sm" variant="outline" className="w-fit" onClick={() => exportJson('whois', result)}>
              Export JSON
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default WhoisLookup;
