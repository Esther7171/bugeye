import { useState } from 'react';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { ModuleNote } from '@/components/shell/ModuleNote';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { browser } from 'wxt/browser';
import { useHostPermission } from '@/lib/useHostPermission';
import { useActiveTab } from '@/lib/useActiveTab';
import { classifySri, sriNeedsAttention, type SriResource, type SriVerdict } from '@/lib/sri';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

function scanPageForSri(): SriResource[] {
  const pageHost = location.hostname;
  const out: SriResource[] = [];

  document.querySelectorAll('script[src]').forEach((el) => {
    const src = el.getAttribute('src');
    if (!src) return;
    try {
      const url = new URL(src, document.baseURI);
      out.push({
        tag: 'script',
        url: url.href,
        host: url.hostname,
        crossOriginAttr: el.getAttribute('crossorigin'),
        integrity: el.getAttribute('integrity'),
        crossOriginResource: url.hostname !== pageHost,
      });
    } catch {
      // ignore
    }
  });

  document.querySelectorAll('link[href]').forEach((el) => {
    const rel = (el.getAttribute('rel') ?? '').toLowerCase();
    const as = (el.getAttribute('as') ?? '').toLowerCase();
    const isStyle = rel.split(/\s+/).includes('stylesheet');
    const isPreload = rel.split(/\s+/).includes('preload') && (as === 'script' || as === 'style');
    if (!isStyle && !isPreload) return;
    const href = el.getAttribute('href');
    if (!href) return;
    try {
      const url = new URL(href, document.baseURI);
      out.push({
        tag: 'link',
        url: url.href,
        host: url.hostname,
        crossOriginAttr: el.getAttribute('crossorigin'),
        integrity: el.getAttribute('integrity'),
        crossOriginResource: url.hostname !== pageHost,
      });
    } catch {
      // ignore
    }
  });

  return out;
}

const VERDICT_LABEL: Record<SriVerdict, string> = {
  missing: 'no integrity',
  'no-cors-attr': 'integrity, no crossorigin',
  ok: 'SRI ok',
  'same-origin': 'same-origin',
};

export function SriCheck({ onBack }: ModuleComponentProps) {
  const [rows, setRows] = useState<(SriResource & { verdict: SriVerdict })[]>([]);
  const [scanning, setScanning] = useState(false);
  const [note, setNote] = useState('');
  const { ensure, pending } = useHostPermission();
  const { tabId, url: activeUrl, origin: activeOrigin } = useActiveTab();

  async function scan() {
    if (!tabId || !activeUrl) {
      setNote('No active tab available.');
      return;
    }
    if (!activeOrigin) {
      setNote('Active tab is not an http(s) page.');
      return;
    }
    setNote('');
    setRows([]);
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
        func: scanPageForSri,
      });
      const pageHost = new URL(activeUrl).hostname;
      const found = (injection?.result as SriResource[] | undefined) ?? [];
      setRows(found.map((r) => ({ ...r, verdict: classifySri(pageHost, r) })));
      if (found.length === 0) setNote('No script[src] or stylesheet/preload link[href] on this page.');
    } finally {
      setScanning(false);
    }
  }

  const issues = rows.filter((r) => sriNeedsAttention(r.verdict));

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="SriCheck"
        description="Flags cross-origin script and stylesheet URLs that lack an integrity attribute (or have integrity without crossorigin)."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Button size="sm" onClick={scan} disabled={scanning || pending} className="w-fit">
          {scanning || pending ? <Loader2 className="size-3 animate-spin" /> : null}
          Scan this tab
        </Button>
        {note && <ModuleNote tone="error">{note}</ModuleNote>}
        {rows.length > 0 && (
          <>
            <p className="text-[11px] text-muted-foreground">
              {issues.length} of {rows.length} cross-origin resources need attention.
            </p>
            <Card>
              <CardContent className="flex max-h-80 flex-col divide-y divide-border overflow-y-auto p-0">
                {rows.map((r) => (
                  <div key={`${r.tag}-${r.url}`} className="flex flex-col gap-1 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-medium">{r.tag}</span>
                      <Badge
                        variant={
                          r.verdict === 'ok'
                            ? 'success'
                            : r.verdict === 'same-origin'
                              ? 'muted'
                              : r.verdict === 'missing'
                                ? 'destructive'
                                : 'warning'
                        }
                        className="shrink-0 gap-1 normal-case"
                      >
                        {r.verdict === 'ok' ? (
                          <CheckCircle2 className="size-2.5" />
                        ) : r.verdict === 'same-origin' ? null : (
                          <AlertTriangle className="size-2.5" />
                        )}
                        {VERDICT_LABEL[r.verdict]}
                      </Badge>
                    </div>
                    <p className="break-all text-[11px] text-muted-foreground">{r.url}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Button size="sm" variant="outline" className="w-fit" onClick={() => exportJson('sricheck', rows)}>
              Export JSON
            </Button>
          </>
        )}
        <p className="text-[11px] text-muted-foreground">
          Same-origin tags are listed but not scored: SRI matters most for CDNs you do not control.
        </p>
      </div>
    </div>
  );
}

export default SriCheck;
