import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { browser } from 'wxt/browser';
import { useHostPermission } from '@/lib/useHostPermission';
import { useActiveTab } from '@/lib/useActiveTab';
import { exportJson, exportText } from '@/lib/export';
import { bulkListStore } from '@/lib/storage';
import type { ModuleComponentProps } from '@/types';

interface LinkHit {
  url: string;
  tag: string;
}

// Self-contained: executed in the page's isolated world via
// chrome.scripting.executeScript, so it cannot reference outer closures.
function scanPageForLinks(): LinkHit[] {
  const found = new Map<string, LinkHit>();
  const add = (raw: string | null, tag: string) => {
    if (!raw) return;
    try {
      const resolved = new URL(raw, document.baseURI).href;
      if (!found.has(resolved)) found.set(resolved, { url: resolved, tag });
    } catch {
      // ignore unparsable URLs (mailto without value, javascript:, etc.)
    }
  };

  document.querySelectorAll('a[href]').forEach((el) => add(el.getAttribute('href'), 'a'));
  document.querySelectorAll('img[src]').forEach((el) => add(el.getAttribute('src'), 'img'));
  document.querySelectorAll('script[src]').forEach((el) => add(el.getAttribute('src'), 'script'));
  document.querySelectorAll('link[href]').forEach((el) => add(el.getAttribute('href'), 'link'));
  document.querySelectorAll('form[action]').forEach((el) => add(el.getAttribute('action'), 'form'));

  return Array.from(found.values());
}

export function LinkGrab({ onBack, onNavigate }: ModuleComponentProps) {
  const [hits, setHits] = useState<LinkHit[]>([]);
  const [pageHost, setPageHost] = useState('');
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
        func: scanPageForLinks,
      });
      const result = (injection?.result as LinkHit[] | undefined) ?? [];
      setHits(result);
      setPageHost(new URL(activeUrl).hostname);
      if (result.length === 0) setNote('No links, scripts or form actions found on this page.');
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="LinkGrab"
        description="Extracts every link, script, stylesheet and form action on the current page."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Button size="sm" onClick={scan} disabled={scanning || pending} className="w-fit">
          {scanning || pending ? <Loader2 className="size-3 animate-spin" /> : null}
          Scan this page
        </Button>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}

        {hits.length > 0 && (
          <LinkResults
            hits={hits}
            pageHost={pageHost}
            onSendToBulkOpen={(urls) => {
              bulkListStore.set(urls.join('\n'));
              onNavigate('list-triage', 'bulkopen');
            }}
          />
        )}
      </div>
    </div>
  );
}

function LinkResults({
  hits,
  pageHost,
  onSendToBulkOpen,
}: {
  hits: LinkHit[];
  pageHost: string;
  onSendToBulkOpen: (urls: string[]) => void;
}) {
  const internal = hits.filter((h) => {
    try {
      return new URL(h.url).hostname === pageHost;
    } catch {
      return false;
    }
  });
  const external = hits.filter((h) => !internal.includes(h));

  return (
    <Tabs defaultValue="internal">
      <TabsList>
        <TabsTrigger value="internal">Internal ({internal.length})</TabsTrigger>
        <TabsTrigger value="external">External ({external.length})</TabsTrigger>
      </TabsList>
      {(['internal', 'external'] as const).map((key) => {
        const list = key === 'internal' ? internal : external;
        return (
          <TabsContent key={key} value={key}>
            <Card>
              <CardContent className="flex max-h-72 flex-col divide-y divide-border overflow-y-auto p-0">
                {list.map((h) => (
                  <div key={h.url} className="flex items-center gap-2 p-2">
                    <Badge variant="outline" className="shrink-0 normal-case">
                      {h.tag}
                    </Badge>
                    <span className="min-w-0 flex-1 truncate text-xs">{h.url}</span>
                  </div>
                ))}
                {list.length === 0 && (
                  <p className="p-3 text-xs text-muted-foreground">Nothing here.</p>
                )}
              </CardContent>
            </Card>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => onSendToBulkOpen(list.map((h) => h.url))} disabled={list.length === 0}>
                <Send className="size-3" /> Send to BulkOpen
              </Button>
              <CopyButton text={list.map((h) => h.url).join('\n')} label="Copy list" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportJson(`linkgrab-${key}`, list)}
                disabled={list.length === 0}
              >
                Export JSON
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportText(`linkgrab-${key}`, list.map((h) => h.url).join('\n'))}
                disabled={list.length === 0}
              >
                Export list
              </Button>
            </div>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

export default LinkGrab;
