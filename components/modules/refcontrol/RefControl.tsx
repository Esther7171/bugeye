import { useEffect, useState } from 'react';
import { Loader2, Zap } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { sendToBackground } from '@/lib/messaging';
import { useHostPermission } from '@/lib/useHostPermission';
import { useActiveTab } from '@/lib/useActiveTab';
import { refererConfigStore, type RefererConfig } from '@/lib/storage';
import { REFERER_MODES, type RefererMode } from '@/lib/traffic';
import type { ModuleComponentProps } from '@/types';

export function RefControl({ onBack }: ModuleComponentProps) {
  const { tabId, origin, url } = useActiveTab();
  const { ensure, pending } = useHostPermission();
  const [config, setConfig] = useState<RefererConfig>({ mode: 'off', spoofValue: '' });
  const [applying, setApplying] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    refererConfigStore.get().then(setConfig);
  }, []);

  async function apply(next: RefererConfig) {
    setConfig(next);
    setNote('');
    if (!tabId || !origin) {
      setNote('No active http(s) tab detected.');
      return;
    }
    if (next.mode !== 'off') {
      const granted = await ensure(origin);
      if (!granted) {
        setNote('Host permission was not granted.');
        return;
      }
    }
    setApplying(true);
    try {
      await refererConfigStore.set(next);
      const result = await sendToBackground({
        type: 'SET_REFERER_RULE',
        tabId,
        mode: next.mode,
        spoofValue: next.spoofValue,
      });
      if (!result.ok) setNote(result.error ?? 'Failed to apply.');
      else setNote(next.mode === 'off' ? 'Referer left untouched.' : 'Reload the page for the change to take effect.');
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="RefControl"
        description="Strip or spoof the Referer header sent by the active tab."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[11px] text-muted-foreground">{url || 'No active tab'}</p>
          <Badge variant={config.mode !== 'off' ? 'success' : 'muted'}>{config.mode}</Badge>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-muted-foreground">Mode</Label>
          <Select
            value={config.mode}
            onValueChange={(v) => {
              const mode = v as RefererMode;
              // Spoof needs a value first - applying immediately here would
              // set an empty spoofValue, silently add no rule, and still
              // show "reload to take effect" even though nothing changed.
              if (mode === 'spoof') setConfig({ ...config, mode });
              else apply({ ...config, mode });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REFERER_MODES.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {config.mode === 'spoof' && (
          <Input
            value={config.spoofValue}
            onChange={(e) => setConfig({ ...config, spoofValue: e.target.value })}
            onBlur={() => apply(config)}
            placeholder="https://spoofed-referrer.example.com/"
          />
        )}

        <Button size="sm" variant="outline" onClick={() => apply(config)} disabled={applying || pending} className="w-fit">
          {applying || pending ? <Loader2 className="size-3 animate-spin" /> : <Zap className="size-3" />}
          Apply
        </Button>

        {note && <p className="text-xs text-muted-foreground">{note}</p>}

        <p className="border-t border-border pt-3 text-[11px] text-muted-foreground">
          To confirm a mode actually applied: set it, click "Apply", then navigate this tab to{' '}
          <span className="font-mono">httpbin.org/headers</span> (or reload if already there). The response
          echoes the Referer your request sent, or its absence if stripped. A page you reach by typing a URL
          or opening a bookmark never sends a Referer in the first place, so testing there will look identical
          whether stripping is on or not - click a link from another page instead.
        </p>
      </div>
    </div>
  );
}

export default RefControl;
