import { useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTarget } from '@/components/shell/TargetProvider';
import { sendToBackground, type HttpMethodsResult } from '@/lib/messaging';
import { normalizeUrl } from '@/lib/utils';
import type { ModuleComponentProps } from '@/types';

const NOTABLE = new Set(['PUT', 'DELETE', 'PATCH', 'TRACE', 'CONNECT']);

export function HTTPMethods({ onBack }: ModuleComponentProps) {
  const { target } = useTarget();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HttpMethodsResult | null>(null);
  const [note, setNote] = useState('');

  async function scan() {
    const normalized = normalizeUrl(url || target);
    if (!normalized) {
      setNote('Enter a valid URL.');
      return;
    }
    setLoading(true);
    setNote('');
    setResult(null);
    try {
      const res = await sendToBackground({ type: 'HTTP_METHODS_CHECK', url: normalized });
      setResult(res);
      if (!res.ok) setNote(res.error ?? 'Request failed.');
      else if (!res.allow && !res.accessControlAllowMethods) {
        setNote('OPTIONS responded but did not include an Allow or Access-Control-Allow-Methods header.');
      }
    } finally {
      setLoading(false);
    }
  }

  const methods = Array.from(new Set([...(result?.allow ?? []), ...(result?.accessControlAllowMethods ?? [])]));

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="HTTPMethods"
        description="Sends a safe OPTIONS probe to see which HTTP methods the server allows."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex gap-2">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={target || 'https://example.com/api/resource'} />
          <Button size="sm" onClick={scan} disabled={loading} className="shrink-0">
            {loading ? <Loader2 className="size-3 animate-spin" /> : null}
            Probe
          </Button>
        </div>

        {note && <p className="text-xs text-muted-foreground">{note}</p>}

        {methods.length > 0 && (
          <Card>
            <CardContent className="flex flex-col gap-2 p-3">
              <div className="flex flex-wrap gap-1.5">
                {methods.map((m) => (
                  <Badge key={m} variant={NOTABLE.has(m) ? 'warning' : 'outline'}>
                    {m}
                  </Badge>
                ))}
              </div>
              {methods.some((m) => NOTABLE.has(m)) && (
                <div className="flex items-start gap-2 text-[11px] text-warning">
                  <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                  <p>State-changing methods are advertised. Verify they require proper authorization.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <p className="text-[11px] text-muted-foreground">
          Only sends OPTIONS, never PUT/DELETE/PATCH directly, to avoid making real state-changing
          requests. Some servers do not implement OPTIONS accurately; treat this as best-effort and
          CORS may hide the true picture for cross-origin requests.
        </p>
      </div>
    </div>
  );
}

export default HTTPMethods;
