

import { Employee, Attendance, LeaveRequest, User, AppConfig, Holiday, LeaveWorkflow, LeaveBalance } from '../types';
import { DEFAULT_CONFIG, BD_HOLIDAYS } from '../constants.tsx';
import { pb, isPocketBaseConfigured } from './pocketbase';

const subscribers: Set<() => void> = new Set();

const sanitizeUserPayload = (data: any, isUpdate: boolean = false) => {
  const pbData: any = {};
  if (data.name) pbData.name = data.name;
  if (data.role) pbData.role = data.role.toUpperCase();
  if (data.department) pbData.department = data.department;
  if (data.designation) pbData.designation = data.designation;
  if (data.employeeId !== undefined) pbData.employee_id = data.employeeId;
  if (data.lineManagerId !== undefined) pbData.line_manager_id = data.lineManagerId || null;
  if (data.avatar && !data.avatar.startsWith('http')) {
    pbData.avatar = data.avatar;
  }
  if (!isUpdate) {
    if (data.email) pbData.email = data.email;
    if (data.password) {
      pbData.password = data.password;
      pbData.passwordConfirm = data.password;
    }
    if (data.employeeId) {
      pbData.username = `user_${data.employeeId.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
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
  while (n--) { u8arr[n] = bstr.charCodeAt(n); }
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
  selfie: r.selfie ? pb.files.getURL(r, r.selfie) : undefined,
  remarks: r.remarks || "",
  dutyType: r.duty_type as any
});

export const hrService = {
  subscribe(callback: () => void) {
    subscribers.add(callback);
    return () => { subscribers.delete(callback); };
  },
  notify() { subscribers.forEach(cb => cb()); },

  async login(email: string, pass: string): Promise<{ user: User | null; error?: string }> {
    if (!isPocketBaseConfigured() || !pb) return { user: null, error: "PocketBase is not configured." };
    try {
      const authData = await pb.collection('users').authWithPassword(email, pass);
      const m = authData.record;
      return { user: {
        id: m.id.toString().trim(),
        employeeId: m.employee_id || '', 
        email: m.email,
        name: m.name || 'User',
        role: (m.role || 'EMPLOYEE').toString().toUpperCase() as any,
        department: m.department || 'Unassigned',
        designation: m.designation || 'Staff',
        avatar: m.avatar ? pb.files.getURL(m, m.avatar) : undefined
      }};
    } catch (err: any) { return { user: null, error: err.message || "PocketBase Login Failed" }; }
  },

  async logout() { if (pb) pb.authStore.clear(); this.notify(); },

  async getEmployees(): Promise<Employee[]> {
    if (!pb || !isPocketBaseConfigured()) return [];
    try {
      const records = await pb.collection('users').getFullList({ sort: '-created', expand: 'line_manager_id' });
      return records.map(r => ({
        id: r.id.toString().trim(),
        employeeId: r.employee_id || '', 
        lineManagerId: r.line_manager_id ? r.line_manager_id.toString().trim() : undefined, 
        name: r.name || 'No Name',
        email: r.email,
        role: (r.role || 'EMPLOYEE').toString().toUpperCase(),
        department: r.department || 'Unassigned',
        designation: r.designation || 'Staff',
        avatar: r.avatar ? pb.files.getURL(r, r.avatar) : undefined,
        joiningDate: r.joining_date || "",
        mobile: r.mobile || "",
        emergencyContact: r.emergency_contact || "",
        salary: r.salary || 0,
        status: r.status || "ACTIVE",
        employmentType: r.employment_type || "PERMANENT",
        location: r.location || "",
        workType: r.work_type || "OFFICE"
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
    if (pbData.avatar && typeof pbData.avatar === 'string' && pbData.avatar.startsWith('data:')) {
      await pb.collection('users').update(id.trim(), toFormData(pbData, 'avatar.jpg'));
    } else {
      delete pbData.avatar; 
      await pb.collection('users').update(id.trim(), pbData);
    }
    this.notify();
  },

  async deleteEmployee(id: string) { if (pb && isPocketBaseConfigured()) { await pb.collection('users').delete(id.trim()); this.notify(); } },

  async getAttendance(): Promise<Attendance[]> {
    if (!pb || !isPocketBaseConfigured()) return [];
    try {
      const records = await pb.collection('attendance').getFullList({ sort: '-date' });
      return records.map(mapAttendance);
    } catch (e) { return []; }
  },

  async getActiveAttendance(employeeId: string): Promise<Attendance | undefined> {
    if (!pb || !isPocketBaseConfigured()) return undefined;
    try {
      const result = await pb.collection('attendance').getList(1, 1, { filter: `employee_id = "${employeeId.trim()}" && check_out = ""` });
      return result.items.length > 0 ? mapAttendance(result.items[0]) : undefined;
    } catch (e) { return undefined; }
  },

  async saveAttendance(data: Attendance) {
    if (!pb || !isPocketBaseConfigured()) return;
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
      duty_type: data.dutyType
    };
    if (data.selfie) payload.selfie = data.selfie;
    await pb.collection('attendance').create(toFormData(payload, 'selfie.jpg'));
    this.notify();
  },

  async updateAttendance(id: string, data: Partial<Attendance>) {
    if (!pb || !isPocketBaseConfigured()) return;
    const pbUpdates: any = {};
    if (data.date) pbUpdates.date = data.date;
    if (data.checkIn) pbUpdates.check_in = data.checkIn;
    if (data.checkOut) pbUpdates.check_out = data.checkOut;
    if (data.remarks) pbUpdates.remarks = data.remarks;
    if (data.status) pbUpdates.status = data.status;
    await pb.collection('attendance').update(id.trim(), pbUpdates);
    this.notify();
  },

  async deleteAttendance(id: string) { if (!pb || !isPocketBaseConfigured()) return; await pb.collection('attendance').delete(id.trim()); this.notify(); },

  async getLeaves(): Promise<LeaveRequest[]> {
    if (!pb || !isPocketBaseConfigured()) return [];
    try {
      const records = await pb.collection('leaves').getFullList({ sort: '-applied_date' });
      return records.map(r => ({ 
        id: r.id.toString().trim(), 
        employeeId: r.employee_id ? r.employee_id.toString().trim() : "", 
        employeeName: r.employee_name,
        lineManagerId: r.line_manager_id ? r.line_manager_id.toString().trim() : undefined,
        appliedDate: r.applied_date,
        startDate: r.start_date,
        endDate: r.end_date,
        totalDays: r.total_days || 0,
        type: r.type,
        reason: r.reason || "",
        status: (r.status || 'PENDING_MANAGER').toString().trim().toUpperCase() as any,
        managerRemarks: r.manager_remarks || "",
        approverRemarks: r.approver_remarks || ""
      }));
    } catch (e) { return []; }
  },

  async saveLeaveRequest(data: Partial<LeaveRequest>) {
    if (!pb || !isPocketBaseConfigured()) return;
    
    // Ensure all date fields include a time component for PocketBase Date field types
    const formatPbDate = (dateStr: string) => {
      if (!dateStr) return null;
      if (dateStr.length === 10) return `${dateStr} 00:00:00`;
      if (dateStr.includes('T')) return dateStr.replace('T', ' ').split('.')[0];
      return dateStr;
    };

    const now = new Date();
    const appliedAt = now.toISOString().replace('T', ' ').split('.')[0];

    // FIX: Property 'total_days' does not exist on type 'Partial<LeaveRequest>'. Using 'totalDays'.
    const payload: any = {
      employee_id: data.employeeId?.trim(),
      employee_name: data.employeeName,
      line_manager_id: (data.lineManagerId && data.lineManagerId.trim().length >= 15) ? data.lineManagerId.trim() : null,
      type: data.type,
      start_date: formatPbDate(data.startDate || ''),
      end_date: formatPbDate(data.endDate || ''),
      total_days: Number(data.totalDays) || 0,
      reason: data.reason || "",
      status: data.status || 'PENDING_MANAGER',
      applied_date: appliedAt
    };

    try {
      await pb.collection('leaves').create(payload);
      this.notify();
    } catch (err: any) {
      if (err.response?.id) {
        this.notify();
        return;
      }
      let detailedMsg = "";
      if (err.response?.data && Object.keys(err.response.data).length > 0) {
        detailedMsg = " - " + Object.entries(err.response.data)
          .map(([field, detail]: [string, any]) => `${field}: ${detail.message}`)
          .join(', ');
      } else {
        detailedMsg = " - Access Denied (Check List/View Rules and user.role)";
      }
      throw new Error(`Failed to create record${detailedMsg}`);
    }
  },

  async modifyLeaveRequest(id: string, updates: Partial<LeaveRequest>) {
    if (!pb || !isPocketBaseConfigured()) return;
    const pbUpdates: any = {};
    if (updates.type) pbUpdates.type = updates.type;
    if (updates.startDate) pbUpdates.start_date = updates.startDate;
    if (updates.endDate) pbUpdates.end_date = updates.endDate;
    if (updates.totalDays) pbUpdates.total_days = Number(updates.totalDays);
    if (updates.reason) pbUpdates.reason = updates.reason;
    if (updates.status) pbUpdates.status = updates.status;
    await pb.collection('leaves').update(id.trim(), pbUpdates);
    this.notify();
  },

  async updateLeaveStatus(id: string, status: string, remarks: string, role: string) {
    if (!pb || !isPocketBaseConfigured()) return;
    
    const update: any = { status };
    if (role === 'MANAGER') {
      update.manager_remarks = remarks;
      if (status === 'APPROVED') update.status = 'PENDING_HR'; 
    } else {
      update.approver_remarks = remarks;
    }

    try {
      await pb.collection('leaves').update(id.trim(), update);
      this.notify();
    } catch (err: any) {
      if (err.response?.id) {
        this.notify();
        return;
      }
      let detailedMsg = "";
      if (err.response?.data && Object.keys(err.response.data).length > 0) {
        detailedMsg = Object.entries(err.response.data)
          .map(([field, detail]: [string, any]) => `${field}: ${detail.message}`)
          .join(', ');
      } else {
        detailedMsg = "Access Denied (Check Update Rules)";
      }
      throw new Error(detailedMsg);
    }
  },

  async getLeaveBalance(employeeId: string): Promise<LeaveBalance> {
    const defaultBalance: LeaveBalance = { employeeId, ANNUAL: 15, CASUAL: 10, SICK: 14 };
    if (!pb || !isPocketBaseConfigured()) return defaultBalance;
    try {
      const records = await pb.collection('leaves').getFullList({
        filter: `employee_id = "${employeeId.trim()}" && status = "APPROVED"`
      });
      const balance = { ...defaultBalance };
      records.forEach(r => {
        const type = r.type as string;
        if (type === 'ANNUAL') balance.ANNUAL -= (r.total_days || 0);
        else if (type === 'CASUAL') balance.CASUAL -= (r.total_days || 0);
        else if (type === 'SICK') balance.SICK -= (r.total_days || 0);
      });
      return balance;
    } catch (e) { return defaultBalance; }
  },

  isManagerOfSomeone(userId: string, employees: Employee[]): boolean {
    return employees.some(e => e.lineManagerId === userId);
  },

  async getConfig(): Promise<AppConfig> {
    if (!pb || !isPocketBaseConfigured()) return DEFAULT_CONFIG;
    try {
      const record = await pb.collection('settings').getFirstListItem('key = "app_config"');
      return record.value || DEFAULT_CONFIG;
    } catch (e) { return DEFAULT_CONFIG; }
  },

  async setConfig(config: AppConfig) {
    if (!pb || !isPocketBaseConfigured()) return;
    try {
      const record = await pb.collection('settings').getFirstListItem('key = "app_config"');
      await pb.collection('settings').update(record.id, { value: config });
    } catch (e) {
      await pb.collection('settings').create({ key: 'app_config', value: config });
    }
    this.notify();
  },

  async getDepartments(): Promise<string[]> {
    if (!pb || !isPocketBaseConfigured()) return [];
    try {
      const record = await pb.collection('settings').getFirstListItem('key = "departments"');
      return record.value || [];
    } catch (e) { return []; }
  },

  async setDepartments(depts: string[]) {
    if (!pb || !isPocketBaseConfigured()) return;
    try {
      const record = await pb.collection('settings').getFirstListItem('key = "departments"');
      await pb.collection('settings').update(record.id, { value: depts });
    } catch (e) {
      await pb.collection('settings').create({ key: 'departments', value: depts });
    }
    this.notify();
  },

  async getDesignations(): Promise<string[]> {
    if (!pb || !isPocketBaseConfigured()) return [];
    try {
      const record = await pb.collection('settings').getFirstListItem('key = "designations"');
      return record.value || [];
    } catch (e) { return []; }
  },

  async setDesignations(desigs: string[]) {
    if (!pb || !isPocketBaseConfigured()) return;
    try {
      const record = await pb.collection('settings').getFirstListItem('key = "designations"');
      await pb.collection('settings').update(record.id, { value: desigs });
    } catch (e) {
      await pb.collection('settings').create({ key: 'designations', value: desigs });
    }
    this.notify();
  },

  async getHolidays(): Promise<Holiday[]> {
    if (!pb || !isPocketBaseConfigured()) return BD_HOLIDAYS;
    try {
      const record = await pb.collection('settings').getFirstListItem('key = "holidays"');
      return record.value || BD_HOLIDAYS;
    } catch (e) { return BD_HOLIDAYS; }
  },

  async setHolidays(hols: Holiday[]) {
    if (!pb || !isPocketBaseConfigured()) return;
    try {
      const record = await pb.collection('settings').getFirstListItem('key = "holidays"');
      await pb.collection('settings').update(record.id, { value: hols });
    } catch (e) {
      await pb.collection('settings').create({ key: 'holidays', value: hols });
    }
    this.notify();
  },

  async getWorkflows(): Promise<LeaveWorkflow[]> {
    if (!pb || !isPocketBaseConfigured()) return [];
    try {
      const record = await pb.collection('settings').getFirstListItem('key = "workflows"');
      return record.value || [];
    } catch (e) { return []; }
  },

  async setWorkflows(wfs: LeaveWorkflow[]) {
    if (!pb || !isPocketBaseConfigured()) return;
    try {
      const record = await pb.collection('settings').getFirstListItem('key = "workflows"');
      await pb.collection('settings').update(record.id, { value: wfs });
    } catch (e) {
      await pb.collection('settings').create({ key: 'workflows', value: wfs });
    }
    this.notify();
  },

  async sendCustomEmail(data: { recipientEmail: string; subject: string; html: string }) {
    if (!pb || !isPocketBaseConfigured()) return;
    
    const payload = {
      recipient_email: data.recipientEmail,
      subject: data.subject,
      html_content: data.html,
      status: 'PENDING'
    };

    try {
      // Direct result check to handle PocketBase SDK refetch behavior
      const result = await pb.collection('reports_queue').create(payload);
      return result;
    } catch (err: any) {
      // Detailed error introspection for "Success but Forbidden View"
      if (err.response?.id || (err.status >= 400 && err.response?.recipient_email)) {
        console.warn("Email record successfully queued (ignoring UI view restriction).");
        return { id: err.response?.id || 'queued_ok' }; 
      }
      
      console.error("Queue Email Error:", err);
      // Only throw if the record definitely wasn't created (no ID in response)
      throw new Error(err.message || "Failed to create queue record.");
    }
  },

  async testPocketBaseConnection(url: string): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const response = await fetch(`${url.replace(/\/+$/, '')}/api/health`);
      if (response.ok) {
        return { success: true, message: "Connected to PocketBase" };
      }
      return { success: false, message: "Connection failed", error: `HTTP ${response.status}` };
    } catch (e: any) {
      return { success: false, message: "Connection error", error: e.message };
    }
  },

  async finalizePasswordReset(token: string, pass: string): Promise<boolean> {
    if (!pb || !isPocketBaseConfigured()) return false;
    try {
      await pb.collection('users').confirmPasswordReset(token, pass, pass);
      return true;
    } catch (e) { return false; }
  }
};
