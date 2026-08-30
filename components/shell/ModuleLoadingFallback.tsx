import { Loader2 } from 'lucide-react';

export function ModuleLoadingFallback() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <Loader2 className="size-4 animate-spin text-muted-foreground" />
      <p className="text-xs text-muted-foreground">Loading module...</p>
    </div>
  );
}
