import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTarget } from '@/components/shell/TargetProvider';
import { hostForCli, isSafeCliHost, NET_COMMANDS, type NetFamily } from '@/lib/netcmds';
import type { ModuleComponentProps } from '@/types';

export function NetCmds({ onBack, onNavigate }: ModuleComponentProps) {
  const { target } = useTarget();
  const [family, setFamily] = useState<NetFamily>('windows');

  const host = useMemo(() => hostForCli(target), [target]);
  const safe = isSafeCliHost(host);
  const cliHost = safe ? host : '<host>';

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="NetCmds"
        description="Ping, traceroute, WHOIS and nmap as copy-paste CLI. The extension cannot open raw sockets, so nothing here is executed."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
          <AlertTriangle className="size-3.5 shrink-0" />
          <p>
            Browsers have no raw sockets. ICMP ping, traceroute, TCP port 43 WHOIS, and real
            port scans cannot run inside this panel. Copy the command into a terminal on an
            authorized engagement, or use the in-browser alternatives (RDAP WHOIS, Shodan
            InternetDB) where they exist.
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            Host: <span className="font-medium text-foreground">{host || '(set a target)'}</span>
            {host && !safe ? ' - not interpolated (unsafe characters)' : ''}
          </p>
          <Tabs value={family} onValueChange={(v) => setFamily(v as NetFamily)}>
            <TabsList>
              <TabsTrigger value="windows">Windows</TabsTrigger>
              <TabsTrigger value="unix">Linux / macOS</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {NET_COMMANDS.map((def) => {
          const command = def.build(cliHost, family);
          return (
            <Card key={def.id}>
              <CardHeader>
                <CardTitle>{def.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <p className="text-[11px] text-muted-foreground">{def.whyNotInBrowser}</p>
                <div className="rounded-md bg-muted p-2">
                  <code className="block whitespace-pre-wrap break-all text-[11px]">{command}</code>
                </div>
                <div className="flex flex-wrap gap-2">
                  <CopyButton text={command} className="w-fit" />
                  {def.inBrowserAlt && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onNavigate(def.inBrowserAlt!.pillar, def.inBrowserAlt!.moduleId)}
                    >
                      {def.inBrowserAlt.label}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default NetCmds;
