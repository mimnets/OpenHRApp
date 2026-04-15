
import { apiClient, dedupe } from './api.client';
import { Attendance } from '../types';
import { organizationService } from './organization.service';
import { shiftService } from './shift.service';
import { notificationService } from './notification.service';

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
        const records = await apiClient.pb.collection('attendance').getFullList({ sort: '-date' });
        console.log(`[AttendanceService] Fetched ${records.length} attendance records`);
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

  async getActiveAttendance(employeeId: string): Promise<Attendance | undefined> {
    if (!apiClient.pb || !apiClient.isConfigured()) return undefined;
    try {
      const today = new Date().toISOString().split('T')[0];
      const config = await organizationService.getConfig();

      // Try to get the employee record to find their shiftId
      let employeeShiftId: string | undefined;
      try {
        const empRecord = await apiClient.pb.collection('users').getOne(employeeId.trim());
        employeeShiftId = empRecord.shift_id || undefined;
      } catch { /* ignore - fallback to global config */ }

      // Resolve employee's effective shift
      const shift = await shiftService.resolveShiftForEmployee(employeeId, employeeShiftId, today);

      const result = await apiClient.pb.collection('attendance').getList(1, 50, {
        filter: `employee_id = "${employeeId.trim()}" && check_out = ""`
      });

      let activeToday: Attendance | undefined = undefined;

      // Determine auto-close time: shift > global config > 23:59
      const autoCloseTime = shift?.autoSessionCloseTime || config.autoSessionCloseTime || "23:59";
      
      // Calculate current time string HH:mm for comparison
      const now = new Date();
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      const currentTimeStr = `${h}:${m}`;

      // Check if ATTENDANCE notifications are enabled (for missed check-out alerts)
      let attendanceNotificationsEnabled = false;
      try {
        const orgConfig = await organizationService.getNotificationConfig();
        attendanceNotificationsEnabled = orgConfig.enabledTypes.includes('ATTENDANCE');
      } catch { /* ignore */ }

      for (const item of result.items) {
        if (item.date < today) {
          // Past unclosed session: Close immediately
          await apiClient.pb.collection('attendance').update(item.id, {
            check_out: autoCloseTime,
            remarks: (item.remarks || "") + " [System: Auto-Closed Past Date]"
          });
          // Missed check-out alert
          if (attendanceNotificationsEnabled) {
            notificationService.createNotification({
              userId: item.employee_id,
              type: 'ATTENDANCE',
              title: 'Your session was auto-closed',
              message: `Check-out was missing for ${item.date}. Session closed at ${autoCloseTime}.`,
              referenceType: 'attendance',
            }).catch(() => {});
          }
        } else if (item.date === today) {
          // Same day session: Check if we passed the allowed max time
          if (currentTimeStr >= autoCloseTime) {
             // Time limit exceeded: Close it now
             await apiClient.pb.collection('attendance').update(item.id, {
                check_out: autoCloseTime,
                remarks: (item.remarks || "") + " [System: Max Time Reached]"
             });
             // Missed check-out alert
             if (attendanceNotificationsEnabled) {
               notificationService.createNotification({
                 userId: item.employee_id,
                 type: 'ATTENDANCE',
                 title: 'Your session was auto-closed',
                 message: `Max time reached. Session closed at ${autoCloseTime}.`,
                 referenceType: 'attendance',
               }).catch(() => {});
             }
             // Do not set as activeToday, effectively logging user out of session
          } else {
             // Valid active session
             activeToday = mapAttendance(item);
          }
        }
      }

      return activeToday;
    } catch (e) { return undefined; }
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
