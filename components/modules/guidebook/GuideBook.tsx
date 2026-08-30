import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CHECKLISTS } from '@/lib/guidebook';
import { checklistStore } from '@/lib/storage';
import { exportMarkdown } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

export function GuideBook({ onBack, onNavigate }: ModuleComponentProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    checklistStore.get().then(setChecked);
  }, []);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      checklistStore.set(next);
      return next;
    });
  }

  function exportProgress() {
    const lines = ['# GuideBook progress', ''];
    for (const group of CHECKLISTS) {
      lines.push(`## ${group.name}`, '');
      for (const item of group.items) {
        lines.push(`- [${checked[item.id] ? 'x' : ' '}] ${item.label}`);
      }
      lines.push('');
    }
    exportMarkdown('guidebook-progress', lines.join('\n'));
  }

  const totalItems = CHECKLISTS.reduce((n, g) => n + g.items.length, 0);
  const doneItems = Object.values(checked).filter(Boolean).length;

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="GuideBook"
        description="Offline methodology checklists. Nothing here runs automatically."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {doneItems}/{totalItems} checked
          </p>
          <Button size="sm" variant="outline" onClick={exportProgress}>
            Export progress
          </Button>
        </div>

        {CHECKLISTS.map((group) => (
          <div key={group.id} className="flex flex-col gap-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {group.name}
            </p>
            {group.items.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex items-start gap-2 p-3">
                  <input
                    type="checkbox"
                    checked={!!checked[item.id]}
                    onChange={() => toggle(item.id)}
                    className="mt-0.5 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground">{item.why}</p>
                    {item.jumpTo && (
                      <button
                        onClick={() => onNavigate(item.jumpTo!.pillar, item.jumpTo!.moduleId)}
                        className="mt-1 flex items-center gap-1 text-[11px] text-primary hover:underline"
                      >
                        Jump to tool <ArrowRight className="size-3" />
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default GuideBook;
