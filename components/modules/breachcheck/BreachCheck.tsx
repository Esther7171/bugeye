import { useEffect, useState } from 'react';
import { Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { sendToBackground, type BreachCheckResult } from '@/lib/messaging';
import { apiKeysStore } from '@/lib/storage';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

export function BreachCheck({ onBack }: ModuleComponentProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BreachCheckResult | null>(null);
  const [hibpKey, setHibpKey] = useState('');

  useEffect(() => {
    apiKeysStore.get().then((keys) => setHibpKey(keys.hibp));
  }, []);

  async function saveKey(value: string) {
    setHibpKey(value);
    const keys = await apiKeysStore.get();
    await apiKeysStore.set({ ...keys, hibp: value });
  }

  async function check() {
    if (!email.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await sendToBackground({ type: 'BREACH_CHECK', email: email.trim(), hibpApiKey: hibpKey.trim() || undefined });
      setResult(res);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="BreachCheck"
        description="Checks an email against known breaches via XposedOrNot (free), or HIBP if you add a key."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
          <ShieldAlert className="size-3.5 shrink-0" />
          <p>Only check emails you own or are explicitly authorized to test.</p>
        </div>

        <div className="flex gap-2">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
          <Button size="sm" onClick={check} disabled={!email.trim() || loading} className="shrink-0">
            {loading ? <Loader2 className="size-3 animate-spin" /> : null}
            Check
          </Button>
        </div>

        {result && (
          <Card>
            <CardContent className="flex flex-col gap-2 p-3">
              {result.ok ? (
                result.breached ? (
                  <Badge variant="destructive" className="w-fit gap-1">
                    <ShieldAlert className="size-2.5" /> found in {result.breaches.length} breach{result.breaches.length === 1 ? '' : 'es'}
                  </Badge>
                ) : (
                  <Badge variant="success" className="w-fit gap-1">
                    <ShieldCheck className="size-2.5" /> no breaches found
                  </Badge>
                )
              ) : (
                <p className="text-xs text-destructive">{result.error ?? 'Lookup failed.'}</p>
              )}
              <p className="text-[11px] text-muted-foreground">Source: {result.source}</p>
              {result.breaches.length > 0 && (
                <div className="flex flex-col divide-y divide-border">
                  {result.breaches.map((b) => (
                    <div key={b.name} className="py-1.5 text-xs">
                      <span className="font-medium">{b.name}</span>
                      {b.domain && <span className="text-muted-foreground"> - {b.domain}</span>}
                      {b.breachDate && <span className="text-muted-foreground"> ({b.breachDate})</span>}
                    </div>
                  ))}
                </div>
              )}
              {result.ok && (
                <Button size="sm" variant="outline" className="w-fit" onClick={() => exportJson('breachcheck', result)}>
                  Export JSON
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <p className="text-xs font-medium">Optional: Have I Been Pwned key</p>
          <p className="text-[11px] text-muted-foreground">
            Stored in plaintext in this browser's local storage only, never sent anywhere but HIBP's
            API, and never logged. If a lookup with this key fails, BugEye falls back to the free
            XposedOrNot source automatically.
          </p>
          <Input value={hibpKey} onChange={(e) => saveKey(e.target.value)} placeholder="HIBP API key" type="password" />
        </div>
      </div>
    </div>
  );
}

export default BreachCheck;
