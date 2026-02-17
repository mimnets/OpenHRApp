
import { apiClient } from './api.client';
import { Tutorial } from '../types';

// Build correct file URL using PocketBase base URL (not appURL from backend)
const buildFileUrl = (collectionName: string, recordId: string, fileName: string): string => {
  if (!fileName || !apiClient.pb) return '';
  const baseUrl = apiClient.pb.baseURL || '';
  return `${baseUrl}/api/files/${collectionName}/${recordId}/${fileName}`;
};

// Extract just the filename from a full URL or return as-is if already a filename
const extractFileName = (coverValue: string): string => {
  if (!coverValue) return '';
  // If it's a full URL, extract just the filename (last path segment)
  if (coverValue.startsWith('http://') || coverValue.startsWith('https://')) {
    try {
      const url = new URL(coverValue);
      const segments = url.pathname.split('/');
      return segments[segments.length - 1] || '';
    } catch {
      return coverValue;
    }
  }
  return coverValue;
};

export const tutorialService = {
  // =============================================
  // PUBLIC METHODS (no auth required)
  // =============================================

  async getPublishedTutorials(page: number = 1, limit: number = 100): Promise<{
    tutorials: Tutorial[];
    page: number;
    totalPages: number;
    totalTutorials: number;
  }> {
    if (!apiClient.pb) {
      console.warn('[TutorialService] PocketBase not configured');
      return { tutorials: [], page: 1, totalPages: 0, totalTutorials: 0 };
    }
    try {
      const response = await apiClient.pb.send(`/api/openhr/tutorials/posts?page=${page}&limit=${limit}`, { method: 'GET' });
      const tutorials: Tutorial[] = (response.tutorials || []).map((p: any) => {
        const fileName = extractFileName(p.cover_image || '');
        return {
          id: p.id,
          title: p.title,
          slug: p.slug,
          content: '',
          excerpt: p.excerpt,
          coverImage: fileName ? buildFileUrl('tutorials', p.id, fileName) : '',
          status: 'PUBLISHED' as const,
          authorName: p.author_name || '',
          displayOrder: p.display_order || 0,
          parentId: p.parent_id || '',
          category: p.category || '',
          publishedAt: p.published_at || '',
          created: p.created || '',
          updated: p.updated || '',
        };
      });
      return {
        tutorials,
        page: response.page || 1,
        totalPages: response.totalPages || 1,
        totalTutorials: response.totalTutorials || tutorials.length,
      };
    } catch (e: any) {
      console.error('[TutorialService] Failed to fetch published tutorials:', e?.message || e);
      return { tutorials: [], page: 1, totalPages: 0, totalTutorials: 0 };
    }
  },

  async getTutorialBySlug(slug: string): Promise<Tutorial | null> {
    if (!apiClient.pb) {
      console.warn('[TutorialService] PocketBase not configured');
      return null;
    }
    try {
      // Sanitize slug to ensure clean URL path (lowercase, alphanumeric + hyphens only)
      const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '');
      const response = await apiClient.pb.send(`/api/openhr/tutorials/posts/${cleanSlug}`, { method: 'GET' });
      if (!response.success || !response.tutorial) return null;
      const p = response.tutorial;
      const fileName = extractFileName(p.cover_image || '');
      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        content: p.content || '',
        excerpt: p.excerpt || '',
        coverImage: fileName ? buildFileUrl('tutorials', p.id, fileName) : '',
        status: 'PUBLISHED',
        authorName: p.author_name || '',
        displayOrder: p.display_order || 0,
        parentId: p.parent_id || '',
        category: p.category || '',
        publishedAt: p.published_at || '',
        created: p.created || '',
        updated: p.updated || '',
      };
    } catch (e: any) {
      console.error('[TutorialService] Failed to fetch tutorial by slug:', e?.message || e);
      return null;
    }
  },

  // =============================================
  // ADMIN METHODS (auth required, PB SDK)
  // =============================================

  async getAllTutorials(): Promise<Tutorial[]> {
    if (!apiClient.pb) return [];
    try {
      const records = await apiClient.pb.collection('tutorials').getFullList({ sort: 'display_order,-created' });
      return records.map((r: any) => ({
        id: r.id,
        title: r.title || '',
        slug: r.slug || '',
        content: r.content || '',
        excerpt: r.excerpt || '',
        coverImage: r.cover_image ? apiClient.pb!.files.getURL(r, r.cover_image) : '',
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
    if (!apiClient.pb) return { success: false, message: 'PocketBase not configured' };
    try {
      const record: Record<string, any> = {
        title: data.title,
        slug: data.slug,
        content: data.content,
        excerpt: data.excerpt,
        status: data.status,
        author_name: data.authorName,
        display_order: data.displayOrder,
        parent_id: data.parentId,
        category: data.category,
      };
      if (data.status === 'PUBLISHED') {
        record.published_at = new Date().toISOString();
      }

      if (data.coverImage) {
        const formData = new FormData();
        Object.entries(record).forEach(([key, val]) => {
          if (val !== undefined && val !== null) formData.append(key, String(val));
        });
        formData.append('cover_image', data.coverImage);
        await apiClient.pb.collection('tutorials').create(formData);
      } else {
        await apiClient.pb.collection('tutorials').create(record);
      }

      apiClient.notify();
      return { success: true, message: 'Tutorial created successfully' };
    } catch (e: any) {
      console.error('[TutorialService] Failed to create tutorial:', e);
      const fieldErrors = e?.data?.data;
      if (fieldErrors) {
        const details = Object.entries(fieldErrors).map(([k, v]: [string, any]) => `${k}: ${v?.message || v}`).join(', ');
        return { success: false, message: `Validation error: ${details}` };
      }
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
    if (!apiClient.pb) return { success: false, message: 'PocketBase not configured' };
    try {
      const record: Record<string, any> = {};
      if (data.title !== undefined) record.title = data.title;
      if (data.slug !== undefined) record.slug = data.slug;
      if (data.content !== undefined) record.content = data.content;
      if (data.excerpt !== undefined) record.excerpt = data.excerpt;
      if (data.status !== undefined) record.status = data.status;
      if (data.authorName !== undefined) record.author_name = data.authorName;
      if (data.displayOrder !== undefined) record.display_order = data.displayOrder;
      if (data.parentId !== undefined) record.parent_id = data.parentId;
      if (data.category !== undefined) record.category = data.category;
      if (data.publishedAt !== undefined) record.published_at = data.publishedAt;

      if (data.coverImage) {
        const formData = new FormData();
        Object.entries(record).forEach(([key, val]) => {
          if (val !== undefined && val !== null) formData.append(key, String(val));
        });
        formData.append('cover_image', data.coverImage);
        await apiClient.pb.collection('tutorials').update(id, formData);
      } else {
        await apiClient.pb.collection('tutorials').update(id, record);
      }

      apiClient.notify();
      return { success: true, message: 'Tutorial updated successfully' };
    } catch (e: any) {
      console.error('[TutorialService] Failed to update tutorial:', e);
      const fieldErrors = e?.data?.data;
      if (fieldErrors) {
        const details = Object.entries(fieldErrors).map(([k, v]: [string, any]) => `${k}: ${v?.message || v}`).join(', ');
        return { success: false, message: `Validation error: ${details}` };
      }
      return { success: false, message: e?.message || 'Failed to update tutorial' };
    }
  },

  async deleteTutorial(id: string): Promise<{ success: boolean; message: string }> {
    if (!apiClient.pb) return { success: false, message: 'PocketBase not configured' };
    try {
      await apiClient.pb.collection('tutorials').delete(id);
      apiClient.notify();
      return { success: true, message: 'Tutorial deleted successfully' };
    } catch (e: any) {
      console.error('[TutorialService] Failed to delete tutorial:', e?.message || e);
      return { success: false, message: e?.message || 'Failed to delete tutorial' };
    }
  },
};
