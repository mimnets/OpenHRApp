
import { apiClient } from './api.client';
import { Employee } from '../types';

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

  if (data.shiftId !== undefined) pbData.shift_id = data.shiftId || null;
  else if (data.shift_id !== undefined) pbData.shift_id = data.shift_id || null;

  if (data.avatar && typeof data.avatar === 'string' && !data.avatar.startsWith('http')) {
    pbData.avatar = data.avatar;
  }

  // Password Logic
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
    
    // Inject Organization ID
    const orgId = apiClient.getOrganizationId();
    if (orgId) pbData.organization_id = orgId;
  }
  return pbData;
};

export const employeeService = {
  async getEmployees(): Promise<Employee[]> {
    if (!apiClient.pb || !apiClient.isConfigured()) {
      console.warn("[EmployeeService] PocketBase not configured");
      return [];
    }
    try {
      // PocketBase API rules filter by organization_id automatically
      const records = await apiClient.pb.collection('users').getFullList({ sort: '-created', expand: 'line_manager_id,team_id' });
      console.log(`[EmployeeService] Fetched ${records.length} employees`);
      return records.map(r => ({
        id: r.id.toString().trim(),
        employeeId: r.employee_id || '',
        lineManagerId: r.line_manager_id ? r.line_manager_id.toString().trim() : undefined,
        teamId: (r.team_id && r.team_id.length > 5) ? r.team_id : undefined,
        shiftId: r.shift_id || undefined,
        organizationId: r.organization_id,
        name: r.name || 'No Name',
        email: r.email,
        role: (r.role || 'EMPLOYEE').toString().toUpperCase(),
        department: r.department || 'Unassigned',
        designation: r.designation || 'Staff',
        avatar: r.avatar ? apiClient.pb!.files.getURL(r, r.avatar) : undefined,
        joiningDate: r.joining_date || "",
        mobile: r.mobile || "",
        emergencyContact: r.emergency_contact || "",
        salary: r.salary || 0,
        status: r.status || "ACTIVE",
        employmentType: r.employment_type || "PERMANENT",
        location: r.location || "",
        workType: r.work_type || "OFFICE"
      })) as any;
    } catch (e: any) {
      console.error("[EmployeeService] Failed to fetch employees:", e?.message || e);
      return [];
    }
  },

  async addEmployee(emp: Partial<Employee>) {
    if (!apiClient.pb || !apiClient.isConfigured()) return;
    const pbData = sanitizeUserPayload(emp, false);
    if (pbData.avatar && typeof pbData.avatar === 'string' && pbData.avatar.startsWith('data:')) {
      await apiClient.pb.collection('users').create(apiClient.toFormData(pbData, 'avatar.jpg'));
    } else {
      await apiClient.pb.collection('users').create(pbData);
    }
    apiClient.notify();
  },

  async updateProfile(id: string, updates: Partial<Employee> | any) {
    if (!apiClient.pb || !apiClient.isConfigured()) return;
    const pbData = sanitizeUserPayload(updates, true);
    
    if (updates.team_id !== undefined) pbData.team_id = updates.team_id || null;
    if (updates.line_manager_id !== undefined) pbData.line_manager_id = updates.line_manager_id || null;

    if (pbData.avatar && typeof pbData.avatar === 'string' && pbData.avatar.startsWith('data:')) {
      await apiClient.pb.collection('users').update(id.trim(), apiClient.toFormData(pbData, 'avatar.jpg'));
    } else {
      delete pbData.avatar; 
      await apiClient.pb.collection('users').update(id.trim(), pbData);
    }
    apiClient.notify();
  },

  async deleteEmployee(id: string) { 
    if (apiClient.pb && apiClient.isConfigured()) { 
      await apiClient.pb.collection('users').delete(id.trim()); 
      apiClient.notify(); 
    } 
  }
};
