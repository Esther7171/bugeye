import { useState } from 'react';
import { X, Plus, ArrowDown, ExternalLink } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  base64Encode,
  base64Decode,
  urlEncode,
  urlDecode,
  htmlEncode,
  htmlDecode,
  hexEncode,
  hexDecode,
} from '@/lib/encode';

// CyberChef reads its input from a `?input=` query param, standard (not
// URL-safe) base64 of the raw text - no recipe is passed, so it opens with
// this text pre-loaded in the input pane and lets the user pick their own
// operations.
function cyberChefUrl(input: string): string {
  const b64 = input ? base64Encode(input) : '';
  return `https://gchq.github.io/CyberChef/${b64 ? `?input=${encodeURIComponent(b64)}` : ''}`;
}
import { auditJwt, type JwtFinding } from '@/lib/jwt';
import { hashAll } from '@/lib/hash';
import type { ModuleComponentProps } from '@/types';

interface SharedInputProps {
  input: string;
  onInputChange: (value: string) => void;
}

function ClearButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="sm" variant="ghost" onClick={onClick}>
      <X className="size-3" /> Clear
    </Button>
  );
}

function CodecPanel({
  input,
  onInputChange,
  encode,
  decode,
}: SharedInputProps & {
  encode: (s: string) => string;
  decode: (s: string) => string;
}) {
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const run = (fn: (s: string) => string) => {
    try {
      setOutput(fn(input));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setOutput('');
    }
  };

  const clear = () => {
    onInputChange('');
    setOutput('');
    setError('');
  };

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        placeholder="Enter text..."
        className="min-h-20"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => run(encode)}>
          Encode
        </Button>
        <Button size="sm" variant="secondary" onClick={() => run(decode)}>
          Decode
        </Button>
        <ClearButton onClick={clear} />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {output && (
        <Card>
          <CardContent className="flex flex-col gap-2 p-3">
            <pre className="whitespace-pre-wrap break-all text-xs">{output}</pre>
            <CopyButton text={output} className="w-fit" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function JwtPanel({ input, onInputChange }: SharedInputProps) {
  const [result, setResult] = useState<{ header: unknown; payload: unknown; findings: JwtFinding[] } | null>(null);
  const [error, setError] = useState('');

  const decode = () => {
    try {
      const audited = auditJwt(input);
      setResult({ header: audited.decoded.header, payload: audited.decoded.payload, findings: audited.findings });
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setResult(null);
    }
  };

  const clear = () => {
    onInputChange('');
    setResult(null);
    setError('');
  };

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        placeholder="Paste a JWT..."
        className="min-h-20"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={decode}>
          Decode
        </Button>
        <ClearButton onClick={clear} />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {result && (
        <div className="flex flex-col gap-2">
          {result.findings.length > 0 && (
            <div className="flex flex-col gap-1">
              {result.findings.map((f) => (
                <Badge
                  key={f.id}
                  variant={f.severity === 'fail' ? 'destructive' : f.severity === 'warn' ? 'warning' : 'muted'}
                  className="w-fit normal-case"
                >
                  {f.title}: {f.detail}
                </Badge>
              ))}
            </div>
          )}
          <Card>
            <CardContent className="p-3">
              <p className="mb-1 text-[10px] uppercase text-muted-foreground">Header</p>
              <pre className="whitespace-pre-wrap break-all text-xs">
                {JSON.stringify(result.header, null, 2)}
              </pre>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="mb-1 text-[10px] uppercase text-muted-foreground">Payload</p>
              <pre className="whitespace-pre-wrap break-all text-xs">
                {JSON.stringify(result.payload, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function HashPanel({ input, onInputChange }: SharedInputProps) {
  const [hashes, setHashes] = useState<Record<string, string> | null>(null);

  const run = async () => {
    setHashes(await hashAll(input));
  };

  const clear = () => {
    onInputChange('');
    setHashes(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        placeholder="Enter text to hash..."
        className="min-h-20"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={run}>
          Hash
        </Button>
        <ClearButton onClick={clear} />
      </div>
      {hashes && (
        <Card>
          <CardContent className="flex flex-col gap-2 p-3">
            {Object.entries(hashes).map(([algo, value]) => (
              <div key={algo} className="flex items-center gap-2">
                <Badge variant="outline" className="shrink-0 normal-case">
                  {algo}
                </Badge>
                <code className="flex-1 truncate text-[11px]">{value}</code>
                <CopyButton text={value} label="" className="size-6 shrink-0 p-0" />
                <a
                  href="https://crackstation.net/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex shrink-0 items-center gap-1 text-[10px] text-primary hover:underline"
                  title="Copy the hash above, then paste it into CrackStation's lookup form"
                >
                  <ExternalLink className="size-2.5" /> CrackStation
                </a>
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground">
              CrackStation looks up a hash against known plaintexts, it does not accept the hash via URL, so copy it
              and paste it into their form.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

type ChainEncoder = 'base64' | 'url' | 'html' | 'hex';
type ChainDirection = 'encode' | 'decode';

interface ChainStep {
  id: string;
  encoder: ChainEncoder;
  direction: ChainDirection;
}

const CHAIN_FNS: Record<ChainEncoder, { encode: (s: string) => string; decode: (s: string) => string }> = {
  base64: { encode: base64Encode, decode: base64Decode },
  url: { encode: urlEncode, decode: urlDecode },
  html: { encode: htmlEncode, decode: htmlDecode },
  hex: { encode: hexEncode, decode: hexDecode },
};

const CHAIN_LABELS: Record<ChainEncoder, string> = {
  base64: 'Base64',
  url: 'URL',
  html: 'HTML',
  hex: 'Hex',
};

function ChainPanel({ input, onInputChange }: SharedInputProps) {
  const [steps, setSteps] = useState<ChainStep[]>([
    { id: crypto.randomUUID(), encoder: 'base64', direction: 'encode' },
  ]);
  const [trace, setTrace] = useState<Array<{ step: ChainStep; output: string }> | null>(null);
  const [error, setError] = useState('');

  const addStep = () => {
    setSteps((prev) => [...prev, { id: crypto.randomUUID(), encoder: 'url', direction: 'encode' }]);
  };

  const removeStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const updateStep = (id: string, patch: Partial<ChainStep>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const run = () => {
    try {
      let value = input;
      const nextTrace: Array<{ step: ChainStep; output: string }> = [];
      for (const step of steps) {
        value = CHAIN_FNS[step.encoder][step.direction](value);
        nextTrace.push({ step, output: value });
      }
      setTrace(nextTrace);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setTrace(null);
    }
  };

  const clear = () => {
    onInputChange('');
    setTrace(null);
    setError('');
  };

  const finalOutput = trace?.at(-1)?.output ?? '';

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        placeholder="Enter text to run through the chain..."
        className="min-h-20"
      />

      <div className="flex flex-col gap-1.5">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center gap-1.5">
            <span className="w-4 shrink-0 text-[10px] text-muted-foreground">{i + 1}</span>
            <Select
              value={step.encoder}
              onValueChange={(v) => updateStep(step.id, { encoder: v as ChainEncoder })}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CHAIN_LABELS) as ChainEncoder[]).map((e) => (
                  <SelectItem key={e} value={e}>
                    {CHAIN_LABELS[e]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={step.direction}
              onValueChange={(v) => updateStep(step.id, { direction: v as ChainDirection })}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="encode">Encode</SelectItem>
                <SelectItem value="decode">Decode</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              onClick={() => removeStep(step.id)}
              disabled={steps.length === 1}
            >
              <X className="size-3" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={addStep}>
          <Plus className="size-3" /> Add step
        </Button>
        <Button size="sm" onClick={run}>
          Run chain
        </Button>
        <ClearButton onClick={clear} />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {trace && (
        <Card>
          <CardContent className="flex flex-col gap-2 p-3">
            {trace.map((t, i) => (
              <div key={t.step.id} className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  {i > 0 && <ArrowDown className="size-2.5" />}
                  <Badge variant="outline" className="normal-case">
                    {CHAIN_LABELS[t.step.encoder]} {t.step.direction}
                  </Badge>
                </div>
                <pre className="whitespace-pre-wrap break-all rounded bg-muted p-2 text-[11px]">
                  {t.output}
                </pre>
              </div>
            ))}
            <CopyButton text={finalOutput} label="Copy final output" className="w-fit" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function EncoderKit({ onBack }: ModuleComponentProps) {
  const [input, setInput] = useState('');

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="EncoderKit"
        description="Instant client-side encode / decode / hash. No permissions needed."
        onBack={onBack}
      />
      <div className="p-3">
        <a
          href={cyberChefUrl(input)}
          target="_blank"
          rel="noreferrer"
          className="mb-2 flex w-fit items-center gap-1 text-[11px] text-primary hover:underline"
        >
          <ExternalLink className="size-3" /> Open current input in CyberChef
        </a>
        <Tabs defaultValue="base64">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="base64">Base64</TabsTrigger>
            <TabsTrigger value="url">URL</TabsTrigger>
            <TabsTrigger value="html">HTML</TabsTrigger>
            <TabsTrigger value="hex">Hex</TabsTrigger>
            <TabsTrigger value="jwt">JWT</TabsTrigger>
            <TabsTrigger value="hash">Hash</TabsTrigger>
            <TabsTrigger value="chain">Chain</TabsTrigger>
          </TabsList>
          <TabsContent value="base64">
            <CodecPanel input={input} onInputChange={setInput} encode={base64Encode} decode={base64Decode} />
          </TabsContent>
          <TabsContent value="url">
            <CodecPanel input={input} onInputChange={setInput} encode={urlEncode} decode={urlDecode} />
          </TabsContent>
          <TabsContent value="html">
            <CodecPanel input={input} onInputChange={setInput} encode={htmlEncode} decode={htmlDecode} />
          </TabsContent>
          <TabsContent value="hex">
            <CodecPanel input={input} onInputChange={setInput} encode={hexEncode} decode={hexDecode} />
          </TabsContent>
          <TabsContent value="jwt">
            <JwtPanel input={input} onInputChange={setInput} />
          </TabsContent>
          <TabsContent value="hash">
            <HashPanel input={input} onInputChange={setInput} />
          </TabsContent>
          <TabsContent value="chain">
            <ChainPanel input={input} onInputChange={setInput} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default EncoderKit;
