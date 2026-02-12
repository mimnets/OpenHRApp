import { apiClient } from './api.client';
import { UpgradeRequest, DonationTier } from '../types';

export const upgradeService = {
  /**
   * Submit a donation activation request
   */
  async submitDonationRequest(data: {
    donationTier: DonationTier;
    donationAmount: number;
    donationReference: string;
    donationScreenshot?: File;
  }): Promise<{ success: boolean; message: string; requestId?: string }> {
    if (!apiClient.pb || !apiClient.isConfigured()) {
      return { success: false, message: 'Not configured' };
    }

    try {
      const orgId = apiClient.getOrganizationId();
      if (!orgId) {
        return { success: false, message: 'No organization found' };
      }

      const formData = new FormData();
      formData.append('organization_id', orgId);
      formData.append('request_type', 'DONATION');
      formData.append('status', 'PENDING');
      formData.append('donation_tier', data.donationTier);
      formData.append('donation_amount', data.donationAmount.toString());
      formData.append('donation_reference', data.donationReference);

      if (data.donationScreenshot) {
        formData.append('donation_screenshot', data.donationScreenshot);
      }

      const record = await apiClient.pb.collection('upgrade_requests').create(formData);
      return { success: true, message: 'Request submitted successfully', requestId: record.id };
    } catch (e: any) {
      console.error('[UpgradeService] Failed to submit donation request:', e);
      return { success: false, message: e?.message || 'Failed to submit request' };
    }
  },

  /**
   * Submit a trial extension request
   */
  async submitExtensionRequest(data: {
    extensionReason: string;
    extensionDays: number;
  }): Promise<{ success: boolean; message: string; requestId?: string }> {
    if (!apiClient.pb || !apiClient.isConfigured()) {
      return { success: false, message: 'Not configured' };
    }

    try {
      const orgId = apiClient.getOrganizationId();
      if (!orgId) {
        return { success: false, message: 'No organization found' };
      }

      const record = await apiClient.pb.collection('upgrade_requests').create({
        organization_id: orgId,
        request_type: 'TRIAL_EXTENSION',
        status: 'PENDING',
        extension_reason: data.extensionReason,
        extension_days: data.extensionDays
      });

      return { success: true, message: 'Extension request submitted', requestId: record.id };
    } catch (e: any) {
      console.error('[UpgradeService] Failed to submit extension request:', e);
      return { success: false, message: e?.message || 'Failed to submit request' };
    }
  },

  /**
   * Accept ad-supported mode (instant activation)
   */
  async acceptAdSupported(): Promise<{ success: boolean; message: string }> {
    if (!apiClient.pb || !apiClient.isConfigured()) {
      return { success: false, message: 'Not configured' };
    }

    try {
      const response = await apiClient.pb.send('/api/openhr/accept-ads', {
        method: 'POST'
      });

      if (response.success) {
        return { success: true, message: 'Ad-supported mode activated' };
      } else {
        return { success: false, message: response.message || 'Failed to activate' };
      }
    } catch (e: any) {
      console.error('[UpgradeService] Failed to accept ad-supported:', e);
      return { success: false, message: e?.message || 'Failed to activate ad-supported mode' };
    }
  },

  /**
   * Get pending upgrade request for current organization
   */
  async getPendingRequest(): Promise<UpgradeRequest | null> {
    if (!apiClient.pb || !apiClient.isConfigured()) {
      return null;
    }

    try {
      const orgId = apiClient.getOrganizationId();
      if (!orgId) return null;

      const records = await apiClient.pb.collection('upgrade_requests').getList(1, 1, {
        filter: `organization_id = "${orgId}" && status = "PENDING"`,
        sort: '-created'
      });

      if (records.items.length === 0) return null;

      const r = records.items[0];
      return {
        id: r.id,
        organizationId: r.organization_id,
        requestType: r.request_type,
        status: r.status,
        donationAmount: r.donation_amount,
        donationTier: r.donation_tier,
        donationReference: r.donation_reference,
        donationScreenshot: r.donation_screenshot ? apiClient.pb.files.getURL(r, r.donation_screenshot) : undefined,
        extensionReason: r.extension_reason,
        extensionDays: r.extension_days,
        adminNotes: r.admin_notes,
        created: r.created
      };
    } catch (e: any) {
      console.error('[UpgradeService] Failed to get pending request:', e);
      return null;
    }
  },

  /**
   * Get all upgrade requests (Super Admin only)
   */
  async getAllRequests(statusFilter?: string): Promise<UpgradeRequest[]> {
    if (!apiClient.pb || !apiClient.isConfigured()) {
      console.log('[UpgradeService] getAllRequests: Not configured');
      return [];
    }

    try {
      const filter = statusFilter ? `status = "${statusFilter}"` : '';
      console.log('[UpgradeService] getAllRequests: Fetching with filter:', filter);
      const records = await apiClient.pb.collection('upgrade_requests').getFullList({
        filter,
        sort: '-created',
        expand: 'organization_id'
      });
      console.log('[UpgradeService] getAllRequests: Found', records.length, 'records');

      return records.map(r => ({
        id: r.id,
        organizationId: r.organization_id,
        organizationName: r.expand?.organization_id?.name || 'Unknown',
        requestType: r.request_type,
        status: r.status,
        donationAmount: r.donation_amount,
        donationTier: r.donation_tier,
        donationReference: r.donation_reference,
        donationScreenshot: r.donation_screenshot ? apiClient.pb!.files.getURL(r, r.donation_screenshot) : undefined,
        extensionReason: r.extension_reason,
        extensionDays: r.extension_days,
        adminNotes: r.admin_notes,
        processedBy: r.processed_by,
        processedAt: r.processed_at,
        created: r.created
      }));
    } catch (e: any) {
      console.error('[UpgradeService] Failed to get all requests:', e);
      return [];
    }
  },

  /**
   * Process an upgrade request (Super Admin only)
   */
  async processRequest(
    requestId: string,
    action: 'APPROVED' | 'REJECTED',
    adminNotes?: string,
    extensionDays?: number
  ): Promise<{ success: boolean; message: string }> {
    if (!apiClient.pb || !apiClient.isConfigured()) {
      return { success: false, message: 'Not configured' };
    }

    try {
      const response = await apiClient.pb.send('/api/openhr/process-upgrade-request', {
        method: 'POST',
        body: JSON.stringify({
          requestId,
          action,
          adminNotes,
          extensionDays
        })
      });

      return { success: response.success, message: response.message };
    } catch (e: any) {
      console.error('[UpgradeService] Failed to process request:', e);
      return { success: false, message: e?.message || 'Failed to process request' };
    }
  }
};
