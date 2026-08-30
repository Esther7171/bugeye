import { useState } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { ModuleNote } from '@/components/shell/ModuleNote';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTarget } from '@/components/shell/TargetProvider';
import { useHostPermission } from '@/lib/useHostPermission';
import { sendToBackground } from '@/lib/messaging';
import { WELL_KNOWN_PATHS } from '@/lib/wellknown';
import { mapLimit } from '@/lib/concurrency';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

interface WellKnownResult {
  path: string;
  label: string;
  found: boolean;
  status: number | null;
}

export function WellKnownScan({ onBack }: ModuleComponentProps) {
  const { target } = useTarget();
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<WellKnownResult[]>([]);
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
      const rows = await mapLimit(WELL_KNOWN_PATHS, 5, async (def) => {
        const res = await sendToBackground({ type: 'HEAD_PROBE', url: `https://${target}${def.path}` });
        return { path: def.path, label: def.label, found: res.ok, status: res.status };
      });
      setResults(rows);
    } finally {
      setScanning(false);
    }
  }

  const foundCount = results.filter((r) => r.found).length;

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="WellKnownScan"
        description="Checks common /.well-known/ paths for security.txt, OpenID config, app links and more."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Button size="sm" onClick={scan} disabled={!target || scanning || pending} className="w-fit">
          {scanning || pending ? <Loader2 className="size-3 animate-spin" /> : null}
          Scan {target || '(set a target)'}
        </Button>

        {note && <ModuleNote tone="error">{note}</ModuleNote>}

        {results.length > 0 && (
          <>
            <p className="text-[11px] text-muted-foreground">
              {foundCount} of {results.length} found.
            </p>
            <Card>
              <CardContent className="flex flex-col divide-y divide-border p-0">
                {results.map((r) => (
                  <div key={r.path} className="flex items-center justify-between gap-2 p-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{r.path}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{r.label}</p>
                    </div>
                    {r.found ? (
                      <Badge variant="success" className="shrink-0 gap-1">
                        <CheckCircle2 className="size-2.5" /> {r.status}
                      </Badge>
                    ) : (
                      <Badge variant="muted" className="shrink-0 gap-1">
                        <XCircle className="size-2.5" /> not found
                      </Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
            <Button size="sm" variant="outline" className="w-fit" onClick={() => exportJson('wellknownscan', results)}>
              Export JSON
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default WellKnownScan;
