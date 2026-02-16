import { SocialLink } from '../types';
import { pb } from './pocketbase';

export const socialLinksService = {
  /**
   * Public — no auth required. Fetches active social links for landing page.
   */
  async getActiveLinks(): Promise<SocialLink[]> {
    if (!pb) return [];

    try {
      const records = await pb.collection('social_links').getFullList({
        filter: 'is_active=true',
        sort: 'display_order'
      });

      return records.map(r => ({
        id: r.id,
        platform: r.platform,
        url: r.url,
        displayOrder: r.display_order || 0,
        isActive: r.is_active,
        created: r.created
      }));
    } catch (e: any) {
      console.error('[SocialLinksService] Failed to fetch active links:', e?.message || e);
      return [];
    }
  },

  /**
   * Super Admin — fetches all social links (active + inactive)
   */
  async getAll(): Promise<SocialLink[]> {
    if (!pb) return [];

    try {
      const records = await pb.collection('social_links').getFullList({
        sort: 'display_order'
      });

      return records.map(r => ({
        id: r.id,
        platform: r.platform,
        url: r.url,
        displayOrder: r.display_order || 0,
        isActive: r.is_active,
        created: r.created
      }));
    } catch (e: any) {
      console.error('[SocialLinksService] Failed to fetch all links:', e?.message || e);
      return [];
    }
  },

  /**
   * Super Admin — create a new social link
   */
  async create(data: { platform: string; url: string; displayOrder?: number; isActive?: boolean }): Promise<{ success: boolean; message: string }> {
    if (!pb) return { success: false, message: 'PocketBase not configured' };

    try {
      await pb.collection('social_links').create({
        platform: data.platform,
        url: data.url,
        display_order: data.displayOrder || 0,
        is_active: data.isActive !== false
      });
      return { success: true, message: 'Social link added successfully' };
    } catch (e: any) {
      console.error('[SocialLinksService] Failed to create:', e?.message || e);
      const fieldErrors = e?.response?.data || e?.data || {};
      const details = Object.entries(fieldErrors).map(([k, v]: any) => `${k}: ${v?.message || v}`).join(', ');
      return { success: false, message: details || e?.message || 'Failed to create social link' };
    }
  },

  /**
   * Super Admin — update an existing social link
   */
  async update(id: string, data: { platform?: string; url?: string; displayOrder?: number; isActive?: boolean }): Promise<{ success: boolean; message: string }> {
    if (!pb) return { success: false, message: 'PocketBase not configured' };

    try {
      const updateData: Record<string, any> = {};
      if (data.platform !== undefined) updateData.platform = data.platform;
      if (data.url !== undefined) updateData.url = data.url;
      if (data.displayOrder !== undefined) updateData.display_order = data.displayOrder;
      if (data.isActive !== undefined) updateData.is_active = data.isActive;

      await pb.collection('social_links').update(id, updateData);
      return { success: true, message: 'Social link updated successfully' };
    } catch (e: any) {
      console.error('[SocialLinksService] Failed to update:', e?.message || e);
      return { success: false, message: e?.message || 'Failed to update social link' };
    }
  },

  /**
   * Super Admin — delete a social link
   */
  async delete(id: string): Promise<{ success: boolean; message: string }> {
    if (!pb) return { success: false, message: 'PocketBase not configured' };

    try {
      await pb.collection('social_links').delete(id);
      return { success: true, message: 'Social link removed' };
    } catch (e: any) {
      console.error('[SocialLinksService] Failed to delete:', e?.message || e);
      return { success: false, message: e?.message || 'Failed to delete social link' };
    }
  },

  /**
   * Super Admin — toggle active status inline
   */
  async toggleActive(id: string, isActive: boolean): Promise<{ success: boolean; message: string }> {
    if (!pb) return { success: false, message: 'PocketBase not configured' };

    try {
      await pb.collection('social_links').update(id, { is_active: isActive });
      return { success: true, message: `Social link ${isActive ? 'activated' : 'deactivated'}` };
    } catch (e: any) {
      console.error('[SocialLinksService] Failed to toggle:', e?.message || e);
      return { success: false, message: e?.message || 'Failed to toggle status' };
    }
  }
};
