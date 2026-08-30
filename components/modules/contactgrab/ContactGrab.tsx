import { useState } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { browser } from 'wxt/browser';
import { useHostPermission } from '@/lib/useHostPermission';
import { originOf } from '@/lib/utils';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

interface ContactData {
  emails: string[];
  phones: string[];
  socials: { platform: string; url: string }[];
}

// Self-contained: executed in the page's isolated world via
// chrome.scripting.executeScript, so it cannot reference outer closures.
function scanPageForContacts(): ContactData {
  const emails = new Set<string>();
  const phones = new Set<string>();
  const socials = new Map<string, { platform: string; url: string }>();

  const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const SOCIAL_HOSTS: [RegExp, string][] = [
    [/(^|\.)twitter\.com$/, 'Twitter/X'],
    [/(^|\.)x\.com$/, 'Twitter/X'],
    [/(^|\.)linkedin\.com$/, 'LinkedIn'],
    [/(^|\.)github\.com$/, 'GitHub'],
    [/(^|\.)instagram\.com$/, 'Instagram'],
    [/(^|\.)facebook\.com$/, 'Facebook'],
    [/(^|\.)youtube\.com$/, 'YouTube'],
    [/(^|\.)tiktok\.com$/, 'TikTok'],
    [/(^|\.)telegram\.me$|(^|\.)t\.me$/, 'Telegram'],
  ];

  const bodyText = document.body?.innerText ?? '';
  for (const m of bodyText.match(EMAIL_RE) ?? []) emails.add(m.toLowerCase());

  document.querySelectorAll('a[href]').forEach((el) => {
    const href = el.getAttribute('href') ?? '';
    if (href.startsWith('mailto:')) {
      const addr = href.slice(7).split('?')[0]?.trim();
      if (addr) emails.add(addr.toLowerCase());
    }
    if (href.startsWith('tel:')) {
      const num = href.slice(4).trim();
      if (num) phones.add(num);
    }
    try {
      const resolved = new URL(href, document.baseURI);
      for (const [hostRe, platform] of SOCIAL_HOSTS) {
        if (hostRe.test(resolved.hostname) && resolved.pathname.length > 1) {
          socials.set(resolved.href, { platform, url: resolved.href });
          break;
        }
      }
    } catch {
      // ignore unparsable hrefs
    }
  });

  return { emails: Array.from(emails), phones: Array.from(phones), socials: Array.from(socials.values()) };
}

export function ContactGrab({ onBack }: ModuleComponentProps) {
  const [data, setData] = useState<ContactData | null>(null);
  const [scanning, setScanning] = useState(false);
  const [note, setNote] = useState('');
  const { ensure, pending } = useHostPermission();

  async function scan() {
    setNote('');
    setData(null);
    setScanning(true);
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !tab.url) {
        setNote('No active tab available.');
        return;
      }
      const origin = originOf(tab.url);
      if (!origin) {
        setNote('Active tab is not an http(s) page.');
        return;
      }
      const granted = await ensure(origin);
      if (!granted) {
        setNote('Host permission was not granted.');
        return;
      }
      const [injection] = await browser.scripting.executeScript({ target: { tabId: tab.id }, func: scanPageForContacts });
      const result = injection?.result as ContactData | undefined;
      setData(result ?? { emails: [], phones: [], socials: [] });
      if (result && result.emails.length === 0 && result.phones.length === 0 && result.socials.length === 0) {
        setNote('No emails, phone links or social profile links found on this page.');
      }
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="ContactGrab"
        description="Scrapes the page DOM and mailto:/tel: links for emails, phones and social handles."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
          <ShieldAlert className="size-3.5 shrink-0" />
          <p>Only scrapes what the page itself publishes. Handle any personal data you collect responsibly.</p>
        </div>

        <Button size="sm" onClick={scan} disabled={scanning || pending} className="w-fit">
          {scanning || pending ? <Loader2 className="size-3 animate-spin" /> : null}
          Scan this page
        </Button>

        {note && <p className="text-xs text-muted-foreground">{note}</p>}

        {data && (data.emails.length > 0 || data.phones.length > 0 || data.socials.length > 0) && (
          <>
            <Tabs defaultValue="emails">
              <TabsList>
                <TabsTrigger value="emails">Emails ({data.emails.length})</TabsTrigger>
                <TabsTrigger value="phones">Phones ({data.phones.length})</TabsTrigger>
                <TabsTrigger value="socials">Socials ({data.socials.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="emails">
                <Card>
                  <CardContent className="max-h-56 overflow-y-auto p-0">
                    {data.emails.length === 0 && <p className="p-2 text-xs text-muted-foreground">None found.</p>}
                    {data.emails.map((e) => (
                      <p key={e} className="truncate border-b border-border p-1.5 text-xs last:border-0">
                        {e}
                      </p>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="phones">
                <Card>
                  <CardContent className="max-h-56 overflow-y-auto p-0">
                    {data.phones.length === 0 && <p className="p-2 text-xs text-muted-foreground">None found.</p>}
                    {data.phones.map((p) => (
                      <p key={p} className="truncate border-b border-border p-1.5 text-xs last:border-0">
                        {p}
                      </p>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="socials">
                <Card>
                  <CardContent className="max-h-56 overflow-y-auto p-0">
                    {data.socials.length === 0 && <p className="p-2 text-xs text-muted-foreground">None found.</p>}
                    {data.socials.map((s) => (
                      <div key={s.url} className="flex items-center gap-2 border-b border-border p-1.5 last:border-0">
                        <Badge variant="outline" className="shrink-0 normal-case">
                          {s.platform}
                        </Badge>
                        <span className="min-w-0 flex-1 truncate text-xs">{s.url}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            <Button size="sm" variant="outline" className="w-fit" onClick={() => exportJson('contactgrab', data)}>
              Export JSON
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default ContactGrab;
