import { useState } from 'react';
import { Loader2, AlertTriangle, ArrowDown } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTarget } from '@/components/shell/TargetProvider';
import { sendToBackground, type RedirectTraceResult } from '@/lib/messaging';
import { normalizeUrl } from '@/lib/utils';
import { analyzeRedirectChain } from '@/lib/redirects';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

export function RedirectTrace({ onBack }: ModuleComponentProps) {
  const { target } = useTarget();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RedirectTraceResult | null>(null);
  const [note, setNote] = useState('');

  async function trace() {
    const normalized = normalizeUrl(url || target);
    if (!normalized) {
      setNote('Enter a valid URL.');
      return;
    }
    setLoading(true);
    setNote('');
    setResult(null);
    try {
      const res = await sendToBackground({ type: 'REDIRECT_TRACE', url: normalized });
      setResult(res);
      if (!res.ok) setNote(res.error ?? 'No response captured. The URL may not redirect, or the request failed.');
    } finally {
      setLoading(false);
    }
  }

  const analysis = result?.ok ? analyzeRedirectChain(url || target, result.hops) : null;
  const chain = result?.ok ? [{ url: url || target, status: 0 }, ...result.hops] : [];

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="RedirectTrace"
        description="Follows a redirect chain hop by hop and flags possible open-redirect or parameter leakage."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex gap-2">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={target || 'https://example.com/redirect?url=...'} />
          <Button size="sm" onClick={trace} disabled={loading} className="shrink-0">
            {loading ? <Loader2 className="size-3 animate-spin" /> : null}
            Trace
          </Button>
        </div>

        {note && <p className="text-xs text-muted-foreground">{note}</p>}

        {analysis && (analysis.openRedirectSuspect || analysis.paramLeakSuspect) && (
          <div className="flex flex-col gap-1.5 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
            {analysis.openRedirectSuspect && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                <p>
                  Possible open redirect: the <code>{analysis.openRedirectParam}</code> parameter's value matches
                  the final destination host.
                </p>
              </div>
            )}
            {analysis.paramLeakSuspect && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                <p>Possible parameter leakage to a third-party host: {analysis.leakedParams.join(', ')}.</p>
              </div>
            )}
          </div>
        )}

        {chain.length > 0 && (
          <>
            <div className="flex flex-col">
              {chain.map((hop, i) => (
                <div key={i} className="flex flex-col">
                  <Card>
                    <CardContent className="flex items-center gap-2 p-2.5">
                      {i > 0 && <Badge variant={hop.status >= 300 && hop.status < 400 ? 'warning' : 'muted'}>{hop.status}</Badge>}
                      <span className="min-w-0 flex-1 truncate text-xs">{hop.url}</span>
                    </CardContent>
                  </Card>
                  {i < chain.length - 1 && <ArrowDown className="mx-auto my-0.5 size-3 text-muted-foreground" />}
                </div>
              ))}
            </div>
            {result?.truncated && (
              <p className="text-[11px] text-warning">Chain truncated at the hop limit; there may be more redirects.</p>
            )}
            <div className="flex flex-wrap gap-2">
              <CopyButton text={chain.map((h) => h.url).join('\n')} label="Copy chain" />
              <Button size="sm" variant="outline" onClick={() => exportJson('redirecttrace', { chain, analysis })}>
                Export JSON
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default RedirectTrace;
