import { useState } from 'react';
import { Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { ModuleNote } from '@/components/shell/ModuleNote';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTarget } from '@/components/shell/TargetProvider';
import { useHostPermission } from '@/lib/useHostPermission';
import { sendToBackground } from '@/lib/messaging';
import { API_SPEC_PATHS, classifySpecBody, type SpecKind } from '@/lib/apispec';
import { mapLimit } from '@/lib/concurrency';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

interface SpecHit {
  path: string;
  label: string;
  url: string;
  status: number | null;
  kind: SpecKind | null;
  found: boolean;
}

export function ApiSpec({ onBack }: ModuleComponentProps) {
  const { target } = useTarget();
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<SpecHit[]>([]);
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
      const rows = await mapLimit(API_SPEC_PATHS, 5, async (def) => {
        const url = `https://${target}${def.path}`;
        const res = await sendToBackground({ type: 'HTTP_PROBE', url });
        const kind = res.body ? classifySpecBody(res.body) : null;
        return {
          path: def.path,
          label: def.label,
          url,
          status: res.status,
          kind,
          found: kind !== null,
        };
      });
      setResults(rows);
    } finally {
      setScanning(false);
    }
  }

  const hits = results.filter((r) => r.found);

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="ApiSpec"
        description="Looks for exposed OpenAPI/Swagger JSON/YAML, Swagger UI, and Postman collections. Confirms by reading the body, not HEAD alone."
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
              {hits.length} spec{hits.length === 1 ? '' : 's'} confirmed by body content.
            </p>
            <Card>
              <CardContent className="flex flex-col divide-y divide-border p-0">
                {results
                  .filter((r) => r.found)
                  .map((r) => (
                    <div key={r.path} className="flex items-center justify-between gap-2 p-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{r.path}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{r.label}</p>
                      </div>
                      <Badge variant={r.kind && r.kind !== 'unknown' ? 'success' : 'warning'} className="shrink-0 gap-1">
                        <CheckCircle2 className="size-2.5" /> {r.kind ?? r.status}
                      </Badge>
                      <a href={r.url} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="ghost" className="size-7 p-0">
                          <ExternalLink className="size-3.5" />
                        </Button>
                      </a>
                    </div>
                  ))}
                {results.every((r) => !r.found) && (
                  <div className="flex items-center gap-2 p-2 text-[11px] text-muted-foreground">
                    <XCircle className="size-3" /> None of the common spec paths responded with a document.
                  </div>
                )}
              </CardContent>
            </Card>
            <Button size="sm" variant="outline" className="w-fit" onClick={() => exportJson('apispec', results)}>
              Export JSON
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default ApiSpec;
