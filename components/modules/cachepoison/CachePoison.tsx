import { useState } from 'react';
import { Loader2, ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { ModuleNote } from '@/components/shell/ModuleNote';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTarget } from '@/components/shell/TargetProvider';
import { useHostPermission } from '@/lib/useHostPermission';
import { sendToBackground, type CachePoisonResult } from '@/lib/messaging';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

export function CachePoison({ onBack }: ModuleComponentProps) {
  const { target } = useTarget();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CachePoisonResult | null>(null);
  const { ensure, pending } = useHostPermission();

  async function run() {
    if (!target) return;
    setLoading(true);
    setResult(null);
    try {
      const granted = await ensure(`https://${target}/*`);
      if (!granted) {
        setResult({
          ok: false,
          canary: '',
          status: null,
          cacheable: false,
          reflected: [],
          unkeyedNotInVary: [],
          error: 'Host permission was not granted.',
        });
        return;
      }
      setResult(await sendToBackground({ type: 'CACHE_POISON_PROBE', url: `https://${target}/` }));
    } finally {
      setLoading(false);
    }
  }

  const signal = result?.ok && result.unkeyedNotInVary.length > 0 && result.cacheable;

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="CachePoison"
        description="Sends one request with a unique canary in unkeyed hop-by-hop headers. Flags if the canary is reflected into a cacheable response whose Vary does not list that header. Detection only, does not poison a shared cache for other users."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Button size="sm" onClick={run} disabled={!target || loading || pending} className="w-fit">
          {loading || pending ? <Loader2 className="size-3 animate-spin" /> : null}
          Probe {target || '(set a target)'}
        </Button>

        {result?.error && <ModuleNote tone="error">{result.error}</ModuleNote>}

        {result && !result.error && (
          <Card>
            <CardContent className="flex flex-col gap-2 p-3">
              {signal ? (
                <Badge variant="warning" className="w-fit gap-1">
                  <AlertTriangle className="size-2.5" /> unkeyed header reflected into a cacheable response
                </Badge>
              ) : result.reflected.length > 0 ? (
                <Badge variant="muted" className="w-fit gap-1">
                  <ShieldAlert className="size-2.5" /> reflected, but response does not look shared-cacheable
                </Badge>
              ) : (
                <Badge variant="success" className="w-fit gap-1">
                  <ShieldCheck className="size-2.5" /> canary not reflected
                </Badge>
              )}
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
                <span className="text-muted-foreground">Canary</span>
                <span className="break-all">{result.canary}</span>
                <span className="text-muted-foreground">Status</span>
                <span>{result.status ?? '(none)'}</span>
                <span className="text-muted-foreground">Cache-Control</span>
                <span className="break-all">{result.cacheControl ?? '(none)'}</span>
                <span className="text-muted-foreground">Vary</span>
                <span className="break-all">{result.vary ?? '(none)'}</span>
                <span className="text-muted-foreground">Shared-cacheable?</span>
                <span>{result.cacheable ? 'yes' : 'no'}</span>
                <span className="text-muted-foreground">Reflected</span>
                <span>{result.reflected.join(', ') || 'none'}</span>
                <span className="text-muted-foreground">Reflected and unkeyed</span>
                <span>{result.unkeyedNotInVary.join(', ') || 'none'}</span>
                {result.location && (
                  <>
                    <span className="text-muted-foreground">Location</span>
                    <span className="break-all">{result.location}</span>
                  </>
                )}
              </div>
              <Button size="sm" variant="outline" className="w-fit" onClick={() => exportJson('cachepoison', result)}>
                Export JSON
              </Button>
            </CardContent>
          </Card>
        )}

        <p className="text-[11px] text-muted-foreground">
          Headers probed: X-Forwarded-Host, X-Forwarded-Scheme, X-Original-URL, X-Rewrite-URL, X-Host,
          X-Forwarded-Port, X-Forwarded-Prefix. A hit is a signal to verify in a proxy, not proof a
          CDN will serve the poisoned page to someone else.
        </p>
      </div>
    </div>
  );
}

export default CachePoison;
