
import { pb, isPocketBaseConfigured } from './pocketbase';
import { convertToWebP } from '../utils/imageConvert';

const subscribers: Set<() => void> = new Set();

// Request deduplication: prevents duplicate in-flight requests for the same key
const inflightRequests = new Map<string, Promise<any>>();

export function dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (inflightRequests.has(key)) return inflightRequests.get(key)! as Promise<T>;
  const promise = fn().finally(() => inflightRequests.delete(key));
  inflightRequests.set(key, promise);
  return promise;
}

// Opt-in retry wrapper for transient failures during high concurrency.
// See Others/CONCURRENCY_FIX_RECORD.md for the rationale, scope, and
// rollback plan. Deliberately does NOT retry auth errors (401/403) —
// that stays the sole responsibility of sessionManager (frozen module).
const RETRY_DELAYS_MS = [250, 750, 2000];

const shouldRetry = (err: any): boolean => {
  // PocketBase auto-cancellation — honor the caller's intent, don't retry.
  if (err?.isAbort) return false;
  const status = err?.status ?? err?.response?.status;
  // No status → fetch-level failure (network drop, DNS, CORS preflight). Retry.
  if (status === undefined || status === 0) return true;
  // Transient upstream / rate-limit. Retry.
  if (status === 429 || status === 502 || status === 503 || status === 504) return true;
  // Anything else (400/401/403/404/409/422/500) is either a user-correctable
  // error or a deterministic server bug — retrying won't help and may mask it.
  return false;
};

export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: any;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      if (attempt === RETRY_DELAYS_MS.length || !shouldRetry(e)) break;
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
    }
  }
  throw lastErr;
}

export const apiClient = {
  pb,
  isConfigured: isPocketBaseConfigured,

  // Event Bus for global state updates
  subscribe(callback: () => void) {
    subscribers.add(callback);
    return () => { subscribers.delete(callback); };
  },

  notify() {
    subscribers.forEach(cb => cb());
  },

  // Helper to get current Organization ID
  getOrganizationId(): string | undefined {
    const orgId = pb?.authStore.model?.organization_id;
    if (!orgId && pb?.authStore.isValid) {
      console.warn("[API Client] User authenticated but no organization_id found in auth model");
    }
    return orgId;
  },

  // Helpers
  dataURLtoBlob(dataurl: string) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) { u8arr[n] = bstr.charCodeAt(n); }
    return new Blob([u8arr], { type: mime });
  },

  async toFormData(data: any, fileName: string = 'file.webp') {
    const formData = new FormData();
    for (const key of Object.keys(data)) {
      const value = data[key];
      if (typeof value === 'string' && value.startsWith('data:image/')) {
        const webpBlob = await convertToWebP(value);
        formData.append(key, webpBlob, fileName);
      } else if (typeof value === 'string' && value.startsWith('data:')) {
        formData.append(key, this.dataURLtoBlob(value), fileName);
      } else if (value !== null && value !== undefined) {
        formData.append(key, value);
      }
    }
    return formData;
  }
};
