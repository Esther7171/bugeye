import { useEffect, useState } from 'react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTarget } from '@/components/shell/TargetProvider';
import { targetNotesStore } from '@/lib/storage';
import { exportMarkdown, exportJson } from '@/lib/export';
import { formatTimestamp } from '@/lib/utils';
import type { ModuleComponentProps } from '@/types';

export function ExportAll({ onBack }: ModuleComponentProps) {
  const { target } = useTarget();
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    if (!target) return;
    targetNotesStore.get().then((all) => setNotes(all[target] ?? ''));
  }, [target]);

  async function updateNotes(value: string) {
    setNotes(value);
    setSaved(false);
    if (!target) return;
    const all = await targetNotesStore.get();
    await targetNotesStore.set({ ...all, [target]: value });
    setSaved(true);
  }

  function buildMarkdown() {
    return [`# BugEye notes - ${target || '(no target)'}`, '', `Exported ${formatTimestamp()}`, '', notes].join('\n');
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="ExportAll"
        description="A per-target scratchpad for your notes, exportable as Markdown or JSON alongside target metadata."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <p className="text-xs text-muted-foreground">
          Notes are saved per target ({target || 'no target set'}). Use each module's own Export
          button to save its individual results; this scratchpad is for your own write-up.
        </p>
        <Textarea
          value={notes}
          onChange={(e) => updateNotes(e.target.value)}
          placeholder="Findings, follow-ups, scope notes..."
          className="min-h-48"
        />
        <p className="text-[11px] text-muted-foreground">{saved ? 'Saved.' : 'Saving...'}</p>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => exportMarkdown(`bugeye-notes-${target || 'target'}`, buildMarkdown())}>
            Export Markdown
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportJson(`bugeye-notes-${target || 'target'}`, { target, notes, exportedAt: formatTimestamp() })}
          >
            Export JSON
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ExportAll;
