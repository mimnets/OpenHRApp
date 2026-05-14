
import { apiClient } from './api.client';
import { Tutorial } from '../types';
import { convertFileToWebP } from '../utils/imageConvert';
import { supabase, isSupabaseConfigured, getSupabaseStorageUrl } from './supabase';

export const tutorialService = {
  async getPublishedTutorials(page: number = 1, limit: number = 100): Promise<{
    tutorials: Tutorial[];
    page: number;
    totalPages: number;
    totalTutorials: number;
  }> {
    if (!isSupabaseConfigured()) return { tutorials: [], page: 1, totalPages: 0, totalTutorials: 0 };
    try {
      const { data, count, error } = await supabase
        .from('tutorials')
        .select('*', { count: 'exact' })
        .eq('status', 'PUBLISHED')
        .order('display_order', { ascending: true })
        .order('published_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;

      const tutorials: Tutorial[] = (data || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        content: '',
        excerpt: r.excerpt || '',
        coverImage: r.cover_image ? getSupabaseStorageUrl('content-images', r.cover_image) : '',
        status: 'PUBLISHED' as const,
        authorName: r.author_name || '',
        displayOrder: r.display_order || 0,
        parentId: r.parent_id || '',
        category: r.category || '',
        publishedAt: r.published_at || '',
        created: r.created || '',
        updated: r.updated || '',
      }));

      const totalTutorials = count ?? tutorials.length;
      return { tutorials, page, totalPages: Math.ceil(totalTutorials / limit), totalTutorials };
    } catch (e: any) {
      console.error('[TutorialService] Failed to fetch published tutorials:', e?.message || e);
      return { tutorials: [], page: 1, totalPages: 0, totalTutorials: 0 };
    }
  },

  async getTutorialBySlug(slug: string): Promise<Tutorial | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '');
      const { data, error } = await supabase
        .from('tutorials')
        .select('*')
        .eq('status', 'PUBLISHED')
        .eq('slug', cleanSlug)
        .single();

      if (error || !data) return null;
      const r = data;
      return {
        id: r.id,
        title: r.title,
        slug: r.slug,
        content: r.content || '',
        excerpt: r.excerpt || '',
        coverImage: r.cover_image ? getSupabaseStorageUrl('content-images', r.cover_image) : '',
        status: 'PUBLISHED',
        authorName: r.author_name || '',
        displayOrder: r.display_order || 0,
        parentId: r.parent_id || '',
        category: r.category || '',
        publishedAt: r.published_at || '',
        created: r.created || '',
        updated: r.updated || '',
      };
    } catch (e: any) {
      console.error('[TutorialService] Failed to fetch tutorial by slug:', e?.message || e);
      return null;
    }
  },

  async getAllTutorials(): Promise<Tutorial[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const { data, error } = await supabase
        .from('tutorials')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created', { ascending: false });

      if (error) throw error;
      return (data || []).map((r: any) => ({
        id: r.id,
        title: r.title || '',
        slug: r.slug || '',
        content: r.content || '',
        excerpt: r.excerpt || '',
        coverImage: r.cover_image ? getSupabaseStorageUrl('content-images', r.cover_image) : '',
        status: r.status || 'DRAFT',
        authorName: r.author_name || '',
        displayOrder: r.display_order || 0,
        parentId: r.parent_id || '',
        category: r.category || '',
        publishedAt: r.published_at || '',
        created: r.created || '',
        updated: r.updated || '',
      }));
    } catch (e: any) {
      console.error('[TutorialService] Failed to fetch all tutorials:', e?.message || e);
      return [];
    }
  },

  async createTutorial(data: {
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    coverImage?: File | null;
    status: 'DRAFT' | 'PUBLISHED';
    authorName: string;
    displayOrder: number;
    parentId: string;
    category: string;
  }): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured()) return { success: false, message: 'Supabase not configured' };
    try {
      let coverPath: string | null = null;
      if (data.coverImage) {
        const webpCover = await convertFileToWebP(data.coverImage);
        const path = `tutorial-covers/${Date.now()}.webp`;
        const { error: uploadErr } = await supabase.storage.from('content-images').upload(path, webpCover, { upsert: true });
        if (uploadErr) throw uploadErr;
        coverPath = path;
      }

      const record: Record<string, any> = {
        title: data.title,
        slug: data.slug,
        content: data.content,
        excerpt: data.excerpt,
        status: data.status,
        author_name: data.authorName,
        display_order: data.displayOrder,
        parent_id: data.parentId || null,
        category: data.category,
      };
      if (coverPath) record.cover_image = coverPath;
      if (data.status === 'PUBLISHED') record.published_at = new Date().toISOString();

      const { error } = await supabase.from('tutorials').insert(record);
      if (error) throw error;
      apiClient.notify();
      return { success: true, message: 'Tutorial created successfully' };
    } catch (e: any) {
      console.error('[TutorialService] Failed to create tutorial:', e);
      return { success: false, message: e?.message || 'Failed to create tutorial' };
    }
  },

  async updateTutorial(id: string, data: {
    title?: string;
    slug?: string;
    content?: string;
    excerpt?: string;
    coverImage?: File | null;
    status?: 'DRAFT' | 'PUBLISHED';
    authorName?: string;
    displayOrder?: number;
    parentId?: string;
    category?: string;
    publishedAt?: string;
  }): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured()) return { success: false, message: 'Supabase not configured' };
    try {
      const record: Record<string, any> = {};
      if (data.title !== undefined) record.title = data.title;
      if (data.slug !== undefined) record.slug = data.slug;
      if (data.content !== undefined) record.content = data.content;
      if (data.excerpt !== undefined) record.excerpt = data.excerpt;
      if (data.status !== undefined) record.status = data.status;
      if (data.authorName !== undefined) record.author_name = data.authorName;
      if (data.displayOrder !== undefined) record.display_order = data.displayOrder;
      if (data.parentId !== undefined) record.parent_id = data.parentId || null;
      if (data.category !== undefined) record.category = data.category;
      if (data.publishedAt !== undefined) record.published_at = data.publishedAt;

      if (data.coverImage) {
        const webpCover = await convertFileToWebP(data.coverImage);
        const path = `tutorial-covers/${Date.now()}.webp`;
        const { error: uploadErr } = await supabase.storage.from('content-images').upload(path, webpCover, { upsert: true });
        if (uploadErr) throw uploadErr;
        record.cover_image = path;
      }

      const { error } = await supabase.from('tutorials').update(record).eq('id', id);
      if (error) throw error;
      apiClient.notify();
      return { success: true, message: 'Tutorial updated successfully' };
    } catch (e: any) {
      console.error('[TutorialService] Failed to update tutorial:', e);
      return { success: false, message: e?.message || 'Failed to update tutorial' };
    }
  },

  async deleteTutorial(id: string): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured()) return { success: false, message: 'Supabase not configured' };
    try {
      const { error } = await supabase.from('tutorials').delete().eq('id', id);
      if (error) throw error;
      apiClient.notify();
      return { success: true, message: 'Tutorial deleted successfully' };
    } catch (e: any) {
      console.error('[TutorialService] Failed to delete tutorial:', e?.message || e);
      return { success: false, message: e?.message || 'Failed to delete tutorial' };
    }
  },
};
