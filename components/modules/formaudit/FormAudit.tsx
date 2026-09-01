import { useState } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { ModuleHeader } from '@/components/shell/ModuleHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { browser } from 'wxt/browser';
import { useHostPermission } from '@/lib/useHostPermission';
import { useActiveTab } from '@/lib/useActiveTab';
import { exportJson } from '@/lib/export';
import type { ModuleComponentProps } from '@/types';

interface FormInfo {
  action: string;
  method: string;
  isHttps: boolean;
  hasCsrfToken: boolean;
  fieldCount: number;
  hasPasswordField: boolean;
}

// Self-contained: executed in the page's isolated world via
// chrome.scripting.executeScript, so it cannot reference outer closures.
function scanPageForForms(): FormInfo[] {
  const CSRF_NAME_RE = /csrf|xsrf|_token|authenticity_token|nonce/i;
  return Array.from(document.querySelectorAll('form')).map((form) => {
    let action = '(none - submits to current URL)';
    try {
      action = form.action ? new URL(form.action, document.baseURI).href : action;
    } catch {
      // keep default
    }
    const inputs = Array.from(form.querySelectorAll('input, textarea, select'));
    const hasCsrfToken = inputs.some((el) => {
      const name = el.getAttribute('name') ?? '';
      return CSRF_NAME_RE.test(name);
    });
    const hasPasswordField = inputs.some((el) => el.getAttribute('type') === 'password');
    return {
      action,
      method: (form.getAttribute('method') || 'GET').toUpperCase(),
      isHttps: action.startsWith('https://'),
      hasCsrfToken,
      fieldCount: inputs.length,
      hasPasswordField,
    };
  });
}

export function FormAudit({ onBack }: ModuleComponentProps) {
  const [forms, setForms] = useState<FormInfo[]>([]);
  const [scanning, setScanning] = useState(false);
  const [note, setNote] = useState('');
  const { ensure, pending } = useHostPermission();
  const { tabId, origin: activeOrigin } = useActiveTab();

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
    setForms([]);
    setScanning(true);
    try {
      // ensure() must be the first await here, see useActiveTab's comment.
      const granted = await ensure(activeOrigin);
      if (!granted) {
        setNote('Host permission was not granted.');
        return;
      }
      const [injection] = await browser.scripting.executeScript({ target: { tabId }, func: scanPageForForms });
      const result = (injection?.result as FormInfo[] | undefined) ?? [];
      setForms(result);
      if (result.length === 0) setNote('No forms found on this page.');
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="flex flex-col">
      <ModuleHeader
        title="FormAudit"
        description="Lists every form: method, action, whether the action is HTTPS, and CSRF token presence."
        onBack={onBack}
      />
      <div className="flex flex-col gap-3 p-3">
        <Button size="sm" onClick={scan} disabled={scanning || pending} className="w-fit">
          {scanning || pending ? <Loader2 className="size-3 animate-spin" /> : null}
          Scan this page
        </Button>

        {note && <p className="text-xs text-muted-foreground">{note}</p>}

        {forms.length > 0 && (
          <>
            <div className="flex flex-col gap-2">
              {forms.map((f, i) => (
                <Card key={i}>
                  <CardContent className="flex flex-col gap-1.5 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="normal-case">
                        {f.method}
                      </Badge>
                      <div className="flex items-center gap-1.5">
                        {f.isHttps ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="size-2.5" /> HTTPS
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="gap-1">
                            <XCircle className="size-2.5" /> not HTTPS
                          </Badge>
                        )}
                        {f.hasCsrfToken ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="size-2.5" /> CSRF token
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="gap-1">
                            <XCircle className="size-2.5" /> no CSRF token
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">{f.action}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {f.fieldCount} field{f.fieldCount === 1 ? '' : 's'}
                      {f.hasPasswordField ? ' (includes a password field)' : ''}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button size="sm" variant="outline" className="w-fit" onClick={() => exportJson('formaudit', forms)}>
              Export JSON
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default FormAudit;
