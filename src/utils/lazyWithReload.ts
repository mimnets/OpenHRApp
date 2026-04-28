import { lazy, ComponentType } from 'react';

const RELOAD_KEY = 'openhr_chunk_reload_at';
const RELOAD_COOLDOWN_MS = 30_000;

const isChunkLoadError = (err: unknown): boolean => {
  const msg = (err as { message?: string })?.message || String(err);
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /ChunkLoadError/i.test(msg) ||
    /Loading chunk \d+ failed/i.test(msg) ||
    /Loading CSS chunk/i.test(msg) ||
    /MIME type of "text\/html"/i.test(msg)
  );
};

export function lazyWithReload<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await importer();
    } catch (err) {
      if (!isChunkLoadError(err)) throw err;

      const now = Date.now();
      const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
      if (now - last < RELOAD_COOLDOWN_MS) throw err;

      sessionStorage.setItem(RELOAD_KEY, String(now));
      try {
        const regs = await navigator.serviceWorker?.getRegistrations?.();
        if (regs) await Promise.all(regs.map(r => r.unregister()));
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
      } catch { /* best-effort */ }
      window.location.reload();
      return new Promise(() => {});
    }
  });
}
