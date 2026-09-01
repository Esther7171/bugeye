import { useCallback, useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { originOf } from '@/lib/utils';

export interface ActiveTabInfo {
  tabId: number | null;
  url: string | null;
  origin: string | null;
}

// Kept live via tabs.onActivated/onUpdated (same pattern as
// TargetProvider's auto-follow), not just fetched once on mount. That
// matters beyond freshness: browser.permissions.request() must run with no
// await ahead of it in the same click's call stack, or its user-gesture
// status is lost (Firefox enforces this strictly; Chrome's tolerance for
// it is inconsistent enough not to rely on). A module that needs the
// current tab's origin to call ensure() can't first await tabs.query() to
// find out what that origin is - by the time that promise resolves, the
// click no longer counts. Reading it from this hook's already-current
// state costs zero awaits at click time.
export function useActiveTab() {
  const [info, setInfo] = useState<ActiveTabInfo>({ tabId: null, url: null, origin: null });

  const refresh = useCallback(async () => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    const url = tab?.url ?? null;
    setInfo({ tabId: tab?.id ?? null, url, origin: url ? originOf(url) : null });
  }, []);

  useEffect(() => {
    refresh();
    const onActivated = () => refresh();
    const onUpdated = (_tabId: number, changeInfo: { status?: string }) => {
      if (changeInfo.status === 'complete') refresh();
    };
    browser.tabs.onActivated.addListener(onActivated);
    browser.tabs.onUpdated.addListener(onUpdated);
    return () => {
      browser.tabs.onActivated.removeListener(onActivated);
      browser.tabs.onUpdated.removeListener(onUpdated);
    };
  }, [refresh]);

  return { ...info, refresh };
}
