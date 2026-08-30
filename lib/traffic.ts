export interface HeaderRuleDraft {
  id: string;
  name: string;
  value: string;
  enabled: boolean;
}

export function newHeaderRule(): HeaderRuleDraft {
  return { id: crypto.randomUUID(), name: '', value: '', enabled: true };
}

export type UaPresetId = 'desktop' | 'mobile' | 'googlebot' | 'custom';

export interface UaPreset {
  id: UaPresetId;
  label: string;
  value: string;
}

export const UA_PRESETS: UaPreset[] = [
  {
    id: 'desktop',
    label: 'Desktop Chrome (Windows)',
    value:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  },
  {
    id: 'mobile',
    label: 'Mobile Chrome (Android)',
    value:
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  },
  {
    id: 'googlebot',
    label: 'Googlebot',
    value: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  },
  { id: 'custom', label: 'Custom string', value: '' },
];

export type RefererMode = 'off' | 'strip' | 'spoof';

export const REFERER_MODES: { id: RefererMode; label: string }[] = [
  { id: 'off', label: 'Leave as-is' },
  { id: 'strip', label: 'Strip (remove header)' },
  { id: 'spoof', label: 'Spoof (set custom value)' },
];
