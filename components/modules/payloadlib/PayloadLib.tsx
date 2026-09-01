import { useMemo, useState } from 'react';
import { Search, ArrowRight, Download } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useTarget } from '@/components/shell/TargetProvider';
import { PAYLOAD_CATEGORIES, type Payload } from '@/lib/payloads';
import { buildNucleiTemplate } from '@/lib/nuclei';
import { downloadText } from '@/lib/utils';
import type { ModuleComponentProps } from '@/types';

function NucleiSection({ payload, target }: { payload: Payload; target: string }) {
  const template = useMemo(
    () => buildNucleiTemplate(payload, { target: target ? `https://${target}` : undefined }),
    [payload, target],
  );
  if (!template) return null;

  return (
    <div className="flex flex-col gap-1.5 rounded border border-dashed p-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-muted-foreground">Nuclei template</p>
        <div className="flex gap-1.5">
          <CopyButton text={template.yaml} label="Copy template" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadText(template.filename, template.yaml, 'text/yaml')}
          >
            <Download className="size-3" />
            .yaml
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <code className="block flex-1 break-all rounded bg-muted p-2 text-[11px]">{template.command}</code>
        <CopyButton text={template.command} label="Copy" />
      </div>
      <p className="text-[11px] text-muted-foreground">
        Save the template as {template.filename}, then run the command with your own nuclei binary. BugEye
        does not run nuclei or send this payload.
      </p>
    </div>
  );
}

export function PayloadLib({ onBack, onNavigate }: ModuleComponentProps) {
  const [query, setQuery] = useState('');
  const [urlEncode, setUrlEncode] = useState(false);
  const { target } = useTarget();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PAYLOAD_CATEGORIES.map((cat) => ({
      ...cat,
      payloads: q
        ? cat.payloads.filter(
            (p) =>
              p.label.toLowerCase().includes(q) ||
              p.value.toLowerCase().includes(q) ||
              cat.name.toLowerCase().includes(q),
          )
        : cat.payloads,
    })).filter((cat) => cat.payloads.length > 0);
  }, [query]);

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="PayloadLib"
        description="Reference payload library. Client-side only - use only against authorized targets."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search payloads or categories..."
              className="pl-7"
            />
          </div>
          <Label className="shrink-0 text-muted-foreground">URL-encode</Label>
          <Switch checked={urlEncode} onCheckedChange={setUrlEncode} />
        </div>

        <p className="text-[11px] text-muted-foreground">
          Copy and use manually on authorized targets. BugEye does not send these.
        </p>

        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground">No payloads match "{query}".</p>
        )}

        {filtered.map((cat) => (
          <div key={cat.id} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {cat.name}
              </p>
              {cat.crossLink && (
                <button
                  onClick={() => onNavigate(cat.crossLink!.pillar, cat.crossLink!.moduleId)}
                  className="flex shrink-0 items-center gap-1 text-[11px] text-primary hover:underline"
                >
                  {cat.crossLink.label} <ArrowRight className="size-3" />
                </button>
              )}
            </div>
            {cat.note && <p className="text-[11px] text-muted-foreground">{cat.note}</p>}
            {cat.payloads.map((p) => {
              const display = urlEncode ? encodeURIComponent(p.value) : p.value;
              return (
                <Card key={p.id}>
                  <CardContent className="flex flex-col gap-1.5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium">{p.label}</p>
                      <CopyButton text={display} />
                    </div>
                    <pre className="whitespace-pre-wrap break-all rounded bg-muted p-2 text-[11px]">
                      {display}
                    </pre>
                    {p.note && (
                      <p className="flex items-start gap-1 text-[11px] text-muted-foreground">
                        <Badge variant="outline" className="shrink-0 normal-case">
                          note
                        </Badge>
                        {p.note}
                      </p>
                    )}
                    {p.nucleiMatcher && <NucleiSection payload={p} target={target} />}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default PayloadLib;
