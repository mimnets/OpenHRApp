import { Employee, Attendance, LeaveRequest, User, AppConfig, Holiday, LeaveWorkflow, LeaveBalance } from '../types';
import { DEFAULT_CONFIG, BD_HOLIDAYS } from '../constants.tsx';
import { pb, isPocketBaseConfigured } from './pocketbase';

const subscribers: Set<() => void> = new Set();

/**
 * Strips all internal and camelCase fields, leaving only 
 * what is confirmed to be in the PocketBase schema.
 */
const sanitizeUserPayload = (data: any, isUpdate: boolean = false) => {
  const pbData: any = {};
  
  // Mandatory Whitelist (Fields that exist in the PB 'users' collection)
  if (data.name) pbData.name = data.name;
  if (data.role) pbData.role = data.role.toUpperCase();
  if (data.department) pbData.department = data.department;
  if (data.designation) pbData.designation = data.designation;
  
  // Map camelCase to snake_case for DB
  if (data.employeeId !== undefined) pbData.employee_id = data.employeeId;
  if (data.lineManagerId !== undefined) pbData.line_manager_id = data.lineManagerId || null;
  
  // Files are handled separately in toFormData if they are base64
  if (data.avatar && !data.avatar.startsWith('http')) {
    pbData.avatar = data.avatar;
  }

  // Only include Auth fields on creation to avoid PB validation errors on update
  if (!isUpdate) {
    if (data.email) pbData.email = data.email;
    if (data.password) {
      pbData.password = data.password;
      pbData.passwordConfirm = data.password;
    }
    pbData.emailVisibility = true;
  }

  return pbData;
};

const dataURLtoBlob = (dataurl: string) => {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

const toFormData = (data: any, fileName: string = 'file.jpg') => {
  const formData = new FormData();
  Object.keys(data).forEach(key => {
    const value = data[key];
    if (typeof value === 'string' && value.startsWith('data:')) {
      formData.append(key, dataURLtoBlob(value), fileName);
    } else if (value !== null && value !== undefined) {
      formData.append(key, value);
    }
  });
  return formData;
};

const upsertSetting = async (key: string, value: any) => {
  if (!pb || !isPocketBaseConfigured()) return;
  try {
    const record = await pb.collection('settings').getFirstListItem(`key = "${key}"`);
    await pb.collection('settings').update(record.id, { value });
  } catch (e) {
    await pb.collection('settings').create({ key, value });
  }
};

const getSetting = async (key: string, defaultValue: any) => {
  if (!pb || !isPocketBaseConfigured()) return defaultValue;
  try {
    const record = await pb.collection('settings').getFirstListItem(`key = "${key}"`);
    return record.value;
  } catch (e) {
    return defaultValue;
  }
};

const parseLocation = (locStr: string): Attendance['location'] => {
  if (!locStr) return { lat: 0, lng: 0, address: 'Unknown' };
  try {
    if (locStr.includes(',')) {
      const parts = locStr.split(',').map(p => p.trim());
      return {
        lat: parseFloat(parts[0]) || 0,
        lng: parseFloat(parts[1]) || 0,
        address: parts.length > 2 ? parts.slice(2).join(', ') : 'GPS Coordinates'
      };
    }
    return { lat: 0, lng: 0, address: locStr };
  } catch (e) {
    return { lat: 0, lng: 0, address: locStr };
  }
};

const mapAttendance = (r: any): Attendance => ({
  ...r,
  id: r.id,
  checkIn: r.check_in,
  checkOut: r.check_out || "",
  employeeName: r.employee_name,
  employeeId: r.employee_id || "", 
  location: parseLocation(r.location),
  selfie: r.selfie ? pb.files.getURL(r, r.selfie) : undefined,
  status: r.status as any,
  date: r.date
});

export const hrService = {
  subscribe(callback: () => void) {
    subscribers.add(callback);
    return () => { subscribers.delete(callback); };
  },

  notify() {
    subscribers.forEach(cb => cb());
  },

  async login(email: string, pass: string): Promise<{ user: User | null; error?: string }> {
    if (!isPocketBaseConfigured() || !pb) {
      return { user: null, error: "PocketBase is not configured." };
    }
    try {
      const authData = await pb.collection('users').authWithPassword(email, pass);
      const m = authData.record;
      const userObj: User = {
        id: m.id,
        employeeId: m.employee_id || '', 
        email: m.email,
        name: m.name || 'User',
        role: (m.role || 'EMPLOYEE').toString().toUpperCase() as any,
        department: m.department || 'Unassigned',
        designation: m.designation || 'Staff',
        avatar: m.avatar ? pb.files.getURL(m, m.avatar) : undefined
      };
      return { user: userObj };
    } catch (err: any) {
      return { user: null, error: err.message || "PocketBase Login Failed" };
    }
  },

  async logout() {
    if (pb) pb.authStore.clear();
    this.notify();
  },

  async getEmployees(): Promise<Employee[]> {
    if (!pb || !isPocketBaseConfigured()) return [];
    try {
      const records = await pb.collection('users').getFullList({ 
        sort: '-created',
        expand: 'line_manager_id'
      });
      return records.map(r => ({
        ...r,
        id: r.id,
        employeeId: r.employee_id || '', 
        lineManagerId: r.line_manager_id || undefined, 
        managerName: r.expand?.line_manager_id?.name || 'Not Assigned',
        managerEmail: r.expand?.line_manager_id?.email || '',
        name: r.name || 'No Name',
        email: r.email,
        role: (r.role || 'EMPLOYEE').toString().toUpperCase(),
        department: r.department || 'Unassigned',
        designation: r.designation || 'Staff',
        avatar: r.avatar ? pb.files.getURL(r, r.avatar) : undefined
      })) as any;
    } catch (e) { return []; }
  },

  async addEmployee(emp: Partial<Employee>) {
    if (!pb || !isPocketBaseConfigured()) return;
    const pbData = sanitizeUserPayload(emp, false);
    
    if (pbData.avatar && typeof pbData.avatar === 'string' && pbData.avatar.startsWith('data:')) {
      await pb.collection('users').create(toFormData(pbData, 'avatar.jpg'));
    } else {
      await pb.collection('users').create(pbData);
    }
    this.notify();
  },

  async updateProfile(id: string, updates: Partial<Employee>) {
    if (!pb || !isPocketBaseConfigured()) return;
    const pbData = sanitizeUserPayload(updates, true);
    
    // Check if we are updating an avatar
    if (pbData.avatar && typeof pbData.avatar === 'string' && pbData.avatar.startsWith('data:')) {
      await pb.collection('users').update(id, toFormData(pbData, 'avatar.jpg'));
    } else {
      // If it's a URL or null, remove it from the payload to avoid trying to "upload" a string
      delete pbData.avatar; 
      await pb.collection('users').update(id, pbData);
    }
    this.notify();
  },

  async deleteEmployee(id: string) {
    if (pb && isPocketBaseConfigured()) {
      await pb.collection('users').delete(id);
      this.notify();
    }
  },

  async getAttendance(): Promise<Attendance[]> {
    if (!pb || !isPocketBaseConfigured()) return [];
    try {
      const records = await pb.collection('attendance').getFullList({ sort: '-date' });
      return records.map(mapAttendance);
    } catch (e) { return []; }
  },

  async getTodayAttendance(employeeId: string): Promise<Attendance[]> {
    const today = new Date().toISOString().split('T')[0];
    if (!pb || !isPocketBaseConfigured()) return [];
    try {
      const records = await pb.collection('attendance').getFullList({
        filter: `employee_id = "${employeeId}" && date = "${today}"`,
        sort: '-created'
      });
      return records.map(mapAttendance);
    } catch (e) { return []; }
  },

  async getActiveAttendance(employeeId: string): Promise<Attendance | undefined> {
    if (!pb || !isPocketBaseConfigured()) return undefined;
    const today = new Date().toISOString().split('T')[0];
    try {
      const result = await pb.collection('attendance').getList(1, 1, {
        filter: `employee_id = "${employeeId}" && check_out = ""`
      });
      
      if (result.items.length > 0) {
        const item = result.items[0];
        // AUTO-CLOSE STALE SESSIONS: 
        if (item.date !== today) {
          await pb.collection('attendance').update(item.id, { 
            check_out: "18:00", 
            remarks: (item.remarks || "") + " (Auto-closed by System)" 
          });
          return undefined;
        }
        return mapAttendance(item);
      }
      return undefined;
    } catch (e) { return undefined; }
  },

  async saveAttendance(data: Attendance) {
    if (!pb || !isPocketBaseConfigured()) return;
    const coordinates = data.location ? `${data.location.lat}, ${data.location.lng}` : "0, 0";
    const payload: any = {
      employee_id: data.employeeId,
      employee_name: data.employeeName || "Unknown",
      date: data.date,
      check_in: data.checkIn,
      check_out: "",
      status: data.status,
      remarks: data.remarks || "",
      location: coordinates
    };
    if (data.selfie) payload.selfie = data.selfie;
    const formData = toFormData(payload, `selfie_${data.employeeId}_${Date.now()}.jpg`);
    await pb.collection('attendance').create(formData);
    this.notify();
  },

  async updateAttendance(id: string, data: Partial<Attendance>) {
    if (!pb || !isPocketBaseConfigured()) return;
    const pbUpdates: any = {};
    if (data.date !== undefined) pbUpdates.date = data.date;
    if (data.checkIn !== undefined) pbUpdates.check_in = data.checkIn;
    if (data.checkOut !== undefined) pbUpdates.check_out = data.checkOut;
    if (data.remarks !== undefined) pbUpdates.remarks = data.remarks;
    if (data.status !== undefined) pbUpdates.status = data.status;
    if (data.selfie && data.selfie.startsWith('data:')) {
      const formData = toFormData(pbUpdates, 'update.jpg');
      formData.append('selfie', dataURLtoBlob(data.selfie), 'selfie.jpg');
      await pb.collection('attendance').update(id, formData);
    } else {
      await pb.collection('attendance').update(id, pbUpdates);
    }
    this.notify();
  },

  async deleteAttendance(id: string) {
    if (!pb || !isPocketBaseConfigured()) return;
    await pb.collection('attendance').delete(id);
    this.notify();
  },

  async getLeaves(): Promise<LeaveRequest[]> {
    if (!pb || !isPocketBaseConfigured()) return [];
    try {
      const records = await pb.collection('leaves').getFullList({ sort: '-applied_date' });
      return records.map(r => ({ 
        ...r, 
        startDate: r.start_date,
        endDate: r.end_date,
        totalDays: r.total_days,
        appliedDate: r.applied_date,
        approverRemarks: r.approver_remarks,
        managerRemarks: r.manager_remarks,
        employeeId: r.employee_id || "", 
        employeeName: r.employee_name,
        lineManagerId: r.line_manager_id || undefined
      })) as any;
    } catch (e) { return []; }
  },

  async getLeaveBalance(employeeId: string): Promise<LeaveBalance> {
    const defaults = { ANNUAL: 20, CASUAL: 10, SICK: 14 };
    const leaves = await this.getLeaves();
    const approved = leaves.filter(l => l.employeeId === employeeId && l.status === 'APPROVED');
    approved.forEach(l => {
      if (l.type in defaults) (defaults as any)[l.type] -= l.totalDays;
    });
    return { employeeId, ...defaults };
  },

  async saveLeaveRequest(data: LeaveRequest) {
    if (!pb || !isPocketBaseConfigured()) return;
    const payload = { 
      employee_id: data.employeeId, 
      employee_name: data.employeeName, 
      applied_date: data.appliedDate,
      start_date: data.startDate,
      end_date: data.endDate,
      total_days: data.totalDays,
      type: data.type,
      reason: data.reason,
      status: data.status,
      line_manager_id: data.lineManagerId || null 
    };
    await pb.collection('leaves').create(payload);
    this.notify();
  },

  async modifyLeaveRequest(id: string, updates: Partial<LeaveRequest>) {
    if (!pb || !isPocketBaseConfigured()) return;
    const pbUpdates: any = {};
    if (updates.type !== undefined) pbUpdates.type = updates.type;
    if (updates.startDate !== undefined) pbUpdates.start_date = updates.startDate;
    if (updates.endDate !== undefined) pbUpdates.end_date = updates.endDate;
    if (updates.totalDays !== undefined) pbUpdates.total_days = updates.totalDays;
    if (updates.reason !== undefined) pbUpdates.reason = updates.reason;
    if (updates.status !== undefined) pbUpdates.status = updates.status;
    if (updates.lineManagerId !== undefined) pbUpdates.line_manager_id = updates.lineManagerId || null;

    await pb.collection('leaves').update(id, pbUpdates);
    this.notify();
  },

  async updateLeaveStatus(id: string, status: 'APPROVED' | 'REJECTED', remarks: string, role: string) {
    if (!pb || !isPocketBaseConfigured()) return;
    try {
      const request = await pb.collection('leaves').getOne(id);
      let newStatus: LeaveRequest['status'] = status;
      if (status === 'APPROVED' && request.status === 'PENDING_MANAGER') newStatus = 'PENDING_HR'; 
      const update: any = { status: newStatus };
      if (role === 'MANAGER') update.manager_remarks = remarks;
      else update.approver_remarks = remarks;
      await pb.collection('leaves').update(id, update);
      this.notify();
    } catch (e) { }
  },

  async sendCustomEmail(payload: { recipientEmail: string, subject?: string, html: string }) {
    if (!pb || !isPocketBaseConfigured()) return;
    try {
        return await pb.collection('reports_queue').create({
            recipient_email: payload.recipientEmail,
            subject: payload.subject || "OpenHR Report",
            html_content: payload.html,
            status: 'PENDING'
        });
    } catch (err: any) {
        throw err;
    }
  },

  async getConfig(): Promise<AppConfig> {
    return await getSetting('app_config', DEFAULT_CONFIG);
  },

  async setConfig(config: AppConfig) {
    await upsertSetting('app_config', config);
    this.notify();
  },

  async getDepartments(): Promise<string[]> {
    return await getSetting('departments', ["Engineering", "HR", "Sales", "Operations"]);
  },

  async setDepartments(list: string[]) {
    await upsertSetting('departments', list);
    this.notify();
  },

  async getDesignations(): Promise<string[]> {
    return await getSetting('designations', ["Developer", "Manager", "HR Executive"]);
  },

  async setDesignations(list: string[]) {
    await upsertSetting('designations', list);
    this.notify();
  },

  async getHolidays(): Promise<Holiday[]> {
    return await getSetting('holidays', BD_HOLIDAYS);
  },

  async setHolidays(list: Holiday[]) {
    await upsertSetting('holidays', list);
    this.notify();
  },

  async getWorkflows(): Promise<LeaveWorkflow[]> {
    return await getSetting('workflows', []);
  },

  async setWorkflows(list: LeaveWorkflow[]) {
    await upsertSetting('workflows', list);
    this.notify();
  },

  isManagerOfSomeone(managerId: string, employees: Employee[]): boolean {
    return employees.some(e => e.lineManagerId === managerId);
  },

  async testPocketBaseConnection(url: string) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return { success: true, message: "Healthy" };
      return { success: false, error: "Unreachable" };
    } catch (e) { return { success: false, error: "Network Error" }; }
  },

  async finalizePasswordReset(token: string, pass: string) {
    if (!pb) return false;
    try {
      await pb.collection('users').confirmPasswordReset(token, pass, pass);
      return true;
    } catch (e) { return false; }
  }
};