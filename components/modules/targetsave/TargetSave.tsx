import { useEffect, useState } from 'react';
import { Plus, Trash2, Crosshair } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTarget } from '@/components/shell/TargetProvider';
import { savedTargetsStore, type SavedTarget } from '@/lib/storage';
import { formatTimestamp } from '@/lib/utils';
import type { ModuleComponentProps } from '@/types';

export function TargetSave({ onBack }: ModuleComponentProps) {
  const { target, setTarget } = useTarget();
  const [saved, setSaved] = useState<SavedTarget[]>([]);

  useEffect(() => {
    savedTargetsStore.get().then(setSaved);
  }, []);

  async function saveCurrent() {
    if (!target) return;
    const now = formatTimestamp();
    const existing = saved.find((s) => s.domain === target);
    const next = existing
      ? saved.map((s) => (s.domain === target ? { ...s, lastUsedAt: now } : s))
      : [...saved, { domain: target, savedAt: now, lastUsedAt: now }];
    setSaved(next);
    await savedTargetsStore.set(next);
  }

  async function remove(domain: string) {
    const next = saved.filter((s) => s.domain !== domain);
    setSaved(next);
    await savedTargetsStore.set(next);
  }

  async function selectTarget(domain: string) {
    setTarget(domain);
    const now = formatTimestamp();
    const next = saved.map((s) => (s.domain === domain ? { ...s, lastUsedAt: now } : s));
    setSaved(next);
    await savedTargetsStore.set(next);
  }

  const sorted = [...saved].sort((a, b) => (a.lastUsedAt < b.lastUsedAt ? 1 : -1));

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="TargetSave"
        description="Save targets you come back to, with when they were saved and last used."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Button
          size="sm"
          onClick={saveCurrent}
          disabled={!target || saved.some((s) => s.domain === target)}
          className="w-fit"
        >
          <Plus className="size-3" /> Save {target || '(set a target)'}
        </Button>

        {sorted.length === 0 && <p className="text-xs text-muted-foreground">No saved targets yet.</p>}

        <div className="flex flex-col gap-2">
          {sorted.map((s) => (
            <Card key={s.domain}>
              <CardContent className="flex items-center justify-between gap-2 p-2.5">
                <div className="min-w-0 flex-1">
                  <button className="truncate text-left text-xs font-medium hover:text-primary" onClick={() => selectTarget(s.domain)}>
                    {s.domain}
                  </button>
                  <p className="text-[11px] text-muted-foreground">
                    Saved {s.savedAt} - last used {s.lastUsedAt}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => selectTarget(s.domain)}>
                    <Crosshair className="size-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => remove(s.domain)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TargetSave;
