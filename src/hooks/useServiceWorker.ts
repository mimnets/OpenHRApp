import { useRegisterSW } from 'virtual:pwa-register/react';
import { useCallback, useEffect, useRef, useState } from 'react';

const UPDATE_CHECK_INTERVAL = 60 * 1000; // 60 seconds
const JUST_UPDATED_KEY = 'pwa-just-updated';
const SUPPRESS_WINDOW_MS = 30 * 1000;

export function useServiceWorker() {
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const [isUpdating, setIsUpdating] = useState(false);
  const justUpdatedAtRef = useRef<number | null>(null);

  if (justUpdatedAtRef.current === null && typeof sessionStorage !== 'undefined') {
    const stored = sessionStorage.getItem(JUST_UPDATED_KEY);
    if (stored) {
      justUpdatedAtRef.current = parseInt(stored, 10) || 0;
      sessionStorage.removeItem(JUST_UPDATED_KEY);
    } else {
      justUpdatedAtRef.current = 0;
    }
  }

  const {
    needRefresh: [needRefreshRaw, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(swUrl, registration) {
      if (!registration) return;

      intervalRef.current = setInterval(async () => {
        if (registration.installing) return;
        if ('connection' in navigator && !navigator.onLine) return;

        try {
          const resp = await fetch(swUrl, {
            cache: 'no-store',
            headers: { 'cache-control': 'no-cache' },
          });
          if (resp?.status === 200) {
            await registration.update();
          }
        } catch {
          // Network error — skip this cycle
        }
      }, UPDATE_CHECK_INTERVAL);
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  // Reload when new SW takes control. Dedupe via reloadedRef so we never
  // reload twice (controllerchange + applyUpdate fallback timeout).
  const reloadedRef = useRef(false);
  useEffect(() => {
    const handleControllerChange = () => {
      if (reloadedRef.current) return;
      reloadedRef.current = true;
      window.location.reload();
    };
    navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange);
    return () => {
      navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  // Check for updates when tab regains focus / device wakes / network returns.
  // iOS Safari doesn't always fire visibilitychange when a PWA comes back from
  // background; the online event covers that case (and offline -> online
  // transitions in general).
  useEffect(() => {
    const checkForUpdate = () => {
      navigator.serviceWorker?.getRegistration().then(r => r?.update()).catch((err) => {
        console.error('Service worker update check failed:', err);
      });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', checkForUpdate);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', checkForUpdate);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    setIsUpdating(true);
    try {
      sessionStorage.setItem(JUST_UPDATED_KEY, String(Date.now()));
    } catch {
      // sessionStorage unavailable — non-fatal
    }
    updateServiceWorker(true);
    // Fallback: if controllerchange never fires within 3s, force reload
    // so the spinner doesn't hang. Deduped via reloadedRef.
    setTimeout(() => {
      if (reloadedRef.current) return;
      reloadedRef.current = true;
      window.location.reload();
    }, 3000);
  }, [updateServiceWorker]);

  const close = useCallback(() => {
    setNeedRefresh(false);
    setOfflineReady(false);
  }, [setNeedRefresh, setOfflineReady]);

  // Suppress banner briefly after a just-completed update to break reload loops
  // where a freshly activated SW immediately reports another update available.
  const withinSuppressWindow =
    justUpdatedAtRef.current !== null &&
    justUpdatedAtRef.current > 0 &&
    Date.now() - justUpdatedAtRef.current < SUPPRESS_WINDOW_MS;
  const needRefresh = withinSuppressWindow ? false : needRefreshRaw;

  return { needRefresh, offlineReady, applyUpdate, isUpdating, close };
}
