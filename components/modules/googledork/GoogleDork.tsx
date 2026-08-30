import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useTarget } from '@/components/shell/TargetProvider';
import { buildGoogleDorks } from '@/lib/googledork';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

export function GoogleDork({ onBack }: ModuleComponentProps) {
  const { target } = useTarget();
  const [domain, setDomain] = useState(target);
  const dorks = domain.trim() ? buildGoogleDorks(domain.trim()) : [];

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="GoogleDork"
        description="Ready-to-click Google dork queries for a domain: files, login pages, index-of, backups, buckets."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com" />

        {dorks.length > 0 && (
          <Card>
            <CardContent className="flex flex-col divide-y divide-border p-0">
              {dorks.map((d) => (
                <div key={d.id} className="flex items-center gap-2 p-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium">{d.label}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{d.query}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <CopyButton text={d.query} label="" className="size-7 p-0" />
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(d.query)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <button className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
                        <ExternalLink className="size-3.5" />
                      </button>
                    </a>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {dorks.length > 0 && (
          <Button size="sm" variant="outline" className="w-fit" onClick={() => exportJson('googledork', dorks)}>
            Export JSON
          </Button>
        )}

        <p className="text-[11px] text-muted-foreground">
          Passive only: opens a normal Google search in a new tab. Nothing is submitted or automated.
        </p>
      </div>
    </div>
  );
}

export default GoogleDork;
