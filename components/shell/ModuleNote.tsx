import { AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModuleNoteProps {
  tone?: 'error' | 'info';
  children: React.ReactNode;
  className?: string;
}

// Shared error/empty/info message used across modules instead of one-off
// <p> variants, so failures are always visible and styled consistently.
export function ModuleNote({ tone = 'info', children, className }: ModuleNoteProps) {
  if (tone === 'error') {
    return (
      <div
        className={cn(
          'flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-[11px] text-destructive',
          className,
        )}
      >
        <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
        <p>{children}</p>
      </div>
    );
  }
  return (
    <p className={cn('flex items-start gap-1.5 text-xs text-muted-foreground', className)}>
      <Info className="mt-0.5 size-3 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
