import { SocialLink } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

const mapRow = (r: Record<string, any>): SocialLink => ({
  id: r.id,
  platform: r.platform,
  url: r.url,
  displayOrder: r.display_order || 0,
  isActive: r.is_active,
  created: r.created,
});

export const socialLinksService = {
  async getActiveLinks(): Promise<SocialLink[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const { data, error } = await supabase
        .from('social_links')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return (data || []).map(mapRow);
    } catch (e: any) {
      console.error('[SocialLinksService] Failed to fetch active links:', e?.message || e);
      return [];
    }
  },

  async getAll(): Promise<SocialLink[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const { data, error } = await supabase
        .from('social_links')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return (data || []).map(mapRow);
    } catch (e: any) {
      console.error('[SocialLinksService] Failed to fetch all links:', e?.message || e);
      return [];
    }
  },

  async create(data: { platform: string; url: string; displayOrder?: number; isActive?: boolean }): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured()) return { success: false, message: 'Supabase not configured' };
    try {
      const { error } = await supabase.from('social_links').insert({
        platform: data.platform,
        url: data.url,
        display_order: data.displayOrder || 0,
        is_active: data.isActive !== false,
      });
      if (error) throw error;
      return { success: true, message: 'Social link added successfully' };
    } catch (e: any) {
      console.error('[SocialLinksService] Failed to create:', e?.message || e);
      return { success: false, message: e?.message || 'Failed to create social link' };
    }
  },

  async update(id: string, data: { platform?: string; url?: string; displayOrder?: number; isActive?: boolean }): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured()) return { success: false, message: 'Supabase not configured' };
    try {
      const updateData: Record<string, any> = {};
      if (data.platform !== undefined) updateData.platform = data.platform;
      if (data.url !== undefined) updateData.url = data.url;
      if (data.displayOrder !== undefined) updateData.display_order = data.displayOrder;
      if (data.isActive !== undefined) updateData.is_active = data.isActive;

      const { error } = await supabase.from('social_links').update(updateData).eq('id', id);
      if (error) throw error;
      return { success: true, message: 'Social link updated successfully' };
    } catch (e: any) {
      console.error('[SocialLinksService] Failed to update:', e?.message || e);
      return { success: false, message: e?.message || 'Failed to update social link' };
    }
  },

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured()) return { success: false, message: 'Supabase not configured' };
    try {
      const { error } = await supabase.from('social_links').delete().eq('id', id);
      if (error) throw error;
      return { success: true, message: 'Social link removed' };
    } catch (e: any) {
      console.error('[SocialLinksService] Failed to delete:', e?.message || e);
      return { success: false, message: e?.message || 'Failed to delete social link' };
    }
  },

  async toggleActive(id: string, isActive: boolean): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured()) return { success: false, message: 'Supabase not configured' };
    try {
      const { error } = await supabase.from('social_links').update({ is_active: isActive }).eq('id', id);
      if (error) throw error;
      return { success: true, message: `Social link ${isActive ? 'activated' : 'deactivated'}` };
    } catch (e: any) {
      console.error('[SocialLinksService] Failed to toggle:', e?.message || e);
      return { success: false, message: e?.message || 'Failed to toggle status' };
    }
  },
};
