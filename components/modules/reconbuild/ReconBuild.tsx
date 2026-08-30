import { useMemo, useState } from 'react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useTarget } from '@/components/shell/TargetProvider';
import type { ModuleComponentProps } from '@/types';

interface ToggleDef {
  id: string;
  label: string;
  flag: string;
  defaultOn: boolean;
}

interface CommandDef {
  id: string;
  name: string;
  build: (target: string, toggles: Record<string, boolean>) => string;
  toggles: ToggleDef[];
}

const COMMANDS: CommandDef[] = [
  {
    id: 'bbot',
    name: 'bbot',
    toggles: [
      { id: 'subdomain', label: 'Subdomain enum', flag: 'subdomain-enum', defaultOn: true },
      { id: 'cloud', label: 'Cloud enum', flag: 'cloud-enum', defaultOn: true },
      { id: 'code', label: 'Code enum', flag: 'code-enum', defaultOn: true },
      { id: 'email', label: 'Email enum', flag: 'email-enum', defaultOn: true },
      { id: 'spider', label: 'Web spider', flag: 'spider', defaultOn: true },
    ],
    build: (target, toggles) => {
      const presets = Object.entries(toggles)
        .filter(([, on]) => on)
        .map(([id]) => COMMANDS[0]!.toggles.find((t) => t.id === id)!.flag);
      return `bbot -t ${target} -p ${presets.join(' ')}`.trim();
    },
  },
  {
    id: 'httpx',
    name: 'httpx',
    toggles: [
      { id: 'statusCode', label: '-status-code', flag: '-status-code', defaultOn: true },
      { id: 'title', label: '-title', flag: '-title', defaultOn: true },
      { id: 'techDetect', label: '-tech-detect', flag: '-tech-detect', defaultOn: true },
      { id: 'followRedirects', label: '-follow-redirects', flag: '-follow-redirects', defaultOn: false },
      { id: 'silent', label: '-silent', flag: '-silent', defaultOn: false },
    ],
    build: (target, toggles) => {
      const flags = COMMANDS[1]!.toggles.filter((t) => toggles[t.id]).map((t) => t.flag);
      return `echo ${target} | httpx ${flags.join(' ')}`.trim();
    },
  },
  {
    id: 'katana',
    name: 'katana',
    toggles: [
      { id: 'jsluice', label: '-jsluice', flag: '-jsluice', defaultOn: false },
      { id: 'depth3', label: '-depth 3', flag: '-depth 3', defaultOn: true },
      { id: 'jsCrawl', label: '-jc (JS crawl)', flag: '-jc', defaultOn: true },
      { id: 'silent', label: '-silent', flag: '-silent', defaultOn: false },
    ],
    build: (target, toggles) => {
      const flags = COMMANDS[2]!.toggles.filter((t) => toggles[t.id]).map((t) => t.flag);
      return `katana -u https://${target} ${flags.join(' ')}`.trim();
    },
  },
  {
    id: 'naabu',
    name: 'naabu',
    toggles: [
      { id: 'topPorts', label: '-top-ports 1000', flag: '-top-ports 1000', defaultOn: true },
      { id: 'pingProbe', label: '-Pn', flag: '-Pn', defaultOn: false },
      { id: 'silent', label: '-silent', flag: '-silent', defaultOn: false },
    ],
    build: (target, toggles) => {
      const flags = COMMANDS[3]!.toggles.filter((t) => toggles[t.id]).map((t) => t.flag);
      return `naabu -host ${target} ${flags.join(' ')}`.trim();
    },
  },
  {
    id: 'nuclei',
    name: 'nuclei',
    toggles: [
      { id: 'severity', label: '-severity medium,high,critical', flag: '-severity medium,high,critical', defaultOn: true },
      { id: 'templates', label: '-t exposures,cves', flag: '-t exposures,cves', defaultOn: true },
      { id: 'rateLimit', label: '-rate-limit 50', flag: '-rate-limit 50', defaultOn: true },
      { id: 'silent', label: '-silent', flag: '-silent', defaultOn: false },
    ],
    build: (target, toggles) => {
      const flags = COMMANDS[4]!.toggles.filter((t) => toggles[t.id]).map((t) => t.flag);
      return `nuclei -u https://${target} ${flags.join(' ')}`.trim();
    },
  },
];

function CommandCard({ def, target }: { def: CommandDef; target: string }) {
  const [toggles, setToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(def.toggles.map((t) => [t.id, t.defaultOn])),
  );

  const command = useMemo(
    () => def.build(target || '<target>', toggles),
    [def, target, toggles],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{def.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-1.5">
          {def.toggles.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-2">
              <Label className="font-normal text-muted-foreground">{t.label}</Label>
              <Switch
                checked={toggles[t.id]}
                onCheckedChange={(v) => setToggles((prev) => ({ ...prev, [t.id]: v }))}
              />
            </div>
          ))}
        </div>
        <div className="rounded-md bg-muted p-2">
          <code className="block whitespace-pre-wrap break-all text-[11px]">{command}</code>
        </div>
        <CopyButton text={command} className="w-fit" />
      </CardContent>
    </Card>
  );
}

export function ReconBuild({ onBack }: ModuleComponentProps) {
  const { target } = useTarget();

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="ReconBuild"
        description="Generates copy-paste CLI commands. Nothing is executed by the extension."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        {COMMANDS.map((def) => (
          <CommandCard key={def.id} def={def} target={target} />
        ))}
      </div>
    </div>
  );
}

export default ReconBuild;
