import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { browser } from 'wxt/browser';
import type { Browser } from 'wxt/browser';
import { targetStore } from '@/lib/storage';
import { normalizeDomain } from '@/lib/utils';

interface TargetContextValue {
  target: string;
  setTarget: (value: string) => void;
  useCurrentTab: () => Promise<void>;
  locked: boolean;
  toggleLock: () => void;
}

const TargetContext = createContext<TargetContextValue>({
  target: '',
  setTarget: () => {},
  useCurrentTab: async () => {},
  locked: false,
  toggleLock: () => {},
});

export function TargetProvider({ children }: { children: ReactNode }) {
  const [target, setTargetState] = useState('');
  // Auto-follow is on by default: opening the panel (or switching tabs) uses
  // whatever site you're on. Typing a target manually, or pinning it, turns it
  // off until "use current tab" or the pin toggle is used again. Mirrored into
  // a ref so the tab listeners (registered once, below) never read a stale
  // value, and into state so the UI (the pin icon) can reflect it.
  const [locked, setLockedState] = useState(false);
  const autoFollow = useRef(true);

  const setLocked = (value: boolean) => {
    autoFollow.current = !value;
    setLockedState(value);
  };

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
    const normalized = normalizeDomain(value);
    // Only actually lock auto-follow off if this is a real change. Re-committing
    // the same value (for example a text input re-firing on blur) should not
    // silently disable auto-follow.
    if (normalized !== target) setLocked(true);
    setTargetState(normalized);
    targetStore.set(normalized);
  };

  const useCurrentTab = async () => {
    setLocked(false);
    await applyFromActiveTab();
  };

  const toggleLock = () => {
    if (locked) {
      setLocked(false);
      applyFromActiveTab();
    } else {
      setLocked(true);
    }
  };

  return (
    <TargetContext.Provider value={{ target, setTarget, useCurrentTab, locked, toggleLock }}>
      {children}
    </TargetContext.Provider>
  );
}

export function useTarget() {
  return useContext(TargetContext);
}
