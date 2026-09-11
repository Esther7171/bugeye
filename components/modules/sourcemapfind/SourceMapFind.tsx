import { useState } from 'react';
import { Loader2, FileCode2 } from 'lucide-react';
import { browser } from 'wxt/browser';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { ModuleNote } from '@/components/shell/ModuleNote';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useHostPermission } from '@/lib/useHostPermission';
import { useActiveTab } from '@/lib/useActiveTab';
import { mapLimit } from '@/lib/concurrency';
import { analyzeScriptForSourceMap, sourceMapReportToMarkdown, type SourceMapFinding } from '@/lib/sourcemap';
import { exportMarkdown } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

// Runs in the page's isolated world to collect every loaded script URL, the
// same way JSList does.
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
  return Array.from(found).filter((u) => /^https?:/i.test(u)).sort();
}

const MAX_SCRIPTS = 60;

export function SourceMapFind({ onBack }: ModuleComponentProps) {
  const [findings, setFindings] = useState<SourceMapFinding[]>([]);
  const [scanning, setScanning] = useState(false);
  const [note, setNote] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const { ensure, pending } = useHostPermission();
  const { tabId, url, origin: activeOrigin } = useActiveTab();

  async function scan() {
    if (!tabId || !activeOrigin) {
      setNote('Active tab is not an http(s) page.');
      return;
    }
    setNote('');
    setFindings([]);
    setScanning(true);
    try {
      // ensure() must be the first await (see useActiveTab's comment).
      const granted = await ensure(activeOrigin);
      if (!granted) {
        setNote('Host permission was not granted.');
        return;
      }
      const [injection] = await browser.scripting.executeScript({ target: { tabId }, func: scanPageForScripts });
      const scripts = ((injection?.result as string[] | undefined) ?? []).slice(0, MAX_SCRIPTS);
      if (scripts.length === 0) {
        setNote('No JavaScript files detected on this page.');
        return;
      }
      setPageUrl(url ?? '');
      await mapLimit(
        scripts,
        6,
        (scriptUrl) => analyzeScriptForSourceMap(scriptUrl),
        (result) => setFindings((prev) => [...prev, result].sort((a, b) => Number(b.accessible) - Number(a.accessible))),
      );
    } finally {
      setScanning(false);
    }
  }

  const exposed = findings.filter((f) => f.accessible);

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="SourceMapFind"
        description="Detects exposed JavaScript source maps (.map) that reconstruct a site's original source."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <ModuleNote>
          Reads scripts loaded by the current tab, then checks each for a reachable source map. An
          exposed <code>.map</code> reveals original, unminified source (often including internal
          paths and comments).
        </ModuleNote>

        <Button size="sm" onClick={scan} disabled={scanning || pending} className="w-fit">
          {scanning || pending ? <Loader2 className="size-3 animate-spin" /> : null}
          Scan this page
        </Button>

        {note && <ModuleNote tone="error">{note}</ModuleNote>}

        {findings.length > 0 && (
          <>
            <p className="text-[11px] text-muted-foreground">
              {exposed.length} exposed source map{exposed.length === 1 ? '' : 's'} across {findings.length} script
              {findings.length === 1 ? '' : 's'} scanned.
            </p>

            <Card>
              <CardContent className="flex max-h-80 flex-col overflow-y-auto p-0">
                {findings.map((f) => (
                  <div key={f.scriptUrl} className="border-b border-border p-2 last:border-0">
                    <div className="flex items-center gap-2">
                      {f.accessible ? (
                        <Badge variant="destructive" className="gap-1 shrink-0">
                          <FileCode2 className="size-2.5" /> map exposed
                        </Badge>
                      ) : (
                        <Badge variant="muted" className="shrink-0">
                          {f.error ? 'fetch failed' : 'no map'}
                        </Badge>
                      )}
                      <span className="min-w-0 flex-1 truncate font-mono text-[11px]" title={f.scriptUrl}>
                        {f.scriptUrl}
                      </span>
                    </div>
                    {f.accessible && (
                      <details className="mt-1.5">
                        <summary className="cursor-pointer text-[11px] text-primary">
                          {f.sourceCount ?? 0} original sources ({f.origin})
                        </summary>
                        <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2 text-[10px]">
                          {(f.sources ?? []).join('\n')}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {exposed.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <CopyButton text={sourceMapReportToMarkdown(pageUrl, findings)} label="Copy report" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportMarkdown('sourcemapfind', sourceMapReportToMarkdown(pageUrl, findings))}
                >
                  Export report
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default SourceMapFind;
