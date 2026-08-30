import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { cveQueryStore } from '@/lib/storage';
import { buildCveLinks } from '@/lib/cve';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

export function CVELookup({ onBack }: ModuleComponentProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    cveQueryStore.get().then((stored) => {
      if (stored) {
        setQuery(stored);
        cveQueryStore.set('');
      }
    });
  }, []);

  const links = query.trim() ? buildCveLinks(query) : [];

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="CVELookup"
        description="Builds search links for a detected technology and version across CVE databases."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex gap-2">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. jQuery 1.8.3" />
          <CopyButton text={query} label="Copy query" className="shrink-0" />
        </div>

        {links.length > 0 && (
          <Card>
            <CardContent className="flex flex-col divide-y divide-border p-0">
              {links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-2 p-2.5 text-xs hover:bg-accent/40"
                >
                  {link.label}
                  <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
                </a>
              ))}
            </CardContent>
          </Card>
        )}

        {links.length > 0 && (
          <Button size="sm" variant="outline" className="w-fit" onClick={() => exportJson('cvelookup', links)}>
            Export JSON
          </Button>
        )}

        {links.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Enter a technology and version (or send one here from RetireJS) to generate search links.
          </p>
        )}
      </div>
    </div>
  );
}

export default CVELookup;
