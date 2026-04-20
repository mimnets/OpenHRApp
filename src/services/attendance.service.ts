
import { apiClient, dedupe } from './api.client';
import { Attendance } from '../types';
import { organizationService } from './organization.service';
import { notificationService } from './notification.service';
import { workdaySessionManager } from './workday/workdaySessionManager';
import { ReconcileResult } from './workday/workdaySessionManager.types';
import { convertToWebP } from '../utils/imageConvert';

// Selfie-specific WebP settings. These apply ONLY to attendance selfies —
// avatars, blog covers, logos, and other uploads continue to use the
// `toFormData` default (0.8, unbounded). A 720px face photo at 0.65 quality
// is visually indistinguishable for audit use and ~30–40% smaller than the
// previous 0.8/full-resolution capture. Reducing the payload directly
// shrinks the rush-hour upload bandwidth and the async-upload retry surface.
const SELFIE_WEBP_QUALITY = 0.65;
const SELFIE_MAX_DIMENSION = 720;

// Cache is keyed by query window so different callers (dashboard=30d, reports=365d)
// don't evict each other. Key format: "sinceDate|untilDate|employeeId|orgId".
const attCache = new Map<string, { data: Attendance[]; ts: number }>();
const ATT_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

const DEFAULT_DAYS = 30;
const daysAgoISO = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
};

export interface GetAttendanceOptions {
  /** YYYY-MM-DD. Defaults to 30 days ago. Pass '' to disable the lower bound. */
  since?: string;
  /** YYYY-MM-DD. Defaults to today (no upper bound applied). */
  until?: string;
  /** Scope to a single employee (uses indexed employee_id filter). */
  employeeId?: string;
  /** Safety cap on rows returned. Raise only for explicit historical reports. */
  maxRows?: number;
}

// ─── Async selfie upload (RC #4) ─────────────────────────────────────────
// Uploading a selfie as part of check-in used to block the user for
// seconds during rush hour. We now create the attendance record first
// and PATCH the selfie afterwards, with retries + a localStorage queue
// for offline / failure recovery.

interface PendingSelfie {
  recordId: string;
  selfieDataUrl: string;
  queuedAt: number;
}

const SELFIE_QUEUE_KEY = 'openhr_pending_selfies';
const MAX_SELFIE_RETRIES = 3;

const readSelfieQueue = (): PendingSelfie[] => {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(SELFIE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const writeSelfieQueue = (queue: PendingSelfie[]) => {
  try {
    if (typeof localStorage === 'undefined') return;
    if (queue.length === 0) localStorage.removeItem(SELFIE_QUEUE_KEY);
    else localStorage.setItem(SELFIE_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    // Storage quota exceeded — drop the queue to avoid breaking the app.
    console.warn("[AttendanceService] Could not persist selfie queue:", e);
  }
};

const uploadSelfieOnce = async (recordId: string, selfieDataUrl: string): Promise<void> => {
  if (!apiClient.pb) throw new Error('PocketBase not configured');
  // Convert with selfie-specific quality + dimension cap instead of routing
  // through `apiClient.toFormData` (which uses the generic 0.8/unbounded
  // defaults appropriate for covers/logos). Build the FormData manually.
  const webpBlob = await convertToWebP(selfieDataUrl, SELFIE_WEBP_QUALITY, SELFIE_MAX_DIMENSION);
  const formData = new FormData();
  formData.append('selfie', webpBlob, 'selfie.webp');
  await apiClient.pb.collection('attendance').update(recordId, formData);
};

const uploadSelfieWithRetry = async (recordId: string, selfieDataUrl: string): Promise<void> => {
  let lastErr: any;
  for (let attempt = 1; attempt <= MAX_SELFIE_RETRIES; attempt++) {
    try {
      await uploadSelfieOnce(recordId, selfieDataUrl);
      attendanceService.clearCache();
      apiClient.notify();
      return;
    } catch (e) {
      lastErr = e;
      // Exponential backoff: 1 s, 3 s, 9 s
      const delay = Math.pow(3, attempt - 1) * 1000;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  // Give up inline — push to persistent queue for retry on next app boot.
  const queue = readSelfieQueue();
  queue.push({ recordId, selfieDataUrl, queuedAt: Date.now() });
  writeSelfieQueue(queue);
  throw lastErr;
};

const notifyLineManagerOfLate = async (data: Attendance): Promise<void> => {
  if (!apiClient.pb) return;
  const orgConfig = await organizationService.getNotificationConfig();
  if (!orgConfig.enabledTypes.includes('ATTENDANCE')) return;
  const empRecord = await apiClient.pb.collection('users').getOne(data.employeeId.trim());
  const managerId = empRecord.line_manager_id;
  if (!managerId) return;
  await notificationService.createNotification({
    userId: managerId,
    type: 'ATTENDANCE',
    title: `${data.employeeName} checked in late`,
    message: `Checked in at ${data.checkIn} on ${data.date}`,
    referenceType: 'attendance',
  });
};

const mapAttendance = (r: any): Attendance => ({
  id: r.id.toString().trim(),
  employeeId: r.employee_id ? r.employee_id.toString().trim() : "", 
  employeeName: r.employee_name,
  date: r.date,
  checkIn: r.check_in,
  checkOut: r.check_out || "",
  status: r.status as any,
  location: { 
    lat: Number(r.latitude) || 0, 
    lng: Number(r.longitude) || 0, 
    address: r.location || "Unknown" 
  },
  selfie: r.selfie ? apiClient.pb?.files.getURL(r, r.selfie) : undefined,
  remarks: r.remarks || "",
  dutyType: r.duty_type as any,
  organizationId: r.organization_id
});

export const attendanceService = {
  clearCache() {
    attCache.clear();
  },

  /**
   * Fetch attendance records, scoped by default to the last 30 days.
   *
   * Callers that need a wider window (Reports, AttendanceLogs audit mode) must
   * pass explicit `since`/`until` options. Always pair with an `organization_id`
   * server-side API rule — this client-side filter is defence-in-depth.
   *
   * Performance: previously this loaded the whole `attendance` collection
   * unbounded. For a multi-tenant DB with 16+ orgs × 100+ users × 250+ days,
   * that was the main cause of the 9 AM rush-hour stall. See
   * `Others/SCALING_PLAN.md §3.1`.
   */
  async getAttendance(options: GetAttendanceOptions = {}): Promise<Attendance[]> {
    const since = options.since !== undefined ? options.since : daysAgoISO(DEFAULT_DAYS);
    const until = options.until || '';
    const employeeId = options.employeeId || '';
    const maxRows = options.maxRows || 2000;
    const orgId = apiClient.getOrganizationId() || '';
    const cacheKey = `${since}|${until}|${employeeId}|${orgId}`;

    const cached = attCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < ATT_CACHE_TTL) return cached.data;

    return dedupe(`attendance:${cacheKey}`, async () => {
      if (!apiClient.pb || !apiClient.isConfigured()) {
        console.warn("[AttendanceService] PocketBase not configured");
        return [];
      }
      try {
        // Build a server-side filter so the DB returns only relevant rows.
        // Server-side API rules still enforce org isolation; the explicit
        // organization_id clause here is defence-in-depth and helps SQLite
        // use the index instead of a full scan.
        const clauses: string[] = [];
        if (orgId) clauses.push(`organization_id = "${orgId}"`);
        if (since) clauses.push(`date >= "${since}"`);
        if (until) clauses.push(`date <= "${until}"`);
        if (employeeId) clauses.push(`employee_id = "${employeeId}"`);
        const filter = clauses.join(' && ');

        const records = await apiClient.pb.collection('attendance').getList(1, maxRows, {
          sort: '-date',
          filter: filter || undefined,
        });
        const result = records.items.map(mapAttendance);
        attCache.set(cacheKey, { data: result, ts: Date.now() });
        return result;
      } catch (e: any) {
        console.error("[AttendanceService] Failed to fetch attendance:", e?.message || e);
        return [];
      }
    });
  },

  /**
   * Returns today's active session for the employee.
   *
   * Past-date open sessions are reconciled (closed) by the workday session
   * manager (FROZEN MODULE — see Others/CLAUDE.md). Callers that also need
   * the list of past sessions that were just closed should call
   * `getActiveAttendanceWithReconciliation` instead.
   */
  async getActiveAttendance(employeeId: string): Promise<Attendance | undefined> {
    const { active } = await workdaySessionManager.reconcileOpenSessions(employeeId);
    return active;
  },

  /**
   * Same as `getActiveAttendance` but also returns the list of past-date
   * sessions that were just auto-closed — so the UI can show a one-time
   * toast explaining what happened.
   */
  async getActiveAttendanceWithReconciliation(employeeId: string): Promise<ReconcileResult> {
    return workdaySessionManager.reconcileOpenSessions(employeeId);
  },

  /**
   * Save an attendance record. Returns as soon as the core record is
   * created; the selfie (if any) uploads in the background with retries
   * and is queued in localStorage if it ultimately fails. See
   * Others/SCALING_PLAN.md §3.4 and SCALING_IMPLEMENTATION_LOG.md RC#4.
   */
  async saveAttendance(data: Attendance) {
    if (!apiClient.pb || !apiClient.isConfigured()) return;
    const orgId = apiClient.getOrganizationId();

    // Step 1 (synchronous, fast): create the record WITHOUT the selfie.
    // This unblocks the user in <1 s instead of waiting for a mobile-network
    // multipart upload. Critical for rush-hour: during check-in bursts, 20
    // simultaneous multipart uploads were starving the server's connections.
    const payload: any = {
      employee_id: data.employeeId.trim(),
      employee_name: data.employeeName,
      date: data.date,
      check_in: data.checkIn,
      status: data.status,
      remarks: data.remarks || "",
      location: data.location?.address || "",
      latitude: parseFloat(String(data.location?.lat || 0)),
      longitude: parseFloat(String(data.location?.lng || 0)),
      duty_type: data.dutyType,
      organization_id: orgId
    };
    const created = await apiClient.pb.collection('attendance').create(payload);
    attendanceService.clearCache();
    apiClient.notify();

    // Step 2 (asynchronous, best-effort): upload the selfie in the
    // background. Success → record is patched with the file URL. Failure
    // after retries → payload queued in localStorage and retried on next
    // app boot via retryPendingSelfies().
    if (data.selfie) {
      // Fire-and-forget. We deliberately do NOT await this so the UI
      // sees "Checked in ✓" before the upload finishes.
      uploadSelfieWithRetry(created.id, data.selfie).catch((err) => {
        console.warn("[AttendanceService] Selfie upload failed after retries, queued for retry:", err?.message || err);
      });
    }

    // Late Alert: notify line manager if status is LATE. Runs in parallel
    // with the selfie upload; both are independent of the check-in ack.
    if (data.status === 'LATE') {
      // Fire-and-forget; don't block the user on the notification round-trip.
      notifyLineManagerOfLate(data).catch((e: any) => {
        console.error("[AttendanceService] Failed to send late alert:", e?.message || e);
      });
    }
  },

  /**
   * Retries any selfie uploads that were queued after network failure.
   * Called from app bootstrap. Safe to call repeatedly — a successful
   * upload removes the entry; a failing one stays queued for next time.
   */
  async retryPendingSelfies(): Promise<void> {
    if (!apiClient.pb || !apiClient.isConfigured()) return;
    const queue = readSelfieQueue();
    if (queue.length === 0) return;
    console.log(`[AttendanceService] Retrying ${queue.length} pending selfie upload(s)`);
    const remaining: PendingSelfie[] = [];
    for (const entry of queue) {
      try {
        await uploadSelfieOnce(entry.recordId, entry.selfieDataUrl);
        // success — drop from queue
      } catch (e) {
        // keep it for next time, but expire after 7 days
        if (Date.now() - entry.queuedAt < 7 * 24 * 60 * 60 * 1000) {
          remaining.push(entry);
        }
      }
    }
    writeSelfieQueue(remaining);
    if (remaining.length === 0) attendanceService.clearCache();
  },

  async updateAttendance(id: string, data: Partial<Attendance>) {
    if (!apiClient.pb || !apiClient.isConfigured()) return;
    const pbUpdates: any = {};
    if (data.date) pbUpdates.date = data.date;
    if (data.checkIn) pbUpdates.check_in = data.checkIn;
    if (data.checkOut) pbUpdates.check_out = data.checkOut;
    if (data.remarks) pbUpdates.remarks = data.remarks;
    if (data.status) pbUpdates.status = data.status;
    await apiClient.pb.collection('attendance').update(id.trim(), pbUpdates);
    attendanceService.clearCache();
    apiClient.notify();
  },

  async deleteAttendance(id: string) {
    if (!apiClient.pb || !apiClient.isConfigured()) return;
    await apiClient.pb.collection('attendance').delete(id.trim());
    attendanceService.clearCache();
    apiClient.notify();
  }
};
