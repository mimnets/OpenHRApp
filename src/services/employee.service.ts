
import { apiClient } from './api.client';
import { Employee } from '../types';

const sanitizeUserPayload = (data: any, isUpdate: boolean = false) => {
  const pbData: any = {};
  if (data.name) pbData.name = data.name;
  if (data.role) pbData.role = data.role.toUpperCase();
  if (data.department) pbData.department = data.department;
  if (data.designation) pbData.designation = data.designation;
  if (data.employeeId !== undefined) pbData.employee_id = data.employeeId;

  // Handle lineManagerId (both camelCase and snake_case)
  if (data.lineManagerId !== undefined) {
    pbData.line_manager_id = data.lineManagerId === '' ? null : data.lineManagerId;
  } else if (data.line_manager_id !== undefined) {
    pbData.line_manager_id = data.line_manager_id === '' ? null : data.line_manager_id;
  }

  // Handle teamId (both camelCase and snake_case)
  if (data.teamId !== undefined) {
    pbData.team_id = data.teamId === '' ? null : data.teamId;
  } else if (data.team_id !== undefined) {
    pbData.team_id = data.team_id === '' ? null : data.team_id;
  }

  // Handle shiftId (both camelCase and snake_case)
  if (data.shiftId !== undefined) {
    pbData.shift_id = data.shiftId === '' ? null : data.shiftId;
  } else if (data.shift_id !== undefined) {
    pbData.shift_id = data.shift_id === '' ? null : data.shift_id;
  }

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

    console.log('[EmployeeService] Creating employee with data:', pbData);
    console.log('[EmployeeService] Original input:', { teamId: emp.teamId, shiftId: emp.shiftId });

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

    console.log('[EmployeeService] Updating employee:', id);
    console.log('[EmployeeService] Input data:', { teamId: updates.teamId, shiftId: updates.shiftId, lineManagerId: updates.lineManagerId });
    console.log('[EmployeeService] Processed data:', { team_id: pbData.team_id, shift_id: pbData.shift_id, line_manager_id: pbData.line_manager_id });

    if (pbData.avatar && typeof pbData.avatar === 'string' && pbData.avatar.startsWith('data:')) {
      const result = await apiClient.pb.collection('users').update(id.trim(), apiClient.toFormData(pbData, 'avatar.jpg'));
      console.log('[EmployeeService] Update result:', result);
    } else {
      delete pbData.avatar;
      const result = await apiClient.pb.collection('users').update(id.trim(), pbData);
      console.log('[EmployeeService] Update result:', result);
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
