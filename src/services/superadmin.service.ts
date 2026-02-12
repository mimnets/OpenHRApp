import { apiClient } from './api.client';
import { Organization, Employee, PlatformStats } from '../types';

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

          try {
            // Get user count
            const users = await apiClient.pb!.collection('users').getList(1, 1, {
              filter: `organization_id = "${r.id}"`,
              skipTotal: false
            });
            userCount = users.totalItems;

            // Get admin email
            const admins = await apiClient.pb!.collection('users').getList(1, 1, {
              filter: `organization_id = "${r.id}" && role = "ADMIN"`,
              sort: 'created'
            });
            if (admins.items.length > 0) {
              adminEmail = admins.items[0].email;
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
            adminEmail
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

    try {
      // Delete all related data first
      // 1. Delete users
      const users = await apiClient.pb.collection('users').getFullList({
        filter: `organization_id = "${id}"`
      });
      for (const user of users) {
        await apiClient.pb.collection('users').delete(user.id);
      }

      // 2. Delete settings
      try {
        const settings = await apiClient.pb.collection('settings').getFullList({
          filter: `organization_id = "${id}"`
        });
        for (const setting of settings) {
          await apiClient.pb.collection('settings').delete(setting.id);
        }
      } catch { /* ignore */ }

      // 3. Delete teams
      try {
        const teams = await apiClient.pb.collection('teams').getFullList({
          filter: `organization_id = "${id}"`
        });
        for (const team of teams) {
          await apiClient.pb.collection('teams').delete(team.id);
        }
      } catch { /* ignore */ }

      // 4. Delete attendance
      try {
        const attendance = await apiClient.pb.collection('attendance').getFullList({
          filter: `organization_id = "${id}"`
        });
        for (const record of attendance) {
          await apiClient.pb.collection('attendance').delete(record.id);
        }
      } catch { /* ignore */ }

      // 5. Delete leaves
      try {
        const leaves = await apiClient.pb.collection('leaves').getFullList({
          filter: `organization_id = "${id}"`
        });
        for (const leave of leaves) {
          await apiClient.pb.collection('leaves').delete(leave.id);
        }
      } catch { /* ignore */ }

      // 6. Finally delete the organization
      await apiClient.pb.collection('organizations').delete(id);

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
  }
};
