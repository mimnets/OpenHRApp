import { createClient } from '@supabase/supabase-js';
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

// Registration verifies the emailed code on its own client that never stores a
// session, so the half-registered user (no organization yet) is invisible to
// the app's session handling and is gone on refresh.
let registrationClient: ReturnType<typeof createClient> | null = null;
const getRegistrationClient = () => registrationClient ??= createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'openhr-registration' } },
);

// Calls the register Edge Function and unwraps its error body.
async function invokeRegister(body: FormData, accessToken?: string): Promise<{ success: boolean; error?: string }> {
  const { data: result, error } = await supabase.functions.invoke('register', {
    body,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
  if (error) {
    let message = error.message;
    try {
      // FunctionsHttpError wraps the real body — extract it
      const errBody = await (error as any).context?.json?.();
      if (errBody?.message) message = errBody.message;
    } catch {}
    console.error('[Auth] Registration error body:', message);
    return { success: false, error: message };
  }
  if (result?.message && !result?.success) return { success: false, error: result.message };
  if (result?.error) return { success: false, error: result.error };
  return { success: true };
}

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

    if (profile.status === 'INACTIVE') {
      await supabase.auth.signOut();
      return { user: null, error: 'Your account has been deactivated. Please contact your administrator.' };
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

  // Registration step 1: emails a verification code. Nothing is created
  // beyond an unconfirmed auth user until the code is entered.
  async startRegistration(email: string, turnstileToken: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: 'System offline' };
    try {
      const body = new FormData();
      body.append('step', 'start');
      body.append('email', email.trim().toLowerCase());
      if (turnstileToken) body.append('turnstileToken', turnstileToken);
      return await invokeRegister(body);
    } catch (err: any) {
      return { success: false, error: err?.message || 'Could not send the verification code.' };
    }
  },

  // Registration step 2: checks the code. The returned token proves the email
  // is verified and is what step 3 sends to the register function.
  async verifyRegistrationCode(email: string, code: string): Promise<{ accessToken?: string; error?: string }> {
    if (!isSupabaseConfigured()) return { error: 'System offline' };
    const { data, error } = await getRegistrationClient().auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'email',
    });
    if (error || !data.session) {
      const msg = error?.message ?? '';
      return { error: /expired/i.test(msg)
        ? 'This code has expired. Send a new one.'
        : 'That code is not right. Check the email and try again.' };
    }
    return { accessToken: data.session.access_token };
  },

  // Registration step 3: creates the organization for the verified email.
  async registerOrganization(data: {
    accessToken: string;
    orgName: string;
    adminName: string;
    password: string;
    country: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: 'System offline' };

    try {
      const formData = new FormData();
      formData.append('orgName', data.orgName);
      formData.append('adminName', data.adminName);
      formData.append('password', data.password);
      formData.append('country', data.country);
      return await invokeRegister(formData, data.accessToken);
    } catch (err: any) {
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
