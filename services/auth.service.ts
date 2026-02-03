
import { apiClient } from './api.client';
import { User } from '../types';
import { organizationService } from './organization.service';

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
  }
};
