import { ShowcaseOrganization } from '../types';
import { pb } from './pocketbase';

function normalizeUrl(url?: string): string {
  if (!url || !url.trim()) return '';
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export const showcaseService = {
  /**
   * Public — no auth required. Fetches active showcase orgs for landing page.
   */
  async getActiveShowcase(): Promise<ShowcaseOrganization[]> {
    if (!pb) return [];

    try {
      const records = await pb.collection('showcase_organizations').getFullList({
        filter: 'is_active=true',
        sort: 'display_order'
      });

      return records.map(r => ({
        id: r.id,
        name: r.name,
        logo: r.logo ? pb!.files.getURL(r, r.logo) : '',
        country: r.country || '',
        industry: r.industry || '',
        websiteUrl: r.website_url || '',
        tagline: r.tagline || '',
        displayOrder: r.display_order || 0,
        isActive: r.is_active,
        created: r.created
      }));
    } catch (e: any) {
      console.error('[ShowcaseService] Failed to fetch active showcase:', e?.message || e);
      return [];
    }
  },

  /**
   * Super Admin — fetches all showcase orgs (active + inactive)
   */
  async getAll(): Promise<ShowcaseOrganization[]> {
    if (!pb) return [];

    try {
      const records = await pb.collection('showcase_organizations').getFullList({
        sort: 'display_order'
      });

      return records.map(r => ({
        id: r.id,
        name: r.name,
        logo: r.logo ? pb!.files.getURL(r, r.logo) : '',
        country: r.country || '',
        industry: r.industry || '',
        websiteUrl: r.website_url || '',
        tagline: r.tagline || '',
        displayOrder: r.display_order || 0,
        isActive: r.is_active,
        created: r.created
      }));
    } catch (e: any) {
      console.error('[ShowcaseService] Failed to fetch all showcase:', e?.message || e);
      return [];
    }
  },

  /**
   * Super Admin — create a new showcase org
   */
  async create(data: { name: string; logo?: File; country?: string; industry?: string; websiteUrl?: string; tagline?: string; displayOrder?: number; isActive?: boolean }): Promise<{ success: boolean; message: string }> {
    if (!pb) return { success: false, message: 'PocketBase not configured' };

    try {
      const formData = new FormData();
      formData.append('name', data.name);
      if (data.logo) formData.append('logo', data.logo);
      if (data.country) formData.append('country', data.country);
      if (data.industry) formData.append('industry', data.industry);
      const url = normalizeUrl(data.websiteUrl);
      if (url) formData.append('website_url', url);
      if (data.tagline) formData.append('tagline', data.tagline);
      formData.append('display_order', String(data.displayOrder || 0));
      formData.append('is_active', String(data.isActive !== false));

      await pb.collection('showcase_organizations').create(formData);
      return { success: true, message: 'Showcase organization added successfully' };
    } catch (e: any) {
      console.error('[ShowcaseService] Failed to create:', e?.message || e);
      console.error('[ShowcaseService] Validation errors:', JSON.stringify(e?.response?.data || e?.data || {}));
      const fieldErrors = e?.response?.data || e?.data || {};
      const details = Object.entries(fieldErrors).map(([k, v]: any) => `${k}: ${v?.message || v}`).join(', ');
      return { success: false, message: details || e?.message || 'Failed to create showcase entry' };
    }
  },

  /**
   * Super Admin — update an existing showcase org
   */
  async update(id: string, data: { name?: string; logo?: File; country?: string; industry?: string; websiteUrl?: string; tagline?: string; displayOrder?: number; isActive?: boolean }): Promise<{ success: boolean; message: string }> {
    if (!pb) return { success: false, message: 'PocketBase not configured' };

    try {
      const formData = new FormData();
      if (data.name !== undefined) formData.append('name', data.name);
      if (data.logo) formData.append('logo', data.logo);
      if (data.country !== undefined) formData.append('country', data.country);
      if (data.industry !== undefined) formData.append('industry', data.industry);
      if (data.websiteUrl !== undefined) formData.append('website_url', normalizeUrl(data.websiteUrl));
      if (data.tagline !== undefined) formData.append('tagline', data.tagline);
      if (data.displayOrder !== undefined) formData.append('display_order', String(data.displayOrder));
      if (data.isActive !== undefined) formData.append('is_active', String(data.isActive));

      await pb.collection('showcase_organizations').update(id, formData);
      return { success: true, message: 'Showcase organization updated successfully' };
    } catch (e: any) {
      console.error('[ShowcaseService] Failed to update:', e?.message || e);
      return { success: false, message: e?.message || 'Failed to update showcase entry' };
    }
  },

  /**
   * Super Admin — delete a showcase org
   */
  async delete(id: string): Promise<{ success: boolean; message: string }> {
    if (!pb) return { success: false, message: 'PocketBase not configured' };

    try {
      await pb.collection('showcase_organizations').delete(id);
      return { success: true, message: 'Showcase organization removed' };
    } catch (e: any) {
      console.error('[ShowcaseService] Failed to delete:', e?.message || e);
      return { success: false, message: e?.message || 'Failed to delete showcase entry' };
    }
  },

  /**
   * Super Admin — toggle active status inline
   */
  async toggleActive(id: string, isActive: boolean): Promise<{ success: boolean; message: string }> {
    if (!pb) return { success: false, message: 'PocketBase not configured' };

    try {
      await pb.collection('showcase_organizations').update(id, { is_active: isActive });
      return { success: true, message: `Showcase entry ${isActive ? 'activated' : 'deactivated'}` };
    } catch (e: any) {
      console.error('[ShowcaseService] Failed to toggle:', e?.message || e);
      return { success: false, message: e?.message || 'Failed to toggle status' };
    }
  }
};
