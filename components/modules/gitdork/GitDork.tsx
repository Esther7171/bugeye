import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useTarget } from '@/components/shell/TargetProvider';
import { buildGitHubDorks, githubSearchUrl, gitlabSearchUrl } from '@/lib/gitdork';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

export function GitDork({ onBack }: ModuleComponentProps) {
  const { target } = useTarget();
  const [company, setCompany] = useState(target.split('.')[0] ?? '');
  const dorks = company.trim() ? buildGitHubDorks(company.trim()) : [];

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="GitDork"
        description="GitHub/GitLab code-search queries for leaked secrets tied to a company or domain."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="company or keyword" />

        {dorks.length > 0 && (
          <Card>
            <CardContent className="flex flex-col divide-y divide-border p-0">
              {dorks.map((d) => (
                <div key={d.id} className="flex flex-col gap-1.5 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium">{d.label}</p>
                    <CopyButton text={d.query} label="Copy" className="shrink-0" />
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">{d.query}</p>
                  <div className="flex gap-2">
                    <a href={githubSearchUrl(d.query)} target="_blank" rel="noreferrer">
                      <span className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
                        GitHub <ExternalLink className="size-2.5" />
                      </span>
                    </a>
                    <a href={gitlabSearchUrl(d.query)} target="_blank" rel="noreferrer">
                      <span className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
                        GitLab <ExternalLink className="size-2.5" />
                      </span>
                    </a>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {dorks.length > 0 && (
          <Button size="sm" variant="outline" className="w-fit" onClick={() => exportJson('gitdork', dorks)}>
            Export JSON
          </Button>
        )}

        <p className="text-[11px] text-muted-foreground">
          Passive, public code search only. GitHub code search requires being signed in to github.com
          in your browser for some query types.
        </p>
      </div>
    </div>
  );
}

export default GitDork;
