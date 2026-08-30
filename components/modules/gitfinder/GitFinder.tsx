import { useState } from 'react';
import { Loader2, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { ModuleNote } from '@/components/shell/ModuleNote';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTarget } from '@/components/shell/TargetProvider';
import { useHostPermission } from '@/lib/useHostPermission';
import { sendToBackground } from '@/lib/messaging';
import { GITFINDER_CHECKS } from '@/lib/gitfinder';
import { mapLimit } from '@/lib/concurrency';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

interface GitFinderResult {
  id: string;
  label: string;
  path: string;
  exposed: boolean;
  dumpCommand: string;
}

export function GitFinder({ onBack }: ModuleComponentProps) {
  const { target } = useTarget();
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<GitFinderResult[]>([]);
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
      const rows = await mapLimit(GITFINDER_CHECKS, 4, async (check) => {
        const res = await sendToBackground({ type: 'FETCH_TEXT', url: `https://${target}${check.path}` });
        const exposed = res.ok && !!res.data && check.validate(res.data);
        return { id: check.id, label: check.label, path: check.path, exposed, dumpCommand: check.dumpCommand(target) };
      });
      setResults(rows);
    } finally {
      setScanning(false);
    }
  }

  const exposed = results.filter((r) => r.exposed);

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="GitFinder"
        description="Detects exposed .git, .svn and .env by fetching and validating known marker files."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Button size="sm" onClick={scan} disabled={!target || scanning || pending} className="w-fit">
          {scanning || pending ? <Loader2 className="size-3 animate-spin" /> : null}
          Check {target || '(set a target)'}
        </Button>

        {note && <ModuleNote tone="error">{note}</ModuleNote>}

        {results.length > 0 && (
          <>
            <div className="flex flex-col gap-2">
              {results.map((r) => (
                <Card key={r.id}>
                  <CardContent className="flex flex-col gap-1.5 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium">{r.label}</p>
                      {r.exposed ? (
                        <Badge variant="destructive" className="gap-1">
                          <ShieldAlert className="size-2.5" /> exposed
                        </Badge>
                      ) : (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="size-2.5" /> not exposed
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{r.path}</p>
                    {r.exposed && (
                      <div className="flex items-center gap-2">
                        <code className="min-w-0 flex-1 truncate rounded bg-muted p-1.5 text-[11px]">{r.dumpCommand}</code>
                        <CopyButton text={r.dumpCommand} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button size="sm" variant="outline" className="w-fit" onClick={() => exportJson('gitfinder', results)}>
              Export JSON
            </Button>
          </>
        )}

        <p className="text-[11px] text-muted-foreground">
          Detection only. Dumping is a separate CLI step you run yourself against authorized targets.
        </p>

        {exposed.length > 0 && (
          <p className="text-xs font-medium text-destructive">
            {exposed.length} exposure{exposed.length === 1 ? '' : 's'} found.
          </p>
        )}
      </div>
    </div>
  );
}

export default GitFinder;
