import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { ModuleNote } from '@/components/shell/ModuleNote';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { browser } from 'wxt/browser';
import { useHostPermission } from '@/lib/useHostPermission';
import { useActiveTab } from '@/lib/useActiveTab';
import { matchTrackers, type TrackerHit } from '@/lib/trackers';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

// Self-contained: executed in the page's isolated world via
// chrome.scripting.executeScript, so it cannot reference outer closures.
function scanPageForHosts(): string[] {
  const hosts = new Set<string>();
  const add = (raw: string | null) => {
    if (!raw) return;
    try {
      hosts.add(new URL(raw, document.baseURI).hostname);
    } catch {
      // ignore unparsable URLs
    }
  };
  document.querySelectorAll('script[src]').forEach((el) => add(el.getAttribute('src')));
  document.querySelectorAll('iframe[src]').forEach((el) => add(el.getAttribute('src')));
  document.querySelectorAll('img[src]').forEach((el) => add(el.getAttribute('src')));
  document.querySelectorAll('link[href]').forEach((el) => add(el.getAttribute('href')));
  return Array.from(hosts);
}

export function TrackerScan({ onBack }: ModuleComponentProps) {
  const [scanning, setScanning] = useState(false);
  const [hits, setHits] = useState<TrackerHit[] | null>(null);
  const [note, setNote] = useState('');
  const { ensure, pending } = useHostPermission();
  const { tabId, origin: activeOrigin } = useActiveTab();

  async function scan() {
    if (!tabId) {
      setNote('No active tab available.');
      return;
    }
    if (!activeOrigin) {
      setNote('Active tab is not an http(s) page.');
      return;
    }
    setNote('');
    setHits(null);
    setScanning(true);
    try {
      // ensure() must be the first await here, see useActiveTab's comment.
      const granted = await ensure(activeOrigin);
      if (!granted) {
        setNote('Host permission was not granted.');
        return;
      }
      const [injection] = await browser.scripting.executeScript({ target: { tabId }, func: scanPageForHosts });
      const hostnames = (injection?.result as string[] | undefined) ?? [];
      const matched = matchTrackers(hostnames);
      setHits(matched);
      if (matched.length === 0) setNote('No known tracker/analytics scripts detected on this page.');
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="TrackerScan"
        description="Scans loaded scripts, iframes and resources for known third-party trackers and analytics."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Button size="sm" onClick={scan} disabled={scanning || pending} className="w-fit">
          {scanning || pending ? <Loader2 className="size-3 animate-spin" /> : null}
          Scan this page
        </Button>

        {note && <ModuleNote>{note}</ModuleNote>}

        {hits && hits.length > 0 && (
          <>
            <p className="text-[11px] text-muted-foreground">{hits.length} tracker(s) detected.</p>
            <Card>
              <CardContent className="flex flex-col divide-y divide-border p-0">
                {hits.map((h) => (
                  <div key={h.id} className="flex flex-col gap-1 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium">{h.name}</span>
                      <Badge variant="outline" className="normal-case">
                        {h.category}
                      </Badge>
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">{h.matchedHosts.join(', ')}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Button size="sm" variant="outline" className="w-fit" onClick={() => exportJson('trackerscan', hits)}>
              Export JSON
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default TrackerScan;
