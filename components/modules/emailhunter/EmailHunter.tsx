import { useState } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { CopyButton } from '@/components/shell/CopyButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { browser } from 'wxt/browser';
import { useTarget } from '@/components/shell/TargetProvider';
import { useHostPermission } from '@/lib/useHostPermission';
import { useActiveTab } from '@/lib/useActiveTab';
import { sendToBackground } from '@/lib/messaging';
import { mapLimit } from '@/lib/concurrency';
import { guessEmailPatterns } from '@/lib/emailpatterns';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const MAX_LINKED_PAGES = 15;

// Self-contained: executed in the page's isolated world via
// chrome.scripting.executeScript, so it cannot reference outer closures.
function scanPageForEmailsAndLinks(): { emails: string[]; internalLinks: string[] } {
  const emails = new Set<string>();
  const re = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  for (const m of (document.body?.innerText ?? '').match(re) ?? []) emails.add(m.toLowerCase());
  document.querySelectorAll('a[href^="mailto:"]').forEach((el) => {
    const addr = el.getAttribute('href')?.slice(7).split('?')[0]?.trim();
    if (addr) emails.add(addr.toLowerCase());
  });

  const internalLinks = new Set<string>();
  document.querySelectorAll('a[href]').forEach((el) => {
    try {
      const resolved = new URL(el.getAttribute('href') ?? '', document.baseURI);
      if (resolved.hostname === location.hostname && (resolved.protocol === 'http:' || resolved.protocol === 'https:')) {
        internalLinks.add(resolved.href);
      }
    } catch {
      // ignore
    }
  });

  return { emails: Array.from(emails), internalLinks: Array.from(internalLinks) };
}

export function EmailHunter({ onBack }: ModuleComponentProps) {
  const { target } = useTarget();
  const [emails, setEmails] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [crawlLinked, setCrawlLinked] = useState(false);
  const [pagesScanned, setPagesScanned] = useState(0);
  const [note, setNote] = useState('');
  const { ensure, pending } = useHostPermission();
  const { tabId, origin: activeOrigin } = useActiveTab();

  const [guessName, setGuessName] = useState('');
  const guesses = guessName.trim() && target ? guessEmailPatterns(guessName, target) : [];

  async function scan() {
    if (!tabId) {
      setNote('No active tab available.');
      return;
    }
    if (!activeOrigin) {
      setNote('Active tab is not an http(s) page.');
      return;
    }
    setNote('');
    setEmails([]);
    setPagesScanned(0);
    setScanning(true);
    try {
      // ensure() must be the first await here, see useActiveTab's comment.
      const granted = await ensure(activeOrigin);
      if (!granted) {
        setNote('Host permission was not granted.');
        return;
      }
      const [injection] = await browser.scripting.executeScript({ target: { tabId }, func: scanPageForEmailsAndLinks });
      const result = injection?.result as { emails: string[]; internalLinks: string[] } | undefined;
      const found = new Set(result?.emails ?? []);
      setPagesScanned(1);

      if (crawlLinked && result?.internalLinks.length) {
        const links = result.internalLinks.slice(0, MAX_LINKED_PAGES);
        let scanned = 1;
        await mapLimit(links, 5, async (link) => {
          const res = await sendToBackground({ type: 'FETCH_TEXT', url: link });
          if (res.ok && res.data) {
            for (const m of res.data.match(EMAIL_RE) ?? []) found.add(m.toLowerCase());
          }
          scanned += 1;
          setPagesScanned(scanned);
        });
      }

      setEmails(Array.from(found).sort());
      if (found.size === 0) setNote('No emails found.');
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="EmailHunter"
        description="Aggregates emails from the current page and, optionally, its internal links."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
          <ShieldAlert className="size-3.5 shrink-0" />
          <p>
            Reads the current tab's DOM using your existing session, no separate login and no
            third-party service. Only aggregates addresses the pages already publish. Handle
            responsibly.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-muted-foreground">Also fetch up to {MAX_LINKED_PAGES} internal links</Label>
          <Switch checked={crawlLinked} onCheckedChange={setCrawlLinked} />
        </div>

        <Button size="sm" onClick={scan} disabled={scanning || pending} className="w-fit">
          {scanning || pending ? <Loader2 className="size-3 animate-spin" /> : null}
          Scan {crawlLinked ? 'page + internal links' : 'this page'}
        </Button>

        {scanning && pagesScanned > 0 && (
          <p className="text-[11px] text-muted-foreground">Scanned {pagesScanned} page(s)...</p>
        )}
        {note && <p className="text-xs text-muted-foreground">{note}</p>}

        {emails.length > 0 && (
          <>
            <Card>
              <CardContent className="max-h-56 overflow-y-auto p-0">
                {emails.map((e) => (
                  <p key={e} className="truncate border-b border-border p-1.5 text-xs last:border-0">
                    {e}
                  </p>
                ))}
              </CardContent>
            </Card>
            <div className="flex flex-wrap gap-2">
              <CopyButton text={emails.join('\n')} label="Copy list" />
              <Button size="sm" variant="outline" onClick={() => exportJson('emailhunter', emails)}>
                Export JSON
              </Button>
            </div>
          </>
        )}

        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <p className="text-xs font-medium">Pattern-guess (unverified)</p>
          <p className="text-[11px] text-muted-foreground">
            Generates common first.last@domain style guesses for a name. These are not verified to
            exist or belong to anyone; use only for your own authorized test accounts or with
            explicit permission.
          </p>
          <Input value={guessName} onChange={(e) => setGuessName(e.target.value)} placeholder="First Last" />
          {guesses.length > 0 && (
            <>
              <Card>
                <CardContent className="max-h-40 overflow-y-auto p-0">
                  {guesses.map((g) => (
                    <p key={g} className="truncate border-b border-border p-1.5 text-xs last:border-0">
                      {g}
                    </p>
                  ))}
                </CardContent>
              </Card>
              <div className="flex gap-2">
                <CopyButton text={guesses.join('\n')} label="Copy guesses" />
                <Button size="sm" variant="outline" onClick={() => exportJson('email-guesses', guesses)}>
                  Export JSON
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default EmailHunter;
