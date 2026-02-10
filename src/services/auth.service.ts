import { apiClient } from './api.client';
import { User } from '../types';
import { organizationService } from './organization.service';

export const authService = {
  async login(email: string, pass: string): Promise<{ user: User | null; error?: string }> {
    if (!apiClient.isConfigured() || !apiClient.pb) return { user: null, error: "PocketBase is not configured." };
    try {
      const authData = await apiClient.pb.collection('users').authWithPassword(email, pass);
      const m = authData.record;
      
      if (!m.verified) {
        apiClient.pb.authStore.clear();
        return { user: null, error: "Account not verified. Please check your email." };
      }

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
    } catch (err: any) { 
      let msg = "Login Failed";
      if (err.response && err.response.message) msg = err.response.message;
      else if (err.data && err.data.message) msg = err.data.message; 
      else if (err.message) msg = err.message;
      return { user: null, error: msg }; 
    }
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

  async requestVerificationEmail(email: string): Promise<boolean> {
    if (!apiClient.pb || !apiClient.isConfigured()) return false;
    try {
      await apiClient.pb.collection('users').requestVerification(email);
      return true;
    } catch (e) {
      console.error("Failed to request verification", e);
      return false;
    }
  },

  async registerOrganization(data: { orgName: string, adminName: string, email: string, password: string }): Promise<{ success: boolean, error?: string }> {
    if (!apiClient.pb || !apiClient.isConfigured()) return { success: false, error: "System offline" };
    
    try {
      console.log("[AUTH] Registration initiated for org: " + data.orgName);

      // SECURITY: Send only what's needed, password should never be logged
      const payload = {
        orgName: data.orgName,
        adminName: data.adminName,
        email: data.email,
        password: data.password
      };

      await apiClient.pb.send("/api/openhr/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Prevent caching of this request
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        },
        body: JSON.stringify(payload)
      });

      // SECURITY: Clear the password from memory immediately after sending
      payload.password = '';
      data.password = '';

      return { success: true };

    } catch (err: any) {
      console.error("[AUTH] Registration Error (detailed message only, no payload logged)");
      let finalMsg = "Registration failed.";
      
      if (err.response && typeof err.response === 'object') {
         if (err.response.message) finalMsg = err.response.message;
         else if (err.response.code) finalMsg = `Error Code: ${err.response.code}`;
      } else if (err.data && err.data.message) {
        finalMsg = err.data.message;
      } else if (err.message) {
        finalMsg = err.message;
      }
      
      return { success: false, error: finalMsg };
    }
  }
};
