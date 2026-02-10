
import { apiClient } from './api.client';
import { LeaveRequest, LeaveBalance } from '../types';
import { organizationService } from './organization.service';

export const leaveService = {
  async getLeaves(): Promise<LeaveRequest[]> {
    if (!apiClient.pb || !apiClient.isConfigured()) {
      console.warn("[LeaveService] PocketBase not configured");
      return [];
    }
    try {
      // PocketBase API rules filter by organization_id automatically
      const records = await apiClient.pb.collection('leaves').getFullList({ sort: '-applied_date' });
      console.log(`[LeaveService] Fetched ${records.length} leave records`);
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
        approverRemarks: r.approver_remarks || "",
        organizationId: r.organization_id
      }));
    } catch (e: any) {
      console.error("[LeaveService] Failed to fetch leaves:", e?.message || e);
      return [];
    }
  },

  async saveLeaveRequest(data: Partial<LeaveRequest>) {
    if (!apiClient.pb || !apiClient.isConfigured()) return;
    
    // 1. Get Employee Info to determine Department
    let department = 'Unassigned';
    let lineManagerId = null;
    
    try {
      if (data.employeeId) {
        const empRecord = await apiClient.pb.collection('users').getOne(data.employeeId);
        department = empRecord.department || 'Unassigned';
        lineManagerId = empRecord.line_manager_id || null;
      }
    } catch(e) { console.error("Could not fetch employee details for workflow"); }

    // 2. Determine Initial Status based on Workflow
    let initialStatus = 'PENDING_MANAGER';
    
    try {
      const workflows = await organizationService.getWorkflows();
      const deptWorkflow = workflows.find(w => w.department === department);
      
      // If workflow is set to HR or ADMIN, skip manager approval
      if (deptWorkflow && (deptWorkflow.approverRole === 'HR' || deptWorkflow.approverRole === 'ADMIN')) {
        initialStatus = 'PENDING_HR';
      }
      // If employee has no manager, default to HR
      if (!lineManagerId && initialStatus === 'PENDING_MANAGER') {
        initialStatus = 'PENDING_HR';
      }
    } catch(e) { console.warn("Workflow check failed, defaulting to Manager"); }

    const formatPbDate = (dateStr: string) => {
      if (!dateStr) return null;
      if (dateStr.length === 10) return `${dateStr} 00:00:00`;
      if (dateStr.includes('T')) return dateStr.replace('T', ' ').split('.')[0];
      return dateStr;
    };
    
    const now = new Date();
    const appliedAt = now.toISOString().replace('T', ' ').split('.')[0];
    const orgId = apiClient.getOrganizationId();
    
    const payload: any = {
      employee_id: data.employeeId?.trim(),
      employee_name: data.employeeName,
      line_manager_id: lineManagerId, // Use database source of truth
      type: data.type,
      start_date: formatPbDate(data.startDate || ''),
      end_date: formatPbDate(data.endDate || ''),
      total_days: Number(data.totalDays) || 0,
      reason: data.reason || "",
      status: initialStatus,
      applied_date: appliedAt,
      organization_id: orgId
    };
    
    try {
      await apiClient.pb.collection('leaves').create(payload);
      apiClient.notify();
    } catch (err: any) {
      if (err.response?.id) { apiClient.notify(); return; }
      throw new Error(`Failed to create record`);
    }
  },

  async updateLeaveStatus(id: string, status: string, remarks: string, role: string) {
    if (!apiClient.pb || !apiClient.isConfigured()) return;
    const update: any = { status };
    if (role === 'MANAGER') {
      update.manager_remarks = remarks;
      if (status === 'APPROVED') update.status = 'PENDING_HR'; 
    } else {
      update.approver_remarks = remarks;
    }
    try {
      await apiClient.pb.collection('leaves').update(id.trim(), update);
      apiClient.notify();
    } catch (err: any) { throw new Error("Access Denied"); }
  },

  async getLeaveBalance(employeeId: string): Promise<LeaveBalance> {
    const policy = await organizationService.getLeavePolicy();
    const quota = policy.overrides[employeeId] || policy.defaults;
    const balance: LeaveBalance = { 
      employeeId, 
      ANNUAL: quota.ANNUAL, 
      CASUAL: quota.CASUAL, 
      SICK: quota.SICK 
    };

    if (!apiClient.pb || !apiClient.isConfigured()) return balance;
    
    try {
      const records = await apiClient.pb.collection('leaves').getFullList({
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
  }
};
