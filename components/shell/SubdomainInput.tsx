import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { lastSubdomainsStore } from '@/lib/storage';

interface SubdomainInputProps {
  value: string;
  onChange: (value: string) => void;
}

// Shared between TakeoverCheck and HostCluster: paste a list, or pull the
// last successful SubFinder run for whatever domain was scanned.
export function SubdomainInput({ value, onChange }: SubdomainInputProps) {
  const [note, setNote] = useState('');

  async function pull() {
    const stored = await lastSubdomainsStore.get();
    if (!stored || stored.subdomains.length === 0) {
      setNote('No SubFinder results saved yet. Run SubFinder first.');
      return;
    }
    onChange(stored.subdomains.join('\n'));
    setNote(`Pulled ${stored.subdomains.length} subdomains from SubFinder (${stored.domain}, ${stored.generatedAt}).`);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-muted-foreground">Subdomains (one per line)</Label>
        <Button size="sm" variant="outline" onClick={pull}>
          Pull from SubFinder
        </Button>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={'sub1.example.com\nsub2.example.com'}
        className="min-h-24"
      />
      {note && <p className="text-[11px] text-muted-foreground">{note}</p>}
    </div>
  );
}
