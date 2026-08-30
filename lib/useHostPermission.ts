import { useCallback, useState } from 'react';
import { sendToBackground } from '@/lib/messaging';

export function useHostPermission() {
  const [pending, setPending] = useState(false);

  const ensure = useCallback(async (origin: string): Promise<boolean> => {
    setPending(true);
    try {
      const has = await sendToBackground({ type: 'HAS_HOST_PERMISSION', origin });
      if (has.granted) return true;
      const req = await sendToBackground({ type: 'REQUEST_HOST_PERMISSION', origin });
      return req.granted;
    } finally {
      setPending(false);
    }
  }, []);

  const ensureMany = useCallback(async (origins: string[]): Promise<boolean> => {
    if (origins.length === 0) return true;
    setPending(true);
    try {
      const has = await sendToBackground({ type: 'HAS_HOST_PERMISSIONS', origins });
      if (has.granted) return true;
      const req = await sendToBackground({ type: 'REQUEST_HOST_PERMISSIONS', origins });
      return req.granted;
    } finally {
      setPending(false);
    }
  }, []);

  return { ensure, ensureMany, pending };
}
