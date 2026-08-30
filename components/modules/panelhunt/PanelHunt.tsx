import { useState } from 'react';
import { Loader2, ExternalLink, ShieldAlert } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { ModuleNote } from '@/components/shell/ModuleNote';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTarget } from '@/components/shell/TargetProvider';
import { useHostPermission } from '@/lib/useHostPermission';
import { sendToBackground } from '@/lib/messaging';
import { PANEL_PATHS } from '@/lib/panelhunt';
import { parseRobots } from '@/lib/robots';
import { mapLimit } from '@/lib/concurrency';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

interface PanelResult {
  url: string;
  path: string;
  label: string;
  status: number | null;
  interesting: boolean;
}

const INTERESTING_STATUSES = new Set([200, 301, 302, 401, 403]);
const MAX_ROBOTS_PATHS = 40;

export function PanelHunt({ onBack }: ModuleComponentProps) {
  const { target } = useTarget();
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<PanelResult[]>([]);
  const [note, setNote] = useState('');
  const { ensure, pending } = useHostPermission();

  async function scan() {
    if (!target) return;
    setScanning(true);
    setResults([]);
    setNote('');
    try {
      const granted = await ensure(`https://${target}/*`);
      if (!granted) {
        setNote('Host permission was not granted.');
        return;
      }

      const knownPaths = new Set(PANEL_PATHS.map((p) => p.path));
      const combined = [...PANEL_PATHS];

      const robotsRes = await sendToBackground({ type: 'FETCH_TEXT', url: `https://${target}/robots.txt` });
      if (robotsRes.ok && robotsRes.data) {
        const disallow = parseRobots(robotsRes.data).disallow.slice(0, MAX_ROBOTS_PATHS);
        for (const path of disallow) {
          if (!knownPaths.has(path)) {
            knownPaths.add(path);
            combined.push({ path, label: 'From robots.txt' });
          }
        }
      }

      const rows = await mapLimit(combined, 5, async (def) => {
        const url = `https://${target}${def.path}`;
        const res = await sendToBackground({ type: 'HEAD_PROBE', url });
        return {
          url,
          path: def.path,
          label: def.label,
          status: res.status,
          interesting: res.status !== null && INTERESTING_STATUSES.has(res.status),
        };
      });
      setResults(rows);
    } finally {
      setScanning(false);
    }
  }

  async function openInteresting() {
    const urls = results.filter((r) => r.interesting).map((r) => r.url);
    if (urls.length === 0) return;
    await sendToBackground({ type: 'OPEN_TABS', urls, delayMs: 150, newWindow: false, groupTitle: 'PanelHunt' });
  }

  const interesting = results.filter((r) => r.interesting);
  const fromRobots = results.filter((r) => r.label === 'From robots.txt').length;

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="PanelHunt"
        description="Probes a curated list of admin/login/sensitive paths, merged with anything robots.txt discloses."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
          <ShieldAlert className="size-3.5 shrink-0" />
          <p>Authorized targets only. This sends one HEAD request per path: the curated list plus robots.txt Disallow entries.</p>
        </div>

        <Button size="sm" onClick={scan} disabled={!target || scanning || pending} className="w-fit">
          {scanning || pending ? <Loader2 className="size-3 animate-spin" /> : null}
          Probe {target || '(set a target)'}
        </Button>

        {note && <ModuleNote tone="error">{note}</ModuleNote>}

        {results.length > 0 && (
          <>
            <p className="text-[11px] text-muted-foreground">
              {interesting.length} interesting result(s){fromRobots > 0 ? `, ${fromRobots} path(s) from robots.txt` : ''}.
            </p>
            <Card>
              <CardContent className="flex max-h-72 flex-col divide-y divide-border overflow-y-auto p-0">
                {results.map((r) => (
                  <div key={r.path} className="flex items-center justify-between gap-2 p-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{r.path}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{r.label}</p>
                    </div>
                    <Badge variant={r.interesting ? 'warning' : 'muted'} className="shrink-0">
                      {r.status ?? 'error'}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={openInteresting} disabled={interesting.length === 0}>
                <ExternalLink className="size-3" /> Open interesting ({interesting.length})
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportJson('panelhunt', results)}>
                Export JSON
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PanelHunt;
