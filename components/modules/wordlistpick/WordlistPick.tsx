import { useMemo, useState } from 'react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { SECLISTS_WORDLISTS, wordlistUrl, wordlistLocalPath } from '@/lib/wordlists';
import type { ModuleComponentProps } from '@/types';

const CATEGORIES = Array.from(new Set(SECLISTS_WORDLISTS.map((w) => w.category)));

export function WordlistPick({ onBack }: ModuleComponentProps) {
  const [selectedId, setSelectedId] = useState(SECLISTS_WORDLISTS[0]!.id);
  const selected = useMemo(() => SECLISTS_WORDLISTS.find((w) => w.id === selectedId)!, [selectedId]);
  const url = wordlistUrl(selected);
  const localPath = wordlistLocalPath(selected);
  const wgetCmd = `wget -O ${selected.path.split('/').pop()} '${url}'`;

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="WordlistPick"
        description="Common SecLists wordlists: local -w path if pre-installed, or a wget command to fetch one."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-muted-foreground">Wordlist</Label>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <div key={cat}>
                  <p className="px-2 pt-2 text-[10px] font-semibold uppercase text-muted-foreground">{cat}</p>
                  {SECLISTS_WORDLISTS.filter((w) => w.category === cat).map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.label}
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="flex flex-col gap-3 p-3">
            <div>
              <p className="mb-1 text-xs font-medium">Local -w path (if SecLists is installed)</p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded bg-muted p-2 text-[11px]">{localPath}</code>
                <CopyButton text={localPath} />
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium">Fetch it with wget</p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded bg-muted p-2 text-[11px]">{wgetCmd}</code>
                <CopyButton text={wgetCmd} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default WordlistPick;
