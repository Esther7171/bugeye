import { Command } from 'cmdk';
import { PILLARS } from '@/lib/pillars';
import { MODULES } from '@/lib/pillars';
import type { PillarId } from '@/types';
import { useTheme } from '@/components/shell/ThemeProvider';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (pillar: PillarId, moduleId?: string) => void;
}

// cmdk's default fuzzy scorer treats `value` as one blob, so a long
// description can out-score an exact match on the module's own name (e.g.
// searching "AutoFinder" was ranking FormAudit's description above it). Item
// values are "name|pillar|description"; this filter scores a match against
// the name far above one that only hits the description.
function paletteFilter(value: string, search: string): number {
  const query = search.trim().toLowerCase();
  if (!query) return 1;
  const [name = value] = value.toLowerCase().split('|');
  if (name === query) return 1;
  if (name.startsWith(query)) return 0.9;
  if (name.includes(query)) return 0.7;
  if (value.toLowerCase().includes(query)) return 0.4;
  return 0;
}

export function CommandPalette({ open, onOpenChange, onNavigate }: CommandPaletteProps) {
  const { toggle } = useTheme();

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Command palette"
      filter={paletteFilter}
      className="fixed left-1/2 top-20 z-50 w-full max-w-sm -translate-x-1/2 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg"
    >
      <div className="border-b border-border px-3">
        <Command.Input
          autoFocus
          placeholder="Jump to a tool..."
          className="h-10 w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
        />
      </div>
      <Command.List className="max-h-80 overflow-y-auto p-1">
        <Command.Empty className="p-4 text-center text-xs text-muted-foreground">
          No results found.
        </Command.Empty>
        <Command.Group heading="Actions" className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground [&_[cmdk-group-items]]:mt-1">
          <Command.Item
            onSelect={() => {
              toggle();
              onOpenChange(false);
            }}
            className="cursor-pointer rounded-sm px-2 py-1.5 text-xs data-[selected=true]:bg-accent"
          >
            Toggle dark / light theme
          </Command.Item>
        </Command.Group>
        {PILLARS.map((pillar) => {
          const items = MODULES.filter((m) => m.pillar === pillar.id);
          if (items.length === 0) return null;
          return (
            <Command.Group
              key={pillar.id}
              heading={pillar.name}
              className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground [&_[cmdk-group-items]]:mt-1"
            >
              {items.map((mod) => (
                <Command.Item
                  key={mod.id}
                  value={`${mod.name}|${pillar.name}|${mod.description}`}
                  onSelect={() => {
                    onNavigate(pillar.id, mod.id);
                    onOpenChange(false);
                  }}
                  className="flex cursor-pointer flex-col gap-0.5 rounded-sm px-2 py-1.5 text-xs data-[selected=true]:bg-accent"
                >
                  <span className="font-medium text-foreground">{mod.name}</span>
                  <span className="text-[11px] text-muted-foreground">{mod.description}</span>
                </Command.Item>
              ))}
            </Command.Group>
          );
        })}
      </Command.List>
    </Command.Dialog>
  );
}
