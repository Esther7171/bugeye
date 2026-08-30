import { useEffect, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { ModuleNote } from '@/components/shell/ModuleNote';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { sendToBackground } from '@/lib/messaging';
import { apiKeysStore, bulkListStore } from '@/lib/storage';
import { parseReverseWhois, type ReverseWhoisResult } from '@/lib/reversewhois';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

type Mode = 'company' | 'name' | 'email' | 'keyword';

export function ReverseWhois({ onNavigate, onBack }: ModuleComponentProps) {
  const [mode, setMode] = useState<Mode>('company');
  const [query, setQuery] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReverseWhoisResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiKeysStore.get().then((keys) => setApiKey(keys.whoxy ?? ''));
  }, []);

  async function saveKey(value: string) {
    setApiKey(value);
    const keys = await apiKeysStore.get();
    await apiKeysStore.set({ ...keys, whoxy: value });
  }

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const res = await sendToBackground({ type: 'REVERSE_WHOIS', mode, query: query.trim(), apiKey: apiKey.trim() });
      if (!res.ok) {
        setError(res.error ?? 'Lookup failed.');
        return;
      }
      setResult(parseReverseWhois(res.raw));
    } finally {
      setLoading(false);
    }
  }

  function sendToBulkOpen() {
    if (!result?.domains.length) return;
    bulkListStore.set(result.domains.map((d) => d.domain).join('\n'));
    onNavigate('list-triage', 'bulkopen');
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="ReverseWhois"
        description="Finds other domains registered under the same name, company, email or keyword. Needs your own Whoxy API key."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-2.5">
          <p className="text-[11px] text-muted-foreground">
            There is no free, unlimited reverse-WHOIS data source, building one from scratch would mean
            indexing every domain registry, which is why every provider charges for it. BugEye supports{' '}
            <a
              href="https://www.whoxy.com/reverse-whois/"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              Whoxy
            </a>{' '}
            (free trial credits on signup, then pay-as-you-go). Stored locally only, never sent anywhere
            but Whoxy's API.
          </p>
          <Input value={apiKey} onChange={(e) => saveKey(e.target.value)} placeholder="Whoxy API key" type="password" />
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground">Search by</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="company">Company</SelectItem>
                <SelectItem value="name">Registrant name</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="keyword">Keyword</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Acme Corporation" className="flex-1" />
          <Button size="sm" onClick={search} disabled={loading || !query.trim() || !apiKey.trim()} className="shrink-0">
            {loading ? <Loader2 className="size-3 animate-spin" /> : null}
            Search
          </Button>
        </div>

        {error && <ModuleNote tone="error">{error}</ModuleNote>}

        {result?.unrecognizedShape && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-warning">
              The response didn't match the expected shape (Whoxy's schema wasn't verified live against a
              real key while building this). Showing the raw response instead of dropping it.
            </p>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2 text-[11px]">
              {JSON.stringify(result.raw, null, 2)}
            </pre>
          </div>
        )}

        {result?.ok && (
          <>
            <p className="text-[11px] text-muted-foreground">
              {result.totalResults ?? result.domains.length} domain(s) found.
            </p>
            <Card>
              <CardContent className="flex max-h-72 flex-col divide-y divide-border overflow-y-auto p-0">
                {result.domains.map((d) => (
                  <div key={d.domain} className="flex items-center justify-between gap-2 p-2 text-xs">
                    <span className="min-w-0 flex-1 truncate">{d.domain}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {d.createDate ?? ''}
                      {d.expiryDate ? ` -> ${d.expiryDate}` : ''}
                    </span>
                  </div>
                ))}
                {result.domains.length === 0 && (
                  <p className="p-2 text-xs text-muted-foreground">No domains found.</p>
                )}
              </CardContent>
            </Card>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={sendToBulkOpen} disabled={result.domains.length === 0}>
                <Send className="size-3" /> Send to BulkOpen
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportJson('reversewhois', result.domains)}>
                Export JSON
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ReverseWhois;
