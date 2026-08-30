import { useState } from 'react';
import { Loader2, ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTarget } from '@/components/shell/TargetProvider';
import { checkDnssec, type DnssecResult } from '@/lib/dnssec';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

const verdictMeta: Record<DnssecResult['verdict'], { label: string; variant: 'success' | 'warning' | 'destructive'; icon: typeof ShieldCheck }> = {
  enabled: { label: 'DNSSEC enabled and validating', variant: 'success', icon: ShieldCheck },
  partial: { label: 'DNSSEC published, not validating', variant: 'warning', icon: ShieldQuestion },
  disabled: { label: 'DNSSEC not enabled', variant: 'destructive', icon: ShieldAlert },
};

export function DNSSECCheck({ onBack }: ModuleComponentProps) {
  const { target } = useTarget();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DnssecResult | null>(null);

  async function scan() {
    if (!target) return;
    setLoading(true);
    setResult(null);
    try {
      setResult(await checkDnssec(target));
    } finally {
      setLoading(false);
    }
  }

  const Meta = result ? verdictMeta[result.verdict] : null;

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="DNSSECCheck"
        description="Checks DNSKEY/DS records and DoH validation (AD flag) for DNSSEC. Best-effort over DoH."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Button size="sm" onClick={scan} disabled={!target || loading} className="w-fit">
          {loading ? <Loader2 className="size-3 animate-spin" /> : null}
          Check {target || '(set a target)'}
        </Button>

        {result && Meta && (
          <>
            <Card>
              <CardContent className="flex flex-col gap-2 p-3">
                <Badge variant={Meta.variant} className="w-fit gap-1">
                  <Meta.icon className="size-2.5" /> {Meta.label}
                </Badge>
                <p className="text-xs text-muted-foreground">{result.detail}</p>
              </CardContent>
            </Card>

            {result.dnskeyRecords.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium">DNSKEY records ({result.dnskeyRecords.length})</p>
                <Card>
                  <CardContent className="flex flex-col divide-y divide-border p-0">
                    {result.dnskeyRecords.map((r, i) => (
                      <p key={i} className="break-all p-1.5 text-[11px]">
                        {r}
                      </p>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {result.dsRecords.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium">DS records ({result.dsRecords.length})</p>
                <Card>
                  <CardContent className="flex flex-col divide-y divide-border p-0">
                    {result.dsRecords.map((r, i) => (
                      <p key={i} className="break-all p-1.5 text-[11px]">
                        {r}
                      </p>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <CopyButton text={JSON.stringify(result, null, 2)} label="Copy JSON" />
              <Button size="sm" variant="outline" onClick={() => exportJson('dnsseccheck', result)}>
                Export JSON
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default DNSSECCheck;
