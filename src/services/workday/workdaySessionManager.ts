/**
 * Workday Session Manager — client-side attendance session lifecycle.
 *
 * FROZEN MODULE — see Others/CLAUDE.md "Frozen Modules — Change-Control".
 *
 * Responsibilities:
 *   - Given an employee id, fetch their open sessions.
 *   - For any session BEFORE today with no check_out, close it as a
 *     client-side fallback with a clear "Auto-closed by system" remark.
 *     Uses the employee's shift autoSessionCloseTime, falling back to the
 *     org app-config, then to "23:59".
 *   - Return the current day's active session only (same behavior as before).
 *
 * Why client-side fallback:
 *   The server cron (cron.pb.js#auto_close_sessions) is authoritative. If it
 *   runs, this module finds nothing to close and is a no-op. If the cron is
 *   not deployed or has been disabled (which has happened historically), the
 *   client-side fallback ensures a forgotten check-out is still closed the
 *   next time the employee opens the app — instead of showing as "active"
 *   for days.
 *
 * Design invariants (do not break):
 *   - NEVER mutate today's session from here. Same-day max-time close is
 *     owned by the server cron, and client-side closure would race it.
 *   - Only close sessions older than the current local date (YYYY-MM-DD).
 *   - Always append a distinct remark so audit trails can distinguish a
 *     client fallback from a server cron close or a manual user close.
 */

import { Attendance } from '../../types';
import { apiClient } from '../api.client';
import { organizationService } from '../organization.service';
import { shiftService } from '../shift.service';
import { ReconcileResult } from './workdaySessionManager.types';

const CLIENT_CLOSE_REMARK = ' [System: Auto-closed — no check-out recorded]';
const FALLBACK_CLOSE_TIME = '23:59';

/** Internal mapper — kept local on purpose so this module owns its contract. */
function mapAttendance(r: any): Attendance {
  return {
    id: r.id.toString().trim(),
    employeeId: r.employee_id ? r.employee_id.toString().trim() : '',
    employeeName: r.employee_name,
    date: r.date,
    checkIn: r.check_in,
    checkOut: r.check_out || '',
    status: r.status as any,
    location: {
      lat: Number(r.latitude) || 0,
      lng: Number(r.longitude) || 0,
      address: r.location || 'Unknown',
    },
    selfie: r.selfie ? apiClient.pb?.files.getURL(r, r.selfie) : undefined,
    remarks: r.remarks || '',
    dutyType: r.duty_type as any,
    organizationId: r.organization_id,
  };
}

function todayYMD(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Resolve the auto-close time this employee's session should be stamped with.
 * Priority: employee shift > org app-config > hardcoded fallback.
 */
async function resolveCloseTime(employeeId: string, date: string): Promise<string> {
  try {
    if (apiClient.pb) {
      let shiftId: string | undefined;
      try {
        const empRecord = await apiClient.pb.collection('users').getOne(employeeId.trim());
        shiftId = empRecord.shift_id || undefined;
      } catch { /* employee record not accessible; fall through */ }

      const shift = await shiftService.resolveShiftForEmployee(employeeId, shiftId, date);
      if (shift?.autoSessionCloseTime) return shift.autoSessionCloseTime;
    }
  } catch { /* shift resolution failed; fall through to org config */ }

  try {
    const config = await organizationService.getConfig();
    if (config?.autoSessionCloseTime) return config.autoSessionCloseTime;
  } catch { /* no config; fall through */ }

  return FALLBACK_CLOSE_TIME;
}

export const workdaySessionManager = {
  /**
   * Return today's active session and close any past-date open sessions.
   * This is the public API the attendance service delegates to.
   */
  async reconcileOpenSessions(employeeId: string): Promise<ReconcileResult> {
    const empty: ReconcileResult = { active: undefined, closedPast: [] };
    if (!apiClient.pb || !apiClient.isConfigured()) return empty;

    const today = todayYMD();

    let openRecords: any[];
    try {
      const result = await apiClient.pb.collection('attendance').getList(1, 50, {
        filter: `employee_id = "${employeeId.trim()}" && check_out = ""`,
      });
      openRecords = result.items;
    } catch (e: any) {
      console.error('[WorkdaySessionManager] Failed to fetch open sessions:', e?.message || e);
      return empty;
    }

    let active: Attendance | undefined;
    const closedPast: Attendance[] = [];

    for (const rec of openRecords) {
      const date = rec.date as string;
      if (date === today) {
        // Today's open session → return as active, never close here.
        active = mapAttendance(rec);
        continue;
      }
      if (date > today) {
        // Future-dated open record (unexpected). Leave it alone and log.
        console.warn('[WorkdaySessionManager] Future-dated open session ignored:', rec.id);
        continue;
      }

      // Past-date open session → close it as a client-side fallback.
      try {
        const closeTime = await resolveCloseTime(employeeId, date);
        const existingRemarks = (rec.remarks as string) || '';
        const updated = await apiClient.pb.collection('attendance').update(rec.id.trim(), {
          check_out: closeTime,
          remarks: existingRemarks + CLIENT_CLOSE_REMARK,
        });
        closedPast.push(mapAttendance(updated));
        console.log(
          `[WorkdaySessionManager] Client-closed past session ${rec.id} (date: ${date}, close: ${closeTime})`
        );
      } catch (e: any) {
        // Do not abort on one failure — continue reconciling the rest.
        console.error(
          `[WorkdaySessionManager] Failed to close past session ${rec.id}:`,
          e?.message || e
        );
      }
    }

    if (closedPast.length > 0) {
      // Invalidate any consumer caches and notify subscribers so the UI
      // refreshes lists/dashboards.
      apiClient.notify();
    }

    return { active, closedPast };
  },
};
