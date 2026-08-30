import { useState } from 'react';
import { Loader2, ShieldAlert, ShieldCheck, ShieldQuestion, Download } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTarget } from '@/components/shell/TargetProvider';
import { useHostPermission } from '@/lib/useHostPermission';
import { sendToBackground } from '@/lib/messaging';
import { assessClickjacking, clickjackPoc, type ClickjackResult } from '@/lib/clickjack';
import { downloadText } from '@/lib/utils';
import type { ModuleComponentProps } from '@/types';

const verdictMeta: Record<ClickjackResult['verdict'], { label: string; variant: 'destructive' | 'success' | 'warning'; icon: typeof ShieldAlert }> = {
  framable: { label: 'Framable', variant: 'destructive', icon: ShieldAlert },
  protected: { label: 'Protected', variant: 'success', icon: ShieldCheck },
  partial: { label: 'Partially protected', variant: 'warning', icon: ShieldQuestion },
};

export function ClickjackCheck({ onBack }: ModuleComponentProps) {
  const { target } = useTarget();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClickjackResult | null>(null);
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const { ensure, pending } = useHostPermission();

  async function scan() {
    if (!target) return;
    setLoading(true);
    setNote('');
    setResult(null);
    try {
      const granted = await ensure(`https://${target}/*`);
      if (!granted) {
        setNote('Host permission was not granted.');
        return;
      }
      const testUrl = `https://${target}/`;
      const res = await sendToBackground({ type: 'GET_URL_HEADERS', url: testUrl });
      if (res.error && Object.keys(res.headers).length === 0) {
        setNote(res.error);
        return;
      }
      setUrl(testUrl);
      setResult(assessClickjacking(res.headers));
    } finally {
      setLoading(false);
    }
  }

  const Meta = result ? verdictMeta[result.verdict] : null;

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="ClickjackCheck"
        description="Checks X-Frame-Options and CSP frame-ancestors to see if the page can be framed."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Button size="sm" onClick={scan} disabled={!target || loading || pending} className="w-fit">
          {loading || pending ? <Loader2 className="size-3 animate-spin" /> : null}
          Check {target || '(set a target)'}
        </Button>

        {note && <p className="text-xs text-muted-foreground">{note}</p>}

        {result && Meta && (
          <>
            <Card>
              <CardContent className="flex flex-col gap-2 p-3">
                <Badge variant={Meta.variant} className="w-fit gap-1">
                  <Meta.icon className="size-2.5" /> {Meta.label}
                </Badge>
                <p className="text-xs text-muted-foreground">{result.detail}</p>
              </CardContent>
            </Card>

            {result.verdict !== 'protected' && (
              <Button
                size="sm"
                variant="outline"
                className="w-fit"
                onClick={() => downloadText('clickjack-poc.html', clickjackPoc(url), 'text/html')}
              >
                <Download className="size-3" /> Download PoC HTML
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ClickjackCheck;
