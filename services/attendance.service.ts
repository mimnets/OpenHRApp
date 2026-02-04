
import { apiClient } from './api.client';
import { Attendance } from '../types';
import { organizationService } from './organization.service';

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
  async getAttendance(): Promise<Attendance[]> {
    if (!apiClient.pb || !apiClient.isConfigured()) return [];
    try {
      const records = await apiClient.pb.collection('attendance').getFullList({ sort: '-date' });
      return records.map(mapAttendance);
    } catch (e) { return []; }
  },

  async getActiveAttendance(employeeId: string): Promise<Attendance | undefined> {
    if (!apiClient.pb || !apiClient.isConfigured()) return undefined;
    try {
      const today = new Date().toISOString().split('T')[0];
      const config = await organizationService.getConfig();
      
      const result = await apiClient.pb.collection('attendance').getList(1, 50, { 
        filter: `employee_id = "${employeeId.trim()}" && check_out = ""` 
      });

      let activeToday: Attendance | undefined = undefined;

      // Determine auto-close time (default to 23:59 if not set)
      const autoCloseTime = config.autoSessionCloseTime || "23:59";
      
      // Calculate current time string HH:mm for comparison
      const now = new Date();
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      const currentTimeStr = `${h}:${m}`;

      for (const item of result.items) {
        if (item.date < today) {
          // Past unclosed session: Close immediately
          await apiClient.pb.collection('attendance').update(item.id, {
            check_out: autoCloseTime,
            remarks: (item.remarks || "") + " [System: Auto-Closed Past Date]"
          });
        } else if (item.date === today) {
          // Same day session: Check if we passed the allowed max time
          if (currentTimeStr >= autoCloseTime) {
             // Time limit exceeded: Close it now
             await apiClient.pb.collection('attendance').update(item.id, {
                check_out: autoCloseTime,
                remarks: (item.remarks || "") + " [System: Max Time Reached]"
             });
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
    await apiClient.pb.collection('attendance').create(apiClient.toFormData(payload, 'selfie.jpg'));
    apiClient.notify();
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
    apiClient.notify();
  },

  async deleteAttendance(id: string) { 
    if (!apiClient.pb || !apiClient.isConfigured()) return; 
    await apiClient.pb.collection('attendance').delete(id.trim()); 
    apiClient.notify(); 
  }
};
