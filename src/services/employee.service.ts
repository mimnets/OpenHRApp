
import { supabase, isSupabaseConfigured, getSupabaseStorageUrl } from './supabase';
import { apiClient, dedupe } from './api.client';
import { Employee } from '../types';

let cachedEmployees: Employee[] | null = null;
let empCacheTimestamp = 0;
const EMP_CACHE_TTL = 2 * 60 * 1000;

const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : null;

function mapProfileToEmployee(r: any): Employee {
  return {
    id: r.id,
    employeeId: r.employee_id || '',
    lineManagerId: r.line_manager_id || undefined,
    teamId: r.team_id || undefined,
    shiftId: r.shift_id || undefined,
    organizationId: r.organization_id,
    name: r.name || 'No Name',
    email: r.email || '',
    role: (r.role || 'EMPLOYEE').toUpperCase(),
    department: r.department || 'Unassigned',
    designation: r.designation || 'Staff',
    avatar: r.avatar ? getSupabaseStorageUrl('avatars', r.avatar) : undefined,
    joiningDate: r.joining_date || '',
    mobile: r.mobile || '',
    emergencyContact: r.emergency_contact || '',
    salary: r.salary || 0,
    status: r.status || 'ACTIVE',
    employmentType: r.employment_type || 'PERMANENT',
    location: r.location || '',
    workType: r.work_type || 'OFFICE',
  } as any;
}

export const employeeService = {
  clearCache() {
    cachedEmployees = null;
    empCacheTimestamp = 0;
  },

  async getEmployees(): Promise<Employee[]> {
    if (cachedEmployees && Date.now() - empCacheTimestamp < EMP_CACHE_TTL) return cachedEmployees;

    const orgId = apiClient.getOrganizationId();
    return dedupe(`employees:${orgId ?? 'none'}`, async () => {
      if (!isSupabaseConfigured()) {
        console.warn('[EmployeeService] Supabase not configured');
        return [];
      }
      try {
        let query = supabase
          .from('profiles')
          .select('*')
          .order('created', { ascending: false });

        if (orgId) query = query.eq('organization_id', orgId);

        const { data, error } = await query;
        if (error) throw error;

        console.log(`[EmployeeService] Fetched ${data?.length ?? 0} employees`);
        const result = (data ?? []).map(mapProfileToEmployee);
        cachedEmployees = result;
        empCacheTimestamp = Date.now();
        return result;
      } catch (e: any) {
        console.error('[EmployeeService] Failed to fetch employees:', e?.message || e);
        return [];
      }
    });
  },

  async addEmployee(emp: Partial<Employee>) {
    if (!isSupabaseConfigured() || !SUPABASE_FUNCTIONS_URL) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const formData = new FormData();
    if (emp.email)       formData.append('email', emp.email);
    if ((emp as any).password) formData.append('password', (emp as any).password);
    if (emp.name)        formData.append('name', emp.name);
    if (emp.role)        formData.append('role', emp.role.toUpperCase());
    if (emp.department)  formData.append('department', emp.department);
    if (emp.designation) formData.append('designation', emp.designation);
    if (emp.employeeId)  formData.append('employeeId', emp.employeeId);
    if (emp.lineManagerId) formData.append('lineManagerId', emp.lineManagerId);
    if (emp.teamId)      formData.append('teamId', emp.teamId);
    if (emp.shiftId)     formData.append('shiftId', emp.shiftId);
    if (emp.mobile)      formData.append('mobile', emp.mobile);
    if (emp.joiningDate) formData.append('joiningDate', emp.joiningDate);

    // Avatar: data URL → Blob
    if (emp.avatar && typeof emp.avatar === 'string' && emp.avatar.startsWith('data:')) {
      const blob = await (await fetch(emp.avatar)).blob();
      formData.append('avatar', blob, 'avatar.webp');
    }

    const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/create-employee`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: formData,
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to create employee');

    employeeService.clearCache();
    apiClient.notify();
  },

  async updateProfile(id: string, updates: Partial<Employee> | any) {
    if (!isSupabaseConfigured()) return;

    const payload: any = {};
    if (updates.name !== undefined)        payload.name = updates.name;
    if (updates.role !== undefined)        payload.role = updates.role.toUpperCase();
    if (updates.department !== undefined)  payload.department = updates.department;
    if (updates.designation !== undefined) payload.designation = updates.designation;
    if (updates.employeeId !== undefined)  payload.employee_id = updates.employeeId;
    if (updates.mobile !== undefined)      payload.mobile = updates.mobile;
    if (updates.joiningDate !== undefined) payload.joining_date = updates.joiningDate;
    if (updates.status !== undefined)      payload.status = updates.status;
    if (updates.employmentType !== undefined) payload.employment_type = updates.employmentType;
    if (updates.workType !== undefined)    payload.work_type = updates.workType;
    if (updates.salary !== undefined)      payload.salary = updates.salary;
    if (updates.location !== undefined)    payload.location = updates.location;
    if (updates.emergencyContact !== undefined) payload.emergency_contact = updates.emergencyContact;

    const lmId = updates.lineManagerId ?? updates.line_manager_id;
    if (lmId !== undefined) payload.line_manager_id = lmId === '' ? null : lmId;

    const tId = updates.teamId ?? updates.team_id;
    if (tId !== undefined) payload.team_id = tId === '' ? null : tId;

    const sId = updates.shiftId ?? updates.shift_id;
    if (sId !== undefined) payload.shift_id = sId === '' ? null : sId;

    // Avatar upload to storage
    if (updates.avatar && typeof updates.avatar === 'string' && updates.avatar.startsWith('data:')) {
      try {
        const blob = await (await fetch(updates.avatar)).blob();
        const path = `${id}/avatar.webp`;
        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(path, blob, { upsert: true, contentType: 'image/webp' });
        if (!uploadErr) payload.avatar = path;
      } catch (e) {
        console.warn('[EmployeeService] Avatar upload failed:', e);
      }
    }

    // Password change goes through Supabase auth admin — not supported from anon key.
    // Password updates must be handled via the update-password Edge Function or
    // supabase.auth.updateUser (for self-updates only).
    if (updates.password) {
      console.warn('[EmployeeService] Password update for other users requires an admin Edge Function. Skipping.');
    }

    console.log('[EmployeeService] Updating profile:', id, payload);
    const { error } = await supabase.from('profiles').update(payload).eq('id', id);
    if (error) throw error;

    employeeService.clearCache();
    apiClient.notify();
  },

  async deleteEmployee(id: string) {
    if (!isSupabaseConfigured()) return;

    // Deleting from profiles cascades to auth.users via FK (on delete cascade).
    // Service-role is needed to delete auth.users — use Edge Function if RLS blocks.
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) throw error;

    employeeService.clearCache();
    apiClient.notify();
  },
};
