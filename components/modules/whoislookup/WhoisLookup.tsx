import { useState } from 'react';
import { Loader2, ExternalLink, ShieldCheck, ShieldAlert } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { ModuleNote } from '@/components/shell/ModuleNote';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTarget } from '@/components/shell/TargetProvider';
import { useHostPermission } from '@/lib/useHostPermission';
import { sendToBackground } from '@/lib/messaging';
import { normalizeDomain } from '@/lib/utils';
import {
  parseRdap,
  domainNotFoundResult,
  registrarSearchLinks,
  extractWhoisFromHtml,
  parseWhoisText,
  emailsFromWhoisSources,
  type WhoisResult,
  type WhoisSourceRecord,
} from '@/lib/whois';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

function ResultCard({ result }: { result: WhoisResult }) {
  return (
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
            <span>
              {result.dnssecSigned === undefined ? 'unknown' : result.dnssecSigned ? 'signed' : 'not signed'}
            </span>
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
            Contacts published in the record
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
          No registrant/admin/technical contact details published; most registrars redact these by default.
        </p>
      )}
    </>
  );
}

export function WhoisLookup({ onBack, onNavigate }: ModuleComponentProps) {
  const { target } = useTarget();
  const [domain, setDomain] = useState(target);
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<WhoisSourceRecord[]>([]);
  const [primary, setPrimary] = useState<WhoisResult | null>(null);
  const [tldUnsupported, setTldUnsupported] = useState(false);
  const [note, setNote] = useState('');
  const { ensure, pending } = useHostPermission();

  async function run() {
    const clean = normalizeDomain(domain);
    if (!clean) return;
    setLoading(true);
    setNote('');
    setSources([]);
    setPrimary(null);
    setTldUnsupported(false);
    try {
      const whoisWebOk = await ensure('https://who.is/*');
      const [rdap, ht, web] = await Promise.all([
        sendToBackground({ type: 'FETCH_RDAP', domain: clean }),
        sendToBackground({ type: 'FETCH_HACKERTARGET_WHOIS', domain: clean }),
        whoisWebOk
          ? sendToBackground({
              type: 'FETCH_TEXT',
              url: `https://who.is/whois/${encodeURIComponent(clean)}`,
            })
          : Promise.resolve({
              ok: false as const,
              data: undefined as string | undefined,
              error: 'Host permission for who.is was not granted.',
            }),
      ]);

      const next: WhoisSourceRecord[] = [];

      if (!rdap.ok) {
        next.push({ id: 'rdap', label: 'RDAP (rdap.org)', ok: false, error: rdap.error });
      } else if (rdap.status === 404) {
        if (rdap.tldUnsupported) {
          setTldUnsupported(true);
          next.push({
            id: 'rdap',
            label: 'RDAP (rdap.org)',
            ok: false,
            error: 'This TLD has no RDAP service (IANA bootstrap).',
          });
        } else {
          next.push({
            id: 'rdap',
            label: 'RDAP (rdap.org)',
            ok: true,
            parsed: domainNotFoundResult(clean),
          });
        }
      } else {
        next.push({
          id: 'rdap',
          label: 'RDAP (rdap.org)',
          ok: true,
          raw: JSON.stringify(rdap.raw, null, 2),
          parsed: parseRdap(clean, rdap.raw),
        });
      }

      if (!ht.ok) {
        next.push({
          id: 'hackertarget',
          label: 'HackerTarget WHOIS API',
          ok: false,
          error: ht.error,
        });
      } else {
        const parsed = parseWhoisText(clean, ht.text ?? '');
        next.push({
          id: 'hackertarget',
          label: 'HackerTarget WHOIS API',
          ok: true,
          raw: ht.text,
          parsed,
        });
      }

      if (!web.ok) {
        next.push({
          id: 'whois_web',
          label: 'who.is (website)',
          ok: false,
          error: web.error,
        });
      } else {
        const extracted = extractWhoisFromHtml(web.data ?? '');
        next.push({
          id: 'whois_web',
          label: 'who.is (website)',
          ok: true,
          raw: extracted || web.data,
          parsed: extracted ? parseWhoisText(clean, extracted) : domainNotFoundResult(clean),
        });
      }

      setSources(next);
      const chosen =
        next.find((s) => s.parsed?.found)?.parsed ??
        next.find((s) => s.parsed && s.parsed.found === false)?.parsed ??
        null;
      setPrimary(chosen);

      if (next.every((s) => !s.ok) && !chosen) {
        setNote(next.map((s) => s.error).filter(Boolean).join(' ') || 'All WHOIS sources failed.');
      }
    } finally {
      setLoading(false);
    }
  }

  const emails = emailsFromWhoisSources(sources);

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="WhoisLookup"
        description="Collects registrar data from RDAP, HackerTarget's free WHOIS API, and the who.is web page. No port 43."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex gap-2">
          <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com" />
          <Button size="sm" onClick={run} disabled={loading || pending || !domain}>
            {loading || pending ? <Loader2 className="size-3 animate-spin" /> : null}
            Look up
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          who.is needs a one-time host permission. RDAP and HackerTarget do not. Raw TCP/43 is still
          impossible in a browser, these are HTTP stand-ins.
        </p>

        {note && <ModuleNote tone="error">{note}</ModuleNote>}

        {tldUnsupported && (
          <div className="flex flex-col gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
            <p>
              RDAP is not offered for this TLD. HackerTarget and who.is may still have the legacy
              record.
            </p>
            <a
              href={`https://who.is/whois/${encodeURIComponent(normalizeDomain(domain) || domain)}`}
              target="_blank"
              rel="noreferrer"
              className="flex w-fit items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="size-3" /> Open who.is
            </a>
          </div>
        )}

        {sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {sources.map((s) => (
              <Badge key={s.id} variant={s.ok ? (s.parsed?.found ? 'success' : 'muted') : 'destructive'}>
                {s.label}
                {!s.ok ? ' failed' : s.parsed?.found ? '' : ' empty'}
              </Badge>
            ))}
          </div>
        )}

        {primary?.found === false && sources.every((s) => !s.parsed?.found) && (
          <>
            <div className="flex items-start gap-2 rounded-md border border-success/30 bg-success/10 p-2 text-[11px] text-success">
              <ShieldCheck className="size-3.5 shrink-0" />
              <p>{primary.domain} does not appear to be registered in the sources that answered.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium">Check availability / register</p>
              <div className="flex flex-wrap gap-2">
                {registrarSearchLinks(primary.domain).map((l) => (
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

        {primary?.found && <ResultCard result={primary} />}

        {emails.length > 0 && (
          <Card>
            <CardContent className="flex flex-col gap-2 p-3">
              <p className="text-xs font-medium">Emails collected from WHOIS records</p>
              {emails.map((e) => (
                <div key={e} className="flex items-center justify-between gap-2">
                  <span className="break-all text-[11px]">{e}</span>
                  <CopyButton text={e} label="" className="size-7 p-0" />
                </div>
              ))}
              <Button size="sm" variant="outline" className="w-fit" onClick={() => onNavigate('osint', 'mailhunt')}>
                Look up in MailHunt
              </Button>
            </CardContent>
          </Card>
        )}

        {sources.length > 0 && (
          <Tabs defaultValue={sources[0]!.id}>
            <TabsList>
              {sources.map((s) => (
                <TabsTrigger key={s.id} value={s.id}>
                  {s.id === 'rdap' ? 'RDAP' : s.id === 'hackertarget' ? 'API' : 'who.is'}
                </TabsTrigger>
              ))}
            </TabsList>
            {sources.map((s) => (
              <TabsContent key={s.id} value={s.id}>
                {s.error && <ModuleNote tone="error">{s.error}</ModuleNote>}
                {s.raw && (
                  <pre className="max-h-56 overflow-auto rounded-md bg-muted p-2 text-[10px]">{s.raw}</pre>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}

        {sources.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="w-fit"
            onClick={() => exportJson('whois', { domain: normalizeDomain(domain), sources, emails })}
          >
            Export JSON
          </Button>
        )}
      </div>
    </div>
  );
}

export default WhoisLookup;
