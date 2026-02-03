
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

  async getConfig(): Promise<AppConfig> {
    if (cachedConfig) return cachedConfig;
    if (!apiClient.pb || !apiClient.isConfigured()) return DEFAULT_CONFIG;
    try {
      const record = await apiClient.pb.collection('settings').getFirstListItem('key = "app_config"');
      cachedConfig = record.value || DEFAULT_CONFIG;
      return cachedConfig!;
    } catch (e) { return DEFAULT_CONFIG; }
  },

  async setConfig(config: AppConfig) {
    if (!apiClient.pb || !apiClient.isConfigured()) return;
    try {
      const record = await apiClient.pb.collection('settings').getFirstListItem('key = "app_config"');
      await apiClient.pb.collection('settings').update(record.id, { value: config });
      cachedConfig = config;
    } catch (e) {
      await apiClient.pb.collection('settings').create({ key: 'app_config', value: config });
      cachedConfig = config;
    }
    apiClient.notify();
  },

  async getDepartments(): Promise<string[]> {
    if (cachedDepartments) return cachedDepartments;
    if (!apiClient.pb || !apiClient.isConfigured()) return [];
    try {
      const record = await apiClient.pb.collection('settings').getFirstListItem('key = "departments"');
      cachedDepartments = record.value || [];
      return cachedDepartments!;
    } catch (e) { return []; }
  },

  async setDepartments(depts: string[]) {
    if (!apiClient.pb || !apiClient.isConfigured()) return;
    try {
      const record = await apiClient.pb.collection('settings').getFirstListItem('key = "departments"');
      await apiClient.pb.collection('settings').update(record.id, { value: depts });
      cachedDepartments = depts;
    } catch (e) {
      await apiClient.pb.collection('settings').create({ key: 'departments', value: depts });
      cachedDepartments = depts;
    }
    apiClient.notify();
  },

  async getDesignations(): Promise<string[]> {
    if (cachedDesignations) return cachedDesignations;
    if (!apiClient.pb || !apiClient.isConfigured()) return [];
    try {
      const record = await apiClient.pb.collection('settings').getFirstListItem('key = "designations"');
      cachedDesignations = record.value || [];
      return cachedDesignations!;
    } catch (e) { return []; }
  },

  async setDesignations(desigs: string[]) {
    if (!apiClient.pb || !apiClient.isConfigured()) return;
    try {
      const record = await apiClient.pb.collection('settings').getFirstListItem('key = "designations"');
      await apiClient.pb.collection('settings').update(record.id, { value: desigs });
      cachedDesignations = desigs;
    } catch (e) {
      await apiClient.pb.collection('settings').create({ key: 'designations', value: desigs });
      cachedDesignations = desigs;
    }
    apiClient.notify();
  },

  async getHolidays(): Promise<Holiday[]> {
    if (cachedHolidays) return cachedHolidays;
    if (!apiClient.pb || !apiClient.isConfigured()) return BD_HOLIDAYS;
    try {
      const record = await apiClient.pb.collection('settings').getFirstListItem('key = "holidays"');
      cachedHolidays = record.value || BD_HOLIDAYS;
      return cachedHolidays!;
    } catch (e) { return BD_HOLIDAYS; }
  },

  async setHolidays(hols: Holiday[]) {
    if (!apiClient.pb || !apiClient.isConfigured()) return;
    try {
      const record = await apiClient.pb.collection('settings').getFirstListItem('key = "holidays"');
      await apiClient.pb.collection('settings').update(record.id, { value: hols });
      cachedHolidays = hols;
    } catch (e) {
      await apiClient.pb.collection('settings').create({ key: 'holidays', value: hols });
      cachedHolidays = hols;
    }
    apiClient.notify();
  },

  async getTeams(): Promise<Team[]> {
    if (!apiClient.pb || !apiClient.isConfigured()) return [];
    try {
      const records = await apiClient.pb.collection('teams').getFullList({ sort: 'name' });
      return records.map(r => ({ id: r.id, name: r.name, leaderId: r.leader_id, department: r.department }));
    } catch (e) { return []; }
  },

  async createTeam(data: Partial<Team>) {
    if (!apiClient.pb || !apiClient.isConfigured()) return null;
    const record = await apiClient.pb.collection('teams').create({ name: data.name, leader_id: data.leaderId, department: data.department });
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
    if (!apiClient.pb || !apiClient.isConfigured()) return [];
    try {
      const record = await apiClient.pb.collection('settings').getFirstListItem('key = "workflows"');
      return record.value || [];
    } catch (e) { return []; }
  },

  async setWorkflows(wfs: LeaveWorkflow[]) {
    if (!apiClient.pb || !apiClient.isConfigured()) return;
    try {
      const record = await apiClient.pb.collection('settings').getFirstListItem('key = "workflows"');
      await apiClient.pb.collection('settings').update(record.id, { value: wfs });
    } catch (e) {
      await apiClient.pb.collection('settings').create({ key: 'workflows', value: wfs });
    }
    apiClient.notify();
  },

  async getLeavePolicy(): Promise<LeavePolicy> {
    if (cachedLeavePolicy) return cachedLeavePolicy;
    const defaultPolicy: LeavePolicy = {
      defaults: { ANNUAL: 15, CASUAL: 10, SICK: 14 },
      overrides: {}
    };
    if (!apiClient.pb || !apiClient.isConfigured()) return defaultPolicy;
    try {
      const record = await apiClient.pb.collection('settings').getFirstListItem('key = "leave_policy"');
      cachedLeavePolicy = record.value || defaultPolicy;
      return cachedLeavePolicy!;
    } catch (e) {
      return defaultPolicy;
    }
  },

  async setLeavePolicy(policy: LeavePolicy) {
    if (!apiClient.pb || !apiClient.isConfigured()) return;
    try {
      const record = await apiClient.pb.collection('settings').getFirstListItem('key = "leave_policy"');
      await apiClient.pb.collection('settings').update(record.id, { value: policy });
      cachedLeavePolicy = policy;
    } catch (e) {
      await apiClient.pb.collection('settings').create({ key: 'leave_policy', value: policy });
      cachedLeavePolicy = policy;
    }
    apiClient.notify();
  },

  // System/Admin
  async sendCustomEmail(data: { recipientEmail: string; subject: string; html: string; type?: string }) {
    if (!apiClient.pb || !apiClient.isConfigured()) return;
    const payload = { 
      recipient_email: data.recipientEmail.trim(), 
      subject: data.subject.trim(), 
      html_content: data.html, 
      type: data.type || 'SYSTEM_REPORT', 
      status: 'PENDING' 
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
