import { Suspense, useEffect, useMemo, useState } from 'react';
import type { PillarId } from '@/types';
import { ThemeProvider } from '@/components/shell/ThemeProvider';
import { TargetProvider } from '@/components/shell/TargetProvider';
import { AppHeader } from '@/components/shell/AppHeader';
import { AuthBanner } from '@/components/shell/AuthBanner';
import { TargetBar } from '@/components/shell/TargetBar';
import { Sidebar } from '@/components/shell/Sidebar';
import { PillarView } from '@/components/shell/PillarView';
import { CommandPalette } from '@/components/shell/CommandPalette';
import { ModuleLoadingFallback } from '@/components/shell/ModuleLoadingFallback';
import { ModuleErrorBoundary } from '@/components/shell/ModuleErrorBoundary';
import { MODULE_COMPONENTS } from '@/components/modules/registry';

export default function App() {
  const [pillar, setPillar] = useState<PillarId>('utility');
  const [moduleId, setModuleId] = useState<string | null>('autofinder');
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const ActiveModule = useMemo(
    () => (moduleId ? MODULE_COMPONENTS[moduleId] : undefined),
    [moduleId],
  );

  return (
    <ThemeProvider>
      <TargetProvider>
        <div className="flex h-full flex-col overflow-hidden bg-background text-foreground">
          <AppHeader />
          <AuthBanner />
          <TargetBar />
          <div className="flex min-h-0 flex-1">
            <Sidebar
              active={pillar}
              onSelect={(p) => {
                setPillar(p);
                setModuleId(null);
              }}
              onOpenPalette={() => setPaletteOpen(true)}
            />
            <main className="min-h-0 flex-1 overflow-y-auto">
              {ActiveModule ? (
                <ModuleErrorBoundary moduleKey={moduleId ?? ''}>
                  <Suspense fallback={<ModuleLoadingFallback />}>
                    <ActiveModule
                      onBack={() => setModuleId(null)}
                      onNavigate={(p, mod) => {
                        setPillar(p);
                        setModuleId(mod ?? null);
                      }}
                    />
                  </Suspense>
                </ModuleErrorBoundary>
              ) : (
                <PillarView pillar={pillar} onOpenModule={setModuleId} />
              )}
            </main>
          </div>
        </div>
        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          onNavigate={(p, mod) => {
            setPillar(p);
            setModuleId(mod ?? null);
          }}
        />
      </TargetProvider>
    </ThemeProvider>
  );
}
