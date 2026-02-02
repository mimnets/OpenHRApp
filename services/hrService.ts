
import { Employee, Attendance, LeaveRequest, User, AppConfig, Holiday, LeaveWorkflow, LeaveBalance, Team, LeavePolicy } from '../types';
import { DEFAULT_CONFIG, BD_HOLIDAYS } from '../constants.tsx';
import { pb, isPocketBaseConfigured } from './pocketbase';

const subscribers: Set<() => void> = new Set();

// Internal Cache for Metadata Performance
let cachedConfig: AppConfig | null = null;
let cachedDepartments: string[] | null = null;
let cachedDesignations: string[] | null = null;
let cachedHolidays: Holiday[] | null = null;
let cachedLeavePolicy: LeavePolicy | null = null;

const sanitizeUserPayload = (data: any, isUpdate: boolean = false) => {
  const pbData: any = {};
  if (data.name) pbData.name = data.name;
  if (data.role) pbData.role = data.role.toUpperCase();
  if (data.department) pbData.department = data.department;
  if (data.designation) pbData.designation = data.designation;
  if (data.employeeId !== undefined) pbData.employee_id = data.employeeId;
  
  if (data.lineManagerId !== undefined) pbData.line_manager_id = data.lineManagerId || null;
  else if (data.line_manager_id !== undefined) pbData.line_manager_id = data.line_manager_id || null;
  
  if (data.teamId !== undefined) pbData.team_id = data.teamId || null;
  else if (data.team_id !== undefined) pbData.team_id = data.team_id || null;

  if (data.avatar && typeof data.avatar === 'string' && !data.avatar.startsWith('http')) {
    pbData.avatar = data.avatar;
  }

  // Password Logic: Allow update if provided, otherwise only set on create
  if (data.password && data.password.trim().length > 0) {
    pbData.password = data.password;
    pbData.passwordConfirm = data.password;
  }

  if (!isUpdate) {
    if (data.email) pbData.email = data.email;
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

  async prefetchMetadata() {
    if (!isPocketBaseConfigured()) return;
    try {
      await Promise.all([
        this.getConfig(),
        this.getDepartments(),
        this.getDesignations(),
        this.getHolidays(),
        this.getTeams(),
        this.getLeavePolicy()
      ]);
    } catch (e) {
      console.warn("Metadata prefetch partial failure", e);
    }
  },

  async login(email: string, pass: string): Promise<{ user: User | null; error?: string }> {
    if (!isPocketBaseConfigured() || !pb) return { user: null, error: "PocketBase is not configured." };
    try {
      const authData = await pb.collection('users').authWithPassword(email, pass);
      const m = authData.record;
      this.prefetchMetadata();
      return { user: {
        id: m.id.toString().trim(),
        employeeId: m.employee_id || '', 
        email: m.email,
        name: m.name || 'User',
        role: (m.role || 'EMPLOYEE').toString().toUpperCase() as any,
        department: m.department || 'Unassigned',
        designation: m.designation || 'Staff',
        teamId: m.team_id || undefined,
        avatar: m.avatar ? pb.files.getURL(m, m.avatar) : undefined
      }};
    } catch (err: any) { return { user: null, error: err.message || "PocketBase Login Failed" }; }
  },

  async finalizePasswordReset(token: string, newPassword: string): Promise<boolean> {
    if (!pb || !isPocketBaseConfigured()) return false;
    try {
      await pb.collection('users').confirmPasswordReset(token, newPassword, newPassword);
      return true;
    } catch (err: any) {
      console.error("Password reset confirmation failed:", err);
      return false;
    }
  },

  async logout() { 
    if (pb) pb.authStore.clear(); 
    cachedConfig = null;
    cachedDepartments = null;
    cachedDesignations = null;
    cachedHolidays = null;
    cachedLeavePolicy = null;
    this.notify(); 
  },

  async getEmployees(): Promise<Employee[]> {
    if (!pb || !isPocketBaseConfigured()) return [];
    try {
      const records = await pb.collection('users').getFullList({ sort: '-created', expand: 'line_manager_id,team_id' });
      return records.map(r => ({
        id: r.id.toString().trim(),
        employeeId: r.employee_id || '', 
        lineManagerId: r.line_manager_id ? r.line_manager_id.toString().trim() : undefined, 
        teamId: (r.team_id && r.team_id.length > 5) ? r.team_id : undefined,
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

  async updateProfile(id: string, updates: Partial<Employee> | any) {
    if (!pb || !isPocketBaseConfigured()) return;
    const pbData = sanitizeUserPayload(updates, true);
    
    if (updates.team_id !== undefined) pbData.team_id = updates.team_id || null;
    if (updates.line_manager_id !== undefined) pbData.line_manager_id = updates.line_manager_id || null;

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
      const today = new Date().toISOString().split('T')[0];
      const config = await this.getConfig();
      
      const result = await pb.collection('attendance').getList(1, 50, { 
        filter: `employee_id = "${employeeId.trim()}" && check_out = ""` 
      });

      let activeToday: Attendance | undefined = undefined;

      for (const item of result.items) {
        if (item.date < today) {
          await pb.collection('attendance').update(item.id, {
            check_out: config.officeEndTime || "18:00",
            remarks: (item.remarks || "") + " [System Auto-closed]"
          });
        } else if (item.date === today) {
          activeToday = mapAttendance(item);
        }
      }

      return activeToday;
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
    const formatPbDate = (dateStr: string) => {
      if (!dateStr) return null;
      if (dateStr.length === 10) return `${dateStr} 00:00:00`;
      if (dateStr.includes('T')) return dateStr.replace('T', ' ').split('.')[0];
      return dateStr;
    };
    const now = new Date();
    const appliedAt = now.toISOString().replace('T', ' ').split('.')[0];
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
      if (err.response?.id) { this.notify(); return; }
      throw new Error(`Failed to create record`);
    }
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
    } catch (err: any) { throw new Error("Access Denied"); }
  },

  async getLeavePolicy(): Promise<LeavePolicy> {
    if (cachedLeavePolicy) return cachedLeavePolicy;
    const defaultPolicy: LeavePolicy = {
      defaults: { ANNUAL: 15, CASUAL: 10, SICK: 14 },
      overrides: {}
    };
    if (!pb || !isPocketBaseConfigured()) return defaultPolicy;
    try {
      const record = await pb.collection('settings').getFirstListItem('key = "leave_policy"');
      cachedLeavePolicy = record.value || defaultPolicy;
      return cachedLeavePolicy!;
    } catch (e) {
      return defaultPolicy;
    }
  },

  async setLeavePolicy(policy: LeavePolicy) {
    if (!pb || !isPocketBaseConfigured()) return;
    try {
      const record = await pb.collection('settings').getFirstListItem('key = "leave_policy"');
      await pb.collection('settings').update(record.id, { value: policy });
      cachedLeavePolicy = policy;
    } catch (e) {
      await pb.collection('settings').create({ key: 'leave_policy', value: policy });
      cachedLeavePolicy = policy;
    }
    this.notify();
  },

  async getLeaveBalance(employeeId: string): Promise<LeaveBalance> {
    const policy = await this.getLeavePolicy();
    
    // Determine quota based on policy: Specific override > Global Default
    const quota = policy.overrides[employeeId] || policy.defaults;
    
    const balance: LeaveBalance = { 
      employeeId, 
      ANNUAL: quota.ANNUAL, 
      CASUAL: quota.CASUAL, 
      SICK: quota.SICK 
    };

    if (!pb || !isPocketBaseConfigured()) return balance;
    
    try {
      const records = await pb.collection('leaves').getFullList({
        filter: `employee_id = "${employeeId.trim()}" && status = "APPROVED"`
      });
      
      records.forEach(r => {
        const type = r.type as string;
        if (type === 'ANNUAL') balance.ANNUAL -= (r.total_days || 0);
        else if (type === 'CASUAL') balance.CASUAL -= (r.total_days || 0);
        else if (type === 'SICK') balance.SICK -= (r.total_days || 0);
      });
      return balance;
    } catch (e) { return balance; }
  },

  async getConfig(): Promise<AppConfig> {
    if (cachedConfig) return cachedConfig;
    if (!pb || !isPocketBaseConfigured()) return DEFAULT_CONFIG;
    try {
      const record = await pb.collection('settings').getFirstListItem('key = "app_config"');
      cachedConfig = record.value || DEFAULT_CONFIG;
      return cachedConfig!;
    } catch (e) { return DEFAULT_CONFIG; }
  },

  async setConfig(config: AppConfig) {
    if (!pb || !isPocketBaseConfigured()) return;
    try {
      const record = await pb.collection('settings').getFirstListItem('key = "app_config"');
      await pb.collection('settings').update(record.id, { value: config });
      cachedConfig = config;
    } catch (e) {
      await pb.collection('settings').create({ key: 'app_config', value: config });
      cachedConfig = config;
    }
    this.notify();
  },

  async getDepartments(): Promise<string[]> {
    if (cachedDepartments) return cachedDepartments;
    if (!pb || !isPocketBaseConfigured()) return [];
    try {
      const record = await pb.collection('settings').getFirstListItem('key = "departments"');
      cachedDepartments = record.value || [];
      return cachedDepartments!;
    } catch (e) { return []; }
  },

  async setDepartments(depts: string[]) {
    if (!pb || !isPocketBaseConfigured()) return;
    try {
      const record = await pb.collection('settings').getFirstListItem('key = "departments"');
      await pb.collection('settings').update(record.id, { value: depts });
      cachedDepartments = depts;
    } catch (e) {
      await pb.collection('settings').create({ key: 'departments', value: depts });
      cachedDepartments = depts;
    }
    this.notify();
  },

  async getDesignations(): Promise<string[]> {
    if (cachedDesignations) return cachedDesignations;
    if (!pb || !isPocketBaseConfigured()) return [];
    try {
      const record = await pb.collection('settings').getFirstListItem('key = "designations"');
      cachedDesignations = record.value || [];
      return cachedDesignations!;
    } catch (e) { return []; }
  },

  async setDesignations(desigs: string[]) {
    if (!pb || !isPocketBaseConfigured()) return;
    try {
      const record = await pb.collection('settings').getFirstListItem('key = "designations"');
      await pb.collection('settings').update(record.id, { value: desigs });
      cachedDesignations = desigs;
    } catch (e) {
      await pb.collection('settings').create({ key: 'designations', value: desigs });
      cachedDesignations = desigs;
    }
    this.notify();
  },

  async getHolidays(): Promise<Holiday[]> {
    if (cachedHolidays) return cachedHolidays;
    if (!pb || !isPocketBaseConfigured()) return BD_HOLIDAYS;
    try {
      const record = await pb.collection('settings').getFirstListItem('key = "holidays"');
      cachedHolidays = record.value || BD_HOLIDAYS;
      return cachedHolidays!;
    } catch (e) { return BD_HOLIDAYS; }
  },

  async setHolidays(hols: Holiday[]) {
    if (!pb || !isPocketBaseConfigured()) return;
    try {
      const record = await pb.collection('settings').getFirstListItem('key = "holidays"');
      await pb.collection('settings').update(record.id, { value: hols });
      cachedHolidays = hols;
    } catch (e) {
      await pb.collection('settings').create({ key: 'holidays', value: hols });
      cachedHolidays = hols;
    }
    this.notify();
  },

  async getTeams(): Promise<Team[]> {
    if (!pb || !isPocketBaseConfigured()) return [];
    try {
      const records = await pb.collection('teams').getFullList({ sort: 'name' });
      return records.map(r => ({ id: r.id, name: r.name, leaderId: r.leader_id, department: r.department }));
    } catch (e) { return []; }
  },

  async createTeam(data: Partial<Team>) {
    if (!pb || !isPocketBaseConfigured()) return null;
    const record = await pb.collection('teams').create({ name: data.name, leader_id: data.leaderId, department: data.department });
    this.notify();
    return record;
  },

  async updateTeam(id: string, data: Partial<Team>) {
    if (!pb || !isPocketBaseConfigured()) return;
    await pb.collection('teams').update(id, { name: data.name, leader_id: data.leaderId, department: data.department });
    this.notify();
  },

  async deleteTeam(id: string) {
    if (!pb || !isPocketBaseConfigured()) return;
    await pb.collection('teams').delete(id);
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

  async sendCustomEmail(data: { recipientEmail: string; subject: string; html: string; type?: string }) {
    if (!pb || !isPocketBaseConfigured()) return;
    const payload = { 
      recipient_email: data.recipientEmail.trim(), 
      subject: data.subject.trim(), 
      html_content: data.html, 
      type: data.type || 'SYSTEM_REPORT', 
      status: 'PENDING' 
    };
    try {
      const result = await pb.collection('reports_queue').create(payload);
      return result;
    } catch (err: any) { 
      // Specialized Error Handling for DB Size Limits
      const errorMessage = err.message || JSON.stringify(err);
      if (errorMessage.includes("html_content") && (errorMessage.includes("5000") || errorMessage.includes("length"))) {
        throw new Error("DATABASE ERROR: Report is too large (over 5000 chars). Go to PocketBase Admin > Collections > reports_queue > html_content and change Max Characters to 0 (Unlimited).");
      }

      console.error("[PocketBase 400 Detail]", {
        message: err.message,
        validationErrors: err.response?.data,
        payloadSent: payload
      });
      
      let errorDetails = err.message || "Failed to create record";
      if (err.response?.data) {
        const fieldErrors = Object.entries(err.response.data)
          .map(([key, val]: [string, any]) => `${key}: ${val.message}`)
          .join(', ');
        if (fieldErrors) errorDetails = `Validation Error: ${fieldErrors}`;
      }
      
      throw new Error(errorDetails); 
    }
  },

  async getReportQueueLog(): Promise<any[]> {
    if (!pb || !isPocketBaseConfigured()) return [];
    try {
      // Fetch last 10 items to show in UI
      const records = await pb.collection('reports_queue').getList(1, 10, {
        sort: '-created',
      });
      return records.items;
    } catch (e: any) {
      // Suppress 403 Forbidden errors to keep console clean for non-admins
      if (e.status !== 403) {
         console.warn("Cannot fetch report logs", e.message);
      }
      return [];
    }
  },

  async testPocketBaseConnection(url: string): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const response = await fetch(`${url.replace(/\/+$/, '')}/api/health`);
      if (response.ok) return { success: true, message: "OK" };
      return { success: false, message: "FAIL" };
    } catch (e: any) { return { success: false, message: "ERR" }; }
  }
};
