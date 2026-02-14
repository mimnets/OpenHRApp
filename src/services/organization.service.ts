import { apiClient } from './api.client';
import { AppConfig, Holiday, Team, LeavePolicy, LeaveWorkflow } from '../types';
import { DEFAULT_CONFIG, BD_HOLIDAYS } from '../constants';
import { shiftService } from './shift.service';

// Internal Cache
let cachedConfig: AppConfig | null = null;
let cachedDepartments: string[] | null = null;
let cachedDesignations: string[] | null = null;
let cachedHolidays: Holiday[] | null = null;
let cachedLeavePolicy: LeavePolicy | null = null;

// Helper functions extracted to avoid 'this' binding issues
async function getSetting(key: string, defaultValue: any) {
  if (!apiClient.pb || !apiClient.isConfigured()) {
    console.warn(`[OrgService] PocketBase not configured, returning default for: ${key}`);
    return defaultValue;
  }
  const orgId = apiClient.getOrganizationId();
  if (!orgId) {
    console.warn(`[OrgService] No organization_id found in auth, returning default for: ${key}`);
    return defaultValue;
  }
  const filter = `key = "${key}" && organization_id = "${orgId}"`;

  try {
    const record = await apiClient.pb.collection('settings').getFirstListItem(filter);
    return record.value || defaultValue;
  } catch (e: any) {
    // This is expected for new orgs that don't have settings yet
    if (e?.status !== 404) {
      console.warn(`[OrgService] Failed to fetch setting '${key}':`, e?.message || e);
    }
    return defaultValue;
  }
}

async function setSetting(key: string, value: any) {
  if (!apiClient.pb || !apiClient.isConfigured()) return;
  const orgId = apiClient.getOrganizationId();
  if (!orgId) throw new Error("No Organization Context");

  const filter = `key = "${key}" && organization_id = "${orgId}"`;
  try {
    const record = await apiClient.pb.collection('settings').getFirstListItem(filter);
    await apiClient.pb.collection('settings').update(record.id, { value });
  } catch {
    await apiClient.pb.collection('settings').create({ key, value, organization_id: orgId });
  }
}

export const organizationService = {
  clearCache() {
    cachedConfig = null;
    cachedDepartments = null;
    cachedDesignations = null;
    cachedHolidays = null;
    cachedLeavePolicy = null;
    shiftService.clearCache();
  },

  async prefetchMetadata() {
    if (!apiClient.isConfigured()) return;
    try {
      const results = await Promise.all([
        organizationService.getConfig(),
        organizationService.getDepartments(),
        organizationService.getDesignations(),
        organizationService.getHolidays(),
        organizationService.getTeams(),
        organizationService.getLeavePolicy(),
        shiftService.getShifts()
      ]);
      // Auto-migrate AppConfig → Default Shift (lazy, idempotent)
      const config = results[0] as AppConfig;
      await shiftService.migrateFromAppConfig(config);
    } catch (e) {
      console.warn("Metadata prefetch partial failure", e);
    }
  },

  // Expose getSetting for external use if needed
  getSetting,
  setSetting,

  async getConfig(): Promise<AppConfig> {
    if (cachedConfig) return cachedConfig;
    const val = await getSetting('app_config', DEFAULT_CONFIG);
    cachedConfig = val;
    return val;
  },

  async setConfig(config: AppConfig) {
    await setSetting('app_config', config);
    cachedConfig = config;
    apiClient.notify();
  },

  async getDepartments(): Promise<string[]> {
    if (cachedDepartments) return cachedDepartments;
    const val = await getSetting('departments', []);
    cachedDepartments = val;
    return val;
  },

  async setDepartments(depts: string[]) {
    await setSetting('departments', depts);
    cachedDepartments = depts;
    apiClient.notify();
  },

  async getDesignations(): Promise<string[]> {
    if (cachedDesignations) return cachedDesignations;
    const val = await getSetting('designations', []);
    cachedDesignations = val;
    return val;
  },

  async setDesignations(desigs: string[]) {
    await setSetting('designations', desigs);
    cachedDesignations = desigs;
    apiClient.notify();
  },

  async getHolidays(): Promise<Holiday[]> {
    if (cachedHolidays) return cachedHolidays;
    const val = await getSetting('holidays', BD_HOLIDAYS);
    cachedHolidays = val;
    return val;
  },

  async setHolidays(hols: Holiday[]) {
    await setSetting('holidays', hols);
    cachedHolidays = hols;
    apiClient.notify();
  },

  async getTeams(): Promise<Team[]> {
    if (!apiClient.pb || !apiClient.isConfigured()) {
      console.warn("[OrgService] PocketBase not configured for teams");
      return [];
    }
    try {
      // PocketBase API rules filter by organization_id automatically
      const records = await apiClient.pb.collection('teams').getFullList({ sort: 'name' });
      console.log(`[OrgService] Fetched ${records.length} teams`);
      return records.map(r => ({ id: r.id, name: r.name, leaderId: r.leader_id, department: r.department, organizationId: r.organization_id }));
    } catch (e: any) {
      console.error("[OrgService] Failed to fetch teams:", e?.message || e);
      return [];
    }
  },

  async createTeam(data: Partial<Team>) {
    if (!apiClient.pb || !apiClient.isConfigured()) return null;
    const orgId = apiClient.getOrganizationId();
    const record = await apiClient.pb.collection('teams').create({
      name: data.name,
      leader_id: data.leaderId,
      department: data.department,
      organization_id: orgId
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
    return await getSetting('workflows', []);
  },

  async setWorkflows(wfs: LeaveWorkflow[]) {
    await setSetting('workflows', wfs);
    apiClient.notify();
  },

  async getLeavePolicy(): Promise<LeavePolicy> {
    if (cachedLeavePolicy) return cachedLeavePolicy;
    const defaultPolicy: LeavePolicy = {
      defaults: { ANNUAL: 15, CASUAL: 10, SICK: 14 },
      overrides: {}
    };
    const val = await getSetting('leave_policy', defaultPolicy);
    cachedLeavePolicy = val;
    return val;
  },

  async setLeavePolicy(policy: LeavePolicy) {
    await setSetting('leave_policy', policy);
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
      organization_id: orgId
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
    } catch {
      return [];
    }
  },

  async getAdminUnverifiedUsers() {
    if (!apiClient.pb || !apiClient.isConfigured()) return [];
    try {
      const response = await apiClient.pb.send("/api/openhr/unverified-users", { method: "GET" });
      return response.users || [];
    } catch {
      return [];
    }
  },

  async adminVerifyUser(userId: string) {
    if (!apiClient.pb || !apiClient.isConfigured()) return { success: false };
    try {
      const response = await apiClient.pb.send("/api/openhr/admin-verify-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      return { success: response.success || false, message: response.message };
    } catch (err: any) {
      return { success: false, message: err.message || "Verification failed" };
    }
  },

  async testPocketBaseConnection(url: string): Promise<{ success: boolean; message: string }> {
    try {
      const cleanUrl = url.trim().replace(/\/+$/, '');
      const response = await fetch(`${cleanUrl}/api/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        return { success: true, message: "Connection successful!" };
      }
      return { success: false, message: `Server responded with status: ${response.status}` };
    } catch (err: any) {
      return { success: false, message: err.message || "Connection failed" };
    }
  }
};
