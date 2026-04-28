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

export const superAdminService = {
  // Check if current user is super admin
  isSuperAdmin(): boolean {
    const role = apiClient.pb?.authStore.model?.role;
    return role === 'SUPER_ADMIN';
  },

  // ==================== ORGANIZATIONS ====================

  async getAllOrganizations(): Promise<Organization[]> {
    if (!apiClient.pb || !apiClient.isConfigured()) {
      console.warn("[SuperAdmin] PocketBase not configured");
      return [];
    }

    try {
      const records = await apiClient.pb.collection('organizations').getFullList({
        sort: '-created'
      });

      // Get user counts for each organization
      const orgsWithStats = await Promise.all(
        records.map(async (r) => {
          let userCount = 0;
          let adminEmail = '';
          let adminVerified: boolean | undefined;

          try {
            // Get user count
            const users = await apiClient.pb!.collection('users').getList(1, 1, {
              filter: `organization_id = "${r.id}"`,
              skipTotal: false
            });
            userCount = users.totalItems;

            // Get the first ADMIN/HR record (org's primary admin) — orgs created via
            // self-registration get an ADMIN; orgs that later add HR-only managers
            // still surface here so super admin sees their verification status too.
            const admins = await apiClient.pb!.collection('users').getList(1, 1, {
              filter: `organization_id = "${r.id}" && (role = "ADMIN" || role = "HR")`,
              sort: 'created',
              fields: 'id,email,verified',
            });
            if (admins.items.length > 0) {
              adminEmail = admins.items[0].email;
              adminVerified = !!(admins.items[0] as any).verified;
            }
          } catch {
            // Ignore errors for stats
          }

          return {
            id: r.id,
            name: r.name,
            address: r.address || '',
            logo: r.logo ? apiClient.pb!.files.getURL(r, r.logo) : undefined,
            subscriptionStatus: r.subscription_status || 'TRIAL',
            trialEndDate: r.trial_end_date || undefined,
            created: r.created,
            updated: r.updated,
            userCount,
            adminEmail,
            adminVerified,
          } as Organization;
        })
      );

      console.log(`[SuperAdmin] Fetched ${orgsWithStats.length} organizations`);
      return orgsWithStats;
    } catch (e: any) {
      console.error("[SuperAdmin] Failed to fetch organizations:", e?.message || e);
      return [];
    }
  },

  async getOrganization(id: string): Promise<Organization | null> {
    if (!apiClient.pb || !apiClient.isConfigured()) return null;

    try {
      const r = await apiClient.pb.collection('organizations').getOne(id);
      return {
        id: r.id,
        name: r.name,
        address: r.address || '',
        logo: r.logo ? apiClient.pb.files.getURL(r, r.logo) : undefined,
        subscriptionStatus: r.subscription_status || 'TRIAL',
        trialEndDate: r.trial_end_date || undefined,
        created: r.created,
        updated: r.updated
      };
    } catch (e: any) {
      console.error("[SuperAdmin] Failed to fetch organization:", e?.message || e);
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
    if (!apiClient.pb || !apiClient.isConfigured()) {
      return { success: false, message: "PocketBase not configured" };
    }

    try {
      // 1. Create organization
      // Set trial end date to 14 days from now if status is TRIAL
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 14);

      const org = await apiClient.pb.collection('organizations').create({
        name: data.name,
        address: data.address || '',
        subscription_status: data.subscriptionStatus || 'TRIAL',
        trial_end_date: data.subscriptionStatus === 'ACTIVE' ? null : trialEndDate.toISOString()
      });

      // 2. Create admin user
      const randId = Math.floor(1000 + Math.random() * 9000);
      const timestamp = new Date().getTime().toString().slice(-4);
      const adminId = "ADM-" + timestamp + "-" + randId;

      try {
        await apiClient.pb.collection('users').create({
          email: data.adminEmail,
          password: data.adminPassword,
          passwordConfirm: data.adminPassword,
          name: data.adminName,
          role: 'ADMIN',
          organization_id: org.id,
          employee_id: adminId,
          designation: 'System Admin',
          department: 'Management',
          verified: true,
          emailVisibility: true
        });
      } catch (userErr: any) {
        // Rollback: delete organization if user creation fails
        await apiClient.pb.collection('organizations').delete(org.id);
        return { success: false, message: `Failed to create admin user: ${userErr.message}` };
      }

      // 3. Create default settings
      try {
        const createSetting = async (key: string, value: any) => {
          await apiClient.pb!.collection('settings').create({
            key,
            value,
            organization_id: org.id
          });
        };

        await createSetting('app_config', {
          companyName: data.name,
          workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Sunday"],
          officeStartTime: "09:00",
          officeEndTime: "18:00"
        });
        await createSetting('departments', ["Engineering", "HR", "Sales", "Marketing"]);
        await createSetting('designations', ["Manager", "Lead", "Associate", "Intern"]);
      } catch {
        // Non-fatal, settings can be created later
        console.warn("[SuperAdmin] Failed to create default settings");
      }

      return { success: true, message: "Organization created successfully", organizationId: org.id };
    } catch (e: any) {
      console.error("[SuperAdmin] Failed to create organization:", e?.message || e);
      return { success: false, message: e?.message || "Failed to create organization" };
    }
  },

  async updateOrganization(id: string, data: Partial<Organization>): Promise<{ success: boolean; message: string }> {
    if (!apiClient.pb || !apiClient.isConfigured()) {
      return { success: false, message: "PocketBase not configured" };
    }

    try {
      const updateData: any = {};

      // Only include fields that are provided
      if (data.name !== undefined) {
        updateData.name = data.name;
      }
      if (data.address !== undefined) {
        updateData.address = data.address;
      }
      if (data.subscriptionStatus !== undefined) {
        updateData.subscription_status = data.subscriptionStatus;
      }

      // Handle trial_end_date based on subscription status
      if (data.subscriptionStatus === 'ACTIVE' || data.subscriptionStatus === 'SUSPENDED' || data.subscriptionStatus === 'AD_SUPPORTED') {
        // Clear trial_end_date for non-trial statuses
        updateData.trial_end_date = '';
      } else if (data.subscriptionStatus === 'TRIAL') {
        // For TRIAL status, set trial_end_date if provided, otherwise set to 14 days from now
        if (data.trialEndDate) {
          // Convert date to ISO string if it's just YYYY-MM-DD
          const dateStr = data.trialEndDate.includes('T') ? data.trialEndDate : data.trialEndDate + 'T23:59:59.999Z';
          updateData.trial_end_date = dateStr;
        } else {
          // Default to 14 days from now
          const trialEnd = new Date();
          trialEnd.setDate(trialEnd.getDate() + 14);
          updateData.trial_end_date = trialEnd.toISOString();
        }
      } else if (data.subscriptionStatus === 'EXPIRED') {
        // For EXPIRED, keep or clear trial_end_date
        updateData.trial_end_date = data.trialEndDate || '';
      }

      console.log("[SuperAdmin] Updating organization:", id, "with data:", updateData);

      await apiClient.pb.collection('organizations').update(id, updateData);

      console.log("[SuperAdmin] Organization updated successfully");
      return { success: true, message: "Organization updated successfully" };
    } catch (e: any) {
      console.error("[SuperAdmin] Failed to update organization:", e?.message || e);
      return { success: false, message: e?.message || "Failed to update organization" };
    }
  },

  async deleteOrganization(id: string): Promise<{ success: boolean; message: string }> {
    if (!apiClient.pb || !apiClient.isConfigured()) {
      return { success: false, message: "PocketBase not configured" };
    }

    // Order matters: delete dependents before the parent organization.
    // Children-of-children (e.g. attendance → users) go first so user/team
    // deletes don't fail on required relations.
    const childCollections = [
      'attendance',
      'leaves',
      'performance_reviews',
      'review_cycles',
      'notifications',
      'announcements',
      'reports_queue',
      'upgrade_requests',
      'shifts',
      'teams',
      'settings',
      'users',
    ];

    const deleteWhere = async (collection: string, filter: string) => {
      try {
        const records = await apiClient.pb!.collection(collection).getFullList({ filter, batch: 500 });
        for (const r of records) {
          try {
            await apiClient.pb!.collection(collection).delete(r.id);
          } catch (err: any) {
            // 404 = already gone (cascade); keep going. Anything else: log and continue
            // so a single stuck record doesn't block the rest of the cleanup.
            if (err?.status !== 404) {
              console.warn(`[SuperAdmin] delete ${collection}/${r.id} failed:`, err?.message || err);
            }
          }
        }
      } catch (err: any) {
        console.warn(`[SuperAdmin] list ${collection} failed:`, err?.message || err);
      }
    };

    // Discover any other collections that carry an `organization_id` relation
    // — keeps cleanup correct if new org-scoped collections are added later.
    const discovered = new Set<string>();
    try {
      const allCollections = await apiClient.pb.collections.getFullList({ batch: 500 });
      for (const col of allCollections) {
        if (col.name === 'organizations') continue;
        const hasOrgField = (col.fields || col.schema || []).some((f: any) => f.name === 'organization_id');
        if (hasOrgField) discovered.add(col.name);
      }
    } catch (err: any) {
      console.warn('[SuperAdmin] Could not enumerate collections, falling back to static list:', err?.message || err);
    }

    // Static list keeps a deterministic dependency order; discovered extras
    // are appended (run before users/teams/settings to be safe).
    const ordered = [...childCollections];
    const extras = [...discovered].filter(c => !ordered.includes(c));
    if (extras.length) {
      console.log('[SuperAdmin] Sweeping additional org-scoped collections:', extras);
      ordered.unshift(...extras);
    }

    try {
      for (const c of ordered) {
        await deleteWhere(c, `organization_id = "${id}"`);
      }

      try {
        await apiClient.pb.collection('organizations').delete(id);
      } catch (err: any) {
        // PocketBase's "required relation reference" error doesn't name the
        // blocking collection — surface enough detail so the next failure is
        // diagnosable instead of opaque.
        const detail = err?.response?.data || err?.data || err?.originalError || err;
        console.error('[SuperAdmin] Org delete blocked. Server detail:', detail);
        throw err;
      }

      return { success: true, message: "Organization and all related data deleted successfully" };
    } catch (e: any) {
      console.error("[SuperAdmin] Failed to delete organization:", e?.message || e);
      return { success: false, message: e?.message || "Failed to delete organization" };
    }
  },

  // ==================== USERS ====================

  async getOrganizationUsers(orgId: string): Promise<Employee[]> {
    if (!apiClient.pb || !apiClient.isConfigured()) return [];

    try {
      const records = await apiClient.pb.collection('users').getFullList({
        filter: `organization_id = "${orgId}"`,
        sort: '-created'
      });

      return records.map(r => ({
        id: r.id,
        employeeId: r.employee_id || '',
        name: r.name || 'No Name',
        email: r.email,
        role: (r.role || 'EMPLOYEE').toString().toUpperCase() as any,
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
        workType: r.work_type || "OFFICE",
        verified: r.verified,
        organizationId: r.organization_id
      })) as Employee[];
    } catch (e: any) {
      console.error("[SuperAdmin] Failed to fetch organization users:", e?.message || e);
      return [];
    }
  },

  async updateUser(userId: string, data: Partial<Employee>): Promise<{ success: boolean; message: string }> {
    if (!apiClient.pb || !apiClient.isConfigured()) {
      return { success: false, message: "PocketBase not configured" };
    }

    try {
      const updateData: any = {};
      if (data.name) updateData.name = data.name;
      if (data.role) updateData.role = data.role;
      if (data.department) updateData.department = data.department;
      if (data.designation) updateData.designation = data.designation;
      if (data.status) updateData.status = data.status;
      if (typeof (data as any).verified === 'boolean') updateData.verified = (data as any).verified;

      await apiClient.pb.collection('users').update(userId, updateData);
      return { success: true, message: "User updated successfully" };
    } catch (e: any) {
      console.error("[SuperAdmin] Failed to update user:", e?.message || e);
      return { success: false, message: e?.message || "Failed to update user" };
    }
  },

  async verifyUser(userId: string): Promise<{ success: boolean; message: string }> {
    return this.updateUser(userId, { verified: true } as any);
  },

  async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    if (!apiClient.pb || !apiClient.isConfigured()) {
      return { success: false, message: "PocketBase not configured" };
    }

    try {
      await apiClient.pb.collection('users').delete(userId);
      return { success: true, message: "User deleted successfully" };
    } catch (e: any) {
      console.error("[SuperAdmin] Failed to delete user:", e?.message || e);
      return { success: false, message: e?.message || "Failed to delete user" };
    }
  },

  // ==================== STATS ====================

  async getPlatformStats(): Promise<PlatformStats> {
    if (!apiClient.pb || !apiClient.isConfigured()) {
      return {
        totalOrganizations: 0,
        totalUsers: 0,
        activeOrganizations: 0,
        trialOrganizations: 0,
        expiredOrganizations: 0,
        recentRegistrations: 0
      };
    }

    try {
      // Get organizations
      const orgs = await apiClient.pb.collection('organizations').getFullList();

      // Get users count
      const usersResult = await apiClient.pb.collection('users').getList(1, 1, {
        filter: 'role != "SUPER_ADMIN"',
        skipTotal: false
      });

      // Calculate 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

      // Get recent registrations
      const recentOrgs = await apiClient.pb.collection('organizations').getList(1, 1, {
        filter: `created >= "${thirtyDaysAgoStr}"`,
        skipTotal: false
      });

      return {
        totalOrganizations: orgs.length,
        totalUsers: usersResult.totalItems,
        activeOrganizations: orgs.filter(o => o.subscription_status === 'ACTIVE').length,
        trialOrganizations: orgs.filter(o => o.subscription_status === 'TRIAL').length,
        expiredOrganizations: orgs.filter(o => o.subscription_status === 'EXPIRED' || o.subscription_status === 'SUSPENDED').length,
        recentRegistrations: recentOrgs.totalItems
      };
    } catch (e: any) {
      console.error("[SuperAdmin] Failed to fetch platform stats:", e?.message || e);
      return {
        totalOrganizations: 0,
        totalUsers: 0,
        activeOrganizations: 0,
        trialOrganizations: 0,
        expiredOrganizations: 0,
        recentRegistrations: 0
      };
    }
  },

  // Guide Help Links (platform-level, no org_id)
  async getGuideHelpLinks(): Promise<Record<string, string>> {
    if (!apiClient.pb || !apiClient.isConfigured()) return {};
    try {
      const record = await apiClient.pb.collection('settings').getFirstListItem('key = "guide_help_links"');
      return record.value || {};
    } catch {
      return {};
    }
  },

  async setGuideHelpLinks(links: Record<string, string>): Promise<void> {
    if (!apiClient.pb || !apiClient.isConfigured()) return;
    try {
      const record = await apiClient.pb.collection('settings').getFirstListItem('key = "guide_help_links"');
      await apiClient.pb.collection('settings').update(record.id, { value: links });
    } catch {
      // Create new record (no org_id — platform-level)
      await apiClient.pb!.collection('settings').create({ key: 'guide_help_links', value: links });
    }
  },

  // ==================== CONTENT IMAGES ====================

  async uploadContentImage(file: File): Promise<string> {
    if (!apiClient.pb || !apiClient.isConfigured()) {
      throw new Error("PocketBase not configured");
    }

    const webpFile = await convertFileToWebP(file);
    const formData = new FormData();
    formData.append('image', webpFile);

    const record = await apiClient.pb.collection('content_images').create(formData);
    const fileName = record.image;
    const baseUrl = apiClient.pb.baseURL || '';
    return `${baseUrl}/api/files/content_images/${record.id}/${fileName}`;
  },

  // ==================== BULK EMAIL ====================

  async resolveBulkRecipients(filter: BulkEmailFilter): Promise<BulkRecipient[]> {
    if (!apiClient.pb || !apiClient.isConfigured()) return [];

    const pb = apiClient.pb;
    // Super-admin broadcasts target every active platform user (admins, HR, managers, employees).
    // We do NOT require `verified = true` — verification gates login, not deliverability — and
    // many orgs have admins/HR who registered but never clicked the verification email. We still
    // always exclude SUPER_ADMIN from broadcasts.
    const excludeSuper = 'role != "SUPER_ADMIN"';
    const adminRolesClause = '(role = "ADMIN" || role = "HR")';

    try {
      let users: Array<{ id: string; email: string; organization_id: string }> = [];

      if (filter.kind === 'ALL_ADMINS') {
        const f = adminRolesClause;
        const records = await pb.collection('users').getFullList({
          filter: f,
          batch: 500,
          fields: 'id,email,organization_id',
        });
        users = records.map(r => ({ id: r.id, email: r.email, organization_id: r.organization_id }));
      } else if (filter.kind === 'ALL_USERS') {
        const records = await pb.collection('users').getFullList({
          filter: excludeSuper,
          batch: 500,
          fields: 'id,email,organization_id',
        });
        users = records.map(r => ({ id: r.id, email: r.email, organization_id: r.organization_id }));
      } else if (filter.kind === 'ORG') {
        const roleClause = filter.rolesScope === 'ADMINS' ? adminRolesClause : excludeSuper;
        const f = `organization_id = "${filter.organizationId}" && ${roleClause}`;
        const records = await pb.collection('users').getFullList({
          filter: f,
          batch: 500,
          fields: 'id,email,organization_id',
        });
        users = records.map(r => ({ id: r.id, email: r.email, organization_id: r.organization_id }));
      } else if (filter.kind === 'BY_SUBSCRIPTION') {
        if (filter.statuses.length === 0) return [];
        // Find matching orgs
        const statusFilter = filter.statuses.map(s => `subscription_status = "${s}"`).join(' || ');
        const orgs = await pb.collection('organizations').getFullList({
          filter: statusFilter,
          batch: 500,
          fields: 'id',
        });
        if (orgs.length === 0) return [];

        const roleClause = filter.rolesScope === 'ADMINS' ? adminRolesClause : excludeSuper;
        // Chunk org IDs to avoid excessively long filter strings
        const ORG_CHUNK = 50;
        for (let i = 0; i < orgs.length; i += ORG_CHUNK) {
          const chunk = orgs.slice(i, i + ORG_CHUNK);
          const orgClause = chunk.map(o => `organization_id = "${o.id}"`).join(' || ');
          const f = `(${orgClause}) && ${roleClause}`;
          const records = await pb.collection('users').getFullList({
            filter: f,
            batch: 500,
            fields: 'id,email,organization_id',
          });
          users.push(...records.map(r => ({ id: r.id, email: r.email, organization_id: r.organization_id })));
        }
      }

      // De-dupe by email (case-insensitive); skip rows with no email
      const seen = new Set<string>();
      const deduped: BulkRecipient[] = [];
      for (const u of users) {
        const key = (u.email || '').toLowerCase().trim();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        deduped.push(u);
      }
      return deduped;
    } catch (e: any) {
      console.error('[SuperAdmin] resolveBulkRecipients failed:', e?.message || e, e);
      return [];
    }
  },

  async previewBulkRecipients(filter: BulkEmailFilter): Promise<{ count: number; sampleEmails: string[] }> {
    const recipients = await this.resolveBulkRecipients(filter);
    return {
      count: recipients.length,
      sampleEmails: recipients.slice(0, 5).map(r => r.email),
    };
  },

  async sendBulkEmail(
    filter: BulkEmailFilter,
    subject: string,
    htmlContent: string
  ): Promise<{ success: boolean; message: string; queued: number; failed: number; campaignId: string }> {
    if (!apiClient.pb || !apiClient.isConfigured()) {
      return { success: false, message: 'PocketBase not configured', queued: 0, failed: 0, campaignId: '' };
    }
    const trimmedSubject = (subject || '').trim();
    if (!trimmedSubject) {
      return { success: false, message: 'Subject is required', queued: 0, failed: 0, campaignId: '' };
    }
    if (!htmlContent || !htmlContent.trim()) {
      return { success: false, message: 'Body is required', queued: 0, failed: 0, campaignId: '' };
    }

    const recipients = await this.resolveBulkRecipients(filter);
    if (recipients.length === 0) {
      return { success: false, message: 'No recipients matched this audience', queued: 0, failed: 0, campaignId: '' };
    }
    if (recipients.length > MAX_BULK_RECIPIENTS) {
      return {
        success: false,
        message: `Recipient list (${recipients.length}) exceeds the per-campaign cap of ${MAX_BULK_RECIPIENTS}. Narrow the audience and split into multiple campaigns.`,
        queued: 0,
        failed: 0,
        campaignId: '',
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
      const results = await Promise.allSettled(
        batch.map(r =>
          apiClient.pb!.collection('reports_queue').create({
            recipient_email: r.email,
            subject: trimmedSubject,
            html_content: safeHtml,
            status: 'PENDING',
            type,
            organization_id: r.organization_id || undefined,
          })
        )
      );
      for (const res of results) {
        if (res.status === 'fulfilled') queued += 1;
        else failed += 1;
      }
    }

    const message =
      failed === 0
        ? `Queued ${queued} email${queued === 1 ? '' : 's'}. Delivery happens in the background.`
        : `Queued ${queued} of ${recipients.length} emails — ${failed} failed to enqueue. Check logs.`;
    return { success: queued > 0, message, queued, failed, campaignId };
  },

  async getRecentBulkCampaigns(limit = 20): Promise<BulkCampaignSummary[]> {
    if (!apiClient.pb || !apiClient.isConfigured()) return [];
    try {
      const rows = await apiClient.pb.collection('reports_queue').getFullList({
        filter: `type ~ "${BULK_CAMPAIGN_PREFIX}"`,
        sort: '-created',
        batch: 500,
        fields: 'id,subject,status,sent_at,created,type',
      });

      const grouped = new Map<string, BulkCampaignSummary>();
      for (const r of rows) {
        const t: string = (r as any).type || '';
        if (!t.startsWith(BULK_CAMPAIGN_PREFIX)) continue;
        const id = t.slice(BULK_CAMPAIGN_PREFIX.length);
        const existing = grouped.get(id);
        const status = (r as any).status as 'PENDING' | 'SENT' | 'FAILED';
        const sentAt = (r as any).sent_at || (r as any).created;
        if (!existing) {
          grouped.set(id, {
            campaignId: id,
            subject: (r as any).subject || '',
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
      const list = Array.from(grouped.values()).sort((a, b) => (b.sentAt || '').localeCompare(a.sentAt || ''));
      return list.slice(0, limit);
    } catch (e: any) {
      console.error('[SuperAdmin] getRecentBulkCampaigns failed:', e?.message || e);
      return [];
    }
  },

  async getBulkCampaignDetail(campaignId: string): Promise<BulkCampaignDetailRow[]> {
    if (!apiClient.pb || !apiClient.isConfigured()) return [];
    if (!campaignId) return [];
    try {
      const rows = await apiClient.pb.collection('reports_queue').getFullList({
        filter: `type = "${BULK_CAMPAIGN_PREFIX}${campaignId}"`,
        sort: '-created',
        batch: 500,
        fields: 'id,recipient_email,status,sent_at,error_message',
      });
      return rows.map(r => ({
        id: r.id,
        recipientEmail: (r as any).recipient_email || '',
        status: ((r as any).status || 'PENDING') as 'PENDING' | 'SENT' | 'FAILED',
        sentAt: (r as any).sent_at || undefined,
        errorMessage: (r as any).error_message || undefined,
      }));
    } catch (e: any) {
      console.error('[SuperAdmin] getBulkCampaignDetail failed:', e?.message || e);
      return [];
    }
  },
};
