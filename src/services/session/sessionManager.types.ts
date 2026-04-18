/**
 * Session Manager Types
 *
 * FROZEN MODULE — see Others/CLAUDE.md "Frozen Modules — Change-Control".
 * This module owns every auth-clear decision in the app. Do not add new
 * authStore.clear() call sites elsewhere.
 */

import { User } from '../../types';

export type LogoutReason =
  | 'USER_INITIATED'   // explicit user action (logout button)
  | 'TOKEN_INVALID'    // hard 401/403 from server — token no longer valid
  | 'NOT_VERIFIED';    // account not verified (handled in auth.service.login)

export type RefreshStatus =
  | { kind: 'idle' }
  | { kind: 'refreshing' }
  | { kind: 'ok'; at: number }
  | { kind: 'transient'; at: number; attempts: number; message?: string }
  | { kind: 'forcedLogout'; reason: LogoutReason; at: number };

export interface RefreshResult {
  ok: boolean;
  /** true if failure was transient (network, 5xx, offline) — session kept */
  transient?: boolean;
  /** true if failure was a hard auth error — session cleared */
  forcedLogout?: boolean;
}

export interface SessionSnapshot {
  user: User | null;
  status: RefreshStatus;
}

export type SessionListener = (snapshot: SessionSnapshot) => void;
