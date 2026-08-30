import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { browser } from 'wxt/browser';
import { useHostPermission } from '@/lib/useHostPermission';
import { originOf } from '@/lib/utils';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

interface ResourceHit {
  url: string;
  thirdParty: boolean;
}

interface LinkedContentData {
  pageHost: string;
  byTag: Record<string, ResourceHit[]>;
}

const TAGS = ['img', 'script', 'iframe', 'link', 'a'] as const;

// Self-contained: executed in the page's isolated world via
// chrome.scripting.executeScript, so it cannot reference outer closures.
function scanPageForLinkedContent(): LinkedContentData {
  const pageHost = location.hostname;
  const byTag: Record<string, ResourceHit[]> = { img: [], script: [], iframe: [], link: [], a: [] };
  const seen: Record<string, Set<string>> = { img: new Set(), script: new Set(), iframe: new Set(), link: new Set(), a: new Set() };

  const attrByTag: Record<string, string> = { img: 'src', script: 'src', iframe: 'src', link: 'href', a: 'href' };

  for (const tag of Object.keys(attrByTag)) {
    const attr = attrByTag[tag]!;
    document.querySelectorAll(`${tag}[${attr}]`).forEach((el) => {
      const raw = el.getAttribute(attr);
      if (!raw) return;
      try {
        const resolved = new URL(raw, document.baseURI);
        if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return;
        if (seen[tag]!.has(resolved.href)) return;
        seen[tag]!.add(resolved.href);
        byTag[tag]!.push({ url: resolved.href, thirdParty: resolved.hostname !== pageHost });
      } catch {
        // ignore
      }
    });
  }

  return { pageHost, byTag };
}

export function LinkedContent({ onBack }: ModuleComponentProps) {
  const [data, setData] = useState<LinkedContentData | null>(null);
  const [scanning, setScanning] = useState(false);
  const [note, setNote] = useState('');
  const { ensure, pending } = useHostPermission();

  async function scan() {
    setNote('');
    setData(null);
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
      const [injection] = await browser.scripting.executeScript({ target: { tabId: tab.id }, func: scanPageForLinkedContent });
      const result = injection?.result as LinkedContentData | undefined;
      setData(result ?? null);
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="LinkedContent"
        description="Lists linked/embedded resources (img, script, iframe, link, a) grouped by type, flagging third-party hosts."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Button size="sm" onClick={scan} disabled={scanning || pending} className="w-fit">
          {scanning || pending ? <Loader2 className="size-3 animate-spin" /> : null}
          Scan this page
        </Button>

        {note && <p className="text-xs text-muted-foreground">{note}</p>}

        {data && (
          <>
            <Tabs defaultValue="img">
              <TabsList>
                {TAGS.map((tag) => (
                  <TabsTrigger key={tag} value={tag}>
                    {tag} ({data.byTag[tag]?.length ?? 0})
                  </TabsTrigger>
                ))}
              </TabsList>
              {TAGS.map((tag) => (
                <TabsContent key={tag} value={tag}>
                  <Card>
                    <CardContent className="flex max-h-64 flex-col divide-y divide-border overflow-y-auto p-0">
                      {(data.byTag[tag]?.length ?? 0) === 0 && (
                        <p className="p-2 text-xs text-muted-foreground">None found.</p>
                      )}
                      {data.byTag[tag]?.map((r) => (
                        <div key={r.url} className="flex items-center gap-2 p-1.5">
                          {r.thirdParty && <Badge variant="warning">3rd-party</Badge>}
                          <span className="min-w-0 flex-1 truncate text-xs">{r.url}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
            <Button size="sm" variant="outline" className="w-fit" onClick={() => exportJson('linkedcontent', data)}>
              Export JSON
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default LinkedContent;
