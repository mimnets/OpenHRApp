
import { apiClient } from './api.client';
import { AppConfig, Holiday, Team, LeavePolicy, LeaveWorkflow } from '../types';
import { DEFAULT_CONFIG, BD_HOLIDAYS } from '../constants.tsx';

// Internal Cache
let cachedConfig: AppConfig | null = null;
let cachedDepartments: string[] | null = null;
let cachedDesignations: string[] | null = null;
let cachedHolidays: Holiday[] | null = null;
let cachedLeavePolicy: LeavePolicy | null = null;

export const organizationService = {
  clearCache() {
    cachedConfig = null;
    cachedDepartments = null;
    cachedDesignations = null;
    cachedHolidays = null;
    cachedLeavePolicy = null;
  },

  async prefetchMetadata() {
    if (!apiClient.isConfigured()) return;
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

  // Helper to ensure we only get settings for the current Org
  async getSetting(key: string, defaultValue: any) {
    if (!apiClient.pb || !apiClient.isConfigured()) return defaultValue;
    const orgId = apiClient.getOrganizationId();
    // If no orgId (e.g. Super Admin or error), fall back to basic query or empty
    const filter = orgId ? `key = "${key}" && organization_id = "${orgId}"` : `key = "${key}"`;
    
    try {
      const record = await apiClient.pb.collection('settings').getFirstListItem(filter);
      return record.value || defaultValue;
    } catch (e) { return defaultValue; }
  },

  async setSetting(key: string, value: any) {
    if (!apiClient.pb || !apiClient.isConfigured()) return;
    const orgId = apiClient.getOrganizationId();
    if (!orgId) throw new Error("No Organization Context");

    const filter = `key = "${key}" && organization_id = "${orgId}"`;
    try {
      const record = await apiClient.pb.collection('settings').getFirstListItem(filter);
      await apiClient.pb.collection('settings').update(record.id, { value });
    } catch (e) {
      await apiClient.pb.collection('settings').create({ key, value, organization_id: orgId });
    }
  },

  async getConfig(): Promise<AppConfig> {
    if (cachedConfig) return cachedConfig;
    const val = await this.getSetting('app_config', DEFAULT_CONFIG);
    cachedConfig = val;
    return val;
  },

  async setConfig(config: AppConfig) {
    await this.setSetting('app_config', config);
    cachedConfig = config;
    apiClient.notify();
  },

  async getDepartments(): Promise<string[]> {
    if (cachedDepartments) return cachedDepartments;
    const val = await this.getSetting('departments', []);
    cachedDepartments = val;
    return val;
  },

  async setDepartments(depts: string[]) {
    await this.setSetting('departments', depts);
    cachedDepartments = depts;
    apiClient.notify();
  },

  async getDesignations(): Promise<string[]> {
    if (cachedDesignations) return cachedDesignations;
    const val = await this.getSetting('designations', []);
    cachedDesignations = val;
    return val;
  },

  async setDesignations(desigs: string[]) {
    await this.setSetting('designations', desigs);
    cachedDesignations = desigs;
    apiClient.notify();
  },

  async getHolidays(): Promise<Holiday[]> {
    if (cachedHolidays) return cachedHolidays;
    const val = await this.getSetting('holidays', BD_HOLIDAYS);
    cachedHolidays = val;
    return val;
  },

  async setHolidays(hols: Holiday[]) {
    await this.setSetting('holidays', hols);
    cachedHolidays = hols;
    apiClient.notify();
  },

  async getTeams(): Promise<Team[]> {
    if (!apiClient.pb || !apiClient.isConfigured()) return [];
    try {
      // API Rules usually handle filtering by organization_id automatically for collections like 'teams'
      const records = await apiClient.pb.collection('teams').getFullList({ sort: 'name' });
      return records.map(r => ({ id: r.id, name: r.name, leaderId: r.leader_id, department: r.department, organizationId: r.organization_id }));
    } catch (e) { return []; }
  },

  async createTeam(data: Partial<Team>) {
    if (!apiClient.pb || !apiClient.isConfigured()) return null;
    const orgId = apiClient.getOrganizationId();
    const record = await apiClient.pb.collection('teams').create({ 
      name: data.name, 
      leader_id: data.leaderId, 
      department: data.department,
      organization_id: orgId // Explicitly set org ID
    });
    apiClient.notify();
    return record;
  },

  async updateTeam(id: string, data: Partial<Team>) {
    if (!apiClient.pb || !apiClient.isConfigured()) return;
    await apiClient.pb.collection('teams').update(id, { name: data.name, leader_id: data.leaderId, department: data.department });
    apiClient.notify();
  },

  async deleteTeam(id: string) {
    if (!apiClient.pb || !apiClient.isConfigured()) return;
    await apiClient.pb.collection('teams').delete(id);
    apiClient.notify();
  },

  async getWorkflows(): Promise<LeaveWorkflow[]> {
    return await this.getSetting('workflows', []);
  },

  async setWorkflows(wfs: LeaveWorkflow[]) {
    await this.setSetting('workflows', wfs);
    apiClient.notify();
  },

  async getLeavePolicy(): Promise<LeavePolicy> {
    if (cachedLeavePolicy) return cachedLeavePolicy;
    const defaultPolicy: LeavePolicy = {
      defaults: { ANNUAL: 15, CASUAL: 10, SICK: 14 },
      overrides: {}
    };
    const val = await this.getSetting('leave_policy', defaultPolicy);
    cachedLeavePolicy = val;
    return val;
  },

  async setLeavePolicy(policy: LeavePolicy) {
    await this.setSetting('leave_policy', policy);
    cachedLeavePolicy = policy;
    apiClient.notify();
  },

  // System/Admin
  async sendCustomEmail(data: { recipientEmail: string; subject: string; html: string; type?: string }) {
    if (!apiClient.pb || !apiClient.isConfigured()) return;
    const orgId = apiClient.getOrganizationId();
    const payload = { 
      recipient_email: data.recipientEmail.trim(), 
      subject: data.subject.trim(), 
      html_content: data.html, 
      type: data.type || 'SYSTEM_REPORT', 
      status: 'PENDING',
      organization_id: orgId // Attach Org ID
    };
    try {
      const result = await apiClient.pb.collection('reports_queue').create(payload);
      return result;
    } catch (err: any) { 
      const errorMessage = err.message || JSON.stringify(err);
      if (errorMessage.includes("html_content") && (errorMessage.includes("5000") || errorMessage.includes("length"))) {
        throw new Error("DATABASE ERROR: Report is too large (over 5000 chars). Go to PocketBase Admin > Collections > reports_queue > html_content and change Max Characters to 0 (Unlimited).");
      }
      
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
    if (!apiClient.pb || !apiClient.isConfigured()) return [];
    try {
      const records = await apiClient.pb.collection('reports_queue').getList(1, 10, { sort: '-created' });
      return records.items;
    } catch (e: any) { return []; }
  },

  async testPocketBaseConnection(url: string): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const response = await fetch(`${url.replace(/\/+$/, '')}/api/health`);
      if (response.ok) return { success: true, message: "OK" };
      return { success: false, message: "FAIL" };
    } catch (e: any) { return { success: false, message: "ERR" }; }
  }
};
