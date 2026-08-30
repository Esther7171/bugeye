import { useMemo, useState } from 'react';
import { ExternalLink, AlertTriangle } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PEAS_ASSETS, PEAS_RUN_SNIPPETS } from '@/lib/peas';
import { TRANSFER_CMDS } from '@/lib/linuxcmds';
import type { ModuleComponentProps } from '@/types';

export function PEASGet({ onBack }: ModuleComponentProps) {
  const [ip, setIp] = useState('10.10.10.10');
  const [port, setPort] = useState('8000');

  const transferCommands = useMemo(
    () => TRANSFER_CMDS.map((c) => ({ ...c, output: c.build(ip, port, 'linpeas.sh') })),
    [ip, port],
  );

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="PEASGet"
        description="Official PEASS-ng links and run snippets. The extension never downloads or runs these for you."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
          <AlertTriangle className="size-3.5 shrink-0" />
          <p>Links and copy only - always run PEAS on systems you're authorized to test.</p>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Official downloads (PEASS-ng latest release)
          </p>
          <div className="flex flex-col gap-2">
            {PEAS_ASSETS.map((a) => (
              <Card key={a.id}>
                <CardContent className="flex items-center justify-between gap-2 p-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="normal-case">
                      {a.platform}
                    </Badge>
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      {a.label} <ExternalLink className="size-3" />
                    </a>
                  </div>
                  <CopyButton text={a.url} label="Copy link" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            How to run
          </p>
          <div className="flex flex-col gap-2">
            {PEAS_RUN_SNIPPETS.map((s) => (
              <Card key={s.id}>
                <CardContent className="flex flex-col gap-1.5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="normal-case">
                        {s.platform}
                      </Badge>
                      <p className="text-xs font-medium">{s.label}</p>
                    </div>
                    <CopyButton text={s.command} />
                  </div>
                  <code className="block break-all rounded bg-muted p-2 text-[11px]">{s.command}</code>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Transfer instead (reuses LinuxCmds transfer set)
          </p>
          <div className="mb-2 flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-muted-foreground">Attacker IP</Label>
              <Input value={ip} onChange={(e) => setIp(e.target.value)} className="w-32" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-muted-foreground">Port</Label>
              <Input value={port} onChange={(e) => setPort(e.target.value)} className="w-20" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {transferCommands.map((c) => (
              <Card key={c.id}>
                <CardContent className="flex flex-col gap-1.5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="normal-case">
                        {c.side}
                      </Badge>
                      <p className="text-xs font-medium">{c.label}</p>
                    </div>
                    <CopyButton text={c.output} />
                  </div>
                  <pre className="whitespace-pre-wrap break-all rounded bg-muted p-2 text-[11px]">
                    {c.output}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PEASGet;
