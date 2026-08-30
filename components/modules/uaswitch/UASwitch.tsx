import { useEffect, useState } from 'react';
import { Loader2, Zap } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { sendToBackground } from '@/lib/messaging';
import { useHostPermission } from '@/lib/useHostPermission';
import { useActiveTab } from '@/lib/useActiveTab';
import { uaConfigStore, type UaConfig } from '@/lib/storage';
import { UA_PRESETS, type UaPresetId } from '@/lib/traffic';
import type { ModuleComponentProps } from '@/types';

export function UASwitch({ onBack }: ModuleComponentProps) {
  const { tabId, origin, url } = useActiveTab();
  const { ensure, pending } = useHostPermission();
  const [config, setConfig] = useState<UaConfig>({ preset: 'desktop', customValue: '', enabled: false });
  const [applying, setApplying] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    uaConfigStore.get().then(setConfig);
  }, []);

  const effectiveValue =
    config.preset === 'custom' ? config.customValue : UA_PRESETS.find((p) => p.id === config.preset)?.value ?? '';

  async function apply(next: UaConfig) {
    setConfig(next);
    setNote('');
    if (!tabId || !origin) {
      setNote('No active http(s) tab detected.');
      return;
    }
    if (next.enabled) {
      const granted = await ensure(origin);
      if (!granted) {
        setNote('Host permission was not granted.');
        return;
      }
    }
    setApplying(true);
    try {
      await uaConfigStore.set(next);
      const value = next.preset === 'custom' ? next.customValue : UA_PRESETS.find((p) => p.id === next.preset)?.value ?? '';
      const result = await sendToBackground({ type: 'SET_UA_RULE', tabId, enabled: next.enabled, value });
      if (!result.ok) setNote(result.error ?? 'Failed to apply.');
      else setNote(next.enabled ? 'Reload the page for the new User-Agent to take effect.' : 'User-Agent override disabled.');
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="UASwitch"
        description="Swap the User-Agent header sent by the active tab."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[11px] text-muted-foreground">{url || 'No active tab'}</p>
          <Badge variant={config.enabled ? 'success' : 'muted'}>{config.enabled ? 'active' : 'off'}</Badge>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-muted-foreground">Preset</Label>
          <Select
            value={config.preset}
            onValueChange={(v) => apply({ ...config, preset: v as UaPresetId })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UA_PRESETS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {config.preset === 'custom' ? (
          <Input
            value={config.customValue}
            onChange={(e) => setConfig({ ...config, customValue: e.target.value })}
            onBlur={() => apply(config)}
            placeholder="Custom User-Agent string"
          />
        ) : (
          <p className="break-all rounded-md bg-muted p-2 text-[11px]">{effectiveValue}</p>
        )}

        <div className="flex items-center gap-2">
          <Label className="text-muted-foreground">Enabled</Label>
          <Switch checked={config.enabled} onCheckedChange={(v) => apply({ ...config, enabled: v })} />
          {(applying || pending) && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
        </div>

        <Button size="sm" variant="outline" onClick={() => apply(config)} disabled={applying || pending} className="w-fit">
          <Zap className="size-3" /> Re-apply
        </Button>

        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </div>
    </div>
  );
}

export default UASwitch;
