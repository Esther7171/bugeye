import { useCallback, useState } from 'react';
import { browser } from 'wxt/browser';

// Every module that needs host access requests this same broad pair instead
// of a per-origin pattern, so the browser only ever prompts once (for
// "Read and change all your data on all websites"): after that grant,
// permissions.request() resolves true with no further prompt for any site,
// since the requested set is already covered.
const ALL_URLS = ['http://*/*', 'https://*/*'];

export function useHostPermission() {
  const [pending, setPending] = useState(false);

  const ensure = useCallback(async (_origin: string): Promise<boolean> => {
    setPending(true);
    try {
      // Call permissions.request() directly, as the very first await, with
      // no contains() pre-check in front of it. Two reasons: (1) Firefox
      // only treats request() as tied to the triggering click if it runs in
      // the same task as that click - any await before it (even a fast,
      // already-resolved one) can break that chain and cause a silent
      // denial with no prompt ever shown. (2) It's redundant anyway:
      // request() already resolves to true with no prompt if the requested
      // set is already granted, in both Chrome and Firefox.
      return await browser.permissions.request({ origins: ALL_URLS });
    } catch {
      return false;
    } finally {
      setPending(false);
    }
  }, []);

  const ensureMany = useCallback(async (origins: string[]): Promise<boolean> => {
    if (origins.length === 0) return true;
    setPending(true);
    try {
      return await browser.permissions.request({ origins: ALL_URLS });
    } catch {
      return false;
    } finally {
      setPending(false);
    }
  }, []);

  return { ensure, ensureMany, pending };
}
