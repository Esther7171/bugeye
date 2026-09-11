import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { ModuleNote } from '@/components/shell/ModuleNote';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTarget } from '@/components/shell/TargetProvider';
import { useHostPermission } from '@/lib/useHostPermission';
import { fetchWaybackUrls } from '@/lib/wayback';
import { mineParams, type MinedParams } from '@/lib/paramminer';
import { bulkListStore } from '@/lib/storage';
import { exportJson, exportText } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

export function ParamMiner({ onBack, onNavigate }: ModuleComponentProps) {
  const { target } = useTarget();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MinedParams | null>(null);
  const [note, setNote] = useState('');
  const { ensure, pending } = useHostPermission();

  async function scan() {
    if (!target) return;
    setLoading(true);
    setNote('');
    setResult(null);
    try {
      const granted = await ensure('https://web.archive.org/*');
      if (!granted) {
        setNote('Host permission was not granted.');
        return;
      }
      const { urls, error } = await fetchWaybackUrls(target);
      if (urls.length === 0) {
        setNote(error ?? 'No archived URLs found for this domain.');
        return;
      }
      const mined = mineParams(urls);
      setResult(mined);
      if (mined.paramNames.length === 0) {
        setNote(`Scanned ${mined.totalUrls} archived URLs; none carried query parameters.`);
      }
    } finally {
      setLoading(false);
    }
  }

  function sendTemplatesToBulkOpen() {
    if (!result) return;
    bulkListStore.set(result.fuzzTemplates.join('\n'));
    onNavigate('list-triage', 'bulkopen');
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="ParamMiner"
        description="Mines historical query parameters for a domain from the Wayback Machine - hidden input surface for fuzzing."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <ModuleNote>
          Pulls archived URLs for the target and extracts every query parameter ever seen. Parameter
          names are untested input surface, often on endpoints no longer linked from the live site.
        </ModuleNote>

        <Button size="sm" onClick={scan} disabled={!target || loading || pending} className="w-fit">
          {loading || pending ? <Loader2 className="size-3 animate-spin" /> : null}
          Mine params for {target || '(set a target)'}
        </Button>

        {note && <ModuleNote tone="error">{note}</ModuleNote>}

        {result && result.paramNames.length > 0 && (
          <>
            <p className="text-[11px] text-muted-foreground">
              {result.paramNames.length} unique parameters across {result.urlsWithParams.length} parameterized URLs
              ({result.totalUrls} archived URLs scanned).
            </p>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-xs font-medium">Parameter names</p>
                <CopyButton text={result.paramNames.join('\n')} label="Copy names" />
              </div>
              <Card>
                <CardContent className="flex max-h-40 flex-wrap gap-1 overflow-y-auto p-2">
                  {result.paramNames.map((p) => (
                    <Badge key={p} variant="outline" className="normal-case font-mono">
                      {p}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-xs font-medium">Fuzz templates ({result.fuzzTemplates.length})</p>
                <CopyButton text={result.fuzzTemplates.join('\n')} label="Copy" />
              </div>
              <Card>
                <CardContent className="max-h-48 overflow-y-auto p-0">
                  {result.fuzzTemplates.slice(0, 300).map((u) => (
                    <p key={u} className="truncate border-b border-border p-1.5 font-mono text-[11px] last:border-0" title={u}>
                      {u}
                    </p>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={sendTemplatesToBulkOpen}>
                <Send className="size-3" /> Templates to BulkOpen
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportText('paramminer-names', result.paramNames.join('\n'))}>
                Export names
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportJson('paramminer', result)}>
                Export JSON
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ParamMiner;
