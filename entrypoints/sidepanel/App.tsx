import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  const mainRef = useRef<HTMLElement>(null);
  const scrollPositions = useRef<Map<PillarId, number>>(new Map());

  // Opening a module and later going "back" reused the same scrollable
  // <main>, so returning to a pillar's module list always landed at whatever
  // scrollTop the module view happened to leave it at (usually 0) instead of
  // where the user had scrolled to. Save it before navigating away, restore
  // it once the list is showing again.
  function saveScroll() {
    if (mainRef.current) scrollPositions.current.set(pillar, mainRef.current.scrollTop);
  }

  function openModule(mod: string | null) {
    saveScroll();
    setModuleId(mod);
  }

  function selectPillar(p: PillarId) {
    saveScroll();
    setPillar(p);
    setModuleId(null);
  }

  function navigateTo(p: PillarId, mod?: string) {
    saveScroll();
    setPillar(p);
    setModuleId(mod ?? null);
  }

  useLayoutEffect(() => {
    if (moduleId === null && mainRef.current) {
      mainRef.current.scrollTop = scrollPositions.current.get(pillar) ?? 0;
    }
  }, [moduleId, pillar]);

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
              onSelect={selectPillar}
              onOpenPalette={() => setPaletteOpen(true)}
            />
            <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto">
              {ActiveModule ? (
                <ModuleErrorBoundary moduleKey={moduleId ?? ''}>
                  <Suspense fallback={<ModuleLoadingFallback />}>
                    <ActiveModule onBack={() => openModule(null)} onNavigate={navigateTo} />
                  </Suspense>
                </ModuleErrorBoundary>
              ) : (
                <PillarView pillar={pillar} onOpenModule={openModule} />
              )}
            </main>
          </div>
        </div>
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onNavigate={navigateTo} />
      </TargetProvider>
    </ThemeProvider>
  );
}
