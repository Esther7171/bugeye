import { useMemo, useState } from 'react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useTarget } from '@/components/shell/TargetProvider';
import {
  buildFfuf,
  buildWfuzz,
  buildGobuster,
  buildFeroxbuster,
  type FuzzOptions,
  type FuzzPosition,
} from '@/lib/fuzzbuild';
import type { ModuleComponentProps } from '@/types';

const POSITIONS: { id: FuzzPosition; label: string }[] = [
  { id: 'path', label: 'Path (directory/file)' },
  { id: 'param', label: 'Query parameter value' },
  { id: 'header', label: 'Header value' },
  { id: 'vhost', label: 'Virtual host (subdomain)' },
  { id: 'body', label: 'POST body field' },
];

export function FuzzBuild({ onBack }: ModuleComponentProps) {
  const { target } = useTarget();
  const [o, setO] = useState<FuzzOptions>({
    target: target ? `https://${target}` : 'https://example.com',
    position: 'path',
    paramName: 'q',
    headerName: 'X-Custom-Header',
    bodyTemplate: 'username=admin&password=FUZZ',
    wordlist: '/usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt',
    matchCodes: '200,204,301,302,307,401,403',
    filterCodes: '',
    filterSize: '',
    autoCalibrate: true,
    recursion: false,
    extensions: '',
    threads: '40',
    rate: '',
  });

  function set<K extends keyof FuzzOptions>(key: K, value: FuzzOptions[K]) {
    setO((prev) => ({ ...prev, [key]: value }));
  }

  const ffuf = useMemo(() => buildFfuf(o), [o]);
  const wfuzz = useMemo(() => buildWfuzz(o), [o]);
  const gobuster = useMemo(() => buildGobuster(o), [o]);
  const feroxbuster = useMemo(() => buildFeroxbuster(o), [o]);

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="FuzzBuild"
        description="Builds ffuf/wfuzz/gobuster/feroxbuster commands. String generation only, nothing is executed."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-muted-foreground">Target URL</Label>
          <Input value={o.target} onChange={(e) => set('target', e.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-muted-foreground">FUZZ position</Label>
          <Select value={o.position} onValueChange={(v) => set('position', v as FuzzPosition)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POSITIONS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {o.position === 'param' && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground">Parameter name</Label>
            <Input value={o.paramName} onChange={(e) => set('paramName', e.target.value)} />
          </div>
        )}
        {o.position === 'header' && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground">Header name</Label>
            <Input value={o.headerName} onChange={(e) => set('headerName', e.target.value)} />
          </div>
        )}
        {o.position === 'body' && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground">Body template (include FUZZ)</Label>
            <Input value={o.bodyTemplate} onChange={(e) => set('bodyTemplate', e.target.value)} />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label className="text-muted-foreground">Wordlist path</Label>
          <Input value={o.wordlist} onChange={(e) => set('wordlist', e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground">Match codes (-mc)</Label>
            <Input value={o.matchCodes} onChange={(e) => set('matchCodes', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground">Filter codes (-fc)</Label>
            <Input value={o.filterCodes} onChange={(e) => set('filterCodes', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground">Filter size (-fs)</Label>
            <Input value={o.filterSize} onChange={(e) => set('filterSize', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground">Extensions (-e)</Label>
            <Input value={o.extensions} onChange={(e) => set('extensions', e.target.value)} placeholder=".php,.html" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground">Threads (-t)</Label>
            <Input value={o.threads} onChange={(e) => set('threads', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground">Rate (-rate)</Label>
            <Input value={o.rate} onChange={(e) => set('rate', e.target.value)} />
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-1.5">
            <Label className="text-muted-foreground">Auto-calibrate</Label>
            <Switch checked={o.autoCalibrate} onCheckedChange={(v) => set('autoCalibrate', v)} />
          </div>
          <div className="flex items-center gap-1.5">
            <Label className="text-muted-foreground">Recursion</Label>
            <Switch checked={o.recursion} onCheckedChange={(v) => set('recursion', v)} />
          </div>
        </div>

        {[
          { name: 'ffuf', cmd: ffuf },
          { name: 'wfuzz', cmd: wfuzz },
          ...(gobuster ? [{ name: 'gobuster', cmd: gobuster }] : []),
          ...(feroxbuster ? [{ name: 'feroxbuster', cmd: feroxbuster }] : []),
        ].map(({ name, cmd }) => (
          <Card key={name}>
            <CardContent className="flex flex-col gap-1.5 p-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">{name}</p>
                <CopyButton text={cmd} />
              </div>
              <code className="block break-all rounded bg-muted p-2 text-[11px]">{cmd}</code>
            </CardContent>
          </Card>
        ))}
        {!gobuster && (
          <p className="text-[11px] text-muted-foreground">
            gobuster and feroxbuster are directory-mode tools; switch FUZZ position to "Path" to see
            equivalent commands for them.
          </p>
        )}
      </div>
    </div>
  );
}

export default FuzzBuild;
