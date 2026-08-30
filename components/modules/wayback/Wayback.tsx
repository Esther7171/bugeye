import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTarget } from '@/components/shell/TargetProvider';
import { useHostPermission } from '@/lib/useHostPermission';
import { fetchWaybackUrls } from '@/lib/wayback';
import { bulkListStore } from '@/lib/storage';
import { exportJson, exportText } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

export function Wayback({ onBack, onNavigate }: ModuleComponentProps) {
  const { target } = useTarget();
  const [loading, setLoading] = useState(false);
  const [urls, setUrls] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const { ensure, pending } = useHostPermission();

  async function scan() {
    if (!target) return;
    setLoading(true);
    setNote('');
    setUrls([]);
    try {
      const granted = await ensure('https://web.archive.org/*');
      if (!granted) {
        setNote('Host permission was not granted.');
        return;
      }
      const result = await fetchWaybackUrls(target);
      setUrls(result.urls);
      if (result.urls.length === 0) setNote(result.error ?? 'No archived URLs found for this domain.');
    } finally {
      setLoading(false);
    }
  }

  function sendToBulkOpen() {
    bulkListStore.set(urls.join('\n'));
    onNavigate('list-triage', 'bulkopen');
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="Wayback"
        description="Queries the Wayback Machine CDX API for archived URLs of the domain."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Button size="sm" onClick={scan} disabled={!target || loading || pending} className="w-fit">
          {loading || pending ? <Loader2 className="size-3 animate-spin" /> : null}
          Query archives for {target || '(set a target)'}
        </Button>

        {note && <p className="text-xs text-muted-foreground">{note}</p>}

        {urls.length > 0 && (
          <>
            <p className="text-[11px] text-muted-foreground">{urls.length} unique URLs found.</p>
            <Card>
              <CardContent className="max-h-72 overflow-y-auto p-0">
                {urls.slice(0, 500).map((u) => (
                  <p key={u} className="truncate border-b border-border p-1.5 text-xs last:border-0">
                    {u}
                  </p>
                ))}
                {urls.length > 500 && (
                  <p className="p-1.5 text-[11px] text-muted-foreground">
                    ...and {urls.length - 500} more. Export or send to BulkOpen to see the full list.
                  </p>
                )}
              </CardContent>
            </Card>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={sendToBulkOpen}>
                <Send className="size-3" /> Send to BulkOpen
              </Button>
              <CopyButton text={urls.join('\n')} label="Copy list" />
              <Button size="sm" variant="outline" onClick={() => exportJson('wayback', urls)}>
                Export JSON
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportText('wayback', urls.join('\n'))}>
                Export list
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Wayback;
