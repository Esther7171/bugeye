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
  { name: 'sidePanel', why: 'Renders the extension as a persistent side panel instead of a popup.' },
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
    name: 'Host access (requested per-site, on demand)',
    why: 'Only requested the moment a tool needs to fetch a specific site - never granted for all sites upfront.',
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
