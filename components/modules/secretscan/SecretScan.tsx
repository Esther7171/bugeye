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
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

interface SecretHit {
  type: string;
  match: string;
  context: string;
}

// Self-contained: executed in the page's isolated world via
// chrome.scripting.executeScript, so it cannot reference outer closures.
function scanPageForSecrets(): SecretHit[] {
  const patterns: Array<{ type: string; re: RegExp }> = [
    { type: 'AWS Access Key', re: /AKIA[0-9A-Z]{16}/g },
    { type: 'Google API Key', re: /AIza[0-9A-Za-z\-_]{35}/g },
    { type: 'Slack Token', re: /xox[baprs]-[0-9a-zA-Z-]{10,}/g },
    { type: 'JWT', re: /eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/g },
    { type: 'Bearer token', re: /Bearer\s+[A-Za-z0-9\-_.=]{10,}/g },
    { type: 'Generic api_key', re: /api[_-]?key["'\s]*[:=]\s*["'][a-zA-Z0-9_\-]{12,}["']/gi },
    { type: 'Generic secret', re: /secret["'\s]*[:=]\s*["'][^"'\s]{8,}["']/gi },
  ];

  const sources: string[] = [document.documentElement.outerHTML];
  document.querySelectorAll('script:not([src])').forEach((el) => {
    if (el.textContent) sources.push(el.textContent);
  });
  const blob = sources.join('\n');

  const found = new Map<string, SecretHit>();
  for (const { type, re } of patterns) {
    for (const m of blob.matchAll(re)) {
      const match = m[0];
      const index = m.index ?? 0;
      const context = blob.slice(Math.max(0, index - 30), index + match.length + 30).replace(/\s+/g, ' ');
      const key = `${type}:${match}`;
      if (!found.has(key)) found.set(key, { type, match, context });
    }
  }
  return Array.from(found.values());
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
        func: scanPageForSecrets,
      });
      const result = (injection?.result as SecretHit[] | undefined) ?? [];
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
        description="Best-effort regex scan of the page's HTML and inline JS for exposed keys and tokens."
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
