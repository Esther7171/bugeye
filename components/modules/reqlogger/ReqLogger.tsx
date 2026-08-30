import { useEffect, useRef, useState } from 'react';
import { ListRestart, Radio, Send, Trash2 } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { sendToBackground, type RequestLogEntry } from '@/lib/messaging';
import { useActiveTab } from '@/lib/useActiveTab';
import { bulkListStore } from '@/lib/storage';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

function statusVariant(status: number | null): 'success' | 'warning' | 'destructive' | 'muted' {
  if (status === null) return 'destructive';
  if (status >= 200 && status < 300) return 'success';
  if (status >= 300 && status < 400) return 'warning';
  if (status >= 400) return 'destructive';
  return 'muted';
}

export function ReqLogger({ onBack, onNavigate }: ModuleComponentProps) {
  const { tabId, url } = useActiveTab();
  const [entries, setEntries] = useState<RequestLogEntry[]>([]);
  const [logging, setLogging] = useState(false);
  const [filter, setFilter] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function refresh() {
    if (!tabId) return;
    const result = await sendToBackground({ type: 'GET_REQUEST_LOG', tabId });
    setEntries(result.entries);
    setLogging(result.logging);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId]);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (logging) pollRef.current = setInterval(refresh, 1500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logging, tabId]);

  async function toggleLogging(next: boolean) {
    if (!tabId) return;
    const result = await sendToBackground({ type: 'SET_REQUEST_LOGGING', tabId, enabled: next });
    setLogging(result.logging);
    if (next) refresh();
  }

  async function clearLog() {
    if (!tabId) return;
    await sendToBackground({ type: 'CLEAR_REQUEST_LOG', tabId });
    setEntries([]);
  }

  const filtered = filter.trim()
    ? entries.filter((e) => e.url.toLowerCase().includes(filter.toLowerCase()) || e.method.toLowerCase().includes(filter.toLowerCase()))
    : entries;

  function sendToBulkOpen() {
    const urls = Array.from(new Set(filtered.map((e) => e.url)));
    bulkListStore.set(urls.join('\n'));
    onNavigate('list-triage', 'bulkopen');
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="ReqLogger"
        description="Logs requests made by the active tab via webRequest. Best-effort, capped at 300 entries."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[11px] text-muted-foreground">{url || 'No active tab'}</p>
          <Badge variant={logging ? 'success' : 'muted'}>{logging ? 'logging' : 'stopped'}</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Label className="text-muted-foreground">Log this tab</Label>
            <Switch checked={logging} onCheckedChange={toggleLogging} />
          </div>
          <Button size="sm" variant="outline" onClick={refresh}>
            <ListRestart className="size-3" /> Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={clearLog}>
            <Trash2 className="size-3" /> Clear
          </Button>
        </div>

        <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by URL or method..." />

        <Card>
          <CardContent className="flex max-h-72 flex-col divide-y divide-border overflow-y-auto p-0">
            {filtered.length === 0 && (
              <p className="p-3 text-xs text-muted-foreground">
                {logging ? (
                  <>
                    <Radio className="mb-1 size-3.5 animate-pulse" /> Waiting for requests. Interact with the page to
                    generate traffic.
                  </>
                ) : (
                  'Enable logging, then browse the tab to capture requests.'
                )}
              </p>
            )}
            {filtered
              .slice()
              .reverse()
              .map((e) => (
                <div key={e.id} className="flex items-center gap-2 p-2">
                  <Badge variant={statusVariant(e.status)} className="w-14 shrink-0 justify-center">
                    {e.status ?? 'err'}
                  </Badge>
                  <span className="w-14 shrink-0 text-[10px] font-medium uppercase text-muted-foreground">
                    {e.method}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs">{e.url}</span>
                </div>
              ))}
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={sendToBulkOpen} disabled={filtered.length === 0}>
            <Send className="size-3" /> Send URLs to BulkOpen
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportJson('reqlogger', filtered)} disabled={filtered.length === 0}>
            Export JSON
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ReqLogger;
