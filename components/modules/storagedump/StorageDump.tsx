import { useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { browser } from 'wxt/browser';
import { useHostPermission } from '@/lib/useHostPermission';
import { useActiveTab } from '@/lib/useActiveTab';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

interface StorageDumpData {
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  indexedDbNames: string[];
}

// Self-contained: executed in the page's isolated world via
// chrome.scripting.executeScript, so it cannot reference outer closures.
async function dumpStorage(): Promise<StorageDumpData> {
  const toRecord = (storage: Storage): Record<string, string> => {
    const out: Record<string, string> = {};
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key !== null) out[key] = storage.getItem(key) ?? '';
    }
    return out;
  };

  let indexedDbNames: string[] = [];
  try {
    if (indexedDB.databases) {
      const dbs = await indexedDB.databases();
      indexedDbNames = dbs.map((d) => d.name ?? '(unnamed)');
    }
  } catch {
    // indexedDB.databases() unsupported in some browsers - skip
  }

  return { localStorage: toRecord(localStorage), sessionStorage: toRecord(sessionStorage), indexedDbNames };
}

function StorageTable({ data }: { data: Record<string, string> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return <p className="p-3 text-xs text-muted-foreground">Empty.</p>;
  return (
    <div className="flex flex-col divide-y divide-border">
      {entries.map(([key, value]) => (
        <div key={key} className="flex flex-col gap-0.5 p-2">
          <span className="text-xs font-medium">{key}</span>
          <span className="break-all text-[11px] text-muted-foreground">{value}</span>
        </div>
      ))}
    </div>
  );
}

export function StorageDump({ onBack }: ModuleComponentProps) {
  const [data, setData] = useState<StorageDumpData | null>(null);
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
      const [injection] = await browser.scripting.executeScript({
        target: { tabId },
        func: dumpStorage,
      });
      setData((injection?.result as StorageDumpData | undefined) ?? null);
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="StorageDump"
        description="Reads and exports localStorage, sessionStorage and IndexedDB database names for the active tab."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Button size="sm" onClick={scan} disabled={scanning || pending} className="w-fit">
          {scanning || pending ? <Loader2 className="size-3 animate-spin" /> : null}
          Dump storage
        </Button>

        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
          <AlertTriangle className="size-3.5 shrink-0" />
          <p>Often holds session tokens and JWTs. Treat exported data as sensitive.</p>
        </div>

        {note && <p className="text-xs text-muted-foreground">{note}</p>}

        {data && (
          <>
            <Tabs defaultValue="local">
              <TabsList>
                <TabsTrigger value="local">localStorage ({Object.keys(data.localStorage).length})</TabsTrigger>
                <TabsTrigger value="session">sessionStorage ({Object.keys(data.sessionStorage).length})</TabsTrigger>
                <TabsTrigger value="idb">IndexedDB ({data.indexedDbNames.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="local">
                <Card>
                  <CardContent className="max-h-64 overflow-y-auto p-0">
                    <StorageTable data={data.localStorage} />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="session">
                <Card>
                  <CardContent className="max-h-64 overflow-y-auto p-0">
                    <StorageTable data={data.sessionStorage} />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="idb">
                <Card>
                  <CardContent className="max-h-64 overflow-y-auto p-0">
                    {data.indexedDbNames.length === 0 ? (
                      <p className="p-3 text-xs text-muted-foreground">No IndexedDB databases found.</p>
                    ) : (
                      data.indexedDbNames.map((name) => (
                        <p key={name} className="truncate border-b border-border p-2 text-xs last:border-0">
                          {name}
                        </p>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            <Button size="sm" variant="outline" className="w-fit" onClick={() => exportJson('storagedump', data)}>
              Export JSON
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default StorageDump;
