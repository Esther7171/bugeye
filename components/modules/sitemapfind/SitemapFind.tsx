import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTarget } from '@/components/shell/TargetProvider';
import { useHostPermission } from '@/lib/useHostPermission';
import { sendToBackground } from '@/lib/messaging';
import { parseRobots } from '@/lib/robots';
import { parseSitemap } from '@/lib/sitemap';
import { mapLimit } from '@/lib/concurrency';
import { bulkListStore } from '@/lib/storage';
import { exportJson, exportText } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

const MAX_NESTED = 20;

export function SitemapFind({ onBack, onNavigate }: ModuleComponentProps) {
  const { target } = useTarget();
  const [loading, setLoading] = useState(false);
  const [urls, setUrls] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const { ensure, pending } = useHostPermission();

  async function scan() {
    if (!target) return;
    setLoading(true);
    setNote('');
    setUrls([]);
    setSources([]);
    try {
      const granted = await ensure(`https://${target}/*`);
      if (!granted) {
        setNote('Host permission was not granted.');
        return;
      }

      const candidates = new Set<string>([`https://${target}/sitemap.xml`]);
      const robotsRes = await sendToBackground({ type: 'FETCH_TEXT', url: `https://${target}/robots.txt` });
      if (robotsRes.ok && robotsRes.data) {
        for (const s of parseRobots(robotsRes.data).sitemaps) candidates.add(s);
      }

      const allUrls = new Set<string>();
      const fetchedSources: string[] = [];
      let toFetch = Array.from(candidates);
      let depth = 0;

      while (toFetch.length > 0 && depth < 2) {
        const batch = toFetch.slice(0, MAX_NESTED);
        toFetch = [];
        await mapLimit(batch, 5, async (sitemapUrl) => {
          const res = await sendToBackground({ type: 'FETCH_TEXT', url: sitemapUrl });
          if (!res.ok || !res.data) return;
          fetchedSources.push(sitemapUrl);
          const parsed = parseSitemap(res.data);
          for (const u of parsed.urls) allUrls.add(u);
          for (const nested of parsed.nestedSitemaps) toFetch.push(nested);
        });
        depth += 1;
      }

      setUrls(Array.from(allUrls).sort());
      setSources(fetchedSources);
      if (allUrls.size === 0) setNote('No sitemap found or it contained no URLs.');
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
        title="SitemapFind"
        description="Fetches sitemap.xml (and sitemaps referenced from robots.txt), following one level of sitemap-index nesting."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Button size="sm" onClick={scan} disabled={!target || loading || pending} className="w-fit">
          {loading || pending ? <Loader2 className="size-3 animate-spin" /> : null}
          Find sitemaps for {target || '(set a target)'}
        </Button>

        {note && <p className="text-xs text-muted-foreground">{note}</p>}

        {sources.length > 0 && (
          <p className="text-[11px] text-muted-foreground">Parsed {sources.length} sitemap file(s).</p>
        )}

        {urls.length > 0 && (
          <>
            <Card>
              <CardContent className="max-h-72 overflow-y-auto p-0">
                {urls.map((u) => (
                  <p key={u} className="truncate border-b border-border p-1.5 text-xs last:border-0">
                    {u}
                  </p>
                ))}
              </CardContent>
            </Card>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={sendToBulkOpen}>
                <Send className="size-3" /> Send to BulkOpen
              </Button>
              <CopyButton text={urls.join('\n')} label="Copy list" />
              <Button size="sm" variant="outline" onClick={() => exportJson('sitemapfind', urls)}>
                Export JSON
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportText('sitemapfind', urls.join('\n'))}>
                Export list
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default SitemapFind;
