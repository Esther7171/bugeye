import { useState } from 'react';
import { Loader2, AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTarget } from '@/components/shell/TargetProvider';
import { sendToBackground, type CorsCheckResult } from '@/lib/messaging';
import type { ModuleComponentProps } from '@/types';

export function CORSCheck({ onBack }: ModuleComponentProps) {
  const { target } = useTarget();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CorsCheckResult | null>(null);

  async function scan() {
    if (!target) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await sendToBackground({ type: 'CORS_CHECK', url: `https://${target}/` });
      setResult(res);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="CORSCheck"
        description="Best-effort test for Origin reflection in Access-Control-Allow-Origin, with credentials."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Button size="sm" onClick={scan} disabled={!target || loading} className="w-fit">
          {loading ? <Loader2 className="size-3 animate-spin" /> : null}
          Test {target || '(set a target)'}
        </Button>

        {result && (
          <Card>
            <CardContent className="flex flex-col gap-2 p-3">
              {result.wildcardWithCredentials && (
                <Badge variant="destructive" className="w-fit gap-1">
                  <ShieldAlert className="size-2.5" /> wildcard origin + credentials (invalid per spec, but check the server)
                </Badge>
              )}
              {result.reflected && !result.wildcardWithCredentials && (
                <Badge variant="warning" className="w-fit gap-1">
                  <AlertTriangle className="size-2.5" /> origin reflected in ACAO
                </Badge>
              )}
              {!result.reflected && result.ok && (
                <Badge variant="success" className="w-fit gap-1">
                  <ShieldCheck className="size-2.5" /> not reflected
                </Badge>
              )}
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
                <span className="text-muted-foreground">Request Origin</span>
                <span className="truncate">{result.requestOrigin}</span>
                <span className="text-muted-foreground">Access-Control-Allow-Origin</span>
                <span className="truncate">{result.acao ?? '(not present)'}</span>
                <span className="text-muted-foreground">Access-Control-Allow-Credentials</span>
                <span className="truncate">{result.acac ?? '(not present)'}</span>
                {result.status !== undefined && (
                  <>
                    <span className="text-muted-foreground">Status</span>
                    <span>{result.status}</span>
                  </>
                )}
              </div>
              {result.error && <p className="text-[11px] text-muted-foreground">{result.error}</p>}
            </CardContent>
          </Card>
        )}

        <p className="text-[11px] text-muted-foreground">
          This probes with the extension's own origin, which the target has never allow-listed on
          purpose. A reflected wildcard-like response usually means the server reflects ANY origin,
          which is the real risk signal, not this specific origin being trusted. CORS behavior can
          also vary by endpoint and request method; verify manually before reporting.
        </p>
      </div>
    </div>
  );
}

export default CORSCheck;
