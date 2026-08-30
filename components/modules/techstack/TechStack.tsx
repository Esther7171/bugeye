import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { browser } from 'wxt/browser';
import { useTarget } from '@/components/shell/TargetProvider';
import { useHostPermission } from '@/lib/useHostPermission';
import { sendToBackground } from '@/lib/messaging';
import { originOf } from '@/lib/utils';
import { fingerprintFromHeaders, type TechHit } from '@/lib/techstack';
import { RETIRE_LIBRARIES } from '@/lib/retirejs';
import { exportJson } from '@/lib/export';
import { cveQueryStore } from '@/lib/storage';
import type { ModuleComponentProps } from '@/types';

// Self-contained: executed in the page's isolated world via
// chrome.scripting.executeScript, so it cannot reference outer closures.
function scanPageMeta(): { generator: string | null; scriptSrcs: string[] } {
  const generator = document.querySelector('meta[name="generator"]')?.getAttribute('content') ?? null;
  const scriptSrcs: string[] = [];
  document.querySelectorAll('script[src]').forEach((el) => {
    const src = el.getAttribute('src');
    if (src) scriptSrcs.push(src);
  });
  return { generator, scriptSrcs };
}

export function TechStack({ onBack, onNavigate }: ModuleComponentProps) {
  const { target } = useTarget();
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<TechHit[]>([]);
  const [note, setNote] = useState('');
  const { ensure, pending } = useHostPermission();

  async function scan() {
    if (!target) return;
    setLoading(true);
    setNote('');
    setHits([]);
    try {
      const granted = await ensure(`https://${target}/*`);
      if (!granted) {
        setNote('Host permission was not granted.');
        return;
      }
      const res = await sendToBackground({ type: 'GET_URL_HEADERS', url: `https://${target}/` });
      const found = fingerprintFromHeaders(res.headers);

      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.id && tab.url) {
        const tabOrigin = originOf(tab.url);
        if (tabOrigin && (await ensure(tabOrigin))) {
          const [injection] = await browser.scripting.executeScript({ target: { tabId: tab.id }, func: scanPageMeta });
          const pageData = injection?.result as { generator: string | null; scriptSrcs: string[] } | undefined;
          if (pageData?.generator) {
            found.push({ name: pageData.generator, source: 'meta', detail: 'meta[name=generator]' });
          }
          for (const src of pageData?.scriptSrcs ?? []) {
            for (const lib of RETIRE_LIBRARIES) {
              const match = lib.filenamePattern ? src.match(lib.filenamePattern) : null;
              if (match?.[1]) {
                found.push({ name: `${lib.name} ${match[1]}`, source: 'script', detail: src });
                break;
              }
            }
          }
        }
      }

      setHits(found);
      if (found.length === 0) setNote('No technology signatures detected from headers, cookies or page markup.');
    } finally {
      setLoading(false);
    }
  }

  function lookupCves(name: string) {
    cveQueryStore.set(name);
    onNavigate('tab-inspector', 'cvelookup');
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="TechStack"
        description="Fingerprints tech from response headers, cookies, meta generator tags and script filenames."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Button size="sm" onClick={scan} disabled={!target || loading || pending} className="w-fit">
          {loading || pending ? <Loader2 className="size-3 animate-spin" /> : null}
          Fingerprint {target || '(set a target)'}
        </Button>

        {note && <p className="text-xs text-muted-foreground">{note}</p>}

        {hits.length > 0 && (
          <>
            <Card>
              <CardContent className="flex flex-col divide-y divide-border p-0">
                {hits.map((h, i) => (
                  <div key={`${h.name}-${i}`} className="flex items-center justify-between gap-2 p-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{h.name}</p>
                      {h.detail && <p className="truncate text-[11px] text-muted-foreground">{h.detail}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Badge variant="outline" className="normal-case">
                        {h.source}
                      </Badge>
                      <Button size="sm" variant="ghost" className="size-6 p-0" onClick={() => lookupCves(h.name)}>
                        <Search className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Button size="sm" variant="outline" className="w-fit" onClick={() => exportJson('techstack', hits)}>
              Export JSON
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default TechStack;
