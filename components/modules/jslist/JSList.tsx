import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { browser } from 'wxt/browser';
import { useHostPermission } from '@/lib/useHostPermission';
import { originOf } from '@/lib/utils';
import { exportJson, exportText } from '@/lib/export';
import { cn } from '@/lib/utils';
import type { ModuleComponentProps } from '@/types';

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

  performance.getEntriesByType('resource').forEach((entry) => {
    const resourceEntry = entry as PerformanceResourceTiming;
    if (resourceEntry.initiatorType === 'script' || /\.js(\?|$)/i.test(entry.name)) {
      found.add(entry.name);
    }
  });

  return Array.from(found).sort();
}

export function JSList({ onBack }: ModuleComponentProps) {
  const [scripts, setScripts] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [note, setNote] = useState('');
  const { ensure, pending } = useHostPermission();

  async function scan() {
    setNote('');
    setScripts([]);
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
      const result = (injection?.result as string[] | undefined) ?? [];
      setScripts(result);
      if (result.length === 0) setNote('No JavaScript files detected on this page.');
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="JSList"
        description="Lists every JavaScript file loaded by the current page."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Button size="sm" onClick={scan} disabled={scanning || pending} className="w-fit">
          {scanning || pending ? <Loader2 className="size-3 animate-spin" /> : null}
          Scan this page
        </Button>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}

        {scripts.length > 0 && (
          <>
            <Card>
              <CardContent className="flex max-h-72 flex-col overflow-y-auto p-0">
                {scripts.map((s, i) => (
                  <div
                    key={s}
                    className={cn(
                      'flex min-w-0 items-center gap-2 border-b border-border p-2 last:border-0',
                      i % 2 === 1 && 'bg-muted/30',
                    )}
                  >
                    <span
                      className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground"
                      title={s}
                    >
                      {s}
                    </span>
                    <CopyButton text={s} label="" className="size-6 shrink-0 p-0" />
                  </div>
                ))}
              </CardContent>
            </Card>
            <div className="flex flex-wrap gap-2">
              <CopyButton text={scripts.join('\n')} label="Copy list" />
              <Button size="sm" variant="outline" onClick={() => exportJson('jslist', scripts)}>
                Export JSON
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportText('jslist', scripts.join('\n'))}>
                Export list
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default JSList;
