import { supabase, isSupabaseConfigured, getSupabaseStorageUrl } from './supabase';
import { apiClient } from './api.client';
import { UpgradeRequest, DonationTier } from '../types';
import { convertFileToWebP } from '../utils/imageConvert';

export const upgradeService = {
  async submitDonationRequest(data: {
    donationTier: DonationTier;
    donationAmount: number;
    donationReference: string;
    donationScreenshot?: File;
  }): Promise<{ success: boolean; message: string; requestId?: string }> {
    if (!isSupabaseConfigured()) return { success: false, message: 'Not configured' };
    try {
      const orgId = apiClient.getOrganizationId();
      if (!orgId) return { success: false, message: 'No organization found' };

      let screenshotPath: string | null = null;
      if (data.donationScreenshot) {
        const webp = await convertFileToWebP(data.donationScreenshot);
        const path = `${orgId}/${Date.now()}.webp`;
        const { error: uploadErr } = await supabase.storage.from('donation-screenshots').upload(path, webp, { upsert: false });
        if (uploadErr) throw uploadErr;
        screenshotPath = path;
      }

      const { data: record, error } = await supabase.from('upgrade_requests').insert({
        organization_id: orgId,
        request_type: 'DONATION',
        status: 'PENDING',
        donation_tier: data.donationTier,
        donation_amount: data.donationAmount,
        donation_reference: data.donationReference,
        donation_screenshot: screenshotPath,
      }).select('id').single();
      if (error) throw error;
      return { success: true, message: 'Request submitted successfully', requestId: record.id };
    } catch (e: any) {
      console.error('[UpgradeService] Failed to submit donation request:', e);
      return { success: false, message: e?.message || 'Failed to submit request' };
    }
  },

  async submitExtensionRequest(data: {
    extensionReason: string;
    extensionDays: number;
  }): Promise<{ success: boolean; message: string; requestId?: string }> {
    if (!isSupabaseConfigured()) return { success: false, message: 'Not configured' };
    try {
      const orgId = apiClient.getOrganizationId();
      if (!orgId) return { success: false, message: 'No organization found' };

      const { data: record, error } = await supabase.from('upgrade_requests').insert({
        organization_id: orgId,
        request_type: 'TRIAL_EXTENSION',
        status: 'PENDING',
        extension_reason: data.extensionReason,
        extension_days: data.extensionDays,
      }).select('id').single();
      if (error) throw error;
      return { success: true, message: 'Extension request submitted', requestId: record.id };
    } catch (e: any) {
      console.error('[UpgradeService] Failed to submit extension request:', e);
      return { success: false, message: e?.message || 'Failed to submit request' };
    }
  },

  async acceptAdSupported(): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured()) return { success: false, message: 'Not configured' };
    try {
      const orgId = apiClient.getOrganizationId();
      if (!orgId) return { success: false, message: 'No organization found' };
      const { error } = await supabase
        .from('organizations')
        .update({ subscription_status: 'AD_SUPPORTED', trial_end_date: null })
        .eq('id', orgId);
      if (error) throw error;
      apiClient.notify();
      return { success: true, message: 'Ad-supported mode activated' };
    } catch (e: any) {
      console.error('[UpgradeService] Failed to accept ad-supported:', e);
      return { success: false, message: e?.message || 'Failed to activate ad-supported mode' };
    }
  },

  async getPendingRequest(): Promise<UpgradeRequest | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const orgId = apiClient.getOrganizationId();
      if (!orgId) return null;

      const { data, error } = await supabase
        .from('upgrade_requests')
        .select('*')
        .eq('organization_id', orgId)
        .eq('status', 'PENDING')
        .order('created', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const r = data;
      return {
        id: r.id,
        organizationId: r.organization_id,
        requestType: r.request_type,
        status: r.status,
        donationAmount: r.donation_amount,
        donationTier: r.donation_tier,
        donationReference: r.donation_reference,
        donationScreenshot: r.donation_screenshot ? getSupabaseStorageUrl('donation-screenshots', r.donation_screenshot) : undefined,
        extensionReason: r.extension_reason,
        extensionDays: r.extension_days,
        adminNotes: r.admin_notes,
        created: r.created,
      };
    } catch (e: any) {
      console.error('[UpgradeService] Failed to get pending request:', e);
      return null;
    }
  },

  async getAllRequests(statusFilter?: string): Promise<UpgradeRequest[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      let query = supabase
        .from('upgrade_requests')
        .select('*, organizations(name)')
        .order('created', { ascending: false });
      if (statusFilter) query = query.eq('status', statusFilter);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((r: any) => ({
        id: r.id,
        organizationId: r.organization_id,
        organizationName: r.organizations?.name || 'Unknown',
        requestType: r.request_type,
        status: r.status,
        donationAmount: r.donation_amount,
        donationTier: r.donation_tier,
        donationReference: r.donation_reference,
        donationScreenshot: r.donation_screenshot ? getSupabaseStorageUrl('donation-screenshots', r.donation_screenshot) : undefined,
        extensionReason: r.extension_reason,
        extensionDays: r.extension_days,
        adminNotes: r.admin_notes,
        processedBy: r.processed_by,
        processedAt: r.processed_at,
        created: r.created,
      }));
    } catch (e: any) {
      console.error('[UpgradeService] Failed to get all requests:', e);
      return [];
    }
  },

  async processRequest(
    requestId: string,
    action: 'APPROVED' | 'REJECTED',
    adminNotes?: string,
    extensionDays?: number,
  ): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured()) return { success: false, message: 'Not configured' };
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Fetch the request to know org + type
      const { data: req, error: fetchErr } = await supabase
        .from('upgrade_requests')
        .select('organization_id, request_type, extension_days, donation_tier')
        .eq('id', requestId)
        .single();
      if (fetchErr || !req) return { success: false, message: 'Request not found' };

      // Update request status
      const { error: updateErr } = await supabase.from('upgrade_requests').update({
        status: action,
        admin_notes: adminNotes || null,
        processed_by: user?.id || null,
        processed_at: new Date().toISOString(),
      }).eq('id', requestId);
      if (updateErr) throw updateErr;

      // If approved, update organization subscription
      if (action === 'APPROVED') {
        const orgUpdate: any = {};
        if (req.request_type === 'TRIAL_EXTENSION') {
          const days = extensionDays ?? req.extension_days ?? 14;
          const newEnd = new Date();
          newEnd.setDate(newEnd.getDate() + days);
          orgUpdate.trial_end_date = newEnd.toISOString();
          orgUpdate.subscription_status = 'TRIAL';
        } else if (req.request_type === 'DONATION') {
          orgUpdate.subscription_status = 'ACTIVE';
          orgUpdate.trial_end_date = null;
        } else if (req.request_type === 'AD_SUPPORTED') {
          orgUpdate.subscription_status = 'AD_SUPPORTED';
          orgUpdate.trial_end_date = null;
        }
        if (Object.keys(orgUpdate).length > 0) {
          await supabase.from('organizations').update(orgUpdate).eq('id', req.organization_id);
        }
      }

      apiClient.notify();
      return { success: true, message: action === 'APPROVED' ? 'Request approved' : 'Request rejected' };
    } catch (e: any) {
      console.error('[UpgradeService] Failed to process request:', e);
      return { success: false, message: e?.message || 'Failed to process request' };
    }
  },
};
