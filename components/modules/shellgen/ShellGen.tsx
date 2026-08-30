import { useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SHELL_VARIANTS, TTY_UPGRADES, urlEncodeIfNeeded } from '@/lib/shellgen';
import type { ModuleComponentProps } from '@/types';

export function ShellGen({ onBack }: ModuleComponentProps) {
  const [lhost, setLhost] = useState('10.10.10.10');
  const [lport, setLport] = useState('4444');
  const [urlEncode, setUrlEncode] = useState(false);

  const commands = useMemo(
    () => SHELL_VARIANTS.map((v) => ({ id: v.id, name: v.name, command: v.build(lhost, lport) })),
    [lhost, lport],
  );

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="ShellGen"
        description="Reverse-shell one-liners. Nothing is executed by the extension - copy and run in your own listener/target."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <a
          href="https://www.revshells.com/"
          target="_blank"
          rel="noreferrer"
          className="flex w-fit items-center gap-1 text-[11px] text-primary hover:underline"
        >
          <ExternalLink className="size-3" /> Interactive generator (more shells)
        </a>

        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label className="text-muted-foreground">LHOST</Label>
            <Input value={lhost} onChange={(e) => setLhost(e.target.value)} className="w-36" />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-muted-foreground">LPORT</Label>
            <Input value={lport} onChange={(e) => setLport(e.target.value)} className="w-24" />
          </div>
          <div className="flex items-center gap-1.5 pb-1.5">
            <Label className="text-muted-foreground">URL-encode</Label>
            <Switch checked={urlEncode} onCheckedChange={setUrlEncode} />
          </div>
        </div>

        <Tabs defaultValue="shells">
          <TabsList>
            <TabsTrigger value="shells">Reverse shells</TabsTrigger>
            <TabsTrigger value="tty">TTY upgrade</TabsTrigger>
          </TabsList>
          <TabsContent value="shells">
            <div className="flex flex-col gap-2">
              {commands.map((c) => {
                const output = urlEncodeIfNeeded(c.command, urlEncode);
                return (
                  <Card key={c.id}>
                    <CardContent className="flex flex-col gap-1.5 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium">{c.name}</p>
                        <CopyButton text={output} />
                      </div>
                      <code className="block break-all rounded bg-muted p-2 text-[11px]">{output}</code>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
          <TabsContent value="tty">
            <div className="flex flex-col gap-2">
              {TTY_UPGRADES.map((t) => (
                <Card key={t.id}>
                  <CardContent className="flex flex-col gap-1.5 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium">{t.name}</p>
                      <CopyButton text={t.command} />
                    </div>
                    <pre className="whitespace-pre-wrap break-all rounded bg-muted p-2 text-[11px]">
                      {t.command}
                    </pre>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default ShellGen;
