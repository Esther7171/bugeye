import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { browser } from 'wxt/browser';
import { useHostPermission } from '@/lib/useHostPermission';
import { useActiveTab } from '@/lib/useActiveTab';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

interface HiddenInput {
  name: string;
  value: string;
  form: string;
}

interface HiddenData {
  comments: string[];
  hiddenInputs: HiddenInput[];
}

// Self-contained: executed in the page's isolated world via
// chrome.scripting.executeScript, so it cannot reference outer closures.
function scanPageForHidden(): HiddenData {
  const comments: string[] = [];
  const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_COMMENT);
  let node = walker.nextNode();
  while (node) {
    const text = node.textContent?.trim();
    if (text) comments.push(text);
    node = walker.nextNode();
  }

  const hiddenInputs = Array.from(document.querySelectorAll('input[type="hidden"]')).map((el) => ({
    name: el.getAttribute('name') ?? '(no name)',
    value: el.getAttribute('value') ?? '',
    form: el.closest('form')?.getAttribute('action') ?? '(no form)',
  }));

  return { comments, hiddenInputs };
}

export function HiddenFind({ onBack }: ModuleComponentProps) {
  const [data, setData] = useState<HiddenData | null>(null);
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
    setData(null);
    setScanning(true);
    try {
      // ensure() must be the first await here, see useActiveTab's comment.
      const granted = await ensure(activeOrigin);
      if (!granted) {
        setNote('Host permission was not granted.');
        return;
      }
      const [injection] = await browser.scripting.executeScript({ target: { tabId }, func: scanPageForHidden });
      const result = injection?.result as HiddenData | undefined;
      setData(result ?? { comments: [], hiddenInputs: [] });
      if (result && result.comments.length === 0 && result.hiddenInputs.length === 0) {
        setNote('No HTML comments or hidden fields found.');
      }
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="HiddenFind"
        description="Extracts HTML comments and type=hidden input fields, which often leak internal info."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Button size="sm" onClick={scan} disabled={scanning || pending} className="w-fit">
          {scanning || pending ? <Loader2 className="size-3 animate-spin" /> : null}
          Scan this page
        </Button>

        {note && <p className="text-xs text-muted-foreground">{note}</p>}

        {data && (data.comments.length > 0 || data.hiddenInputs.length > 0) && (
          <>
            <Tabs defaultValue="comments">
              <TabsList>
                <TabsTrigger value="comments">Comments ({data.comments.length})</TabsTrigger>
                <TabsTrigger value="hidden">Hidden fields ({data.hiddenInputs.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="comments">
                <Card>
                  <CardContent className="max-h-64 overflow-y-auto p-0">
                    {data.comments.length === 0 && <p className="p-2 text-xs text-muted-foreground">None found.</p>}
                    {data.comments.map((c, i) => (
                      <pre key={i} className="whitespace-pre-wrap break-all border-b border-border p-2 text-[11px] last:border-0">
                        {c}
                      </pre>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="hidden">
                <Card>
                  <CardContent className="max-h-64 overflow-y-auto p-0">
                    {data.hiddenInputs.length === 0 && <p className="p-2 text-xs text-muted-foreground">None found.</p>}
                    {data.hiddenInputs.map((h, i) => (
                      <div key={i} className="flex flex-col gap-0.5 border-b border-border p-2 last:border-0">
                        <span className="text-xs font-medium">{h.name}</span>
                        <span className="break-all text-[11px] text-muted-foreground">{h.value || '(empty)'}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            <Button size="sm" variant="outline" className="w-fit" onClick={() => exportJson('hiddenfind', data)}>
              Export JSON
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default HiddenFind;
