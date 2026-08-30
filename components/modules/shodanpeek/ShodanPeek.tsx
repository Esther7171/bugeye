import { useEffect, useState } from 'react';
import { Loader2, Send, KeyRound } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTarget } from '@/components/shell/TargetProvider';
import { sendToBackground, type ShodanInternetDbResult } from '@/lib/messaging';
import { apiKeysStore, bulkListStore } from '@/lib/storage';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

const WEB_PORTS = new Set([80, 443, 8080, 8443, 8000, 8888, 3000, 5000, 8081, 8090]);

export function ShodanPeek({ onBack, onNavigate }: ModuleComponentProps) {
  const { target } = useTarget();
  const [ip, setIp] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ShodanInternetDbResult | null>(null);
  const [note, setNote] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [fullLookupLoading, setFullLookupLoading] = useState(false);
  const [fullData, setFullData] = useState<unknown>(null);
  const [fullError, setFullError] = useState('');

  useEffect(() => {
    apiKeysStore.get().then((keys) => setApiKey(keys.shodan));
  }, []);

  async function scan() {
    if (!target) return;
    setLoading(true);
    setNote('');
    setResult(null);
    setFullData(null);
    try {
      const resolved = await sendToBackground({ type: 'DOH_RESOLVE', hostname: target });
      if (!resolved.ok || !resolved.addresses?.length) {
        setNote(resolved.error ?? 'Could not resolve an IPv4 address for this domain.');
        return;
      }
      const resolvedIp = resolved.addresses[0]!;
      setIp(resolvedIp);
      const db = await sendToBackground({ type: 'FETCH_SHODAN_INTERNETDB', ip: resolvedIp });
      setResult(db);
      if (!db.ok) setNote(db.error ?? 'InternetDB lookup failed.');
    } finally {
      setLoading(false);
    }
  }

  async function saveApiKey(value: string) {
    setApiKey(value);
    const keys = await apiKeysStore.get();
    await apiKeysStore.set({ ...keys, shodan: value });
  }

  async function runFullLookup() {
    if (!ip || !apiKey.trim()) return;
    setFullLookupLoading(true);
    setFullError('');
    setFullData(null);
    try {
      const res = await sendToBackground({ type: 'FETCH_SHODAN_HOST', ip, apiKey: apiKey.trim() });
      if (!res.ok) setFullError(res.error ?? 'Full Shodan lookup failed.');
      else setFullData(res.data);
    } finally {
      setFullLookupLoading(false);
    }
  }

  function sendWebPortsToBulkOpen() {
    if (!result?.ports) return;
    const urls = result.ports
      .filter((p) => WEB_PORTS.has(p))
      .map((p) => `${p === 443 || p === 8443 ? 'https' : 'http'}://${ip}:${p}`);
    if (urls.length === 0) return;
    bulkListStore.set(urls.join('\n'));
    onNavigate('list-triage', 'bulkopen');
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="ShodanPeek"
        description="Free, no-key lookup of open ports, hostnames and known CVEs via Shodan InternetDB."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Button size="sm" onClick={scan} disabled={!target || loading} className="w-fit">
          {loading ? <Loader2 className="size-3 animate-spin" /> : null}
          Look up {target || '(set a target)'}
        </Button>

        {note && <p className="text-xs text-muted-foreground">{note}</p>}

        {result?.ok && (
          <>
            <Card>
              <CardContent className="flex flex-col gap-2 p-3">
                <p className="text-xs font-medium">{result.ip}</p>
                <div className="flex flex-wrap gap-1.5">
                  {(result.ports ?? []).map((p) => (
                    <Badge key={p} variant={WEB_PORTS.has(p) ? 'success' : 'outline'}>
                      {p}
                    </Badge>
                  ))}
                  {(result.ports ?? []).length === 0 && (
                    <span className="text-[11px] text-muted-foreground">No open ports on record.</span>
                  )}
                </div>
                {(result.vulns ?? []).length > 0 && (
                  <div className="flex flex-col gap-1">
                    <p className="text-[11px] font-medium text-destructive">Known CVEs</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.vulns!.map((v) => (
                        <Badge key={v} variant="destructive">
                          {v}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {(result.hostnames ?? []).length > 0 && (
                  <div className="flex flex-col gap-1">
                    <p className="text-[11px] font-medium text-muted-foreground">Hostnames</p>
                    <p className="text-[11px]">{result.hostnames!.join(', ')}</p>
                  </div>
                )}
                {(result.tags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {result.tags!.map((t) => (
                      <Badge key={t} variant="muted">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={sendWebPortsToBulkOpen}>
                <Send className="size-3" /> Send web ports to BulkOpen
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportJson('shodanpeek', result)}>
                Export JSON
              </Button>
            </div>
          </>
        )}

        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <p className="text-xs font-medium">Optional: full Shodan API</p>
          <p className="text-[11px] text-muted-foreground">
            Stored in plaintext in this browser's local storage only, never sent anywhere but
            Shodan's API, and never logged. Used for a richer per-host lookup beyond InternetDB.
          </p>
          <div className="flex gap-2">
            <Input
              value={apiKey}
              onChange={(e) => saveApiKey(e.target.value)}
              placeholder="Shodan API key"
              type="password"
            />
            <Button size="sm" variant="outline" onClick={runFullLookup} disabled={!ip || !apiKey.trim() || fullLookupLoading} className="shrink-0">
              {fullLookupLoading ? <Loader2 className="size-3 animate-spin" /> : <KeyRound className="size-3" />}
              Full lookup
            </Button>
          </div>
          {fullError && <p className="text-xs text-destructive">{fullError}</p>}
          {fullData !== null && (
            <>
              <pre className="max-h-56 overflow-auto rounded-md bg-muted p-2 text-[10px]">
                {JSON.stringify(fullData, null, 2)}
              </pre>
              <CopyButton text={JSON.stringify(fullData, null, 2)} label="Copy JSON" className="w-fit" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ShodanPeek;
