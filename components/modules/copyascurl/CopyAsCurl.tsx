import { useEffect, useMemo, useState } from 'react';
import { Loader2, ListRestart } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { sendToBackground, type RequestLogEntry } from '@/lib/messaging';
import { useActiveTab } from '@/lib/useActiveTab';
import type { ModuleComponentProps } from '@/types';

export function CopyAsCurl({ onBack }: ModuleComponentProps) {
  const { tabId } = useActiveTab();
  const [entries, setEntries] = useState<RequestLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState('Accept: */*');
  const [body, setBody] = useState('');

  async function loadLog() {
    if (!tabId) return;
    setLoading(true);
    try {
      const res = await sendToBackground({ type: 'GET_REQUEST_LOG', tabId });
      setEntries(res.entries.slice().reverse());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId]);

  function pick(entry: RequestLogEntry) {
    setMethod(entry.method);
    setUrl(entry.url);
  }

  const curl = useMemo(() => {
    const parts = ['curl', `-X ${method}`, `'${url || 'https://example.com/'}'`];
    for (const line of headers.split('\n')) {
      const trimmed = line.trim();
      if (trimmed) parts.push(`-H '${trimmed}'`);
    }
    if (body.trim() && method !== 'GET') parts.push(`-d '${body.trim()}'`);
    return parts.join(' \\\n  ');
  }, [method, url, headers, body]);

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="CopyAsCurl"
        description="Turns a captured request (from ReqLogger) or a manually entered request into a curl command."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium">Requests logged for this tab</p>
          <Button size="sm" variant="outline" onClick={loadLog} disabled={loading}>
            {loading ? <Loader2 className="size-3 animate-spin" /> : <ListRestart className="size-3" />}
            Refresh
          </Button>
        </div>
        <Card>
          <CardContent className="max-h-40 overflow-y-auto p-0">
            {entries.length === 0 && (
              <p className="p-2 text-xs text-muted-foreground">
                No requests captured yet. Enable logging in ReqLogger first, then come back and refresh.
              </p>
            )}
            {entries.slice(0, 100).map((e) => (
              <button
                key={e.id}
                onClick={() => pick(e)}
                className="flex w-full items-center gap-2 border-b border-border p-1.5 text-left last:border-0 hover:bg-accent/40"
              >
                <span className="w-14 shrink-0 text-[10px] font-medium uppercase text-muted-foreground">{e.method}</span>
                <span className="min-w-0 flex-1 truncate text-xs">{e.url}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <div className="flex gap-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground">Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label className="text-muted-foreground">URL</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/api/resource" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground">Headers (one per line, captured requests only carry method/URL/status)</Label>
            <Textarea value={headers} onChange={(e) => setHeaders(e.target.value)} className="min-h-16" />
          </div>
          {method !== 'GET' && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground">Body</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-16" />
            </div>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-xs font-medium">curl command</p>
            <CopyButton text={curl} />
          </div>
          <pre className="whitespace-pre-wrap break-all rounded-md bg-muted p-2 text-[11px]">{curl}</pre>
        </div>
      </div>
    </div>
  );
}

export default CopyAsCurl;
