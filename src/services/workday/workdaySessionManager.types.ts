/**
 * Workday Session Manager Types
 *
 * FROZEN MODULE — see Others/CLAUDE.md "Frozen Modules — Change-Control".
 * This module owns every CLIENT-SIDE open-session close decision. The server
 * cron (Others/pb_hooks/cron.pb.js#auto_close_sessions) remains authoritative.
 */

import { Attendance } from '../../types';

export type CloseReason =
  | 'PAST_DATE_NO_CHECKOUT';  // the only client-side reason we close with

export interface ReconcileResult {
  /** The employee's currently-active session (today only), if any. */
  active: Attendance | undefined;
  /**
   * Past-date open sessions that we closed right now as a fallback because
   * the server cron either didn't run or isn't deployed. UI surfaces this
   * as a one-time toast so the employee knows their session from an earlier
   * day was reconciled.
   */
  closedPast: Attendance[];
}
