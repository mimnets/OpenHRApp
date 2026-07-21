import { supabase, isSupabaseConfigured } from './supabase';
import { apiClient, resolveOrgId } from './api.client';
import { AppConfig, Holiday, Team, LeavePolicy, LeaveWorkflow, OrgReviewConfig, CustomLeaveType, OrgNotificationConfig, SubscriptionInfo, SubscriptionStatus, User } from '../types';
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


// localStorage key prefix for platform-level settings when the DB
// migration (nullable org_id) hasn't been applied yet.
const PLATFORM_PREFIX = 'openhr-platform:';

async function getSetting(key: string, defaultValue: any) {
  if (!isSupabaseConfigured()) {
    console.warn(`[OrgService] Supabase not configured, returning default for: ${key}`);
    return defaultValue;
  }
  const orgId = await resolveOrgId();
  try {
    let query = supabase
      .from('settings')
      .select('value')
      .eq('key', key);
    if (orgId) {
      query = query.eq('organization_id', orgId);
    } else {
      query = query.is('organization_id', null);
    }
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (data?.value != null) {
      try {
        return typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      } catch {
        return defaultValue;
      }
    }
    // No DB row — for platform-level, try localStorage fallback.
    if (!orgId) {
      const stored = readPlatformStored(key);
      if (stored !== undefined) return stored;
    }
    return defaultValue;
  } catch (e: any) {
    console.warn(`[OrgService] Failed to fetch setting '${key}':`, e?.message || e);
    // Last resort: localStorage for platform-level reads.
    if (!orgId) {
      const stored = readPlatformStored(key);
      if (stored !== undefined) return stored;
    }
    return defaultValue;
  }
}

function readPlatformStored(key: string): any | undefined {
  try {
    const raw = localStorage.getItem(PLATFORM_PREFIX + key);
    if (raw !== null) return JSON.parse(raw);
  } catch { /* corrupt or unavailable */ }
  return undefined;
}

function writePlatformStored(key: string, value: any): void {
  try { localStorage.setItem(PLATFORM_PREFIX + key, JSON.stringify(value)); } catch { /* quota or unavailable */ }
}

async function setSetting(key: string, value: any) {
  if (!isSupabaseConfigured()) return;
  const orgId = await resolveOrgId();

  if (orgId) {
    // Org-scoped setting — upsert with composite unique constraint.
    const { error } = await supabase
      .from('settings')
      .upsert({ key, value, organization_id: orgId }, { onConflict: 'organization_id,key' });
    if (error) throw error;
  } else {
    // Platform-level setting (super admin, no org context).
    // Try the DB path first (requires migration 0019: nullable org_id).
    // If the column is still NOT NULL, fall back to localStorage so the
    // feature works immediately without a DB migration.
    try {
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('key', key)
        .is('organization_id', null)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from('settings')
          .update({ value })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('settings')
          .insert({ key, value, organization_id: null });
        if (error) throw error;
      }
      // DB write succeeded — clear any stale localStorage copy.
      try { localStorage.removeItem(PLATFORM_PREFIX + key); } catch {}
    } catch (e: any) {
      if (e?.message?.includes('not-null constraint') || e?.code === '23502') {
        // Migration 0019 hasn't been applied yet. Persist to localStorage
        // so the super admin can still use the feature immediately.
        console.warn(`[OrgService] Platform DB not ready, using localStorage for: ${key}`);
        writePlatformStored(key, value);
        return;
      }
      throw e;
    }
  }
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
    // Two tiers to keep iOS LTE login responsive. Tier 1 is what the dashboard
    // shell needs to render correctly (company name + role lists). Tier 2 is
    // module-specific (Leave, Attendance, Team Directory) and is fired in the
    // background so it doesn't block the first paint of the authenticated UI.
    try {
      await Promise.all([
        organizationService.getConfig(),
        organizationService.getDepartments(),
        organizationService.getDesignations(),
      ]);
    } catch (e) {
      console.warn('Metadata prefetch (tier 1) partial failure', e);
    }
    // Fire-and-forget — never blocks the caller, errors are logged only.
    Promise.allSettled([
      organizationService.getHolidays(),
      organizationService.getTeams(),
      organizationService.getLeavePolicy(),
      shiftService.getShifts(),
    ]).then(results => {
      const failed = results.filter(r => r.status === 'rejected');
      if (failed.length) console.warn('Metadata prefetch (tier 2) partial failure', failed);
    });
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

  // Platform-level setting — no org_id filter.
  // Falls back to localStorage if the DB migration (nullable org_id) hasn't
  // been applied yet.
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
      if (data?.value) return data.value;
    } catch { /* DB unavailable — try localStorage below */ }
    try {
      const stored = localStorage.getItem('openhr-platform:guide_help_links');
      if (stored) return JSON.parse(stored);
    } catch {}
    return {};
  },

  /**
   * Fetch subscription status directly from Supabase. Replaces the dead
   * PocketBase `/api/openhr/subscription-status` endpoint.
   * Super Admins (no org) get a synthetic ACTIVE response.
   */
  async getSubscriptionStatus(user: User | null): Promise<SubscriptionInfo | null> {
    if (!user) return null;

    // SUPER_ADMIN has no org context — always active, not blocked.
    if (user.role === 'SUPER_ADMIN' || !user.organizationId) {
      return {
        status: 'ACTIVE',
        isSuperAdmin: true,
        isReadOnly: false,
        isBlocked: false,
        showAds: false,
        isDemo: false,
      };
    }

    if (!isSupabaseConfigured()) {
      // Safe default: don't block users when backend is unreachable.
      return {
        status: 'ACTIVE',
        isSuperAdmin: false,
        isReadOnly: false,
        isBlocked: false,
        showAds: false,
        isDemo: false,
      };
    }

    const { data, error } = await supabase
      .from('organizations')
      .select('subscription_status, trial_end_date, is_demo')
      .eq('id', user.organizationId)
      .maybeSingle();

    if (error) {
      console.error('[OrgService] getSubscriptionStatus failed:', error.message);
      throw error;
    }

    const status = (data?.subscription_status as SubscriptionStatus) || 'TRIAL';
    const trialEndDate = data?.trial_end_date as string | undefined;

    let daysRemaining: number | undefined;
    if (status === 'TRIAL' && trialEndDate) {
      const endDate = new Date(trialEndDate);
      const now = new Date();
      // Calendar-date math (ignore wall-clock time) to match the legacy PB endpoint.
      const endDay = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
      const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
      daysRemaining = Math.max(0, Math.round((endDay - today) / (1000 * 60 * 60 * 24)));
    }

    return {
      status,
      trialEndDate,
      daysRemaining,
      isSuperAdmin: false,
      isReadOnly: status === 'EXPIRED',
      isBlocked: status === 'SUSPENDED',
      showAds: status === 'AD_SUPPORTED',
      isDemo: data?.is_demo || false,
    };
  },

  async getOrgBranding(): Promise<{ name: string; address: string; logoDataUrl: string | null }> {
    const orgId = await resolveOrgId();
    if (!orgId) return { name: '', address: '', logoDataUrl: null };
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('name, address, logo')
        .eq('id', orgId)
        .maybeSingle();
      if (error) throw error;
      let logoDataUrl: string | null = null;
      if (data?.logo) {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/org-logos/${data.logo}`;
        try {
          const resp = await fetch(url);
          const blob = await resp.blob();
          logoDataUrl = await new Promise<string>((res, rej) => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result as string);
            reader.onerror = rej;
            reader.readAsDataURL(blob);
          });
        } catch { /* logo unavailable */ }
      }
      return { name: data?.name || '', address: data?.address || '', logoDataUrl };
    } catch { return { name: '', address: '', logoDataUrl: null }; }
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
