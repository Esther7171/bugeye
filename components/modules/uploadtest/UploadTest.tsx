import { useState } from 'react';
import { Loader2, Download, AlertTriangle } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SIZE_TIERS, generateOversizedImage, generateSmallPng, svgXssBlob, SVG_XSS_SAMPLE } from '@/lib/uploadtest';
import { downloadBlob } from '@/lib/utils';
import type { ModuleComponentProps } from '@/types';

export function UploadTest({ onBack }: ModuleComponentProps) {
  const [tierId, setTierId] = useState(SIZE_TIERS[0]!.id);
  const [generating, setGenerating] = useState<string | null>(null);

  async function downloadOversized() {
    const tier = SIZE_TIERS.find((t) => t.id === tierId)!;
    setGenerating('oversized');
    try {
      const blob = await generateOversizedImage(tier.side);
      downloadBlob(`oversized-test-${tier.label.replace(/[^0-9]/g, '')}mb.png`, blob);
    } finally {
      setGenerating(null);
    }
  }

  async function downloadMimeMismatch() {
    setGenerating('mime');
    try {
      const blob = await generateSmallPng();
      downloadBlob('image.txt', blob);
    } finally {
      setGenerating(null);
    }
  }

  async function downloadDoubleExt() {
    setGenerating('double-ext');
    try {
      const blob = await generateSmallPng();
      downloadBlob('photo.php.jpg', blob);
    } finally {
      setGenerating(null);
    }
  }

  function downloadSvgXss() {
    downloadBlob('svg-xss-test.svg', svgXssBlob());
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="UploadTest"
        description="Generates single test files to check upload validation. Never floods, never auto-submits."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
          <AlertTriangle className="size-3.5 shrink-0" />
          <p>
            Every button here downloads exactly ONE file for you to upload manually. Nothing is
            submitted automatically and nothing is sent anywhere but your own disk.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Oversized-but-valid image</CardTitle>
            <CardDescription>
              Tests whether the server enforces a max upload size. The file is a genuinely valid,
              decodable PNG - not corrupted padding.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Select value={tierId} onValueChange={setTierId}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIZE_TIERS.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={downloadOversized} disabled={generating === 'oversized'}>
              {generating === 'oversized' ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}
              Download
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wrong-extension / MIME-mismatch file</CardTitle>
            <CardDescription>
              Real PNG bytes saved as image.txt. A secure server checks the actual file content
              (magic bytes), not just the extension or the Content-Type header the browser sends.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="sm" onClick={downloadMimeMismatch} disabled={generating === 'mime'}>
              {generating === 'mime' ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}
              Download image.txt
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Double-extension filename</CardTitle>
            <CardDescription>
              Harmless image bytes named photo.php.jpg. Tests whether the server (or a
              misconfigured handler) only looks at the last extension, or the first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="sm" onClick={downloadDoubleExt} disabled={generating === 'double-ext'}>
              {generating === 'double-ext' ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}
              Download photo.php.jpg
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SVG with embedded script</CardTitle>
            <CardDescription>
              Standard, non-destructive SVG-XSS test file (a single alert()). Tests whether SVG
              uploads are sanitized before being rendered or served inline.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <pre className="whitespace-pre-wrap break-all rounded bg-muted p-2 text-[11px]">
              {SVG_XSS_SAMPLE}
            </pre>
            <div className="flex gap-2">
              <Button size="sm" onClick={downloadSvgXss}>
                <Download className="size-3" /> Download svg-xss-test.svg
              </Button>
              <CopyButton text={SVG_XSS_SAMPLE} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Polyglot files (note)</CardTitle>
            <CardDescription>
              A polyglot file is simultaneously valid as two formats - e.g. a GIF that is also
              valid JavaScript, or a JPEG that is also a valid ZIP. If an app trusts a file's
              extension/magic-byte check alone and then serves it from the same origin, a
              polyglot can slip past validation and still execute as the second format in the
              right context. There's no single-file generator here since the technique depends on
              the specific target's parser - treat this as a testing concept to keep in mind
              alongside the checks above.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

export default UploadTest;
