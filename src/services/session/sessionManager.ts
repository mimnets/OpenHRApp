/**
 * Session Manager — login/auth lifecycle owner.
 *
 * FROZEN MODULE — see Others/CLAUDE.md "Frozen Modules — Change-Control".
 *
 * Responsibilities:
 *   - Wrap pb.collection('users').authRefresh() with retry + error classification.
 *   - Decide when to call pb.authStore.clear(). This is the ONLY file in the repo
 *     allowed to call authStore.clear() (auth.service.ts#logout delegates here).
 *   - Emit typed events so AuthContext can render UI state without owning the
 *     logout decision itself.
 *
 * Design invariants (do not break):
 *   - A transient network error (offline, timeout, 5xx) MUST NOT log the user
 *     out. Only a hard 401/403 from the server does.
 *   - authRefresh() is retried up to 3 times with exponential backoff.
 *   - forceLogout() is the single exit path that clears the auth store.
 */

import { pb } from '../pocketbase';
import { User } from '../../types';
import {
  LogoutReason,
  RefreshResult,
  RefreshStatus,
  SessionListener,
  SessionSnapshot,
} from './sessionManager.types';

// --- Configuration ---------------------------------------------------------

const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const VISIBILITY_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const RETRY_DELAYS_MS = [500, 1500, 3000]; // 3 retries with backoff

// --- Internal state --------------------------------------------------------

let currentUser: User | null = null;
let status: RefreshStatus = { kind: 'idle' };
let lastSuccessfulRefresh = 0;
let periodicTimer: ReturnType<typeof setInterval> | null = null;
const listeners: Set<SessionListener> = new Set();

// --- Helpers ---------------------------------------------------------------

function buildUserFromModel(model: any): User {
  return {
    id: model.id,
    employeeId: model.employee_id || '',
    name: model.name || 'User',
    email: model.email,
    role: (model.role || 'EMPLOYEE').toString().toUpperCase() as any,
    department: model.department || 'Unassigned',
    designation: model.designation || 'Staff',
    teamId: model.team_id || undefined,
    organizationId: model.organization_id || undefined,
    avatar: model.avatar && pb ? pb.files.getURL(model, model.avatar) : undefined,
  };
}

function setStatus(next: RefreshStatus) {
  status = next;
  emit();
}

function setUser(next: User | null) {
  currentUser = next;
  emit();
}

function emit() {
  const snapshot: SessionSnapshot = { user: currentUser, status };
  listeners.forEach((l) => {
    try { l(snapshot); } catch { /* listener errors must not kill the loop */ }
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Classify an auth-refresh error.
 * - Hard auth failure (401/403, explicit "token" message) → force logout.
 * - Everything else (network, timeout, 5xx, offline) → transient, keep session.
 */
function isHardAuthFailure(err: any): boolean {
  if (!err) return false;
  const status = err.status ?? err.response?.status ?? err.originalError?.status;
  if (status === 401 || status === 403) return true;

  // PocketBase sometimes wraps these; look at message as a secondary signal
  const msg = String(err.message || err.response?.message || '').toLowerCase();
  if (msg.includes('invalid token') || msg.includes('missing token')) return true;
  if (msg.includes('not authenticated')) return true;

  // Network failures / aborts / offline → transient
  return false;
}

/**
 * Shared logout implementation used both internally (on TOKEN_INVALID) and by
 * the public `forceLogout` API. Kept as a module-level function so the
 * internal call inside `attemptRefresh` does not depend on the public object
 * being fully constructed.
 */
async function performForceLogout(reason: LogoutReason): Promise<void> {
  if (pb) pb.authStore.clear();
  setUser(null);
  setStatus({ kind: 'forcedLogout', reason, at: Date.now() });
}

// --- Core refresh with retry ----------------------------------------------

async function attemptRefresh(): Promise<RefreshResult> {
  if (!pb || !pb.authStore.isValid) {
    // No token at all — nothing to refresh, not an error.
    return { ok: false };
  }

  let lastErr: any = null;

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length + 1; attempt++) {
    try {
      await pb.collection('users').authRefresh();
      lastSuccessfulRefresh = Date.now();
      setStatus({ kind: 'ok', at: lastSuccessfulRefresh });
      // Sync user from refreshed model
      if (pb.authStore.model) {
        setUser(buildUserFromModel(pb.authStore.model));
      }
      return { ok: true };
    } catch (err) {
      lastErr = err;

      // Hard auth failure → stop retrying, force logout
      if (isHardAuthFailure(err)) {
        await performForceLogout('TOKEN_INVALID');
        return { ok: false, forcedLogout: true };
      }

      // Transient — backoff and retry if we have retries left
      if (attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
    }
  }

  // All retries exhausted — still transient. Keep session, surface status.
  setStatus({
    kind: 'transient',
    at: Date.now(),
    attempts: RETRY_DELAYS_MS.length + 1,
    message: String(lastErr?.message || 'Network error'),
  });
  return { ok: false, transient: true };
}

// --- Public API ------------------------------------------------------------

export const sessionManager = {
  /**
   * Bootstrap the session on app start. Called once by AuthContext.
   * - If there is a stored token, refresh it (with retries).
   * - On hard failure → force logout, return { user: null }.
   * - On transient failure → keep existing authStore model as the "best known"
   *   user and let the periodic/visibility refresh retry later.
   */
  async initialize(): Promise<{ user: User | null }> {
    if (!pb) return { user: null };

    if (!pb.authStore.isValid || !pb.authStore.model) {
      setUser(null);
      return { user: null };
    }

    setStatus({ kind: 'refreshing' });
    const result = await attemptRefresh();

    if (result.forcedLogout) {
      return { user: null };
    }

    // Either ok OR transient — in both cases we keep the stored model as the
    // starting point. On transient, a retry is scheduled by schedulers.
    const user = pb.authStore.model ? buildUserFromModel(pb.authStore.model) : null;
    setUser(user);
    return { user };
  },

  /**
   * Register the current user after a successful login. AuthContext calls
   * this from its `login()` wrapper — auth.service.ts has already populated
   * pb.authStore via authWithPassword.
   */
  setCurrentUser(user: User | null) {
    setUser(user);
    if (user) {
      lastSuccessfulRefresh = Date.now();
      setStatus({ kind: 'ok', at: lastSuccessfulRefresh });
    }
  },

  /**
   * Start periodic background refresh (every 30 minutes).
   * Returns a stop function; call on unmount.
   */
  scheduleRefresh(): () => void {
    if (periodicTimer) clearInterval(periodicTimer);
    periodicTimer = setInterval(() => {
      // Fire-and-forget; attemptRefresh manages its own status/retries.
      void attemptRefresh();
    }, REFRESH_INTERVAL_MS);
    return () => {
      if (periodicTimer) clearInterval(periodicTimer);
      periodicTimer = null;
    };
  },

  /**
   * Called from a visibilitychange listener when the tab becomes visible.
   * Throttled by VISIBILITY_COOLDOWN_MS so we don't thrash refreshes.
   */
  async onVisible(): Promise<void> {
    if (!pb?.authStore.isValid) return;
    if (Date.now() - lastSuccessfulRefresh <= VISIBILITY_COOLDOWN_MS) return;
    await attemptRefresh();
  },

  /**
   * The ONLY sanctioned exit that clears the auth store from inside the app
   * (other than auth.service.ts#logout, which delegates here).
   */
  async forceLogout(reason: LogoutReason): Promise<void> {
    await performForceLogout(reason);
  },

  /** Read-only snapshot. */
  getSnapshot(): SessionSnapshot {
    return { user: currentUser, status };
  },

  /** Subscribe to session state changes. Returns unsubscribe fn. */
  subscribe(listener: SessionListener): () => void {
    listeners.add(listener);
    // Immediately emit current state so the subscriber syncs up.
    try { listener({ user: currentUser, status }); } catch { /* ignore */ }
    return () => { listeners.delete(listener); };
  },
};
