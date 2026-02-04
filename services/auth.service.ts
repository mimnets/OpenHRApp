
import { apiClient } from './api.client';
import { User } from '../types';
import { organizationService } from './organization.service';
import { DEFAULT_CONFIG, BD_HOLIDAYS } from '../constants';

export const authService = {
  async login(email: string, pass: string): Promise<{ user: User | null; error?: string }> {
    if (!apiClient.isConfigured() || !apiClient.pb) return { user: null, error: "PocketBase is not configured." };
    try {
      const authData = await apiClient.pb.collection('users').authWithPassword(email, pass);
      const m = authData.record;
      organizationService.prefetchMetadata();
      return { user: {
        id: m.id.toString().trim(),
        employeeId: m.employee_id || '', 
        email: m.email,
        name: m.name || 'User',
        role: (m.role || 'EMPLOYEE').toString().toUpperCase() as any,
        department: m.department || 'Unassigned',
        designation: m.designation || 'Staff',
        teamId: m.team_id || undefined,
        organizationId: m.organization_id || undefined,
        avatar: m.avatar ? apiClient.pb.files.getURL(m, m.avatar) : undefined
      }};
    } catch (err: any) { return { user: null, error: err.message || "PocketBase Login Failed" }; }
  },

  async logout() { 
    if (apiClient.pb) apiClient.pb.authStore.clear(); 
    organizationService.clearCache();
    apiClient.notify(); 
  },

  async finalizePasswordReset(token: string, newPassword: string): Promise<boolean> {
    if (!apiClient.pb || !apiClient.isConfigured()) return false;
    try {
      await apiClient.pb.collection('users').confirmPasswordReset(token, newPassword, newPassword);
      return true;
    } catch (err: any) {
      console.error("Password reset confirmation failed:", err);
      return false;
    }
  },

  async registerOrganization(data: { orgName: string, adminName: string, email: string, password: string }): Promise<{ success: boolean, error?: string }> {
    if (!apiClient.pb || !apiClient.isConfigured()) return { success: false, error: "System offline" };
    
    try {
      // 1. Create Organization
      const orgRecord = await apiClient.pb.collection('organizations').create({
        name: data.orgName,
        subscription_status: 'TRIAL'
      });

      // 2. Create Admin User linked to Organization
      await apiClient.pb.collection('users').create({
        email: data.email,
        emailVisibility: true,
        password: data.password,
        passwordConfirm: data.password,
        name: data.adminName,
        role: 'ADMIN',
        organization_id: orgRecord.id,
        employee_id: 'ADMIN-01',
        designation: 'System Admin',
        department: 'Management'
      });

      // 3. Login to set context for initialization
      await this.login(data.email, data.password);

      // 4. Initialize Default Settings for this Organization
      const orgId = orgRecord.id;
      
      const config = { ...DEFAULT_CONFIG, companyName: data.orgName };
      
      await Promise.all([
        // App Config
        apiClient.pb.collection('settings').create({ key: 'app_config', value: config, organization_id: orgId }),
        // Default Departments
        apiClient.pb.collection('settings').create({ 
          key: 'departments', 
          value: ["Engineering", "HR", "Sales", "Marketing"], 
          organization_id: orgId 
        }),
        // Default Designations
        apiClient.pb.collection('settings').create({ 
          key: 'designations', 
          value: ["Manager", "Lead", "Associate", "Intern"], 
          organization_id: orgId 
        }),
        // Default Holidays
        apiClient.pb.collection('settings').create({ 
          key: 'holidays', 
          value: BD_HOLIDAYS, 
          organization_id: orgId 
        }),
      ]);

      return { success: true };

    } catch (err: any) {
      console.error("Registration Error:", err);
      return { success: false, error: err.message || "Registration failed. Ensure backend schema is updated." };
    }
  }
};
