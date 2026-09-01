import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PermissionRow {
  name: string;
  why: string;
}

const PERMISSIONS: PermissionRow[] = [
  { name: 'storage', why: 'Remembers your target, theme and dismissed banners locally on your device.' },
  { name: 'cookies', why: 'Lets CookieJar read/export/import cookies for the domain you choose.' },
  {
    name: 'tabs',
    why: 'Reads the active tab\'s URL for target context, and opens tabs from BulkOpen, PanelHunt and ShodanPeek.',
  },
  { name: 'sidePanel / sidebar', why: 'Chrome/Edge: persistent side panel. Firefox: sidebar (View → Sidebar → BugEye, or the toolbar button / Ctrl+Shift+K).' },
  {
    name: 'activeTab / scripting',
    why: 'Lets page-scan tools (LinkGrab, SecretScan, BucketSpot, FormAudit and others) read the page you\'re viewing when you click "Scan".',
  },
  {
    name: 'webRequest',
    why: 'Lets HeaderGrade see raw response headers (incl. Set-Cookie), and lets ReqLogger and RedirectTrace observe request metadata for the current tab.',
  },
  {
    name: 'declarativeNetRequest',
    why: 'Lets the Traffic pillar (HeaderInject, UASwitch, RefControl) rewrite request headers for a site you have granted access to. Rules apply only to that tab and only while you have them enabled.',
  },
  {
    name: 'Host access (all sites, requested once)',
    why: 'The first time any tool needs to read a page, you get a single "all sites" prompt. Grant it once and every tool works on any site afterward with no further prompts.',
  },
];

export function PermissionsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <DialogPrimitive.Title className="text-sm font-semibold">Why these permissions?</DialogPrimitive.Title>
          <DialogPrimitive.Close asChild>
            <Button variant="ghost" size="icon" className="size-6">
              <X className="size-3.5" />
            </Button>
          </DialogPrimitive.Close>
        </div>
        <div className="flex flex-col gap-3">
          {PERMISSIONS.map((p) => (
            <div key={p.name}>
              <p className="text-xs font-medium">{p.name}</p>
              <p className="text-[11px] text-muted-foreground">{p.why}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
