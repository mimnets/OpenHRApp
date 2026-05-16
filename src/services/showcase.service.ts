import { ShowcaseOrganization } from '../types';
import { supabase, isSupabaseConfigured, getSupabaseStorageUrl } from './supabase';
import { convertFileToWebP } from '../utils/imageConvert';

const LOGO_BUCKET = 'showcase-logos';

function normalizeUrl(url?: string): string {
  if (!url || !url.trim()) return '';
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const mapRow = (r: Record<string, any>): ShowcaseOrganization => ({
  id: r.id,
  name: r.name,
  logo: r.logo ? getSupabaseStorageUrl(LOGO_BUCKET, r.logo) : '',
  country: r.country || '',
  industry: r.industry || '',
  websiteUrl: r.website_url || '',
  tagline: r.tagline || '',
  displayOrder: r.display_order || 0,
  isActive: r.is_active,
  created: r.created,
});

async function uploadLogo(file: File): Promise<string> {
  const webpBlob = await convertFileToWebP(file);
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
  const { error } = await supabase.storage.from(LOGO_BUCKET).upload(path, webpBlob, { contentType: 'image/webp', upsert: false });
  if (error) throw error;
  return path;
}

export const showcaseService = {
  async getActiveShowcase(): Promise<ShowcaseOrganization[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const { data, error } = await supabase
        .from('showcase_organizations')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return (data || []).map(mapRow);
    } catch (e: any) {
      console.error('[ShowcaseService] Failed to fetch active showcase:', e?.message || e);
      return [];
    }
  },

  async getAll(): Promise<ShowcaseOrganization[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const { data, error } = await supabase
        .from('showcase_organizations')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return (data || []).map(mapRow);
    } catch (e: any) {
      console.error('[ShowcaseService] Failed to fetch all showcase:', e?.message || e);
      return [];
    }
  },

  async create(data: { name: string; logo?: File; country?: string; industry?: string; websiteUrl?: string; tagline?: string; displayOrder?: number; isActive?: boolean }): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured()) return { success: false, message: 'Supabase not configured' };
    try {
      let logoPath: string | undefined;
      if (data.logo) logoPath = await uploadLogo(data.logo);

      const { error } = await supabase.from('showcase_organizations').insert({
        name: data.name,
        logo: logoPath,
        country: data.country,
        industry: data.industry,
        website_url: normalizeUrl(data.websiteUrl),
        tagline: data.tagline,
        display_order: data.displayOrder || 0,
        is_active: data.isActive !== false,
      });
      if (error) throw error;
      return { success: true, message: 'Showcase organization added successfully' };
    } catch (e: any) {
      console.error('[ShowcaseService] Failed to create:', e?.message || e);
      return { success: false, message: e?.message || 'Failed to create showcase entry' };
    }
  },

  async update(id: string, data: { name?: string; logo?: File; country?: string; industry?: string; websiteUrl?: string; tagline?: string; displayOrder?: number; isActive?: boolean }): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured()) return { success: false, message: 'Supabase not configured' };
    try {
      const updateData: Record<string, any> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.logo) updateData.logo = await uploadLogo(data.logo);
      if (data.country !== undefined) updateData.country = data.country;
      if (data.industry !== undefined) updateData.industry = data.industry;
      if (data.websiteUrl !== undefined) updateData.website_url = normalizeUrl(data.websiteUrl);
      if (data.tagline !== undefined) updateData.tagline = data.tagline;
      if (data.displayOrder !== undefined) updateData.display_order = data.displayOrder;
      if (data.isActive !== undefined) updateData.is_active = data.isActive;

      const { error } = await supabase.from('showcase_organizations').update(updateData).eq('id', id);
      if (error) throw error;
      return { success: true, message: 'Showcase organization updated successfully' };
    } catch (e: any) {
      console.error('[ShowcaseService] Failed to update:', e?.message || e);
      return { success: false, message: e?.message || 'Failed to update showcase entry' };
    }
  },

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured()) return { success: false, message: 'Supabase not configured' };
    try {
      const { error } = await supabase.from('showcase_organizations').delete().eq('id', id);
      if (error) throw error;
      return { success: true, message: 'Showcase organization removed' };
    } catch (e: any) {
      console.error('[ShowcaseService] Failed to delete:', e?.message || e);
      return { success: false, message: e?.message || 'Failed to delete showcase entry' };
    }
  },

  async toggleActive(id: string, isActive: boolean): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured()) return { success: false, message: 'Supabase not configured' };
    try {
      const { error } = await supabase.from('showcase_organizations').update({ is_active: isActive }).eq('id', id);
      if (error) throw error;
      return { success: true, message: `Showcase entry ${isActive ? 'activated' : 'deactivated'}` };
    } catch (e: any) {
      console.error('[ShowcaseService] Failed to toggle:', e?.message || e);
      return { success: false, message: e?.message || 'Failed to toggle status' };
    }
  },
};
