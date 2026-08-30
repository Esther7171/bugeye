import { useState } from 'react';
import { Loader2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTarget } from '@/components/shell/TargetProvider';
import { useHostPermission } from '@/lib/useHostPermission';
import { sendToBackground } from '@/lib/messaging';
import { auditCsp, type CspAuditReport, type CspCheckState } from '@/lib/cspaudit';
import type { ModuleComponentProps } from '@/types';

const gradeColor: Record<CspAuditReport['grade'], string> = {
  A: 'text-success',
  B: 'text-success',
  C: 'text-warning',
  D: 'text-warning',
  F: 'text-destructive',
};

function StateIcon({ state }: { state: CspCheckState }) {
  if (state === 'pass') return <CheckCircle2 className="size-3.5 text-success" />;
  if (state === 'warn') return <AlertTriangle className="size-3.5 text-warning" />;
  return <XCircle className="size-3.5 text-destructive" />;
}

export function CSPAudit({ onBack }: ModuleComponentProps) {
  const { target } = useTarget();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<CspAuditReport | null>(null);
  const [rawCsp, setRawCsp] = useState('');
  const [note, setNote] = useState('');
  const { ensure, pending } = useHostPermission();

  async function scan() {
    if (!target) return;
    setLoading(true);
    setNote('');
    setReport(null);
    try {
      const granted = await ensure(`https://${target}/*`);
      if (!granted) {
        setNote('Host permission was not granted.');
        return;
      }
      const res = await sendToBackground({ type: 'GET_URL_HEADERS', url: `https://${target}/` });
      const csp = Object.entries(res.headers).find(([k]) => k.toLowerCase() === 'content-security-policy')?.[1];
      setRawCsp(csp ?? '');
      setReport(auditCsp(csp));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="CSPAudit"
        description="Parses Content-Security-Policy and flags weak directives (unsafe-inline, unsafe-eval, wildcards)."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Button size="sm" onClick={scan} disabled={!target || loading || pending} className="w-fit">
          {loading || pending ? <Loader2 className="size-3 animate-spin" /> : null}
          Audit {target || '(set a target)'}
        </Button>

        {note && <p className="text-xs text-muted-foreground">{note}</p>}

        {report && (
          <>
            <Card>
              <CardContent className="flex flex-col gap-2 p-3">
                <p className={`text-2xl font-bold ${gradeColor[report.grade]}`}>
                  {report.grade}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">{report.score}/100</span>
                </p>
                {rawCsp && <p className="break-all text-[11px] text-muted-foreground">{rawCsp}</p>}
              </CardContent>
            </Card>

            <div className="flex flex-col divide-y divide-border rounded-md border border-border">
              {report.findings.map((f, i) => (
                <div key={`${f.directive}-${i}`} className="flex items-start gap-2 p-2">
                  <StateIcon state={f.state} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{f.directive}</span>
                      <Badge variant={f.state === 'pass' ? 'success' : f.state === 'warn' ? 'warning' : 'destructive'}>
                        {f.state}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{f.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {rawCsp && <CopyButton text={rawCsp} label="Copy raw CSP" className="w-fit" />}
          </>
        )}
      </div>
    </div>
  );
}

export default CSPAudit;
