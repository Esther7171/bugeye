import { useRef, useState, type DragEvent } from 'react';
import { Upload, MapPin, ExternalLink } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { parseExif, exifToMarkdown, safeStringify, type ExifSummary } from '@/lib/exif';
import { exportMarkdown } from '@/lib/export';
import { cn } from '@/lib/utils';
import type { ModuleComponentProps } from '@/types';

export function ExifPeek({ onBack }: ModuleComponentProps) {
  const [summary, setSummary] = useState<ExifSummary | null>(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError('');
    setSummary(null);
    try {
      const result = await parseExif(file);
      setSummary(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="ExifPeek"
        description="Parses EXIF metadata entirely in your browser. Nothing is uploaded anywhere."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-8 text-center transition-colors',
            dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
          )}
        >
          <Upload className="size-5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Drop an image here, or click to choose a file</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        {summary && (
          <Card>
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{summary.fileName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {(summary.fileSize / 1024).toFixed(1)} KB
                    {summary.width && summary.height ? ` · ${summary.width}x${summary.height}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <CopyButton text={exifToMarkdown(summary)} label="Copy report" />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportMarkdown('exifpeek', exifToMarkdown(summary))}
                  >
                    Export
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <Field label="Camera make" value={summary.make} />
                <Field label="Camera model" value={summary.model} />
                <Field label="Software" value={summary.software} />
                <Field label="Date taken" value={summary.dateTimeOriginal} />
                <Field label="Orientation" value={summary.orientation?.toString()} />
              </div>

              {summary.latitude !== undefined && summary.longitude !== undefined ? (
                <a
                  href={`https://maps.google.com/?q=${summary.latitude},${summary.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-fit items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive hover:underline"
                >
                  <MapPin className="size-3.5" /> GPS: {summary.latitude.toFixed(6)}, {summary.longitude.toFixed(6)}
                  <ExternalLink className="size-3" />
                </a>
              ) : (
                <p className="text-xs text-muted-foreground">No GPS data found.</p>
              )}

              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">All raw tags</summary>
                <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-all rounded bg-muted p-2 text-[11px]">
                  {safeStringify(summary.raw)}
                </pre>
              </details>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="truncate">{value}</p>
    </div>
  );
}

export default ExifPeek;
