import { useRegisterSW } from 'virtual:pwa-register/react';
import { useCallback, useEffect, useRef, useState } from 'react';

const UPDATE_CHECK_INTERVAL = 60 * 1000; // 60 seconds

export function useServiceWorker() {
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const [isUpdating, setIsUpdating] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
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

  // Reload when new SW takes control — fallback for when updateServiceWorker()'s
  // internal reload races activation and the page ends up on stale chunks
  useEffect(() => {
    const handleControllerChange = () => {
      window.location.reload();
    };
    navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange);
    return () => {
      navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  // Check for updates when tab regains focus / device wakes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        navigator.serviceWorker?.getRegistration().then(r => r?.update()).catch((err) => {
          console.error('Service worker update check failed:', err);
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    setIsUpdating(true);
    // reloadPage=true: vite-plugin-pwa calls location.reload() after SKIP_WAITING
    // controllerchange listener above is the safety net if that races
    updateServiceWorker(true);
  }, [updateServiceWorker]);

  const close = useCallback(() => {
    setNeedRefresh(false);
    setOfflineReady(false);
  }, [setNeedRefresh, setOfflineReady]);

  return { needRefresh, offlineReady, applyUpdate, isUpdating, close };
}
