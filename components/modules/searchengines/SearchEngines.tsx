import { useMemo, useState } from 'react';
import { ExternalLink, ArrowRight, Search, X } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { ModuleNote } from '@/components/shell/ModuleNote';
import { CopyButton } from '@/components/shell/CopyButton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useTarget } from '@/components/shell/TargetProvider';
import { isIpAddress } from '@/lib/utils';
import { SEARCH_ENGINES, SEARCH_ENGINE_CATEGORIES, type SearchEngine } from '@/lib/searchengines';
import type { ModuleComponentProps } from '@/types';

export function SearchEngines({ onBack, onNavigate }: ModuleComponentProps) {
  const { target } = useTarget();
  const [query, setQuery] = useState('');
  const isIp = !!target && isIpAddress(target);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SEARCH_ENGINES;
    return SEARCH_ENGINES.filter(
      (e) => e.name.toLowerCase().includes(q) || e.desc.toLowerCase().includes(q) || e.category.toLowerCase().includes(q),
    );
  }, [query]);

  const allLinks = useMemo(() => {
    if (!target) return '';
    return SEARCH_ENGINES.map((e) => e.url(target, isIp))
      .filter((u): u is string => !!u)
      .join('\n');
  }, [target, isIp]);

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="SearchEngines"
        description="One-click deep links into 30+ recon / OSINT search engines, pre-filled with your target."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <ModuleNote>
          Opens each engine's search for <strong>{target || '(set a target first)'}</strong> in a new
          tab. Nothing is fetched or submitted from here - these are just links. Engines marked{' '}
          <Badge variant="outline" className="normal-case text-[9px]">
            login
          </Badge>{' '}
          need an account or API key to show results.
        </ModuleNote>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter engines (e.g. dns, code, exploit)"
            className="pl-8 pr-8"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear filter"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {allLinks && (
          <div className="flex flex-wrap gap-2">
            <CopyButton text={allLinks} label="Copy all links" />
          </div>
        )}

        {SEARCH_ENGINE_CATEGORIES.map((category) => {
          const engines = filtered.filter((e) => e.category === category);
          if (engines.length === 0) return null;
          return (
            <div key={category} className="flex flex-col gap-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{category}</p>
              {engines.map((engine) => (
                <EngineRow key={engine.id} engine={engine} target={target} isIp={isIp} onNavigate={onNavigate} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EngineRow({
  engine,
  target,
  isIp,
  onNavigate,
}: {
  engine: SearchEngine;
  target: string;
  isIp: boolean;
  onNavigate: ModuleComponentProps['onNavigate'];
}) {
  const href = target ? engine.url(target, isIp) : null;
  const disabled = !target || !href;

  return (
    <Card className={disabled ? 'opacity-60' : 'transition-colors hover:border-primary/50'}>
      <CardContent className="flex items-center justify-between gap-2 p-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">{engine.name}</span>
            {engine.auth && (
              <Badge variant="outline" className="normal-case text-[9px]">
                login
              </Badge>
            )}
            {engine.native && (
              <button
                onClick={() => onNavigate(engine.native!.pillar, engine.native!.moduleId)}
                className="inline-flex items-center gap-0.5 rounded-sm bg-primary/10 px-1 text-[9px] text-primary hover:underline"
                title={`BugEye has this natively: ${engine.native.label}`}
              >
                in-app: {engine.native.label} <ArrowRight className="size-2.5" />
              </button>
            )}
          </div>
          <p className="truncate text-[11px] text-muted-foreground" title={engine.desc}>
            {engine.desc}
          </p>
        </div>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] hover:border-primary/50 hover:text-primary"
          >
            Open <ExternalLink className="size-3" />
          </a>
        ) : (
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {!target ? 'set target' : isIp ? 'domain only' : 'IP only'}
          </span>
        )}
      </CardContent>
    </Card>
  );
}

export default SearchEngines;
