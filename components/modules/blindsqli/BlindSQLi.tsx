import { useMemo, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { BLIND_SQLI_PAYLOADS, BLIND_SQLI_LANDING_SPOTS } from '@/lib/blindsqli';
import type { ModuleComponentProps } from '@/types';

export function BlindSQLi({ onBack }: ModuleComponentProps) {
  const [collector, setCollector] = useState('your-id.oast.fun');

  const payloads = useMemo(
    () => BLIND_SQLI_PAYLOADS.map((p) => ({ ...p, value: p.build(collector || '{{collector}}') })),
    [collector],
  );

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="BlindSQLi"
        description="Generates out-of-band and time-based blind SQLi payloads pointing at your collector. Generation only; nothing is sent."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
          <ShieldAlert className="size-3.5 shrink-0" />
          <p>
            BugEye only generates these strings. You are responsible for where you submit them and
            for having authorization to test the target.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-muted-foreground">Collector domain (interactsh / Burp Collaborator)</Label>
          <Input value={collector} onChange={(e) => setCollector(e.target.value)} />
        </div>

        <div className="flex flex-col gap-2">
          {payloads.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex flex-col gap-1.5 p-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">{p.label}</p>
                  <CopyButton text={p.value} />
                </div>
                <code className="block break-all rounded bg-muted p-2 text-[11px]">{p.value}</code>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col gap-1.5 border-t border-border pt-3">
          <p className="text-xs font-medium">Where blind SQLi commonly lands</p>
          <ul className="list-inside list-disc text-[11px] text-muted-foreground">
            {BLIND_SQLI_LANDING_SPOTS.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default BlindSQLi;
