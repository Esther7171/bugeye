import { useState } from 'react';
import { Loader2, Send, ExternalLink } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { ModuleNote } from '@/components/shell/ModuleNote';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTarget } from '@/components/shell/TargetProvider';
import { useHostPermission } from '@/lib/useHostPermission';
import { fetchUrlscan, type UrlscanHit } from '@/lib/urlscan';
import { normalizeDomain } from '@/lib/utils';
import { bulkListStore, lastSubdomainsStore } from '@/lib/storage';
import { exportJson } from '@/lib/export';
import { formatTimestamp } from '@/lib/utils';
import type { ModuleComponentProps } from '@/types';

export function UrlScanPeek({ onBack, onNavigate }: ModuleComponentProps) {
  const { target } = useTarget();
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<UrlscanHit[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [note, setNote] = useState('');
  const { ensure, pending } = useHostPermission();

  async function run() {
    const clean = normalizeDomain(target);
    if (!clean) return;
    setLoading(true);
    setNote('');
    setHits([]);
    setDomains([]);
    setTotal(0);
    try {
      const granted = await ensure('https://urlscan.io/*');
      if (!granted) {
        setNote('Host permission was not granted for urlscan.io.');
        return;
      }
      const res = await fetchUrlscan(clean);
      if (res.error) {
        setNote(res.error);
        return;
      }
      setHits(res.results);
      setDomains(res.domains);
      setTotal(res.total);
      if (res.results.length === 0) setNote('No public scans found for this domain on urlscan.io.');
      else if (res.domains.length > 0) {
        lastSubdomainsStore.set({ domain: clean, subdomains: res.domains, generatedAt: formatTimestamp() });
      }
    } finally {
      setLoading(false);
    }
  }

  function sendDomainsToSubFinder() {
    bulkListStore.set(domains.join('\n'));
    onNavigate('list-triage', 'bulkopen');
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="UrlScanPeek"
        description="Searches urlscan.io's public scans for a domain: live URLs, subdomains, IPs and page metadata."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <ModuleNote>
          Queries urlscan.io's key-free public search for <strong>{target || '(set a target)'}</strong>. Results are
          scans other people submitted publicly - a passive source, nothing is submitted on your behalf.
        </ModuleNote>

        <Button size="sm" onClick={run} disabled={!target || loading || pending} className="w-fit">
          {loading || pending ? <Loader2 className="size-3 animate-spin" /> : null}
          Search urlscan.io for {target || '(set a target)'}
        </Button>

        {note && <ModuleNote tone="error">{note}</ModuleNote>}

        {hits.length > 0 && (
          <>
            <p className="text-[11px] text-muted-foreground">
              {hits.length} recent scans shown{total > hits.length ? ` of ${total} total` : ''}; {domains.length} unique
              hostnames.
            </p>

            {domains.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={sendDomainsToSubFinder}>
                  <Send className="size-3" /> Hostnames to BulkOpen
                </Button>
                <CopyButton text={domains.join('\n')} label="Copy hostnames" />
                <Button size="sm" variant="outline" onClick={() => exportJson('urlscan', { domains, hits })}>
                  Export JSON
                </Button>
              </div>
            )}

            <Card>
              <CardContent className="flex max-h-80 flex-col overflow-y-auto p-0">
                {hits.map((h, i) => (
                  <div key={`${h.scanUrl}-${i}`} className="flex flex-col gap-0.5 border-b border-border p-2 last:border-0">
                    <div className="flex items-center gap-1.5">
                      <span className="min-w-0 flex-1 truncate text-[11px] font-medium" title={h.title || h.url}>
                        {h.title || h.domain || h.url}
                      </span>
                      {h.country && (
                        <Badge variant="outline" className="shrink-0 normal-case text-[9px]">
                          {h.country}
                        </Badge>
                      )}
                      {h.scanUrl && (
                        <a href={h.scanUrl} target="_blank" rel="noreferrer" className="shrink-0 text-primary" title="Open scan">
                          <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                    <span className="truncate font-mono text-[10px] text-muted-foreground" title={h.url}>
                      {h.url}
                    </span>
                    <span className="truncate text-[10px] text-muted-foreground">
                      {[h.ip, h.server, h.time?.slice(0, 10)].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

export default UrlScanPeek;
