import { useState, useEffect } from 'react';
import { Crosshair, MonitorSmartphone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useTarget } from '@/components/shell/TargetProvider';
import { ThemeToggle } from '@/components/shell/ThemeToggle';

export function TargetBar() {
  const { target, setTarget, useCurrentTab } = useTarget();
  const [draft, setDraft] = useState(target);

  useEffect(() => setDraft(target), [target]);

  return (
    <div className="flex items-center gap-2 border-b border-border bg-card/60 px-3 py-2">
      <Crosshair className="size-4 shrink-0 text-primary" />
      <Input
        value={draft}
        placeholder="target domain, e.g. example.com"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => setTarget(draft)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') setTarget(draft);
        }}
        className="h-7"
      />
      <TooltipProvider delayDuration={300}>
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
