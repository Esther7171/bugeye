import { ArrowRight, Clock } from 'lucide-react';
import type { PillarId } from '@/types';
import { modulesForPillar } from '@/lib/pillars';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PillarViewProps {
  pillar: PillarId;
  onOpenModule: (moduleId: string) => void;
}

export function PillarView({ pillar, onOpenModule }: PillarViewProps) {
  const modules = modulesForPillar(pillar);

  if (modules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 p-8 text-center">
        <Clock className="size-4 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">No tools here yet - check back in a future release.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 p-3">
      {modules.map((mod) => (
        <Card
          key={mod.id}
          onClick={() => mod.status === 'live' && onOpenModule(mod.id)}
          className={
            mod.status === 'live'
              ? 'cursor-pointer transition-colors hover:border-primary/50 hover:bg-accent/40'
              : 'opacity-60'
          }
        >
          <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
            <div className="flex flex-col gap-1">
              <CardTitle>{mod.name}</CardTitle>
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
      ))}
    </div>
  );
}
