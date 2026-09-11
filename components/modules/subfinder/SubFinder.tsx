import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useTarget } from '@/components/shell/TargetProvider';
import { useHostPermission } from '@/lib/useHostPermission';
import { sendToBackground } from '@/lib/messaging';
import { fetchCrtSh, fetchCrtName, fetchHackerTarget, fetchCertSpotter, fetchSubdomainCenter } from '@/lib/subfinder';
import { mapLimit } from '@/lib/concurrency';
import { normalizeDomain } from '@/lib/utils';
import { exportJson, exportText } from '@/lib/export';
import { bulkListStore, lastSubdomainsStore } from '@/lib/storage';
import { formatTimestamp } from '@/lib/utils';
import type { ModuleComponentProps } from '@/types';

const SOURCE_ORIGINS = [
  'https://crt.sh/*',
  'https://crt.name/*',
  'https://api.subdomain.center/*',
];

export function SubFinder({ onBack, onNavigate }: ModuleComponentProps) {
  const { target, setTarget } = useTarget();
  const [domain, setDomain] = useState(target);
  const [loading, setLoading] = useState(false);
  const [subdomains, setSubdomains] = useState<string[]>([]);
  const [sources, setSources] = useState<Record<string, string[]>>({});
  const [resolved, setResolved] = useState<Record<string, string[]>>({});
  const [resolving, setResolving] = useState(false);
  const [doResolve, setDoResolve] = useState(false);
  const [note, setNote] = useState('');
  const { ensureMany, pending } = useHostPermission();

  async function run() {
    const clean = normalizeDomain(domain);
    if (!clean) return;
    setNote('');
    setLoading(true);
    setSubdomains([]);
    setSources({});
    setResolved({});
    try {
      const granted = await ensureMany(SOURCE_ORIGINS);
      if (!granted) {
        setNote('Host permission was not granted for crt.sh / crt.name / subdomain.center.');
        return;
      }
      // HackerTarget and CertSpotter both send permissive CORS headers, so
      // they run without any host permission at all, unlike the other three.
      const [crt, crtName, hackerTarget, certSpotter, subdomainCenter] = await Promise.all([
        fetchCrtSh(clean),
        fetchCrtName(clean),
        fetchHackerTarget(clean),
        fetchCertSpotter(clean),
        fetchSubdomainCenter(clean),
      ]);

      const bySource = new Map<string, Set<string>>();
      const addSource = (hosts: string[], label: string) => {
        for (const h of hosts) {
          if (!bySource.has(h)) bySource.set(h, new Set());
          bySource.get(h)!.add(label);
        }
      };
      addSource(crt.hostnames, 'crt.sh');
      addSource(crtName.hostnames, 'crt.name');
      addSource(hackerTarget.hostnames, 'HackerTarget');
      addSource(certSpotter.hostnames, 'CertSpotter');
      addSource(subdomainCenter.hostnames, 'subdomain.center');

      const all = Array.from(bySource.keys()).sort();
      const sourceMap: Record<string, string[]> = {};
      for (const [host, labels] of bySource) sourceMap[host] = Array.from(labels).sort();

      setSubdomains(all);
      setSources(sourceMap);
      if (all.length > 0) {
        lastSubdomainsStore.set({ domain: clean, subdomains: all, generatedAt: formatTimestamp() });
      }

      const summary = `crt.sh: ${crt.hostnames.length}, crt.name: ${crtName.hostnames.length}, HackerTarget: ${hackerTarget.hostnames.length}, CertSpotter: ${certSpotter.hostnames.length}, subdomain.center: ${subdomainCenter.hostnames.length}, unique total: ${all.length}`;
      const errors = [
        crt.error && `crt.sh: ${crt.error}`,
        crtName.error && `crt.name: ${crtName.error}`,
        hackerTarget.error && `HackerTarget: ${hackerTarget.error}`,
        certSpotter.error && `CertSpotter: ${certSpotter.error}`,
        subdomainCenter.error && `subdomain.center: ${subdomainCenter.error}`,
      ]
        .filter(Boolean)
        .join(' | ');
      setNote(errors ? `${summary}. ${errors}` : summary);

      if (doResolve && all.length > 0) {
        setResolving(true);
        await mapLimit(
          all,
          8,
          async (host) => {
            const r = await sendToBackground({ type: 'DOH_RESOLVE', hostname: host });
            return { host, addresses: r.ok ? (r.addresses ?? []) : [] };
          },
          ({ host, addresses }) => {
            setResolved((prev) => ({ ...prev, [host]: addresses }));
          },
        );
        setResolving(false);
      }
    } finally {
      setLoading(false);
    }
  }

  function sendToBulkOpen() {
    bulkListStore.set(subdomains.join('\n'));
    onNavigate('list-triage', 'bulkopen');
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="SubFinder"
        description="Enumerates subdomains via 5 sources (crt.sh, crt.name, CertSpotter, HackerTarget, subdomain.center), cross-checked and de-duplicated."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex gap-2">
          <Input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="example.com"
          />
          <Button size="sm" onClick={run} disabled={loading || pending || !domain}>
            {loading || pending ? <Loader2 className="size-3 animate-spin" /> : null}
            Run
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-muted-foreground">Resolve live IPs via DoH</Label>
          <Switch checked={doResolve} onCheckedChange={setDoResolve} />
        </div>

        {note && <p className="text-xs text-muted-foreground">{note}</p>}

        {subdomains.length > 0 && (
          <>
            <Card>
              <CardContent className="max-h-72 overflow-y-auto p-0">
                {subdomains.map((s) => (
                  <div
                    key={s}
                    className="flex items-center justify-between gap-2 border-b border-border p-2 last:border-0"
                  >
                    <button
                      className="min-w-0 flex-1 truncate text-left text-xs hover:text-primary"
                      onClick={() => setTarget(s)}
                      title="Set as target"
                    >
                      {s}
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      {sources[s]?.map((label) => (
                        <Badge key={label} variant="outline" className="normal-case">
                          {label}
                        </Badge>
                      ))}
                      {resolving && !resolved[s] ? (
                        <Loader2 className="size-3 animate-spin text-muted-foreground" />
                      ) : resolved[s] ? (
                        <Badge variant={resolved[s]!.length ? 'success' : 'muted'}>
                          {resolved[s]!.length ? resolved[s]![0] : 'no A record'}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={sendToBulkOpen}>
                <Send className="size-3" /> Send to BulkOpen
              </Button>
              <CopyButton text={subdomains.join('\n')} label="Copy list" />
              <Button size="sm" variant="outline" onClick={() => exportJson('subfinder', { subdomains, sources })}>
                Export JSON
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportText('subfinder', subdomains.join('\n'))}>
                Export list
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default SubFinder;
