import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { ModuleNote } from '@/components/shell/ModuleNote';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { browser } from 'wxt/browser';
import { useTarget } from '@/components/shell/TargetProvider';
import { useHostPermission } from '@/lib/useHostPermission';
import { cookiePermissionPatterns } from '@/lib/cookies';
import { auditJwt, JWT_RE, type JwtFinding } from '@/lib/jwt';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

function FindingList({ findings }: { findings: JwtFinding[] }) {
  if (findings.length === 0) {
    return <p className="text-[11px] text-muted-foreground">No alg:none, missing exp, or weak kid patterns.</p>;
  }
  return (
    <div className="flex flex-col gap-1.5">
      {findings.map((f) => (
        <div key={f.id} className="flex flex-col gap-0.5">
          <Badge
            variant={f.severity === 'fail' ? 'destructive' : f.severity === 'warn' ? 'warning' : 'muted'}
            className="w-fit normal-case"
          >
            {f.title}
          </Badge>
          <p className="text-[11px] text-muted-foreground">{f.detail}</p>
        </div>
      ))}
    </div>
  );
}

export function JwtAudit({ onBack }: ModuleComponentProps) {
  const { target } = useTarget();
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [header, setHeader] = useState<unknown>(null);
  const [payload, setPayload] = useState<unknown>(null);
  const [findings, setFindings] = useState<JwtFinding[] | null>(null);
  const [cookieHits, setCookieHits] = useState<{ name: string; findings: JwtFinding[] }[]>([]);
  const [scanning, setScanning] = useState(false);
  const { ensureMany, pending } = useHostPermission();

  function run(token: string) {
    try {
      const result = auditJwt(token);
      setHeader(result.decoded.header);
      setPayload(result.decoded.payload);
      setFindings(result.findings);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setHeader(null);
      setPayload(null);
      setFindings(null);
    }
  }

  async function scanCookies() {
    if (!target) return;
    setScanning(true);
    setCookieHits([]);
    try {
      const granted = await ensureMany(cookiePermissionPatterns(target));
      if (!granted) {
        setError('Host permission was not granted.');
        return;
      }
      const list = await browser.cookies.getAll({ domain: target });
      const hits: { name: string; findings: JwtFinding[] }[] = [];
      for (const c of list) {
        const m = c.value.match(JWT_RE);
        if (!m) continue;
        try {
          hits.push({ name: c.name, findings: auditJwt(m[0]!).findings });
        } catch {
          // ignore non-JWT eyJ noise
        }
      }
      setCookieHits(hits);
      if (hits.length === 0) setError('No JWT-shaped cookie values on this domain.');
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="JwtAudit"
        description="Inspects a JWT for alg:none, missing/expired exp, weak kid, and jku/x5u/jwk in the header. Decode-only, nothing is sent."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste a JWT..."
          className="min-h-20"
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => run(input)} disabled={!input.trim()}>
            Audit
          </Button>
          <Button size="sm" variant="outline" onClick={scanCookies} disabled={!target || scanning || pending}>
            {scanning || pending ? <Loader2 className="size-3 animate-spin" /> : null}
            Scan cookies on {target || 'target'}
          </Button>
        </div>
        {error && <ModuleNote tone="error">{error}</ModuleNote>}

        {findings && (
          <>
            <FindingList findings={findings} />
            <Card>
              <CardContent className="p-3">
                <p className="mb-1 text-[10px] uppercase text-muted-foreground">Header</p>
                <pre className="whitespace-pre-wrap break-all text-xs">{JSON.stringify(header, null, 2)}</pre>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="mb-1 text-[10px] uppercase text-muted-foreground">Payload</p>
                <pre className="whitespace-pre-wrap break-all text-xs">{JSON.stringify(payload, null, 2)}</pre>
              </CardContent>
            </Card>
            <Button
              size="sm"
              variant="outline"
              className="w-fit"
              onClick={() => exportJson('jwtaudit', { header, payload, findings })}
            >
              Export JSON
            </Button>
          </>
        )}

        {cookieHits.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium">JWTs in cookies</p>
            {cookieHits.map((h) => (
              <Card key={h.name}>
                <CardContent className="flex flex-col gap-2 p-3">
                  <p className="text-xs font-medium">{h.name}</p>
                  <FindingList findings={h.findings} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default JwtAudit;
