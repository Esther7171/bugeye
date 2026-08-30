import { Component, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  moduleKey: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// React.lazy() means a module can fail to load (stale chunk after a rebuild,
// a transient fetch error) or throw during render. Without this boundary
// that unmounts the tree silently, leaving a blank panel with no way back
// short of closing and reopening it.
export class ModuleErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidUpdate(prevProps: Props) {
    if (prevProps.moduleKey !== this.props.moduleKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  override render() {
    if (this.state.error) {
      // React.lazy() only ever calls its import() once and caches the
      // result, so a stale-chunk failure (typical after rebuilding the
      // extension while the panel was already open) can't be fixed by
      // re-rendering - only a fresh load of the panel re-runs the import.
      const isChunkLoadError = /dynamically imported module|Failed to fetch|Loading chunk/i.test(
        this.state.error.message,
      );
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
          <AlertTriangle className="size-5 text-destructive" />
          <div>
            <p className="text-xs font-medium">This module failed to load.</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{this.state.error.message}</p>
          </div>
          {isChunkLoadError ? (
            <p className="max-w-xs text-[11px] text-muted-foreground">
              This usually means the extension was rebuilt while the panel was open. Close this side
              panel and reopen it (or reload the extension in chrome://extensions) to pick up the new
              build.
            </p>
          ) : (
            <Button size="sm" variant="outline" onClick={() => this.setState({ error: null })}>
              <RotateCcw className="size-3" /> Retry
            </Button>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
