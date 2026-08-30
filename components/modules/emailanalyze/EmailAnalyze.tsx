import { useState } from 'react';
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useHostPermission } from '@/lib/useHostPermission';
import { sendToBackground } from '@/lib/messaging';
import { isDisposableDomain } from '@/lib/disposable';
import { md5 } from '@/lib/hash';
import type { ModuleComponentProps } from '@/types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AnalyzeResult {
  domain: string;
  validFormat: boolean;
  disposable: boolean;
  mx: string[];
  spf: string | null;
  dmarc: string | null;
  gravatar: boolean | null;
}

export function EmailAnalyze({ onBack }: ModuleComponentProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const { ensure, pending } = useHostPermission();

  async function analyze() {
    const trimmed = email.trim().toLowerCase();
    const validFormat = EMAIL_RE.test(trimmed);
    const domain = trimmed.split('@')[1] ?? '';
    if (!validFormat || !domain) {
      setResult({ domain, validFormat, disposable: false, mx: [], spf: null, dmarc: null, gravatar: null });
      return;
    }

    setLoading(true);
    try {
      const [mxRes, spfRes, dmarcRes] = await Promise.all([
        sendToBackground({ type: 'DOH_QUERY', hostname: domain, recordType: 'MX' }),
        sendToBackground({ type: 'DOH_QUERY', hostname: domain, recordType: 'TXT' }),
        sendToBackground({ type: 'DOH_QUERY', hostname: `_dmarc.${domain}`, recordType: 'TXT' }),
      ]);

      const mx = mxRes.ok ? mxRes.answers.map((a) => a.data).sort() : [];
      const spf = spfRes.ok ? (spfRes.answers.find((a) => a.data.includes('v=spf1'))?.data ?? null) : null;
      const dmarc = dmarcRes.ok ? (dmarcRes.answers.find((a) => a.data.includes('v=DMARC1'))?.data ?? null) : null;

      let gravatar: boolean | null = null;
      const grantedGravatar = await ensure('https://www.gravatar.com/*');
      if (grantedGravatar) {
        const hash = md5(trimmed);
        const probe = await sendToBackground({ type: 'HEAD_PROBE', url: `https://www.gravatar.com/avatar/${hash}?d=404` });
        gravatar = probe.status === 200;
      }

      setResult({ domain, validFormat, disposable: isDisposableDomain(domain), mx, spf, dmarc, gravatar });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="EmailAnalyze"
        description="Format validity, MX/SPF/DMARC lookup via DoH, disposable-provider check and Gravatar presence."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex gap-2">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
          <Button size="sm" onClick={analyze} disabled={!email.trim() || loading || pending} className="shrink-0">
            {loading || pending ? <Loader2 className="size-3 animate-spin" /> : null}
            Analyze
          </Button>
        </div>

        {result && (
          <Card>
            <CardContent className="flex flex-col gap-2 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span>Format valid</span>
                {result.validFormat ? <CheckCircle2 className="size-3.5 text-success" /> : <XCircle className="size-3.5 text-destructive" />}
              </div>
              {result.validFormat && (
                <>
                  <div className="flex items-center justify-between">
                    <span>Disposable provider</span>
                    {result.disposable ? (
                      <Badge variant="warning" className="gap-1">
                        <AlertTriangle className="size-2.5" /> yes
                      </Badge>
                    ) : (
                      <Badge variant="success">no</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Gravatar</span>
                    {result.gravatar === null ? (
                      <Badge variant="muted">unknown</Badge>
                    ) : result.gravatar ? (
                      <Badge variant="success">present</Badge>
                    ) : (
                      <Badge variant="muted">not found</Badge>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 border-t border-border pt-2">
                    <span className="font-medium">MX records ({result.mx.length})</span>
                    {result.mx.length === 0 ? (
                      <span className="text-muted-foreground">None found (mail may not be accepted for this domain).</span>
                    ) : (
                      result.mx.map((m) => <span key={m}>{m}</span>)
                    )}
                  </div>
                  <div className="flex flex-col gap-1 border-t border-border pt-2">
                    <span className="font-medium">SPF</span>
                    <span className="break-all text-muted-foreground">{result.spf ?? 'Not found.'}</span>
                  </div>
                  <div className="flex flex-col gap-1 border-t border-border pt-2">
                    <span className="font-medium">DMARC</span>
                    <span className="break-all text-muted-foreground">{result.dmarc ?? 'Not found.'}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default EmailAnalyze;
