import { supabase, isSupabaseConfigured } from './supabase';
import { User } from '../types';
import { organizationService } from './organization.service';
import { sessionManager } from './session/sessionManager';
import { apiClient } from './api.client';

// Build the app User object from a Supabase profile row
const profileToUser = (profile: Record<string, any>): User => ({
  id: profile.id,
  employeeId: profile.employee_id || '',
  email: profile.email || '',
  name: profile.name || 'User',
  role: (profile.role || 'EMPLOYEE').toString().toUpperCase() as any,
  department: profile.department || 'Unassigned',
  designation: profile.designation || 'Staff',
  teamId: profile.team_id || undefined,
  organizationId: profile.organization_id || undefined,
  avatar: profile.avatar
    ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar}`
    : undefined,
});

export const authService = {
  async login(email: string, pass: string): Promise<{ user: User | null; error?: string }> {
    if (!isSupabaseConfigured()) return { user: null, error: 'Supabase not configured.' };

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (authError || !authData.user) {
      return { user: null, error: authError?.message || 'Login failed.' };
    }

    // Fetch profile row
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      return { user: null, error: 'Account profile not found. Contact support.' };
    }

    if (!profile.verified) {
      await supabase.auth.signOut();
      return { user: null, error: 'Account not verified. Please check your email.' };
    }

    const appUser = profileToUser({ ...profile, email: authData.user.email });
    apiClient.setOrganizationId(profile.organization_id);
    apiClient.setAuthRole(profile.role);
    return { user: appUser };
  },

  async logout() {
    // sessionManager.forceLogout() is the single exit path that calls
    // supabase.auth.signOut() — do not duplicate the call here (frozen
    // module invariant: only sessionManager may call signOut).
    await sessionManager.forceLogout('USER_INITIATED');
    organizationService.clearCache();
    apiClient.notify();
  },

  async finalizePasswordReset(_token: string, newPassword: string): Promise<boolean> {
    // Supabase handles token via magic link in URL — user lands back in app
    // already authenticated; we just update the password.
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { console.error('[Auth] Password reset failed:', error.message); return false; }
    return true;
  },

  async requestVerificationEmail(email: string): Promise<boolean> {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) { console.error('[Auth] Resend verification failed:', error.message); return false; }
    return true;
  },

  async requestPasswordReset(email: string): Promise<{ ok: boolean; error?: string }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/?reset=1`,
    });
    if (error) { console.error('[Auth] Password reset request failed:', error.message); return { ok: false, error: error.message }; }
    return { ok: true };
  },

  async registerOrganization(data: {
    orgName: string;
    adminName: string;
    email: string;
    password: string;
    country: string;
    address?: string;
    logo?: File | null;
  }): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: 'System offline' };

    try {
      const formData = new FormData();
      formData.append('orgName', data.orgName);
      formData.append('adminName', data.adminName);
      formData.append('email', data.email);
      formData.append('password', data.password);
      formData.append('country', data.country);
      if (data.address) formData.append('address', data.address);
      if (data.logo) formData.append('logo', data.logo);

      // Calls the Supabase Edge Function (Phase 4 will create this)
      const { data: result, error } = await supabase.functions.invoke('register', {
        body: formData,
      });

      // SECURITY: Clear password from memory immediately
      data.password = '';

      if (error) {
        let message = error.message;
        try {
          // FunctionsHttpError wraps the real body — extract it
          const body = await (error as any).context?.json?.();
          if (body?.message) message = body.message;
        } catch {}
        console.error('[Auth] Registration 400 body:', message);
        return { success: false, error: message };
      }
      if (result?.message && !result?.success) return { success: false, error: result.message };
      if (result?.error) return { success: false, error: result.error };

      return { success: true };
    } catch (err: any) {
      data.password = '';
      console.error('[Auth] Registration error');
      return { success: false, error: err?.message || 'Registration failed.' };
    }
  },

  // Fetch the current user's profile from Supabase (used by sessionManager shim)
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) return null;
    // Keep apiClient org ID warm for page-refresh case (login() not called)
    apiClient.setOrganizationId(profile.organization_id ?? undefined);
    apiClient.setAuthRole(profile.role ?? undefined);
    return profileToUser({ ...profile, email: user.email });
  },
};
