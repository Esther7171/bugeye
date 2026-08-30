import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { browser } from 'wxt/browser';
import type { Browser } from 'wxt/browser';
import { targetStore } from '@/lib/storage';
import { normalizeDomain } from '@/lib/utils';

interface TargetContextValue {
  target: string;
  setTarget: (value: string) => void;
  useCurrentTab: () => Promise<void>;
}

const TargetContext = createContext<TargetContextValue>({
  target: '',
  setTarget: () => {},
  useCurrentTab: async () => {},
});

export function TargetProvider({ children }: { children: ReactNode }) {
  const [target, setTargetState] = useState('');
  // Auto-follow is on by default: opening the panel (or switching tabs) uses
  // whatever site you're on. Typing a target manually turns it off until you
  // click "use current tab" again.
  const autoFollow = useRef(true);

  const applyFromActiveTab = async (): Promise<boolean> => {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        const url = new URL(tab.url);
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          const normalized = normalizeDomain(url.hostname);
          setTargetState(normalized);
          targetStore.set(normalized);
          return true;
        }
      }
    } catch {
      // ignore - side panel may not have tab access yet
    }
    return false;
  };

  useEffect(() => {
    applyFromActiveTab().then((applied) => {
      if (!applied) targetStore.get().then(setTargetState);
    });
  }, []);

  useEffect(() => {
    const onActivated = () => {
      if (autoFollow.current) applyFromActiveTab();
    };
    const onUpdated = (
      _tabId: number,
      changeInfo: Browser.tabs.OnUpdatedInfo,
      tab: Browser.tabs.Tab,
    ) => {
      if (autoFollow.current && tab.active && changeInfo.status === 'complete') applyFromActiveTab();
    };
    browser.tabs.onActivated.addListener(onActivated);
    browser.tabs.onUpdated.addListener(onUpdated);
    return () => {
      browser.tabs.onActivated.removeListener(onActivated);
      browser.tabs.onUpdated.removeListener(onUpdated);
    };
  }, []);

  const setTarget = (value: string) => {
    autoFollow.current = false;
    const normalized = normalizeDomain(value);
    setTargetState(normalized);
    targetStore.set(normalized);
  };

  const useCurrentTab = async () => {
    autoFollow.current = true;
    await applyFromActiveTab();
  };

  return (
    <TargetContext.Provider value={{ target, setTarget, useCurrentTab }}>
      {children}
    </TargetContext.Provider>
  );
}

export function useTarget() {
  return useContext(TargetContext);
}
