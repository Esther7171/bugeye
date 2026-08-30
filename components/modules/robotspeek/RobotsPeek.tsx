import { useState } from 'react';
import { Loader2, Send, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { ModuleNote } from '@/components/shell/ModuleNote';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTarget } from '@/components/shell/TargetProvider';
import { useHostPermission } from '@/lib/useHostPermission';
import { sendToBackground } from '@/lib/messaging';
import { parseRobots } from '@/lib/robots';
import { looksLikeAdminPath } from '@/lib/panelhunt';
import { mapLimit } from '@/lib/concurrency';
import { bulkListStore } from '@/lib/storage';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

const INTERESTING_STATUSES = new Set([200, 301, 302, 401, 403]);
const MAX_PROBED = 60;

interface DisallowResult {
  path: string;
  status: number | null;
  interesting: boolean;
  looksAdmin: boolean;
}

export function RobotsPeek({ onBack, onNavigate }: ModuleComponentProps) {
  const { target } = useTarget();
  const [loading, setLoading] = useState(false);
  const [probing, setProbing] = useState(false);
  const [sitemaps, setSitemaps] = useState<string[]>([]);
  const [rows, setRows] = useState<DisallowResult[]>([]);
  const [note, setNote] = useState('');
  const { ensure, pending } = useHostPermission();

  async function scan() {
    if (!target) return;
    setLoading(true);
    setNote('');
    setRows([]);
    setSitemaps([]);
    try {
      const granted = await ensure(`https://${target}/*`);
      if (!granted) {
        setNote('Host permission was not granted.');
        return;
      }
      const res = await sendToBackground({ type: 'FETCH_TEXT', url: `https://${target}/robots.txt` });
      if (!res.ok || !res.data) {
        setNote(res.error ?? `No robots.txt found (status ${res.status ?? 'unknown'}).`);
        return;
      }
      const parsed = parseRobots(res.data);
      setSitemaps(parsed.sitemaps);
      if (parsed.disallow.length === 0 && parsed.sitemaps.length === 0) {
        setNote('robots.txt found but contains no Disallow or Sitemap lines.');
        return;
      }
      setLoading(false);

      if (parsed.disallow.length > 0) {
        setProbing(true);
        const toProbe = parsed.disallow.slice(0, MAX_PROBED);
        if (parsed.disallow.length > MAX_PROBED) {
          setNote(`Showing the first ${MAX_PROBED} of ${parsed.disallow.length} Disallow paths (alive-checked).`);
        }
        const probed = await mapLimit(toProbe, 6, async (path) => {
          const probeRes = await sendToBackground({ type: 'HEAD_PROBE', url: `https://${target}${path}` });
          return {
            path,
            status: probeRes.status,
            interesting: probeRes.status !== null && INTERESTING_STATUSES.has(probeRes.status),
            looksAdmin: looksLikeAdminPath(path),
          };
        });
        setRows(probed);
        setProbing(false);
      }
    } finally {
      setLoading(false);
      setProbing(false);
    }
  }

  function sendPathsToBulkOpen() {
    const urls = rows.filter((r) => r.interesting).map((r) => `https://${target}${r.path}`);
    if (urls.length === 0) return;
    bulkListStore.set(urls.join('\n'));
    onNavigate('list-triage', 'bulkopen');
  }

  const adminHits = rows.filter((r) => r.looksAdmin && r.interesting);

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="RobotsPeek"
        description="Fetches robots.txt, then alive-checks each Disallow path and flags ones that look like admin panels."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Button size="sm" onClick={scan} disabled={!target || loading || probing || pending} className="w-fit">
          {loading || probing || pending ? <Loader2 className="size-3 animate-spin" /> : null}
          Fetch robots.txt for {target || '(set a target)'}
        </Button>

        {note && <ModuleNote>{note}</ModuleNote>}

        {adminHits.length > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
            <ShieldAlert className="size-3.5 shrink-0" />
            <p>
              {adminHits.length} disclosed path{adminHits.length === 1 ? '' : 's'} look{adminHits.length === 1 ? 's' : ''} like an
              admin/login panel and responded live (e.g. WordPress always Disallows /wp-admin/).
            </p>
          </div>
        )}

        {sitemaps.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium">Sitemaps ({sitemaps.length})</p>
            <Card>
              <CardContent className="max-h-32 overflow-y-auto p-0">
                {sitemaps.map((s) => (
                  <p key={s} className="truncate border-b border-border p-1.5 text-xs last:border-0">
                    {s}
                  </p>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {rows.length > 0 && (
          <>
            <div>
              <p className="mb-1.5 text-xs font-medium">Disallow paths ({rows.length})</p>
              <Card>
                <CardContent className="flex max-h-72 flex-col divide-y divide-border overflow-y-auto p-0">
                  {rows.map((r) => (
                    <div key={r.path} className="flex items-center gap-2 p-1.5">
                      {r.looksAdmin && (
                        <Badge variant={r.interesting ? 'warning' : 'outline'} className="shrink-0 gap-1">
                          <ShieldAlert className="size-2.5" /> admin?
                        </Badge>
                      )}
                      <span className="min-w-0 flex-1 truncate text-xs">{r.path}</span>
                      {probing ? (
                        <Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" />
                      ) : r.interesting ? (
                        <Badge variant="success" className="shrink-0 gap-1">
                          <CheckCircle2 className="size-2.5" /> {r.status}
                        </Badge>
                      ) : (
                        <Badge variant="muted" className="shrink-0">
                          {r.status ?? 'no response'}
                        </Badge>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={sendPathsToBulkOpen} disabled={!rows.some((r) => r.interesting)}>
                <Send className="size-3" /> Send live paths to BulkOpen
              </Button>
              <CopyButton text={rows.map((r) => r.path).join('\n')} label="Copy paths" />
              <Button size="sm" variant="outline" onClick={() => exportJson('robotspeek', { sitemaps, disallow: rows })}>
                Export JSON
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default RobotsPeek;
