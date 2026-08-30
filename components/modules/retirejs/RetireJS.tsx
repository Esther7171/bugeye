import { useState } from 'react';
import { Loader2, ShieldAlert, Search } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { browser } from 'wxt/browser';
import { sendToBackground } from '@/lib/messaging';
import { useHostPermission } from '@/lib/useHostPermission';
import { originOf } from '@/lib/utils';
import { mapLimit } from '@/lib/concurrency';
import { detectLibrary, type RetireFinding } from '@/lib/retirejs';
import { exportJson } from '@/lib/export';
import { cveQueryStore } from '@/lib/storage';
import type { ModuleComponentProps } from '@/types';

const SCAN_CAP = 25;

// Self-contained: executed in the page's isolated world via
// chrome.scripting.executeScript, so it cannot reference outer closures.
function scanPageForScripts(): string[] {
  const found = new Set<string>();
  document.querySelectorAll('script[src]').forEach((el) => {
    const src = el.getAttribute('src');
    if (!src) return;
    try {
      found.add(new URL(src, document.baseURI).href);
    } catch {
      // ignore
    }
  });
  return Array.from(found);
}

export function RetireJS({ onBack, onNavigate }: ModuleComponentProps) {
  const [scanning, setScanning] = useState(false);
  const [findings, setFindings] = useState<RetireFinding[]>([]);
  const [scannedCount, setScannedCount] = useState(0);
  const [note, setNote] = useState('');
  const { ensure, pending } = useHostPermission();

  async function scan() {
    setNote('');
    setFindings([]);
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
        func: scanPageForScripts,
      });
      const urls = ((injection?.result as string[] | undefined) ?? []).slice(0, SCAN_CAP);
      if (urls.length === 0) {
        setNote('No external scripts found on this page.');
        return;
      }
      setScannedCount(urls.length);

      const results = await mapLimit(urls, 5, async (url) => {
        try {
          const res = await sendToBackground({ type: 'FETCH_TEXT', url });
          return detectLibrary(url, res.ok ? (res.data ?? null) : null);
        } catch {
          return detectLibrary(url, null);
        }
      });

      setFindings(results.filter((f): f is RetireFinding => f !== null));
    } finally {
      setScanning(false);
    }
  }

  function lookupCves(finding: RetireFinding) {
    cveQueryStore.set(`${finding.library} ${finding.version}`);
    onNavigate('tab-inspector', 'cvelookup');
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="RetireJS"
        description="Detects outdated JS libraries with known CVEs from a curated vulnerability signature set."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Button size="sm" onClick={scan} disabled={scanning || pending} className="w-fit">
          {scanning || pending ? <Loader2 className="size-3 animate-spin" /> : null}
          Scan this page
        </Button>

        {note && <p className="text-xs text-muted-foreground">{note}</p>}

        {!scanning && scannedCount > 0 && (
          <p className="text-[11px] text-muted-foreground">
            Checked {scannedCount} script{scannedCount === 1 ? '' : 's'} against a curated subset of well-known
            libraries (not the full retire.js database).
          </p>
        )}

        {findings.length === 0 && scannedCount > 0 && !scanning && (
          <p className="text-xs text-muted-foreground">No known-vulnerable library versions detected.</p>
        )}

        {findings.length > 0 && (
          <>
            <div className="flex flex-col gap-2">
              {findings.map((f) => (
                <Card key={f.url}>
                  <CardContent className="flex flex-col gap-1.5 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium">
                        {f.library} <span className="text-muted-foreground">v{f.version}</span>
                      </p>
                      <Badge variant="destructive" className="gap-1">
                        <ShieldAlert className="size-2.5" /> {f.vulnerabilities.length} CVE
                        {f.vulnerabilities.length === 1 ? '' : 's'}
                      </Badge>
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">{f.url}</p>
                    {f.vulnerabilities.map((v) => (
                      <div key={v.cves.join(',')} className="text-[11px]">
                        <span className="font-medium">{v.cves.join(', ')}</span> - {v.info}
                      </div>
                    ))}
                    <Button size="sm" variant="outline" className="w-fit" onClick={() => lookupCves(f)}>
                      <Search className="size-3" /> Look up CVEs
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button size="sm" variant="outline" className="w-fit" onClick={() => exportJson('retirejs', findings)}>
              Export JSON
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default RetireJS;
