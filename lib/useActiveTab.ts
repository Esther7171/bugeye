import { useCallback, useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { originOf } from '@/lib/utils';

export interface ActiveTabInfo {
  tabId: number | null;
  url: string | null;
  origin: string | null;
}

export function useActiveTab() {
  const [info, setInfo] = useState<ActiveTabInfo>({ tabId: null, url: null, origin: null });

  const refresh = useCallback(async () => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    const url = tab?.url ?? null;
    setInfo({ tabId: tab?.id ?? null, url, origin: url ? originOf(url) : null });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...info, refresh };
}
