import { useState } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { ModuleNote } from '@/components/shell/ModuleNote';
import { SubdomainInput } from '@/components/shell/SubdomainInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTarget } from '@/components/shell/TargetProvider';
import { clusterHosts, type HostClusterResult } from '@/lib/hostcluster';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

const MAX_RESOLVED = 150;

function parseList(raw: string): string[] {
  return Array.from(new Set(raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)));
}

export function HostCluster({ onBack }: ModuleComponentProps) {
  const { target } = useTarget();
  const [raw, setRaw] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HostClusterResult | null>(null);
  const [note, setNote] = useState('');

  async function scan() {
    if (!target) {
      setNote('Set a target domain in the bar above first.');
      return;
    }
    const list = parseList(raw).slice(0, MAX_RESOLVED);
    if (list.length === 0) {
      setNote('Paste at least one subdomain, or pull results from SubFinder.');
      return;
    }
    setNote('');
    setLoading(true);
    setResult(null);
    try {
      setResult(await clusterHosts(target, list));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="HostCluster"
        description="Groups subdomains by shared IP, and flags ones resolving outside the apex domain's apparent range."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <SubdomainInput value={raw} onChange={setRaw} />

        <Button size="sm" onClick={scan} disabled={loading} className="w-fit">
          {loading ? <Loader2 className="size-3 animate-spin" /> : null}
          Cluster by IP
        </Button>

        {note && <ModuleNote>{note}</ModuleNote>}

        {result && (
          <>
            {result.apexIp && <p className="text-[11px] text-muted-foreground">Apex ({target}) resolves to {result.apexIp}.</p>}

            {result.outliers.length > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
                <ShieldAlert className="size-3.5 shrink-0" />
                <p>
                  {result.outliers.length} subdomain{result.outliers.length === 1 ? '' : 's'} resolve outside the
                  apex's /24, a possible sign of third-party hosting or shadow IT. This is a heuristic, not proof.
                </p>
              </div>
            )}

            <div>
              <p className="mb-1.5 text-xs font-medium">Clusters ({result.clusters.length})</p>
              <div className="flex flex-col gap-2">
                {result.clusters.map((c) => (
                  <Card key={c.ip}>
                    <CardContent className="flex flex-col gap-1.5 p-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium">{c.ip}</span>
                        <Badge variant="outline">{c.subdomains.length}</Badge>
                        {result.outliers.some((o) => o.ip === c.ip) && <Badge variant="warning">outside apex range</Badge>}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{c.subdomains.join(', ')}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {result.unresolved.length > 0 && (
              <p className="text-[11px] text-muted-foreground">{result.unresolved.length} did not resolve: {result.unresolved.join(', ')}</p>
            )}

            <Button size="sm" variant="outline" className="w-fit" onClick={() => exportJson('hostcluster', result)}>
              Export JSON
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default HostCluster;
