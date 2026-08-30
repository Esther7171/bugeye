import { useState } from 'react';
import { Search, Info } from 'lucide-react';
import { PILLARS } from '@/lib/pillars';
import type { PillarId } from '@/types';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { PermissionsDialog } from '@/components/shell/PermissionsDialog';

interface SidebarProps {
  active: PillarId;
  onSelect: (pillar: PillarId) => void;
  onOpenPalette: () => void;
}

export function Sidebar({ active, onSelect, onOpenPalette }: SidebarProps) {
  const [permissionsOpen, setPermissionsOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={200}>
      <nav className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-border bg-card/40 py-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onOpenPalette}
              className="mb-1 flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Search className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Command palette (Ctrl+K)</TooltipContent>
        </Tooltip>
        <div className="my-1 h-px w-6 bg-border" />
        {PILLARS.map((pillar) => {
          const Icon = pillar.icon;
          const isActive = pillar.id === active;
          return (
            <Tooltip key={pillar.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onSelect(pillar.id)}
                  className={cn(
                    'flex size-9 items-center justify-center rounded-md transition-colors',
                    isActive
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  <Icon className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{pillar.name}</TooltipContent>
            </Tooltip>
          );
        })}
        <div className="mt-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setPermissionsOpen(true)}
                className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Info className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Why these permissions?</TooltipContent>
          </Tooltip>
        </div>
      </nav>
      <PermissionsDialog open={permissionsOpen} onOpenChange={setPermissionsOpen} />
    </TooltipProvider>
  );
}
