import { supabase, isSupabaseConfigured, getSupabaseStorageUrl } from './supabase';
import { apiClient } from './api.client';
import { Organization, Employee, PlatformStats, SubscriptionStatus } from '../types';
import { convertFileToWebP } from '../utils/imageConvert';
import { sanitizeHtml } from '../utils/sanitize';

// ==================== BULK EMAIL TYPES ====================

export type BulkEmailFilter =
  | { kind: 'ALL_ADMINS' }
  | { kind: 'ALL_USERS' }
  | { kind: 'ORG'; organizationId: string; rolesScope?: 'ALL' | 'ADMINS' }
  | { kind: 'BY_SUBSCRIPTION'; statuses: SubscriptionStatus[]; rolesScope?: 'ALL' | 'ADMINS' };

export interface BulkRecipient {
  id: string;
  email: string;
  organization_id: string;
}

export interface BulkCampaignSummary {
  campaignId: string;
  subject: string;
  totalRows: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  sentAt: string;
}

export interface BulkCampaignDetailRow {
  id: string;
  recipientEmail: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  sentAt?: string;
  errorMessage?: string;
}

const BULK_CAMPAIGN_PREFIX = 'BULK_CAMPAIGN_';
const MAX_BULK_RECIPIENTS = 5000;
const INSERT_BATCH_SIZE = 50;

// Cached role — populated lazily by async methods; read by isSuperAdmin()
let _cachedRole: string | null = null;

async function ensureCachedRole(): Promise<void> {
  if (_cachedRole !== null) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { _cachedRole = ''; return; }
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  _cachedRole = data?.role ?? '';
}

export function invalidateCachedRole(): void {
  _cachedRole = null;
}

function mapOrg(r: any, userCount = 0, adminEmail = '', adminVerified?: boolean): Organization {
  return {
    id: r.id,
    name: r.name,
    address: r.address || '',
    logo: r.logo ? getSupabaseStorageUrl('org-logos', r.logo) : undefined,
    subscriptionStatus: r.subscription_status || 'TRIAL',
    trialEndDate: r.trial_end_date || undefined,
    created: r.created,
    updated: r.updated,
    userCount,
    adminEmail,
    adminVerified,
  } as Organization;
}

export const superAdminService = {
  isSuperAdmin(): boolean {
    return _cachedRole === 'SUPER_ADMIN';
  },

  // ==================== ORGANIZATIONS ====================

  async getAllOrganizations(): Promise<Organization[]> {
    if (!isSupabaseConfigured()) return [];
    await ensureCachedRole();
    try {
      const { data: orgs, error: orgsErr } = await supabase
        .from('organizations')
        .select('*')
        .order('created', { ascending: false });
      if (orgsErr) throw orgsErr;
      if (!orgs || orgs.length === 0) return [];

      // Single query: all profiles across these orgs (id, org_id, role, email)
      const orgIds = orgs.map(o => o.id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, organization_id, role')
        .in('organization_id', orgIds);

      const profilesByOrg = new Map<string, Array<{ id: string; role: string }>>();
      for (const p of profiles ?? []) {
        const list = profilesByOrg.get(p.organization_id) ?? [];
        list.push(p);
        profilesByOrg.set(p.organization_id, list);
      }

      return orgs.map(r => {
        const members = profilesByOrg.get(r.id) ?? [];
        const admins = members
          .filter(p => p.role === 'ADMIN' || p.role === 'HR')
          .sort((a, b) => (a.role === 'ADMIN' ? -1 : 1)); // ADMIN before HR
        return mapOrg(r, members.length, '', admins[0] ? true : undefined);
      });
    } catch (e: any) {
      console.error('[SuperAdmin] Failed to fetch organizations:', e?.message || e);
      return [];
    }
  },

  async getOrganization(id: string): Promise<Organization | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data: r, error } = await supabase.from('organizations').select('*').eq('id', id).single();
      if (error) throw error;
      return mapOrg(r);
    } catch (e: any) {
      console.error('[SuperAdmin] Failed to fetch organization:', e?.message || e);
      return null;
    }
  },

  async createOrganization(data: {
    name: string;
    address?: string;
    subscriptionStatus?: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
  }): Promise<{ success: boolean; message: string; organizationId?: string }> {
    if (!isSupabaseConfigured()) return { success: false, message: 'Supabase not configured' };
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return { success: false, message: 'Not authenticated' };

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/superadmin-create-org`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          name: data.name,
          address: data.address,
          subscriptionStatus: data.subscriptionStatus,
          adminName: data.adminName,
          adminEmail: data.adminEmail,
          adminPassword: data.adminPassword,
        }),
      });
      const json = await res.json();
      if (!json.success) return { success: false, message: json.message || 'Failed to create organization' };
      apiClient.notify();
      return { success: true, message: 'Organization created successfully', organizationId: json.organizationId };
    } catch (e: any) {
      console.error('[SuperAdmin] Failed to create organization:', e?.message || e);
      return { success: false, message: e?.message || 'Failed to create organization' };
    }
  },

  async updateOrganization(id: string, data: Partial<Organization>): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured()) return { success: false, message: 'Supabase not configured' };
    try {
      const update: any = {};
      if (data.name !== undefined) update.name = data.name;
      if (data.address !== undefined) update.address = data.address;
      if (data.subscriptionStatus !== undefined) update.subscription_status = data.subscriptionStatus;

      if (data.subscriptionStatus === 'ACTIVE' || data.subscriptionStatus === 'SUSPENDED' || data.subscriptionStatus === 'AD_SUPPORTED') {
        update.trial_end_date = null;
      } else if (data.subscriptionStatus === 'TRIAL') {
        if (data.trialEndDate) {
          update.trial_end_date = data.trialEndDate.includes('T') ? data.trialEndDate : data.trialEndDate + 'T23:59:59.999Z';
        } else {
          const end = new Date();
          end.setDate(end.getDate() + 14);
          update.trial_end_date = end.toISOString();
        }
      } else if (data.subscriptionStatus === 'EXPIRED') {
        update.trial_end_date = data.trialEndDate || null;
      }

      const { error } = await supabase.from('organizations').update(update).eq('id', id);
      if (error) throw error;
      apiClient.notify();
      return { success: true, message: 'Organization updated successfully' };
    } catch (e: any) {
      console.error('[SuperAdmin] Failed to update organization:', e?.message || e);
      return { success: false, message: e?.message || 'Failed to update organization' };
    }
  },

  async deleteOrganization(id: string): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured()) return { success: false, message: 'Supabase not configured' };
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return { success: false, message: 'Not authenticated' };

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/superadmin-delete-org`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ organizationId: id }),
      });
      const json = await res.json();
      if (!json.success) return { success: false, message: json.message || 'Failed to delete organization' };
      apiClient.notify();
      return { success: true, message: 'Organization and all related data deleted successfully' };
    } catch (e: any) {
      console.error('[SuperAdmin] Failed to delete organization:', e?.message || e);
      return { success: false, message: e?.message || 'Failed to delete organization' };
    }
  },

  // ==================== USERS ====================

  async getOrganizationUsers(orgId: string): Promise<Employee[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', orgId)
        .order('created', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(r => ({
        id: r.id,
        employeeId: r.employee_id || '',
        name: r.name || 'No Name',
        email: r.email || '',
        role: (r.role || 'EMPLOYEE').toString().toUpperCase() as any,
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
        verified: r.verified,
        organizationId: r.organization_id,
      })) as Employee[];
    } catch (e: any) {
      console.error('[SuperAdmin] Failed to fetch organization users:', e?.message || e);
      return [];
    }
  },

  async updateUser(userId: string, data: Partial<Employee>): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured()) return { success: false, message: 'Supabase not configured' };
    try {
      const update: any = {};
      if (data.name) update.name = data.name;
      if (data.role) update.role = data.role;
      if (data.department) update.department = data.department;
      if (data.designation) update.designation = data.designation;
      if (data.status) update.status = data.status;
      if (typeof (data as any).verified === 'boolean') update.verified = (data as any).verified;

      const { error } = await supabase.from('profiles').update(update).eq('id', userId);
      if (error) throw error;
      apiClient.notify();
      return { success: true, message: 'User updated successfully' };
    } catch (e: any) {
      console.error('[SuperAdmin] Failed to update user:', e?.message || e);
      return { success: false, message: e?.message || 'Failed to update user' };
    }
  },

  async verifyUser(userId: string): Promise<{ success: boolean; message: string }> {
    return this.updateUser(userId, { verified: true } as any);
  },

  async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured()) return { success: false, message: 'Supabase not configured' };
    try {
      // Delete profile — cascade handles child rows. Auth user cleanup requires service role.
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
      apiClient.notify();
      return { success: true, message: 'User deleted successfully' };
    } catch (e: any) {
      console.error('[SuperAdmin] Failed to delete user:', e?.message || e);
      return { success: false, message: e?.message || 'Failed to delete user' };
    }
  },

  // ==================== STATS ====================

  async getPlatformStats(): Promise<PlatformStats> {
    const empty: PlatformStats = {
      totalOrganizations: 0,
      totalUsers: 0,
      activeOrganizations: 0,
      trialOrganizations: 0,
      expiredOrganizations: 0,
      recentRegistrations: 0,
    };
    if (!isSupabaseConfigured()) return empty;
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [orgsRes, usersRes, recentRes] = await Promise.all([
        supabase.from('organizations').select('id, subscription_status'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).neq('role', 'SUPER_ADMIN'),
        supabase.from('organizations').select('id', { count: 'exact', head: true }).gte('created', thirtyDaysAgo.toISOString()),
      ]);

      const orgs = orgsRes.data ?? [];
      return {
        totalOrganizations: orgs.length,
        totalUsers: usersRes.count ?? 0,
        activeOrganizations: orgs.filter(o => o.subscription_status === 'ACTIVE').length,
        trialOrganizations: orgs.filter(o => o.subscription_status === 'TRIAL').length,
        expiredOrganizations: orgs.filter(o => o.subscription_status === 'EXPIRED' || o.subscription_status === 'SUSPENDED').length,
        recentRegistrations: recentRes.count ?? 0,
      };
    } catch (e: any) {
      console.error('[SuperAdmin] Failed to fetch platform stats:', e?.message || e);
      return empty;
    }
  },

  // Guide Help Links (platform-level, organization_id IS NULL)
  async getGuideHelpLinks(): Promise<Record<string, string>> {
    if (!isSupabaseConfigured()) return {};
    try {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'guide_help_links')
        .is('organization_id', null)
        .maybeSingle();
      return data?.value ?? {};
    } catch {
      return {};
    }
  },

  async setGuideHelpLinks(links: Record<string, string>): Promise<void> {
    if (!isSupabaseConfigured()) return;
    await supabase
      .from('settings')
      .upsert({ key: 'guide_help_links', value: links, organization_id: null }, { onConflict: 'key' });
  },

  // ==================== CONTENT IMAGES ====================

  async uploadContentImage(file: File): Promise<string> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
    const webpFile = await convertFileToWebP(file);
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.webp`;
    const { error } = await supabase.storage.from('content-images').upload(path, webpFile, { contentType: 'image/webp', upsert: false });
    if (error) throw new Error('Failed to upload content image: ' + error.message);
    return getSupabaseStorageUrl('content-images', path);
  },

  // ==================== BULK EMAIL ====================

  async resolveBulkRecipients(filter: BulkEmailFilter): Promise<BulkRecipient[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      // TODO: email lives in auth.users, not profiles — emails will be empty until a
      // server-side join (Edge Function) is wired up; bulk email delivery is blocked until then.
      let query = supabase.from('profiles').select('id, organization_id, role').neq('role', 'SUPER_ADMIN');

      if (filter.kind === 'ALL_ADMINS') {
        query = query.in('role', ['ADMIN', 'HR']);
      } else if (filter.kind === 'ALL_USERS') {
        // already excludes SUPER_ADMIN above
      } else if (filter.kind === 'ORG') {
        query = query.eq('organization_id', filter.organizationId);
        if (filter.rolesScope === 'ADMINS') query = query.in('role', ['ADMIN', 'HR']);
      } else if (filter.kind === 'BY_SUBSCRIPTION') {
        if (filter.statuses.length === 0) return [];
        const { data: orgs } = await supabase
          .from('organizations')
          .select('id')
          .in('subscription_status', filter.statuses);
        const orgIds = (orgs ?? []).map(o => o.id);
        if (orgIds.length === 0) return [];
        query = query.in('organization_id', orgIds);
        if (filter.rolesScope === 'ADMINS') query = query.in('role', ['ADMIN', 'HR']);
      }

      const { data, error } = await query;
      if (error) throw error;

      // De-dupe by id (email unavailable — see TODO above)
      const seen = new Set<string>();
      const deduped: BulkRecipient[] = [];
      for (const u of data ?? []) {
        if (!u.id || seen.has(u.id)) continue;
        seen.add(u.id);
        deduped.push({ id: u.id, email: '', organization_id: u.organization_id });
      }
      return deduped;
    } catch (e: any) {
      console.error('[SuperAdmin] resolveBulkRecipients failed:', e?.message || e, e);
      throw e;
    }
  },

  async previewBulkRecipients(filter: BulkEmailFilter): Promise<{ count: number; sampleEmails: string[] }> {
    const recipients = await this.resolveBulkRecipients(filter);
    return { count: recipients.length, sampleEmails: recipients.slice(0, 5).map(r => r.email) };
  },

  async sendBulkEmail(
    filter: BulkEmailFilter,
    subject: string,
    htmlContent: string,
  ): Promise<{ success: boolean; message: string; queued: number; failed: number; campaignId: string }> {
    if (!isSupabaseConfigured()) return { success: false, message: 'Supabase not configured', queued: 0, failed: 0, campaignId: '' };
    const trimmedSubject = (subject || '').trim();
    if (!trimmedSubject) return { success: false, message: 'Subject is required', queued: 0, failed: 0, campaignId: '' };
    if (!htmlContent?.trim()) return { success: false, message: 'Body is required', queued: 0, failed: 0, campaignId: '' };

    const recipients = await this.resolveBulkRecipients(filter);
    if (recipients.length === 0) return { success: false, message: 'No recipients matched this audience', queued: 0, failed: 0, campaignId: '' };
    if (recipients.length > MAX_BULK_RECIPIENTS) {
      return {
        success: false,
        message: `Recipient list (${recipients.length}) exceeds the per-campaign cap of ${MAX_BULK_RECIPIENTS}. Narrow the audience and split into multiple campaigns.`,
        queued: 0, failed: 0, campaignId: '',
      };
    }

    const safeHtml = sanitizeHtml(htmlContent);
    const campaignId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const type = `${BULK_CAMPAIGN_PREFIX}${campaignId}`;

    let queued = 0;
    let failed = 0;
    for (let i = 0; i < recipients.length; i += INSERT_BATCH_SIZE) {
      const batch = recipients.slice(i, i + INSERT_BATCH_SIZE);
      const rows = batch.map(r => ({
        recipient_email: r.email,
        subject: trimmedSubject,
        html_content: safeHtml,
        status: 'PENDING',
        type,
        organization_id: r.organization_id || null,
      }));
      const { error } = await supabase.from('reports_queue').insert(rows);
      if (error) { failed += batch.length; console.error('[SuperAdmin] bulk insert batch failed:', error.message); }
      else queued += batch.length;
    }

    const message = failed === 0
      ? `Queued ${queued} email${queued === 1 ? '' : 's'}. Delivery happens in the background.`
      : `Queued ${queued} of ${recipients.length} emails — ${failed} failed to enqueue. Check logs.`;
    return { success: queued > 0, message, queued, failed, campaignId };
  },

  async getRecentBulkCampaigns(limit = 20): Promise<BulkCampaignSummary[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const { data, error } = await supabase
        .from('reports_queue')
        .select('id, subject, status, sent_at, created_at, type')
        .like('type', `${BULK_CAMPAIGN_PREFIX}%`)
        .order('created_at', { ascending: false })
        .limit(2000);
      if (error) throw error;

      const grouped = new Map<string, BulkCampaignSummary>();
      for (const r of data ?? []) {
        const t: string = r.type || '';
        if (!t.startsWith(BULK_CAMPAIGN_PREFIX)) continue;
        const id = t.slice(BULK_CAMPAIGN_PREFIX.length);
        const status = (r.status || 'PENDING') as 'PENDING' | 'SENT' | 'FAILED';
        const sentAt = r.sent_at || r.created_at;
        const existing = grouped.get(id);
        if (!existing) {
          grouped.set(id, {
            campaignId: id,
            subject: r.subject || '',
            totalRows: 1,
            sentCount: status === 'SENT' ? 1 : 0,
            failedCount: status === 'FAILED' ? 1 : 0,
            pendingCount: status === 'PENDING' ? 1 : 0,
            sentAt,
          });
        } else {
          existing.totalRows += 1;
          if (status === 'SENT') existing.sentCount += 1;
          else if (status === 'FAILED') existing.failedCount += 1;
          else existing.pendingCount += 1;
        }
      }
      return Array.from(grouped.values())
        .sort((a, b) => (b.sentAt || '').localeCompare(a.sentAt || ''))
        .slice(0, limit);
    } catch (e: any) {
      console.error('[SuperAdmin] getRecentBulkCampaigns failed:', e?.message || e);
      return [];
    }
  },

  async getBulkCampaignDetail(campaignId: string): Promise<BulkCampaignDetailRow[]> {
    if (!isSupabaseConfigured() || !campaignId) return [];
    try {
      const { data, error } = await supabase
        .from('reports_queue')
        .select('id, recipient_email, status, sent_at, error_message')
        .eq('type', `${BULK_CAMPAIGN_PREFIX}${campaignId}`)
        .order('created_at', { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []).map(r => ({
        id: r.id,
        recipientEmail: r.recipient_email || '',
        status: (r.status || 'PENDING') as 'PENDING' | 'SENT' | 'FAILED',
        sentAt: r.sent_at || undefined,
        errorMessage: r.error_message || undefined,
      }));
    } catch (e: any) {
      console.error('[SuperAdmin] getBulkCampaignDetail failed:', e?.message || e);
      return [];
    }
  },
};
