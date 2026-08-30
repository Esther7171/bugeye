import { useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { browser } from 'wxt/browser';
import { sendToBackground } from '@/lib/messaging';
import { useHostPermission } from '@/lib/useHostPermission';
import { originOf } from '@/lib/utils';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

interface BucketHit {
  type: string;
  url: string;
}

interface BucketResult extends BucketHit {
  probe: 'public' | 'private' | 'unknown';
  status: number | null;
}

// Must be fully self-contained: executed in the page's isolated world via
// chrome.scripting.executeScript, so it cannot reference outer closures.
function scanPageForBuckets(): BucketHit[] {
  const patterns: Array<{ type: string; re: RegExp }> = [
    { type: 'S3', re: /[a-z0-9.-]*s3[.-][a-z0-9-]*\.amazonaws\.com\/[a-z0-9._/-]*|s3:\/\/[a-z0-9.-]+/gi },
    { type: 'Azure Blob', re: /[a-z0-9-]+\.blob\.core\.windows\.net\/[a-z0-9._/-]*/gi },
    { type: 'GCS', re: /storage\.googleapis\.com\/[a-z0-9._/-]+|[a-z0-9._-]+\.storage\.googleapis\.com/gi },
    { type: 'DO Spaces', re: /[a-z0-9-]+\.digitaloceanspaces\.com\/[a-z0-9._/-]*/gi },
  ];

  const haystacks: string[] = [document.documentElement.outerHTML];
  document.querySelectorAll('[src],[href]').forEach((el) => {
    const src = el.getAttribute('src');
    const href = el.getAttribute('href');
    if (src) haystacks.push(src);
    if (href) haystacks.push(href);
  });
  performance.getEntriesByType('resource').forEach((entry) => haystacks.push(entry.name));

  const found = new Map<string, BucketHit>();
  const blob = haystacks.join('\n');
  for (const { type, re } of patterns) {
    const matches = blob.match(re) ?? [];
    for (const m of matches) {
      let url = m;
      if (!/^https?:\/\//i.test(url) && !url.startsWith('s3://')) url = `https://${url}`;
      found.set(url, { type, url });
    }
  }
  return Array.from(found.values());
}

export function BucketSpot({ onBack }: ModuleComponentProps) {
  const [scanning, setScanning] = useState(false);
  const [probing, setProbing] = useState(false);
  const [results, setResults] = useState<BucketResult[]>([]);
  const [note, setNote] = useState('');
  const { ensure, ensureMany, pending } = useHostPermission();

  async function scan() {
    setNote('');
    setResults([]);
    setScanning(true);
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !tab.url) {
        setNote('No active tab available.');
        return;
      }
      const origin = originOf(tab.url);
      if (!origin) {
        setNote('Active tab is not an http(s) page.');
        return;
      }
      const granted = await ensure(origin);
      if (!granted) {
        setNote('Host permission was not granted.');
        return;
      }

      const [injection] = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: scanPageForBuckets,
      });
      const hits = (injection?.result as BucketHit[] | undefined) ?? [];
      if (hits.length === 0) {
        setNote('No cloud storage references found on this page.');
        return;
      }

      const rows: BucketResult[] = hits.map((h) => ({ ...h, probe: 'unknown', status: null }));
      setResults(rows);

      const bucketOrigins = Array.from(
        new Set(hits.map((h) => originOf(h.url)).filter((o): o is string => !!o)),
      );
      const probeGranted = await ensureMany(bucketOrigins);
      if (!probeGranted) {
        setNote('Buckets found. Grant host access to probe public/private status.');
        return;
      }

      setProbing(true);
      for (let i = 0; i < rows.length; i++) {
        const res = await sendToBackground({ type: 'HEAD_PROBE', url: rows[i]!.url });
        const probe: BucketResult['probe'] =
          res.status === 200 ? 'public' : res.status === 403 || res.status === 401 ? 'private' : 'unknown';
        setResults((prev) => {
          const next = [...prev];
          next[i] = { ...next[i]!, probe, status: res.status };
          return next;
        });
      }
      setProbing(false);
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="BucketSpot"
        description="Scans the current page for exposed cloud storage buckets (S3, Azure, GCS, DO Spaces)."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Button size="sm" onClick={scan} disabled={scanning || pending} className="w-fit">
          {scanning || pending ? <Loader2 className="size-3 animate-spin" /> : null}
          Scan this page
        </Button>

        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
          <AlertTriangle className="size-3.5 shrink-0" />
          <p>
            Public/private status is best-effort (HEAD request). CORS or bucket policy may hide the
            true state - verify manually before reporting.
          </p>
        </div>

        {note && <p className="text-xs text-muted-foreground">{note}</p>}

        {results.length > 0 && (
          <>
            <Card>
              <CardContent className="flex max-h-72 flex-col divide-y divide-border overflow-y-auto p-0">
                {results.map((r) => (
                  <div key={r.url} className="flex items-center justify-between gap-2 p-2">
                    <div className="min-w-0 flex-1">
                      <Badge variant="outline" className="mb-1 normal-case">
                        {r.type}
                      </Badge>
                      <p className="truncate text-xs">{r.url}</p>
                    </div>
                    {probing && r.probe === 'unknown' ? (
                      <Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" />
                    ) : (
                      <Badge
                        variant={
                          r.probe === 'public' ? 'destructive' : r.probe === 'private' ? 'success' : 'muted'
                        }
                      >
                        {r.probe}
                        {r.status ? ` ${r.status}` : ''}
                      </Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
            <Button size="sm" variant="outline" className="w-fit" onClick={() => exportJson('bucketspot', results)}>
              Export JSON
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default BucketSpot;
