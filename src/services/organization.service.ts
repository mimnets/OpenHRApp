import { supabase, isSupabaseConfigured } from './supabase';
import { apiClient, resolveOrgId } from './api.client';
import { AppConfig, Holiday, Team, LeavePolicy, LeaveWorkflow, OrgReviewConfig, CustomLeaveType, OrgNotificationConfig } from '../types';
import { DEFAULT_CONFIG, DEFAULT_REVIEW_CONFIG, DEFAULT_LEAVE_TYPES, DEFAULT_NOTIFICATION_CONFIG } from '../constants';
import { shiftService } from './shift.service';

const ORG_CACHE_TTL = 5 * 60 * 1000;
let orgCacheTimestamp = 0;

let cachedConfig: AppConfig | null = null;
let cachedDepartments: string[] | null = null;
let cachedDesignations: string[] | null = null;
let cachedHolidays: Holiday[] | null = null;
let cachedLeavePolicy: LeavePolicy | null = null;
let cachedReviewConfig: OrgReviewConfig | null = null;
let cachedLeaveTypes: CustomLeaveType[] | null = null;
let cachedTeams: Team[] | null = null;
let cachedNotificationConfig: OrgNotificationConfig | null = null;

function isCacheValid() {
  return orgCacheTimestamp > 0 && Date.now() - orgCacheTimestamp < ORG_CACHE_TTL;
}
function touchCache() { orgCacheTimestamp = Date.now(); }


async function getSetting(key: string, defaultValue: any) {
  if (!isSupabaseConfigured()) {
    console.warn(`[OrgService] Supabase not configured, returning default for: ${key}`);
    return defaultValue;
  }
  const orgId = await resolveOrgId();
  if (!orgId) {
    console.warn(`[OrgService] No organization_id, returning default for: ${key}`);
    return defaultValue;
  }
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .eq('organization_id', orgId)
      .maybeSingle();
    if (error) throw error;
    return data?.value ?? defaultValue;
  } catch (e: any) {
    console.warn(`[OrgService] Failed to fetch setting '${key}':`, e?.message || e);
    return defaultValue;
  }
}

async function setSetting(key: string, value: any) {
  if (!isSupabaseConfigured()) return;
  const orgId = await resolveOrgId();
  if (!orgId) throw new Error('No Organization Context');
  // Upsert requires unique constraint on (organization_id, key) — see migration 0001.
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value, organization_id: orgId }, { onConflict: 'organization_id,key' });
  if (error) throw error;
}

export const organizationService = {
  clearCache() {
    cachedConfig = null;
    cachedDepartments = null;
    cachedDesignations = null;
    cachedHolidays = null;
    cachedLeavePolicy = null;
    cachedReviewConfig = null;
    cachedTeams = null;
    cachedLeaveTypes = null;
    cachedNotificationConfig = null;
    orgCacheTimestamp = 0;
    shiftService.clearCache();
  },

  async prefetchMetadata() {
    if (!isSupabaseConfigured()) return;
    try {
      await Promise.all([
        organizationService.getConfig(),
        organizationService.getDepartments(),
        organizationService.getDesignations(),
        organizationService.getHolidays(),
        organizationService.getTeams(),
        organizationService.getLeavePolicy(),
        shiftService.getShifts(),
      ]);
    } catch (e) {
      console.warn('Metadata prefetch partial failure', e);
    }
  },

  getSetting,
  setSetting,

  async getConfig(): Promise<AppConfig> {
    if (cachedConfig && isCacheValid()) return cachedConfig;
    const val = await getSetting('app_config', DEFAULT_CONFIG);
    cachedConfig = val;
    touchCache();
    return val;
  },

  async setConfig(config: AppConfig) {
    await setSetting('app_config', config);
    cachedConfig = config;
    apiClient.notify();
  },

  async getDepartments(): Promise<string[]> {
    if (cachedDepartments && isCacheValid()) return cachedDepartments;
    const val = await getSetting('departments', []);
    const arr = Array.isArray(val) ? val : [];
    cachedDepartments = arr;
    touchCache();
    return arr;
  },

  async setDepartments(depts: string[]) {
    await setSetting('departments', depts);
    cachedDepartments = depts;
    apiClient.notify();
  },

  async getDesignations(): Promise<string[]> {
    if (cachedDesignations && isCacheValid()) return cachedDesignations;
    const val = await getSetting('designations', []);
    const arr = Array.isArray(val) ? val : [];
    cachedDesignations = arr;
    touchCache();
    return arr;
  },

  async setDesignations(desigs: string[]) {
    await setSetting('designations', desigs);
    cachedDesignations = desigs;
    apiClient.notify();
  },

  async getHolidays(): Promise<Holiday[]> {
    if (cachedHolidays && isCacheValid()) return cachedHolidays;
    const val = await getSetting('holidays', []);
    const arr = Array.isArray(val) ? val : [];
    cachedHolidays = arr;
    touchCache();
    return arr;
  },

  async setHolidays(hols: Holiday[]) {
    await setSetting('holidays', hols);
    cachedHolidays = hols;
    apiClient.notify();
  },

  async getTeams(): Promise<Team[]> {
    if (cachedTeams && isCacheValid()) return cachedTeams;
    if (!isSupabaseConfigured()) return [];
    try {
      const orgId = apiClient.getOrganizationId();
      let query = supabase.from('teams').select('*').order('name');
      if (orgId) query = query.eq('organization_id', orgId);
      const { data, error } = await query;
      if (error) throw error;
      console.log(`[OrgService] Fetched ${data?.length ?? 0} teams`);
      cachedTeams = (data ?? []).map(r => ({
        id: r.id,
        name: r.name,
        leaderId: r.leader_id,
        department: r.department,
        organizationId: r.organization_id,
      }));
      return cachedTeams;
    } catch (e: any) {
      console.error('[OrgService] Failed to fetch teams:', e?.message || e);
      return [];
    }
  },

  async createTeam(data: Partial<Team>) {
    if (!isSupabaseConfigured()) return null;
    const orgId = apiClient.getOrganizationId();
    const { data: record, error } = await supabase
      .from('teams')
      .insert({ name: data.name, leader_id: data.leaderId, department: data.department, organization_id: orgId })
      .select()
      .single();
    if (error) throw error;
    cachedTeams = null;
    apiClient.notify();
    return record;
  },

  async updateTeam(id: string, data: Partial<Team>) {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase
      .from('teams')
      .update({ name: data.name, leader_id: data.leaderId, department: data.department })
      .eq('id', id);
    if (error) throw error;
    cachedTeams = null;
    apiClient.notify();
  },

  async deleteTeam(id: string) {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from('teams').delete().eq('id', id);
    if (error) throw error;
    cachedTeams = null;
    apiClient.notify();
  },

  async getWorkflows(): Promise<LeaveWorkflow[]> {
    const val = await getSetting('workflows', []);
    return Array.isArray(val) ? val : [];
  },

  async setWorkflows(wfs: LeaveWorkflow[]) {
    await setSetting('workflows', wfs);
    apiClient.notify();
  },

  async getLeavePolicy(): Promise<LeavePolicy> {
    if (cachedLeavePolicy && isCacheValid()) return cachedLeavePolicy;
    const defaultPolicy: LeavePolicy = { defaults: { ANNUAL: 15, CASUAL: 10, SICK: 14 }, overrides: {} };
    const val = await getSetting('leave_policy', defaultPolicy);
    const normalized: LeavePolicy = {
      defaults: val?.defaults ?? defaultPolicy.defaults,
      overrides: val?.overrides ?? {},
    };
    cachedLeavePolicy = normalized;
    return normalized;
  },

  async setLeavePolicy(policy: LeavePolicy) {
    await setSetting('leave_policy', policy);
    cachedLeavePolicy = policy;
    apiClient.notify();
  },

  async getReviewConfig(): Promise<OrgReviewConfig> {
    if (cachedReviewConfig && isCacheValid()) return cachedReviewConfig;
    const val = await getSetting('review_config', DEFAULT_REVIEW_CONFIG);
    cachedReviewConfig = val;
    return val;
  },

  async setReviewConfig(config: OrgReviewConfig) {
    await setSetting('review_config', config);
    cachedReviewConfig = config;
    apiClient.notify();
  },

  async getLeaveTypes(): Promise<CustomLeaveType[]> {
    if (cachedLeaveTypes && isCacheValid()) return cachedLeaveTypes;
    const val = await getSetting('leave_types', DEFAULT_LEAVE_TYPES);
    const arr = Array.isArray(val) ? val : DEFAULT_LEAVE_TYPES;
    cachedLeaveTypes = arr;
    return arr;
  },

  async setLeaveTypes(types: CustomLeaveType[]) {
    await setSetting('leave_types', types);
    cachedLeaveTypes = types;
    apiClient.notify();
  },

  async getNotificationConfig(): Promise<OrgNotificationConfig> {
    if (cachedNotificationConfig && isCacheValid()) return cachedNotificationConfig;
    const val = await getSetting('notification_config', DEFAULT_NOTIFICATION_CONFIG);
    cachedNotificationConfig = val;
    return val;
  },

  async setNotificationConfig(config: OrgNotificationConfig) {
    await setSetting('notification_config', config);
    cachedNotificationConfig = config;
    apiClient.notify();
  },

  async sendCustomEmail(data: { recipientEmail: string; subject: string; html: string; type?: string }) {
    if (!isSupabaseConfigured()) return;
    const orgId = apiClient.getOrganizationId();
    const payload = {
      recipient_email: data.recipientEmail.trim(),
      subject: data.subject.trim(),
      html_content: data.html,
      type: data.type || 'SYSTEM_REPORT',
      status: 'PENDING',
      organization_id: orgId,
    };
    const { data: result, error } = await supabase.from('reports_queue').insert(payload).select().single();
    if (error) throw new Error(error.message);
    return result;
  },

  async getReportQueueLog(): Promise<any[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const { data, error } = await supabase
        .from('reports_queue')
        .select('*')
        .order('created', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    } catch { return []; }
  },

  async getAdminUnverifiedUsers() {
    if (!isSupabaseConfigured()) return [];
    try {
      const orgId = apiClient.getOrganizationId();
      let query = supabase
        .from('profiles')
        .select('id, name, email:id, employee_id, department, designation, created')
        .eq('verified', false);
      if (orgId) query = query.eq('organization_id', orgId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    } catch { return []; }
  },

  async adminVerifyUser(userId: string) {
    if (!isSupabaseConfigured()) return { success: false };
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ verified: true })
        .eq('id', userId);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Verification failed' };
    }
  },

  async getOnboardingStatus(): Promise<{ dismissed: boolean } | null> {
    return getSetting('onboarding_status', null);
  },

  async setOnboardingStatus(status: { dismissed: boolean }): Promise<void> {
    await setSetting('onboarding_status', status);
  },

  // Platform-level setting — no org_id filter
  async getGuideHelpLinks(): Promise<Record<string, string>> {
    if (!isSupabaseConfigured()) return {};
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'guide_help_links')
        .is('organization_id', null)
        .maybeSingle();
      if (error) throw error;
      return data?.value ?? {};
    } catch { return {}; }
  },

  async testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase.from('organizations').select('id').limit(1);
      if (error) return { success: false, message: error.message };
      return { success: true, message: 'Connection successful!' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Connection failed' };
    }
  },

  // Legacy alias kept so existing callers don't break during migration
  testPocketBaseConnection: async (url: string): Promise<{ success: boolean; message: string }> => {
    return organizationService.testSupabaseConnection();
  },
};
