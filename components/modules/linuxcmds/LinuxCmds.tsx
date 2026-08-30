import { useMemo, useState } from 'react';
import { ExternalLink, AlertTriangle } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PRIVESC_ENUM, TRANSFER_CMDS, PIVOT_CMDS } from '@/lib/linuxcmds';
import type { ModuleComponentProps } from '@/types';

function CmdCard({
  label,
  command,
  badge,
  link,
}: {
  label: string;
  command: string;
  badge?: string;
  link?: { label: string; url: string };
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1.5 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-medium">{label}</p>
            {badge && (
              <Badge variant="outline" className="normal-case">
                {badge}
              </Badge>
            )}
          </div>
          <CopyButton text={command} />
        </div>
        <pre className="whitespace-pre-wrap break-all rounded bg-muted p-2 text-[11px]">{command}</pre>
        {link && (
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="flex w-fit items-center gap-1 text-[11px] text-primary hover:underline"
          >
            <ExternalLink className="size-3" /> {link.label}
          </a>
        )}
      </CardContent>
    </Card>
  );
}

export function LinuxCmds({ onBack }: ModuleComponentProps) {
  const [ip, setIp] = useState('10.10.10.10');
  const [port, setPort] = useState('8000');
  const [file, setFile] = useState('linpeas.sh');
  const [localPort, setLocalPort] = useState('8080');
  const [remoteHost, setRemoteHost] = useState('127.0.0.1');
  const [remotePort, setRemotePort] = useState('80');
  const [sshTarget, setSshTarget] = useState('user@10.10.10.10');

  const transferCommands = useMemo(
    () => TRANSFER_CMDS.map((c) => ({ ...c, output: c.build(ip, port, file) })),
    [ip, port, file],
  );
  const pivotCommands = useMemo(
    () => PIVOT_CMDS.map((c) => ({ ...c, output: c.build(localPort, remoteHost, remotePort, sshTarget) })),
    [localPort, remoteHost, remotePort, sshTarget],
  );

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="LinuxCmds"
        description="Copy-paste command cheats. The extension generates text only - nothing is executed."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
          <AlertTriangle className="size-3.5 shrink-0" />
          <p>Enumeration commands are for authorized assessments and labs only.</p>
        </div>

        <Tabs defaultValue="privesc">
          <TabsList>
            <TabsTrigger value="privesc">Privesc enum</TabsTrigger>
            <TabsTrigger value="transfer">File transfer</TabsTrigger>
            <TabsTrigger value="pivot">Port-forward / pivot</TabsTrigger>
          </TabsList>

          <TabsContent value="privesc">
            <div className="flex flex-col gap-2">
              {PRIVESC_ENUM.map((c) => (
                <CmdCard key={c.id} label={c.label} command={c.command} link={c.link} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="transfer">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex flex-col gap-1">
                  <Label className="text-muted-foreground">Attacker IP</Label>
                  <Input value={ip} onChange={(e) => setIp(e.target.value)} className="w-32" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-muted-foreground">Port</Label>
                  <Input value={port} onChange={(e) => setPort(e.target.value)} className="w-20" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-muted-foreground">Filename</Label>
                  <Input value={file} onChange={(e) => setFile(e.target.value)} className="w-40" />
                </div>
              </div>
              {transferCommands.map((c) => (
                <CmdCard key={c.id} label={c.label} command={c.output} badge={c.side} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="pivot">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex flex-col gap-1">
                  <Label className="text-muted-foreground">ssh target</Label>
                  <Input value={sshTarget} onChange={(e) => setSshTarget(e.target.value)} className="w-40" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-muted-foreground">Local port</Label>
                  <Input value={localPort} onChange={(e) => setLocalPort(e.target.value)} className="w-24" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-muted-foreground">Remote host</Label>
                  <Input value={remoteHost} onChange={(e) => setRemoteHost(e.target.value)} className="w-32" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-muted-foreground">Remote port</Label>
                  <Input value={remotePort} onChange={(e) => setRemotePort(e.target.value)} className="w-24" />
                </div>
              </div>
              {pivotCommands.map((c) => (
                <CmdCard key={c.id} label={c.label} command={c.output} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default LinuxCmds;
