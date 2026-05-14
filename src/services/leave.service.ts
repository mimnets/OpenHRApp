
import { supabase, isSupabaseConfigured } from './supabase';
import { apiClient, dedupe } from './api.client';
import { LeaveRequest, LeaveBalance } from '../types';
import { organizationService } from './organization.service';

let cachedLeaves: LeaveRequest[] | null = null;
let leaveCacheTimestamp = 0;
const LEAVE_CACHE_TTL = 2 * 60 * 1000;

const mapLeave = (r: any): LeaveRequest => ({
  id: r.id,
  employeeId: r.employee_id ? r.employee_id.toString().trim() : '',
  employeeName: r.employee_name,
  lineManagerId: r.line_manager_id ? r.line_manager_id.toString().trim() : undefined,
  appliedDate: r.applied_date,
  startDate: r.start_date,
  endDate: r.end_date,
  totalDays: r.total_days || 0,
  type: r.type,
  reason: r.reason || '',
  status: (r.status || 'PENDING_MANAGER').toString().trim().toUpperCase() as any,
  managerRemarks: r.manager_remarks || '',
  approverRemarks: r.approver_remarks || '',
  organizationId: r.organization_id,
});

export const leaveService = {
  clearCache() {
    cachedLeaves = null;
    leaveCacheTimestamp = 0;
  },

  async getLeaves(): Promise<LeaveRequest[]> {
    if (cachedLeaves && Date.now() - leaveCacheTimestamp < LEAVE_CACHE_TTL) return cachedLeaves;
    const orgId = apiClient.getOrganizationId();
    return dedupe(`leaves:${orgId ?? 'none'}`, async () => {
      if (!isSupabaseConfigured()) {
        console.warn('[LeaveService] Supabase not configured');
        return [];
      }
      try {
        const halfYearAgo = new Date();
        halfYearAgo.setDate(halfYearAgo.getDate() - 180);
        const since = halfYearAgo.toISOString().split('T')[0];

        let query = supabase
          .from('leaves')
          .select('*')
          .gte('applied_date', since)
          .order('applied_date', { ascending: false });

        if (orgId) query = query.eq('organization_id', orgId);

        const { data, error } = await query;
        if (error) throw error;

        console.log(`[LeaveService] Fetched ${data?.length ?? 0} leave records`);
        const result = (data ?? []).map(mapLeave);
        cachedLeaves = result;
        leaveCacheTimestamp = Date.now();
        return result;
      } catch (e: any) {
        console.error('[LeaveService] Failed to fetch leaves:', e?.message || e);
        return [];
      }
    });
  },

  async saveLeaveRequest(data: Partial<LeaveRequest>) {
    if (!isSupabaseConfigured()) return;

    // Fetch employee's department + line_manager_id for workflow routing
    let department = 'Unassigned';
    let lineManagerId: string | null = null;
    try {
      if (data.employeeId) {
        const { data: emp } = await supabase
          .from('profiles')
          .select('department, line_manager_id')
          .eq('id', data.employeeId)
          .single();
        department = emp?.department || 'Unassigned';
        lineManagerId = emp?.line_manager_id || null;
      }
    } catch (e) { console.error('Could not fetch employee details for workflow'); }

    // Determine initial status from workflow config
    let initialStatus = 'PENDING_MANAGER';
    try {
      const workflows = await organizationService.getWorkflows();
      const deptWorkflow = workflows.find(w => w.department === department);
      if (deptWorkflow && (deptWorkflow.approverRole === 'HR' || deptWorkflow.approverRole === 'ADMIN')) {
        initialStatus = 'PENDING_HR';
      }
      if (!lineManagerId && initialStatus === 'PENDING_MANAGER') {
        initialStatus = 'PENDING_HR';
      }
    } catch (e) { console.warn('Workflow check failed, defaulting to Manager'); }

    const orgId = apiClient.getOrganizationId();
    const payload: any = {
      employee_id: data.employeeId?.trim(),
      employee_name: data.employeeName,
      line_manager_id: lineManagerId,
      type: data.type,
      start_date: data.startDate || null,
      end_date: data.endDate || null,
      total_days: Number(data.totalDays) || 0,
      reason: data.reason || '',
      status: initialStatus,
      applied_date: new Date().toISOString(),
      organization_id: orgId,
    };

    const { error } = await supabase.from('leaves').insert(payload);
    if (error) throw new Error(`Failed to create record: ${error.message}`);
    leaveService.clearCache();
    apiClient.notify();
  },

  async updateLeaveStatus(id: string, status: string, remarks: string, role: string) {
    if (!isSupabaseConfigured()) return;
    const update: any = { status };
    if (role === 'MANAGER') {
      update.manager_remarks = remarks;
      if (status === 'APPROVED') update.status = 'PENDING_HR';
    } else if (role === 'ADMIN' || role === 'HR') {
      update.approver_remarks = remarks;
    } else {
      update.approver_remarks = remarks;
    }
    const { error } = await supabase.from('leaves').update(update).eq('id', id.trim());
    if (error) throw new Error('Access Denied');
    leaveService.clearCache();
    apiClient.notify();
  },

  async adminCreateLeave(data: {
    employeeId: string;
    employeeName: string;
    type: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string;
    status: string;
    remarks: string;
  }) {
    if (!isSupabaseConfigured()) return;

    let lineManagerId: string | null = null;
    try {
      const { data: emp } = await supabase
        .from('profiles')
        .select('line_manager_id')
        .eq('id', data.employeeId.trim())
        .single();
      lineManagerId = emp?.line_manager_id || null;
    } catch (e) { /* non-fatal */ }

    const orgId = apiClient.getOrganizationId();
    const payload: any = {
      employee_id: data.employeeId.trim(),
      employee_name: data.employeeName,
      line_manager_id: lineManagerId,
      type: data.type,
      start_date: data.startDate || null,
      end_date: data.endDate || null,
      total_days: Number(data.totalDays) || 0,
      reason: data.reason || '',
      status: data.status || 'APPROVED',
      approver_remarks: data.remarks || '',
      applied_date: new Date().toISOString(),
      organization_id: orgId,
    };

    const { error } = await supabase.from('leaves').insert(payload);
    if (error) throw new Error('Failed to create leave record');
    leaveService.clearCache();
    apiClient.notify();
  },

  async adminUpdateLeave(id: string, data: {
    type?: string;
    startDate?: string;
    endDate?: string;
    totalDays?: number;
    reason?: string;
    status?: string;
    managerRemarks?: string;
    approverRemarks?: string;
  }) {
    if (!isSupabaseConfigured()) return;
    const update: any = {};
    if (data.type !== undefined)           update.type = data.type;
    if (data.startDate !== undefined)      update.start_date = data.startDate || null;
    if (data.endDate !== undefined)        update.end_date = data.endDate || null;
    if (data.totalDays !== undefined)      update.total_days = Number(data.totalDays);
    if (data.reason !== undefined)         update.reason = data.reason;
    if (data.status !== undefined)         update.status = data.status;
    if (data.managerRemarks !== undefined) update.manager_remarks = data.managerRemarks;
    if (data.approverRemarks !== undefined) update.approver_remarks = data.approverRemarks;

    const { error } = await supabase.from('leaves').update(update).eq('id', id.trim());
    if (error) throw new Error('Failed to update leave record');
    leaveService.clearCache();
    apiClient.notify();
  },

  async adminDeleteLeave(id: string) {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from('leaves').delete().eq('id', id.trim());
    if (error) throw new Error('Failed to delete leave record');
    leaveService.clearCache();
    apiClient.notify();
  },

  async getLeaveBalance(employeeId: string): Promise<LeaveBalance> {
    const policy = await organizationService.getLeavePolicy();
    const defaults = policy?.defaults ?? { ANNUAL: 15, CASUAL: 10, SICK: 14 };
    const overrides = policy?.overrides ?? {};
    const quota = overrides[employeeId] || defaults;
    const balance: LeaveBalance = { employeeId };
    for (const [type, amount] of Object.entries(quota)) {
      balance[type] = amount as number;
    }
    if (!isSupabaseConfigured()) return balance;
    try {
      const { data, error } = await supabase
        .from('leaves')
        .select('type, total_days')
        .eq('employee_id', employeeId.trim())
        .eq('status', 'APPROVED');
      if (error) throw error;
      (data ?? []).forEach(r => {
        const type = r.type as string;
        if (type in balance && typeof balance[type] === 'number') {
          (balance as any)[type] = (balance[type] as number) - (r.total_days || 0);
        }
      });
      return balance;
    } catch (e) { return balance; }
  },
};
