import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, Zap } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { sendToBackground } from '@/lib/messaging';
import { useHostPermission } from '@/lib/useHostPermission';
import { useActiveTab } from '@/lib/useActiveTab';
import { headerRulesStore } from '@/lib/storage';
import { newHeaderRule, type HeaderRuleDraft } from '@/lib/traffic';
import type { ModuleComponentProps } from '@/types';

export function HeaderInject({ onBack }: ModuleComponentProps) {
  const { tabId, origin, url } = useActiveTab();
  const { ensure, pending } = useHostPermission();
  const [rules, setRules] = useState<HeaderRuleDraft[]>([]);
  const [applying, setApplying] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    headerRulesStore.get().then((stored) => setRules(stored.length ? stored : [newHeaderRule()]));
  }, []);

  function updateRule(id: string, patch: Partial<HeaderRuleDraft>) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRule(id: string) {
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  async function applyRules() {
    setNote('');
    if (!tabId || !origin) {
      setNote('No active http(s) tab detected.');
      return;
    }
    const granted = await ensure(origin);
    if (!granted) {
      setNote('Host permission was not granted.');
      return;
    }
    setApplying(true);
    try {
      await headerRulesStore.set(rules);
      const result = await sendToBackground({
        type: 'SET_HEADER_RULES',
        tabId,
        rules: rules.map((r) => ({ name: r.name, value: r.value, enabled: r.enabled })),
      });
      if (!result.ok) setNote(result.error ?? 'Failed to apply rules.');
      else setNote('Rules applied to the current tab. Reload the page for it to take effect on the main request.');
    } finally {
      setApplying(false);
    }
  }

  const activeCount = rules.filter((r) => r.enabled && r.name.trim()).length;

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="HeaderInject"
        description="Add or overwrite request headers on the active tab. Rules apply only to that tab."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[11px] text-muted-foreground">{url || 'No active tab'}</p>
          <Badge variant={activeCount > 0 ? 'success' : 'muted'}>{activeCount} active</Badge>
        </div>

        <div className="flex flex-col gap-2">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardContent className="flex flex-col gap-2 p-2.5">
                <div className="flex items-center gap-2">
                  <Input
                    value={rule.name}
                    onChange={(e) => updateRule(rule.id, { name: e.target.value })}
                    placeholder="Header name, e.g. X-Forwarded-For"
                    className="flex-1"
                  />
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(v) => updateRule(rule.id, { enabled: v })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    onClick={() => removeRule(rule.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <Input
                  value={rule.value}
                  onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                  placeholder="Header value"
                />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setRules((prev) => [...prev, newHeaderRule()])}>
            <Plus className="size-3" /> Add rule
          </Button>
          <Button size="sm" onClick={applyRules} disabled={applying || pending}>
            {applying || pending ? <Loader2 className="size-3 animate-spin" /> : <Zap className="size-3" />}
            Apply to this tab
          </Button>
        </div>

        {note && <p className="text-xs text-muted-foreground">{note}</p>}

        <p className="border-t border-border pt-3 text-[11px] text-muted-foreground">
          To confirm a rule actually applied: enable it, click "Apply to this tab", then navigate that
          tab to <span className="font-mono">httpbin.org/headers</span> (or reload if you are already
          there). The response echoes every header your request sent, including the one you injected.
        </p>
      </div>
    </div>
  );
}

export default HeaderInject;
