
import { apiClient, dedupe } from './api.client';
import { Attendance } from '../types';
import { organizationService } from './organization.service';
import { notificationService } from './notification.service';
import { workdaySessionManager } from './workday/workdaySessionManager';
import { ReconcileResult } from './workday/workdaySessionManager.types';

let cachedAttendance: Attendance[] | null = null;
let attCacheTimestamp = 0;
const ATT_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

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
    cachedAttendance = null;
    attCacheTimestamp = 0;
  },

  async getAttendance(): Promise<Attendance[]> {
    if (cachedAttendance && Date.now() - attCacheTimestamp < ATT_CACHE_TTL) return cachedAttendance;
    return dedupe('attendance', async () => {
      if (!apiClient.pb || !apiClient.isConfigured()) {
        console.warn("[AttendanceService] PocketBase not configured");
        return [];
      }
      try {
        // PocketBase API rules filter by organization_id automatically
        const records = await apiClient.pb.collection('attendance').getFullList({ sort: '-date' });
        const result = records.map(mapAttendance);
        cachedAttendance = result;
        attCacheTimestamp = Date.now();
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

  async saveAttendance(data: Attendance) {
    if (!apiClient.pb || !apiClient.isConfigured()) return;
    const orgId = apiClient.getOrganizationId();
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
    if (data.selfie) payload.selfie = data.selfie;
    await apiClient.pb.collection('attendance').create(await apiClient.toFormData(payload, 'selfie.webp'));
    attendanceService.clearCache();
    apiClient.notify();

    // Late Alert: notify line manager if status is LATE
    if (data.status === 'LATE') {
      try {
        const orgConfig = await organizationService.getNotificationConfig();
        if (orgConfig.enabledTypes.includes('ATTENDANCE')) {
          const empRecord = await apiClient.pb.collection('users').getOne(data.employeeId.trim());
          const managerId = empRecord.line_manager_id;
          if (managerId) {
            await notificationService.createNotification({
              userId: managerId,
              type: 'ATTENDANCE',
              title: `${data.employeeName} checked in late`,
              message: `Checked in at ${data.checkIn} on ${data.date}`,
              referenceType: 'attendance',
            });
          }
        }
      } catch (e: any) {
        console.error("[AttendanceService] Failed to send late alert:", e?.message || e);
      }
    }
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
