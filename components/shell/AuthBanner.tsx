import { useEffect, useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { bannerStore } from '@/lib/storage';
import { Button } from '@/components/ui/button';

export function AuthBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    bannerStore.get().then(setDismissed);
  }, []);

  if (dismissed) return null;

  return (
    <div className="flex items-center gap-2 border-b border-warning/30 bg-warning/10 px-3 py-2 text-[11px] text-warning">
      <ShieldAlert className="size-3.5 shrink-0" />
      <p className="flex-1 leading-tight">
        Authorized VAPT / bug bounty / your own assets only. Recon and OSINT
        triage, no auto-sent exploits, no DoS, no login brute-force. The first
        time any tool needs to read a page, your browser will ask for
        permission once - grant it and every tool works from then on with no
        further prompts.
      </p>
      <Button
        variant="ghost"
        size="icon"
        className="size-5 shrink-0 text-warning hover:bg-warning/15"
        onClick={() => {
          setDismissed(true);
          bannerStore.set(true);
        }}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}
