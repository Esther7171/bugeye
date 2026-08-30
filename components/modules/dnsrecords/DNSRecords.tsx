import { useState } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTarget } from '@/components/shell/TargetProvider';
import { fetchAllDnsRecords, type DnsRecordSet, type DnsType } from '@/lib/dnsrecords';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

const TYPE_LABELS: DnsType[] = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'SOA', 'CAA', 'TXT'];

function RecordGroup({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-medium">{label}</p>
        <CopyButton text={values.join('\n')} label="" className="size-6 p-0" />
      </div>
      <Card>
        <CardContent className="flex flex-col divide-y divide-border p-0">
          {values.map((v, i) => (
            <p key={i} className="break-all p-1.5 text-[11px]">
              {v}
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function DNSRecords({ onBack }: ModuleComponentProps) {
  const { target } = useTarget();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DnsRecordSet | null>(null);

  async function scan() {
    if (!target) return;
    setLoading(true);
    setData(null);
    try {
      const result = await fetchAllDnsRecords(target);
      setData(result);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="DNSRecords"
        description="Full DNS record lookup via DoH: A, AAAA, CNAME, MX, NS, TXT, SOA, CAA, plus SPF/DMARC/DKIM and reverse PTR."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Button size="sm" onClick={scan} disabled={!target || loading} className="w-fit">
          {loading ? <Loader2 className="size-3 animate-spin" /> : null}
          Look up {target || '(set a target)'}
        </Button>

        {data && (
          <>
            {TYPE_LABELS.map((t) => (
              <RecordGroup key={t} label={t} values={data.records[t]} />
            ))}

            <div>
              <p className="mb-1 text-xs font-medium">Email authentication</p>
              <Card>
                <CardContent className="flex flex-col gap-2 p-3 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span>SPF</span>
                    {data.spf ? <CheckCircle2 className="size-3.5 text-success" /> : <XCircle className="size-3.5 text-destructive" />}
                  </div>
                  {data.spf && <p className="break-all text-muted-foreground">{data.spf}</p>}
                  <div className="flex items-center justify-between">
                    <span>DMARC</span>
                    {data.dmarc ? <CheckCircle2 className="size-3.5 text-success" /> : <XCircle className="size-3.5 text-destructive" />}
                  </div>
                  {data.dmarc && <p className="break-all text-muted-foreground">{data.dmarc}</p>}
                  <div className="flex items-center justify-between">
                    <span>DKIM ({data.dkim.length} selector{data.dkim.length === 1 ? '' : 's'} found)</span>
                  </div>
                  {data.dkim.map((d) => (
                    <p key={d.selector} className="break-all text-muted-foreground">
                      <Badge variant="outline" className="mr-1.5 normal-case">
                        {d.selector}
                      </Badge>
                      {d.value}
                    </p>
                  ))}
                  {data.dkim.length === 0 && (
                    <p className="text-muted-foreground">No DKIM record found at common selectors (best-effort guess only).</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {data.ptr && data.ptr.length > 0 && <RecordGroup label="PTR (reverse DNS)" values={data.ptr} />}

            <Button size="sm" variant="outline" className="w-fit" onClick={() => exportJson('dnsrecords', data)}>
              Export JSON
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default DNSRecords;
