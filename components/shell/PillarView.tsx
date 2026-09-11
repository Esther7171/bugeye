import { useState } from 'react';
import { ArrowRight, Clock, Search, X } from 'lucide-react';
import type { ModuleMeta, PillarId } from '@/types';
import { modulesForPillar, pillarById, pillarName, searchModules } from '@/lib/pillars';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface PillarViewProps {
  pillar: PillarId;
  onOpenModule: (moduleId: string) => void;
  onNavigate: (pillar: PillarId, moduleId?: string) => void;
}

export function PillarView({ pillar, onOpenModule, onNavigate }: PillarViewProps) {
  const [query, setQuery] = useState('');
  const meta = pillarById(pillar);
  const searching = query.trim().length > 0;
  const modules = searching ? searchModules(query) : modulesForPillar(pillar);

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Header: which section am I in, and what is it for. */}
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">{searching ? 'Search all tools' : meta?.name ?? pillar}</h2>
        <p className="text-[11px] text-muted-foreground">
          {searching
            ? `${modules.length} tool${modules.length === 1 ? '' : 's'} match "${query.trim()}"`
            : meta?.description}
        </p>
      </div>

      {/* Always-visible search across every tool, not just this section. */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search all tools (e.g. subdomain, cookies, headers)"
          className="pl-8 pr-8"
        />
        {searching && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {modules.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1.5 p-8 text-center">
          <Clock className="size-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            {searching ? 'No tools match that search.' : 'No tools here yet - check back in a future release.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {modules.map((mod) => (
            <ModuleCard
              key={mod.id}
              mod={mod}
              showPillar={searching}
              onOpen={() => (searching ? onNavigate(mod.pillar, mod.id) : onOpenModule(mod.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ModuleCard({ mod, showPillar, onOpen }: { mod: ModuleMeta; showPillar: boolean; onOpen: () => void }) {
  return (
    <Card
      onClick={() => mod.status === 'live' && onOpen()}
      className={
        mod.status === 'live'
          ? 'cursor-pointer transition-colors hover:border-primary/50 hover:bg-accent/40'
          : 'opacity-60'
      }
    >
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <CardTitle>{mod.name}</CardTitle>
            {showPillar && (
              <Badge variant="outline" className="shrink-0 normal-case text-[9px]">
                {pillarName(mod.pillar)}
              </Badge>
            )}
          </div>
          <CardDescription>{mod.description}</CardDescription>
        </div>
        {mod.status === 'live' ? (
          <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        ) : (
          <Badge variant="muted" className="shrink-0 gap-1">
            <Clock className="size-2.5" /> soon
          </Badge>
        )}
      </CardHeader>
    </Card>
  );
}
