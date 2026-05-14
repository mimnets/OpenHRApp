import { supabase, isSupabaseConfigured } from './supabase';
import { apiClient } from './api.client';

export const verificationService = {
  async checkVerified(email: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !email) return false;
    try {
      // email lives in auth.users, not profiles — resolve via current session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.email?.toLowerCase() !== email.toLowerCase().trim()) return false;
      const { data } = await supabase.from('profiles').select('verified').eq('id', user.id).maybeSingle();
      return !!(data?.verified);
    } catch {
      return false;
    }
  },

  async testEmailConfiguration(testEmail: string): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured()) return { success: false, message: 'Supabase not configured' };
    try {
      // Trigger a password reset email as a test — Supabase handles delivery
      const { error } = await supabase.auth.resetPasswordForEmail(testEmail);
      if (error) throw error;
      return { success: true, message: 'Test email sent! Check your inbox in 1-2 minutes.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Email test failed' };
    }
  },

  async getUnverifiedUsers(): Promise<{
    success: boolean;
    count: number;
    users: Array<{ id: string; email: string; name: string; role: string; created: string; updated: string }>;
    error?: string;
  }> {
    if (!isSupabaseConfigured()) return { success: false, count: 0, users: [], error: 'Not authenticated' };
    try {
      const orgId = apiClient.getOrganizationId();
      let query = supabase
        .from('profiles')
        .select('id, name, role, created, updated')
        .eq('verified', false);
      if (orgId) query = query.eq('organization_id', orgId);
      const { data, error } = await query.order('created', { ascending: false });
      if (error) throw error;
      const users = (data || []).map(r => ({
        id: r.id,
        email: '', // email lives in auth.users — not available via profiles query
        name: r.name || '',
        role: r.role || '',
        created: r.created || '',
        updated: r.updated || '',
      }));
      return { success: true, count: users.length, users };
    } catch (err: any) {
      return { success: false, count: 0, users: [], error: err?.message || 'Failed to fetch users' };
    }
  },

  async manuallyVerifyUser(userId: string): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured()) return { success: false, message: 'Not authenticated' };
    try {
      const { error } = await supabase.from('profiles').update({ verified: true }).eq('id', userId);
      if (error) throw error;
      apiClient.notify();
      return { success: true, message: 'User verified successfully' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Verification failed' };
    }
  },

  async waitForEmailVerification(
    email: string,
    maxWaitMinutes: number = 5,
  ): Promise<{ verified: boolean; timeoutMs: number }> {
    const pollIntervalMs = 10000;
    const maxChecks = (maxWaitMinutes * 60 * 1000) / pollIntervalMs;
    let checks = 0;

    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        checks++;
        const verified = await verificationService.checkVerified(email);
        if (verified) {
          clearInterval(interval);
          resolve({ verified: true, timeoutMs: checks * pollIntervalMs });
          return;
        }
        if (checks >= maxChecks) {
          clearInterval(interval);
          resolve({ verified: false, timeoutMs: checks * pollIntervalMs });
        }
      }, pollIntervalMs);
    });
  },

  async verifyEmailToken(token: string): Promise<{ success: boolean; email?: string; message: string }> {
    if (!isSupabaseConfigured()) return { success: false, message: 'Supabase not configured' };
    try {
      const { data, error } = await supabase.auth.verifyOtp({ token_hash: token, type: 'email' });
      if (error) {
        const msg = error.message.includes('expired') || error.message.includes('invalid')
          ? 'Verification link has expired or is invalid. Please request a new one.'
          : error.message;
        return { success: false, message: msg };
      }
      return { success: true, email: data.user?.email, message: 'Email verified successfully! You can now log in.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Verification failed' };
    }
  },

  async resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured()) return { success: false, message: 'Supabase not configured' };
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      return { success: true, message: 'Verification email resent. Check your inbox!' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to resend verification email' };
    }
  },
};
