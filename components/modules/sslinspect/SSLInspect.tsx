import { useState } from 'react';
import { Loader2, ShieldAlert, ShieldCheck, Send } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTarget } from '@/components/shell/TargetProvider';
import { useHostPermission } from '@/lib/useHostPermission';
import { sendToBackground } from '@/lib/messaging';
import { summarizeCerts, sslReportToMarkdown, type SslSummary } from '@/lib/ssl';
import { exportMarkdown } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

export function SSLInspect({ onBack, onNavigate }: ModuleComponentProps) {
  const { target } = useTarget();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<SslSummary | null>(null);
  const [note, setNote] = useState('');
  const { ensure, pending } = useHostPermission();

  async function scan() {
    if (!target) return;
    setLoading(true);
    setNote('');
    setSummary(null);
    try {
      const granted = await ensure('https://crt.sh/*');
      if (!granted) {
        setNote('Host permission was not granted.');
        return;
      }
      const result = await sendToBackground({ type: 'FETCH_CRTSH_CERTS', domain: target });
      if (!result.ok) {
        setNote(result.error ?? 'crt.sh lookup failed.');
        return;
      }
      const parsed = summarizeCerts(target, result.entries);
      if (!parsed) {
        setNote('No certificate transparency logs found for this domain.');
        return;
      }
      setSummary(parsed);
    } finally {
      setLoading(false);
    }
  }

  const opensslCmd = target ? `openssl s_client -connect ${target}:443 -servername ${target}` : '';

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="SSLInspect"
        description="Certificate info via crt.sh CT logs: issuer, validity, expiry and SANs."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Button size="sm" onClick={scan} disabled={!target || loading || pending} className="w-fit">
          {loading || pending ? <Loader2 className="size-3 animate-spin" /> : null}
          Inspect certificate for {target || '(set a target)'}
        </Button>

        {note && <p className="text-xs text-muted-foreground">{note}</p>}

        {summary && (
          <>
            <Card>
              <CardContent className="flex flex-col gap-2 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">{summary.latest.issuerName}</p>
                  {summary.expired ? (
                    <Badge variant="destructive" className="gap-1">
                      <ShieldAlert className="size-2.5" /> expired
                    </Badge>
                  ) : (
                    <Badge variant={summary.daysUntilExpiry < 21 ? 'warning' : 'success'} className="gap-1">
                      <ShieldCheck className="size-2.5" /> {summary.daysUntilExpiry}d left
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span>Valid from</span>
                  <span>{summary.latest.notBefore}</span>
                  <span>Valid until</span>
                  <span>{summary.latest.notAfter}</span>
                </div>
              </CardContent>
            </Card>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-xs font-medium">SANs from CT logs ({summary.sans.length})</p>
                {summary.sans.length > 0 && (
                  <Button size="sm" variant="outline" onClick={() => onNavigate('osint', 'subfinder')}>
                    <Send className="size-3" /> Send to SubFinder
                  </Button>
                )}
              </div>
              <Card>
                <CardContent className="max-h-48 overflow-y-auto p-0">
                  {summary.sans.length === 0 && (
                    <p className="p-2 text-xs text-muted-foreground">No additional names found.</p>
                  )}
                  {summary.sans.map((s) => (
                    <div key={s} className="truncate border-b border-border p-1.5 text-xs last:border-0">
                      {s}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-wrap gap-2">
              <CopyButton text={sslReportToMarkdown(target, summary)} label="Copy report" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportMarkdown('sslinspect', sslReportToMarkdown(target, summary))}
              >
                Export
              </Button>
            </div>
          </>
        )}

        <div className="flex flex-col gap-1.5 border-t border-border pt-3">
          <p className="text-xs font-medium">Live handshake details</p>
          <p className="text-[11px] text-muted-foreground">
            Cipher suite, protocol version and chain validation are not readable from the browser.
            Run this locally instead:
          </p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-muted p-2 text-[11px]">{opensslCmd}</code>
            <CopyButton text={opensslCmd} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default SSLInspect;
