import { useState } from 'react';
import { Loader2, ShieldAlert, Zap } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { ModuleNote } from '@/components/shell/ModuleNote';
import { SubdomainInput } from '@/components/shell/SubdomainInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTarget } from '@/components/shell/TargetProvider';
import { useHostPermission } from '@/lib/useHostPermission';
import { sendToBackground } from '@/lib/messaging';
import { matchProvider, type TakeoverResult } from '@/lib/takeover';
import { mapLimit } from '@/lib/concurrency';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

const MAX_CHECKED = 100;

function parseList(raw: string): string[] {
  return Array.from(new Set(raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)));
}

async function checkOne(subdomain: string, canFetchBody: boolean): Promise<TakeoverResult> {
  try {
    const cnameRes = await sendToBackground({ type: 'DOH_QUERY', hostname: subdomain, recordType: 'CNAME' });
    if (!cnameRes.ok) {
      return { subdomain, cname: null, provider: null, verdict: 'error', detail: cnameRes.error ?? 'DNS query failed.' };
    }
    const cname = cnameRes.answers[0]?.data.replace(/\.$/, '') ?? null;
    if (!cname) {
      return { subdomain, cname: null, provider: null, verdict: 'none', detail: 'No CNAME record.' };
    }
    const provider = matchProvider(cname);
    if (!provider) {
      return { subdomain, cname, provider: null, verdict: 'none', detail: 'CNAME does not match a known takeover-prone provider.' };
    }
    if (!canFetchBody) {
      return { subdomain, cname, provider: provider.name, verdict: 'medium', detail: 'CNAME matches a known provider. Body not verified (no host permission).' };
    }
    const bodyRes = await sendToBackground({ type: 'FETCH_TEXT', url: `https://${subdomain}/` });
    if (bodyRes.ok && bodyRes.data) {
      const matched = provider.bodySignatures.some((sig) => bodyRes.data!.includes(sig));
      if (matched) {
        return { subdomain, cname, provider: provider.name, verdict: 'high', detail: 'CNAME and page body both match the provider\'s unclaimed signature.' };
      }
      return { subdomain, cname, provider: provider.name, verdict: 'medium', detail: "CNAME matches, but the page body didn't match the known unclaimed signature (may still be claimed, or the signature is stale)." };
    }
    return { subdomain, cname, provider: provider.name, verdict: 'medium', detail: `CNAME matches. Could not fetch the page to confirm (${bodyRes.error ?? 'fetch failed'}).` };
  } catch (err) {
    return { subdomain, cname: null, provider: null, verdict: 'error', detail: err instanceof Error ? err.message : String(err) };
  }
}

const verdictMeta: Record<TakeoverResult['verdict'], { label: string; variant: 'destructive' | 'warning' | 'muted' | 'outline' }> = {
  high: { label: 'HIGH', variant: 'destructive' },
  medium: { label: 'MEDIUM', variant: 'warning' },
  none: { label: 'clear', variant: 'outline' },
  error: { label: 'error', variant: 'muted' },
};

export function TakeoverCheck({ onBack }: ModuleComponentProps) {
  const { target } = useTarget();
  const [raw, setRaw] = useState('');
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<TakeoverResult[]>([]);
  const [note, setNote] = useState('');
  const { ensureMany, pending } = useHostPermission();

  async function scan() {
    const list = parseList(raw).slice(0, MAX_CHECKED);
    if (list.length === 0) {
      setNote('Paste at least one subdomain, or pull results from SubFinder.');
      return;
    }
    setNote('');
    setResults([]);
    setScanning(true);
    setProgress({ done: 0, total: list.length });
    try {
      let canFetchBody = false;
      if (target) {
        canFetchBody = await ensureMany([`https://${target}/*`, `https://*.${target}/*`]);
      }
      let done = 0;
      const rows = await mapLimit(
        list,
        6,
        (subdomain) => checkOne(subdomain, canFetchBody),
        () => setProgress({ done: ++done, total: list.length }),
      );
      const order: Record<TakeoverResult['verdict'], number> = { high: 0, medium: 1, error: 2, none: 3 };
      rows.sort((a, b) => order[a.verdict] - order[b.verdict]);
      setResults(rows);
      if (!canFetchBody) {
        setNote('No host permission granted, so results are capped at MEDIUM (CNAME match only, page body not verified).');
      }
    } finally {
      setScanning(false);
    }
  }

  const flagged = results.filter((r) => r.verdict === 'high' || r.verdict === 'medium');

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="TakeoverCheck"
        description="Subdomain takeover detection: CNAME fingerprint plus best-effort page-body confirmation."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
          <ShieldAlert className="size-3.5 shrink-0" />
          <p>Authorized targets only. A HIGH verdict is a real, actionable finding, not a guess. Verify manually before reporting.</p>
        </div>

        <SubdomainInput value={raw} onChange={setRaw} />

        <Button size="sm" onClick={scan} disabled={scanning || pending} className="w-fit">
          {scanning || pending ? <Loader2 className="size-3 animate-spin" /> : <Zap className="size-3" />}
          {scanning ? `Checking ${progress.done}/${progress.total}...` : 'Check for takeovers'}
        </Button>

        {note && <ModuleNote>{note}</ModuleNote>}

        {results.length > 0 && (
          <>
            <p className="text-[11px] text-muted-foreground">
              {flagged.length} of {results.length} flagged (HIGH or MEDIUM).
            </p>
            <Card>
              <CardContent className="flex max-h-96 flex-col divide-y divide-border overflow-y-auto p-0">
                {results.map((r) => {
                  const meta = verdictMeta[r.verdict];
                  return (
                    <div key={r.subdomain} className="flex flex-col gap-1 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 flex-1 truncate text-xs font-medium">{r.subdomain}</span>
                        <Badge variant={meta.variant} className="shrink-0">
                          {meta.label}
                        </Badge>
                      </div>
                      {r.cname && (
                        <p className="truncate text-[11px] text-muted-foreground">
                          CNAME: {r.cname}
                          {r.provider ? ` (${r.provider})` : ''}
                        </p>
                      )}
                      {(r.verdict === 'high' || r.verdict === 'medium') && (
                        <p className="text-[11px] text-muted-foreground">{r.detail}</p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <Button size="sm" variant="outline" className="w-fit" onClick={() => exportJson('takeovercheck', results)}>
              Export JSON
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default TakeoverCheck;
