import { useEffect, useMemo, useState } from 'react';
import { Loader2, ExternalLink, ShieldCheck } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { ModuleNote } from '@/components/shell/ModuleNote';
import { CopyButton } from '@/components/shell/CopyButton';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { sendToBackground } from '@/lib/messaging';
import { originOf } from '@/lib/utils';
import { mapLimit } from '@/lib/concurrency';
import { useHostPermission } from '@/lib/useHostPermission';
import { exportJson, exportText } from '@/lib/export';
import { bulkListStore } from '@/lib/storage';
import type { AliveCheckResult, ModuleComponentProps } from '@/types';

interface Row extends AliveCheckResult {
  selected: boolean;
  checked: boolean;
}

type FilterMode = 'all' | '2xx' | '2xx-401-403' | 'custom';

function normalizeList(raw: string): string[] {
  const lines = raw
    .split(/\r?\n|,|\s+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const normalized = lines.map((line) => {
    let value = line;
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) value = `https://${value}`;
    try {
      return new URL(value).toString();
    } catch {
      return null;
    }
  });

  return Array.from(new Set(normalized.filter((v): v is string => v !== null)));
}

function matchesFilter(row: Row, mode: FilterMode, customCodes: number[]): boolean {
  if (mode === 'all') return true;
  if (row.status === null) return false;
  if (mode === '2xx') return row.status >= 200 && row.status < 300;
  if (mode === '2xx-401-403') return (row.status >= 200 && row.status < 300) || row.status === 401 || row.status === 403;
  if (mode === 'custom') return customCodes.includes(row.status);
  return true;
}

function StatusBadge({ row, loading }: { row: Row; loading: boolean }) {
  if (loading) {
    return (
      <Badge variant="muted" className="gap-1">
        <Loader2 className="size-2.5 animate-spin" /> checking
      </Badge>
    );
  }
  if (!row.checked) return <Badge variant="outline">unchecked</Badge>;
  if (row.category === 'live') {
    return (
      <Badge variant={row.status && row.status < 400 ? 'success' : 'warning'}>
        {row.status ?? '-'}
      </Badge>
    );
  }
  if (row.category === 'blocked') return <Badge variant="warning">blocked</Badge>;
  return <Badge variant="destructive">dead</Badge>;
}

export function BulkOpen({ onBack }: ModuleComponentProps) {
  const [raw, setRaw] = useState('');
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    bulkListStore.get().then((stored) => {
      if (stored) {
        setRaw(stored);
        bulkListStore.set('');
      }
    });
  }, []);
  const [checking, setChecking] = useState(false);
  const [checkingIndex, setCheckingIndex] = useState<Set<number>>(new Set());
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [customCodes, setCustomCodes] = useState('200,301,302');
  const [delayMs, setDelayMs] = useState(150);
  const [newWindow, setNewWindow] = useState(false);
  const [note, setNote] = useState('');
  const { ensureMany, pending } = useHostPermission();

  const parsedCustomCodes = useMemo(
    () =>
      customCodes
        .split(',')
        .map((c) => parseInt(c.trim(), 10))
        .filter((n) => !Number.isNaN(n)),
    [customCodes],
  );

  const filteredRows = useMemo(
    () => rows.filter((r) => matchesFilter(r, filterMode, parsedCustomCodes)),
    [rows, filterMode, parsedCustomCodes],
  );

  const selectedRows = filteredRows.filter((r) => r.selected);

  function handleNormalize() {
    const urls = normalizeList(raw);
    setRows(
      urls.map((url) => ({
        url,
        ok: false,
        status: null,
        statusText: '',
        category: 'dead',
        ms: 0,
        selected: true,
        checked: false,
      })),
    );
  }

  async function handleCheckAlive() {
    if (rows.length === 0) return;
    setNote('');
    const origins = Array.from(new Set(rows.map((r) => originOf(r.url)).filter((o): o is string => !!o)));
    const granted = await ensureMany(origins);
    if (!granted) {
      setNote('Host permission was not granted for one or more of these origins.');
      return;
    }

    setChecking(true);
    setCheckingIndex(new Set(rows.map((_, i) => i)));
    await mapLimit(
      rows,
      6,
      async (row, index) => {
        const result = await sendToBackground({ type: 'ALIVE_CHECK', url: row.url });
        return { index, result };
      },
      ({ index, result }) => {
        setRows((prev) => {
          const next = [...prev];
          next[index] = { ...next[index]!, ...result, checked: true };
          return next;
        });
        setCheckingIndex((prev) => {
          const next = new Set(prev);
          next.delete(index);
          return next;
        });
      },
    );
    setChecking(false);
  }

  async function handleOpenSelected() {
    if (selectedRows.length === 0) return;
    if (selectedRows.length > 20) {
      const proceed = confirm(
        `You're about to open ${selectedRows.length} tabs. This may be slow or disruptive. Continue?`,
      );
      if (!proceed) return;
    }
    await sendToBackground({
      type: 'OPEN_TABS',
      urls: selectedRows.map((r) => r.url),
      delayMs,
      newWindow,
      groupTitle: 'BulkOpen',
    });
  }

  function toggleRow(url: string) {
    setRows((prev) => prev.map((r) => (r.url === url ? { ...r, selected: !r.selected } : r)));
  }

  function toggleAllFiltered(value: boolean) {
    const filteredUrls = new Set(filteredRows.map((r) => r.url));
    setRows((prev) => prev.map((r) => (filteredUrls.has(r.url) ? { ...r, selected: value } : r)));
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="BulkOpen"
        description="Paste many endpoints, alive-check them, then open the ones you want."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={'One endpoint per line, any format:\nadmin.example.com\nhttp://example.com/api\nexample.com/login'}
          className="min-h-28"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={handleNormalize}>
            Normalize ({normalizeList(raw).length || 0})
          </Button>
          <Button size="sm" variant="secondary" onClick={handleCheckAlive} disabled={rows.length === 0 || checking || pending}>
            {checking || pending ? <Loader2 className="size-3 animate-spin" /> : <ShieldCheck className="size-3" />}
            Check alive
          </Button>
        </div>

        {note && <ModuleNote tone="error">{note}</ModuleNote>}

        {rows.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Label className="text-muted-foreground">Filter</Label>
              <Select value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="2xx">2xx only</SelectItem>
                  <SelectItem value="2xx-401-403">2xx + 401 + 403</SelectItem>
                  <SelectItem value="custom">Custom codes</SelectItem>
                </SelectContent>
              </Select>
              {filterMode === 'custom' && (
                <Input
                  value={customCodes}
                  onChange={(e) => setCustomCodes(e.target.value)}
                  placeholder="200,301,302"
                  className="w-36"
                />
              )}
            </div>

            <Card>
              <CardContent className="flex flex-col divide-y divide-border p-0">
                <div className="flex items-center justify-between p-2">
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={filteredRows.length > 0 && filteredRows.every((r) => r.selected)}
                      onChange={(e) => toggleAllFiltered(e.target.checked)}
                    />
                    Select all ({filteredRows.length})
                  </label>
                  <span className="text-[11px] text-muted-foreground">{selectedRows.length} selected</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {filteredRows.map((row) => {
                    const index = rows.indexOf(row);
                    return (
                      <div key={row.url} className="flex items-center gap-2 p-2">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={() => toggleRow(row.url)}
                        />
                        <span className="min-w-0 flex-1 truncate text-xs">{row.url}</span>
                        <StatusBadge row={row} loading={checkingIndex.has(index)} />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Label className="text-muted-foreground">Delay (ms)</Label>
                <Input
                  type="number"
                  value={delayMs}
                  onChange={(e) => setDelayMs(Number(e.target.value))}
                  className="w-20"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Label className="text-muted-foreground">New window</Label>
                <Switch checked={newWindow} onCheckedChange={setNewWindow} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={handleOpenSelected} disabled={selectedRows.length === 0}>
                <ExternalLink className="size-3" /> Open selected ({selectedRows.length})
              </Button>
              <CopyButton
                text={rows.filter((r) => r.category === 'live').map((r) => r.url).join('\n')}
                label="Copy live only"
              />
              <Button size="sm" variant="outline" onClick={() => exportJson('bulkopen', rows)}>
                Export JSON
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportText('bulkopen', filteredRows.map((r) => r.url).join('\n'))}
              >
                Export list
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default BulkOpen;
