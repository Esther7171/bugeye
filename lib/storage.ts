import { browser } from 'wxt/browser';
import type { Browser } from 'wxt/browser';
import type { HeaderRuleDraft, UaPresetId, RefererMode } from '@/lib/traffic';
import type { AutoFinderReport, ProgressMap } from '@/lib/autofinder';

const KEYS = {
  target: 'bugeye:target',
  theme: 'bugeye:theme',
  bannerDismissed: 'bugeye:bannerDismissed',
  bulkList: 'bugeye:bulkList',
  checklist: 'bugeye:checklist',
  headerRules: 'bugeye:headerRules',
  uaConfig: 'bugeye:uaConfig',
  refererConfig: 'bugeye:refererConfig',
  apiKeys: 'bugeye:apiKeys',
  cveQuery: 'bugeye:cveQuery',
  savedTargets: 'bugeye:savedTargets',
  targetNotes: 'bugeye:targetNotes',
  lastSubdomains: 'bugeye:lastSubdomains',
  autoFinderReport: 'bugeye:autoFinderReport',
} as const;

export type Theme = 'dark' | 'light';

async function get<T>(key: string, fallback: T): Promise<T> {
  const result = await browser.storage.local.get(key);
  return (result[key] as T) ?? fallback;
}

async function set(key: string, value: unknown): Promise<void> {
  await browser.storage.local.set({ [key]: value });
}

export const targetStore = {
  get: () => get<string>(KEYS.target, ''),
  set: (value: string) => set(KEYS.target, value),
};

export const themeStore = {
  get: () => get<Theme>(KEYS.theme, 'dark'),
  set: (value: Theme) => set(KEYS.theme, value),
};

export const bannerStore = {
  get: () => get<boolean>(KEYS.bannerDismissed, false),
  set: (value: boolean) => set(KEYS.bannerDismissed, value),
};

export const bulkListStore = {
  get: () => get<string>(KEYS.bulkList, ''),
  set: (value: string) => set(KEYS.bulkList, value),
};

export const checklistStore = {
  get: () => get<Record<string, boolean>>(KEYS.checklist, {}),
  set: (value: Record<string, boolean>) => set(KEYS.checklist, value),
};

export interface UaConfig {
  preset: UaPresetId;
  customValue: string;
  enabled: boolean;
}

export interface RefererConfig {
  mode: RefererMode;
  spoofValue: string;
}

export const headerRulesStore = {
  get: () => get<HeaderRuleDraft[]>(KEYS.headerRules, []),
  set: (value: HeaderRuleDraft[]) => set(KEYS.headerRules, value),
};

export const uaConfigStore = {
  get: () => get<UaConfig>(KEYS.uaConfig, { preset: 'desktop', customValue: '', enabled: false }),
  set: (value: UaConfig) => set(KEYS.uaConfig, value),
};

export const refererConfigStore = {
  get: () => get<RefererConfig>(KEYS.refererConfig, { mode: 'off', spoofValue: '' }),
  set: (value: RefererConfig) => set(KEYS.refererConfig, value),
};

export interface ApiKeys {
  shodan: string;
  hibp: string;
  whoxy: string;
}

export const apiKeysStore = {
  get: () => get<ApiKeys>(KEYS.apiKeys, { shodan: '', hibp: '', whoxy: '' }),
  set: (value: ApiKeys) => set(KEYS.apiKeys, value),
};

export const cveQueryStore = {
  get: () => get<string>(KEYS.cveQuery, ''),
  set: (value: string) => set(KEYS.cveQuery, value),
};

export interface SavedTarget {
  domain: string;
  savedAt: string;
  lastUsedAt: string;
}

export const savedTargetsStore = {
  get: () => get<SavedTarget[]>(KEYS.savedTargets, []),
  set: (value: SavedTarget[]) => set(KEYS.savedTargets, value),
};

export const targetNotesStore = {
  get: () => get<Record<string, string>>(KEYS.targetNotes, {}),
  set: (value: Record<string, string>) => set(KEYS.targetNotes, value),
};

export interface LastSubdomains {
  domain: string;
  subdomains: string[];
  generatedAt: string;
}

// Non-consuming (unlike bulkListStore's send-once pattern): SubFinder writes
// its last result here after a successful run, and any module can read it
// via a "Pull from SubFinder" button without racing other consumers.
export const lastSubdomainsStore = {
  get: () => get<LastSubdomains | null>(KEYS.lastSubdomains, null),
  set: (value: LastSubdomains) => set(KEYS.lastSubdomains, value),
};

export interface StoredAutoFinderReport {
  domain: string;
  report: AutoFinderReport;
  progress: ProgressMap;
  generatedAt: string;
}

// chrome.storage.local, so this survives tab switches, panel navigation and
// browser restarts. Restored on mount only when its domain still matches the
// current target; a target change does not delete it, it just stops being
// shown until the user switches back or reruns.
export const autoFinderReportStore = {
  get: () => get<StoredAutoFinderReport | null>(KEYS.autoFinderReport, null),
  set: (value: StoredAutoFinderReport) => set(KEYS.autoFinderReport, value),
};

export function onStorageChange(
  callback: (changes: Record<string, Browser.storage.StorageChange>) => void,
) {
  const listener = (
    changes: Record<string, Browser.storage.StorageChange>,
    areaName: string,
  ) => {
    if (areaName === 'local') callback(changes);
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
