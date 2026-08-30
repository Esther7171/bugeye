import { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { exportJson, exportText } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function valueLabel(v: JsonValue): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return `Array(${v.length})`;
  if (typeof v === 'object') return `Object(${Object.keys(v).length})`;
  if (typeof v === 'string') return `"${v}"`;
  return String(v);
}

function isExpandable(v: JsonValue): boolean {
  return v !== null && typeof v === 'object';
}

function JsonNode({ label, value, depth }: { label: string | null; value: JsonValue; depth: number }) {
  const [open, setOpen] = useState(depth < 1);
  const expandable = isExpandable(value);

  if (!expandable) {
    return (
      <div className="flex gap-1 py-0.5 pl-4 text-[11px]" style={{ paddingLeft: depth * 12 + 16 }}>
        {label !== null && <span className="text-muted-foreground">{label}:</span>}
        <span
          className={
            typeof value === 'string'
              ? 'text-success'
              : typeof value === 'number'
                ? 'text-primary'
                : typeof value === 'boolean'
                  ? 'text-warning'
                  : 'text-muted-foreground'
          }
        >
          {valueLabel(value)}
        </span>
      </div>
    );
  }

  const entries = Array.isArray(value) ? value.map((v, i) => [String(i), v] as const) : Object.entries(value as Record<string, JsonValue>);

  return (
    <div>
      <button
        className="flex items-center gap-1 py-0.5 text-[11px] hover:bg-accent/40"
        style={{ paddingLeft: depth * 12 }}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <ChevronDown className="size-3 shrink-0" /> : <ChevronRight className="size-3 shrink-0" />}
        {label !== null && <span className="text-muted-foreground">{label}:</span>}
        <span className="text-muted-foreground">{valueLabel(value)}</span>
      </button>
      {open && (
        <div>
          {entries.map(([k, v]) => (
            <JsonNode key={k} label={k} value={v} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function JSONView({ onBack }: ModuleComponentProps) {
  const [raw, setRaw] = useState('');
  const [error, setError] = useState('');

  const parsed = useMemo<JsonValue | null>(() => {
    if (!raw.trim()) {
      setError('');
      return null;
    }
    try {
      const value = JSON.parse(raw);
      setError('');
      return value;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, [raw]);

  const pretty = parsed !== null ? JSON.stringify(parsed, null, 2) : '';

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="JSONView"
        description="Pretty-print and collapsible tree view for pasted JSON or API responses."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Paste JSON here..."
          className="min-h-28 font-mono text-[11px]"
        />
        {error && <p className="text-xs text-destructive">{error}</p>}

        {parsed !== null && (
          <>
            <div className="max-h-72 overflow-auto rounded-md border border-border bg-card/40 p-2">
              <JsonNode label={null} value={parsed} depth={0} />
            </div>
            <div className="flex flex-wrap gap-2">
              <CopyButton text={pretty} label="Copy pretty" />
              <Button size="sm" variant="outline" onClick={() => exportJson('jsonview', parsed)}>
                Export JSON
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportText('jsonview', pretty)}>
                Export pretty text
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default JSONView;
