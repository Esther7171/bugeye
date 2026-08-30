import { useState, useEffect } from 'react';
import { Crosshair, MonitorSmartphone, Pin, PinOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useTarget } from '@/components/shell/TargetProvider';
import { ThemeToggle } from '@/components/shell/ThemeToggle';
import { cn } from '@/lib/utils';

export function TargetBar() {
  const { target, setTarget, useCurrentTab, locked, toggleLock } = useTarget();
  const [draft, setDraft] = useState(target);

  useEffect(() => setDraft(target), [target]);

  // Only commit (and lock auto-follow) when the draft actually differs from
  // the current target, so an incidental blur (e.g. clicking away to switch
  // browser tabs) does not silently freeze the target bar.
  function commit() {
    if (draft !== target) setTarget(draft);
  }

  return (
    <div className="flex items-center gap-2 border-b border-border bg-card/60 px-3 py-2">
      <Crosshair className="size-4 shrink-0 text-primary" />
      <Input
        value={draft}
        placeholder="target domain, e.g. example.com"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
        }}
        className="h-7"
      />
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={cn('size-7 shrink-0', locked && 'border-primary text-primary')}
              onClick={toggleLock}
            >
              {locked ? <Pin className="size-3.5" /> : <PinOff className="size-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {locked ? 'Target locked. Click to unlock and resume auto-follow' : 'Lock target (stop auto-follow)'}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" className="size-7 shrink-0" onClick={useCurrentTab}>
              <MonitorSmartphone className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Re-sync to current tab (resumes auto-follow)</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <ThemeToggle />
    </div>
  );
}
