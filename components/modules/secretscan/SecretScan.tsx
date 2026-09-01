import { useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { browser } from 'wxt/browser';
import { useHostPermission } from '@/lib/useHostPermission';
import { useActiveTab } from '@/lib/useActiveTab';
import { sendToBackground } from '@/lib/messaging';
import { mapLimit } from '@/lib/concurrency';
import { findSecrets, type SecretHit } from '@/lib/secrets';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

const SCAN_CAP = 20;

// Self-contained: executed in the page's isolated world via
// chrome.scripting.executeScript, so it cannot reference outer closures.
// Only collects raw text - regex matching happens back in the component
// (via the shared findSecrets helper) so it can also run over externally
// fetched script content, which this sandboxed function has no access to.
function collectPageSources(): { blob: string; scriptSrcs: string[] } {
  const sources: string[] = [document.documentElement.outerHTML];
  document.querySelectorAll('script:not([src])').forEach((el) => {
    if (el.textContent) sources.push(el.textContent);
  });

  const scriptSrcs = new Set<string>();
  document.querySelectorAll('script[src]').forEach((el) => {
    const src = el.getAttribute('src');
    if (!src) return;
    try {
      scriptSrcs.add(new URL(src, document.baseURI).href);
    } catch {
      // ignore unparsable src
    }
  });

  return { blob: sources.join('\n'), scriptSrcs: Array.from(scriptSrcs) };
}

export function SecretScan({ onBack }: ModuleComponentProps) {
  const [hits, setHits] = useState<SecretHit[]>([]);
  const [scanning, setScanning] = useState(false);
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
    setHits([]);
    setScanning(true);
    try {
      // ensure() must be the first await here, see useActiveTab's comment.
      const granted = await ensure(activeOrigin);
      if (!granted) {
        setNote('Host permission was not granted.');
        return;
      }
      const [injection] = await browser.scripting.executeScript({
        target: { tabId },
        func: collectPageSources,
      });
      const { blob, scriptSrcs } = injection?.result ?? { blob: '', scriptSrcs: [] };

      const found = findSecrets(blob);
      await mapLimit(scriptSrcs.slice(0, SCAN_CAP), 5, async (url) => {
        try {
          const res = await sendToBackground({ type: 'FETCH_TEXT', url });
          if (res.ok && res.data) findSecrets(res.data, found);
        } catch {
          // ignore unreachable scripts
        }
      });

      const result = Array.from(found.values());
      setHits(result);
      if (result.length === 0) setNote('No likely secrets found on this page.');
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="SecretScan"
        description="Best-effort regex scan of the page's HTML, inline JS, and same-origin external scripts for exposed keys and tokens."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
          <AlertTriangle className="size-3.5 shrink-0" />
          <p>
            Pattern matching only - expect false positives (test fixtures, docs, minified noise).
            Verify every hit manually before reporting it.
          </p>
        </div>

        <Button size="sm" onClick={scan} disabled={scanning || pending} className="w-fit">
          {scanning || pending ? <Loader2 className="size-3 animate-spin" /> : null}
          Scan this page
        </Button>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}

        {hits.length > 0 && (
          <>
            <div className="flex flex-col gap-2">
              {hits.map((h, i) => (
                <Card key={`${h.type}-${i}`}>
                  <CardContent className="flex flex-col gap-1.5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="warning" className="normal-case">
                        {h.type}
                      </Badge>
                      <CopyButton text={h.match} />
                    </div>
                    <code className="block break-all text-xs">{h.match}</code>
                    <p className="truncate text-[11px] text-muted-foreground">…{h.context}…</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button size="sm" variant="outline" className="w-fit" onClick={() => exportJson('secretscan', hits)}>
              Export JSON
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default SecretScan;
