
import { apiClient } from './api.client';
import { BlogPost } from '../types';

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

export const blogService = {
  // =============================================
  // PUBLIC METHODS (no auth required)
  // =============================================

  async getPublishedPosts(page: number = 1, limit: number = 10): Promise<{
    posts: BlogPost[];
    page: number;
    totalPages: number;
    totalPosts: number;
  }> {
    if (!apiClient.pb) {
      console.warn('[BlogService] PocketBase not configured');
      return { posts: [], page: 1, totalPages: 0, totalPosts: 0 };
    }
    try {
      const response = await apiClient.pb.send(`/api/openhr/blog/posts?page=${page}&limit=${limit}`, { method: 'GET' });
      const posts: BlogPost[] = (response.posts || []).map((p: any) => {
        const fileName = extractFileName(p.cover_image || '');
        return {
          id: p.id,
          title: p.title,
          slug: p.slug,
          content: '',
          excerpt: p.excerpt,
          coverImage: fileName ? buildFileUrl('blog_posts', p.id, fileName) : '',
          status: 'PUBLISHED' as const,
          authorId: '',
          authorName: p.author_name || '',
          publishedAt: p.published_at || '',
          created: p.created || '',
          updated: p.updated || '',
        };
      });
      return {
        posts,
        page: response.page || 1,
        totalPages: response.totalPages || 1,
        totalPosts: response.totalPosts || posts.length,
      };
    } catch (e: any) {
      console.error('[BlogService] Failed to fetch published posts:', e?.message || e);
      return { posts: [], page: 1, totalPages: 0, totalPosts: 0 };
    }
  },

  async getPostBySlug(slug: string): Promise<BlogPost | null> {
    if (!apiClient.pb) {
      console.warn('[BlogService] PocketBase not configured');
      return null;
    }
    try {
      // Sanitize slug to ensure clean URL path (lowercase, alphanumeric + hyphens only)
      const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '');
      const response = await apiClient.pb.send(`/api/openhr/blog/posts/${cleanSlug}`, { method: 'GET' });
      if (!response.success || !response.post) return null;
      const p = response.post;
      const fileName = extractFileName(p.cover_image || '');
      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        content: p.content || '',
        excerpt: p.excerpt || '',
        coverImage: fileName ? buildFileUrl('blog_posts', p.id, fileName) : '',
        status: 'PUBLISHED',
        authorId: '',
        authorName: p.author_name || '',
        publishedAt: p.published_at || '',
        created: p.created || '',
        updated: p.updated || '',
      };
    } catch (e: any) {
      console.error('[BlogService] Failed to fetch post by slug:', e?.message || e);
      return null;
    }
  },

  // =============================================
  // ADMIN METHODS (auth required, PB SDK)
  // =============================================

  async getAllPosts(): Promise<BlogPost[]> {
    if (!apiClient.pb) return [];
    try {
      const records = await apiClient.pb.collection('blog_posts').getFullList({ sort: '-created' });
      return records.map((r: any) => ({
        id: r.id,
        title: r.title || '',
        slug: r.slug || '',
        content: r.content || '',
        excerpt: r.excerpt || '',
        coverImage: r.cover_image ? apiClient.pb!.files.getURL(r, r.cover_image) : '',
        status: r.status || 'DRAFT',
        authorId: r.author_id || '',
        authorName: r.author_name || '',
        publishedAt: r.published_at || '',
        created: r.created || '',
        updated: r.updated || '',
      }));
    } catch (e: any) {
      console.error('[BlogService] Failed to fetch all posts:', e?.message || e);
      return [];
    }
  },

  async createPost(data: {
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    coverImage?: File | null;
    status: 'DRAFT' | 'PUBLISHED';
    authorName: string;
  }): Promise<{ success: boolean; message: string }> {
    if (!apiClient.pb) return { success: false, message: 'PocketBase not configured' };
    try {
      // Build plain record data
      const record: Record<string, any> = {
        title: data.title,
        slug: data.slug,
        content: data.content,
        excerpt: data.excerpt,
        status: data.status,
        author_name: data.authorName,
      };
      if (data.status === 'PUBLISHED') {
        record.published_at = new Date().toISOString();
      }

      // If there's a file, use FormData; otherwise use plain object
      if (data.coverImage) {
        const formData = new FormData();
        Object.entries(record).forEach(([key, val]) => {
          if (val !== undefined && val !== null) formData.append(key, val);
        });
        formData.append('cover_image', data.coverImage);
        await apiClient.pb.collection('blog_posts').create(formData);
      } else {
        await apiClient.pb.collection('blog_posts').create(record);
      }

      apiClient.notify();
      return { success: true, message: 'Blog post created successfully' };
    } catch (e: any) {
      console.error('[BlogService] Failed to create post:', e);
      // Extract PocketBase field validation errors if available
      const fieldErrors = e?.data?.data;
      if (fieldErrors) {
        const details = Object.entries(fieldErrors).map(([k, v]: [string, any]) => `${k}: ${v?.message || v}`).join(', ');
        return { success: false, message: `Validation error: ${details}` };
      }
      return { success: false, message: e?.message || 'Failed to create blog post' };
    }
  },

  async updatePost(id: string, data: {
    title?: string;
    slug?: string;
    content?: string;
    excerpt?: string;
    coverImage?: File | null;
    status?: 'DRAFT' | 'PUBLISHED';
    authorName?: string;
    publishedAt?: string;
  }): Promise<{ success: boolean; message: string }> {
    if (!apiClient.pb) return { success: false, message: 'PocketBase not configured' };
    try {
      // Build plain record data — only include fields that are defined
      const record: Record<string, any> = {};
      if (data.title !== undefined) record.title = data.title;
      if (data.slug !== undefined) record.slug = data.slug;
      if (data.content !== undefined) record.content = data.content;
      if (data.excerpt !== undefined) record.excerpt = data.excerpt;
      if (data.status !== undefined) record.status = data.status;
      if (data.authorName !== undefined) record.author_name = data.authorName;
      if (data.publishedAt !== undefined) record.published_at = data.publishedAt;

      // If there's a new file, use FormData; otherwise use plain object
      if (data.coverImage) {
        const formData = new FormData();
        Object.entries(record).forEach(([key, val]) => {
          if (val !== undefined && val !== null) formData.append(key, String(val));
        });
        formData.append('cover_image', data.coverImage);
        await apiClient.pb.collection('blog_posts').update(id, formData);
      } else {
        await apiClient.pb.collection('blog_posts').update(id, record);
      }

      apiClient.notify();
      return { success: true, message: 'Blog post updated successfully' };
    } catch (e: any) {
      console.error('[BlogService] Failed to update post:', e);
      // Extract PocketBase field validation errors if available
      const fieldErrors = e?.data?.data;
      if (fieldErrors) {
        const details = Object.entries(fieldErrors).map(([k, v]: [string, any]) => `${k}: ${v?.message || v}`).join(', ');
        return { success: false, message: `Validation error: ${details}` };
      }
      return { success: false, message: e?.message || 'Failed to update blog post' };
    }
  },

  async deletePost(id: string): Promise<{ success: boolean; message: string }> {
    if (!apiClient.pb) return { success: false, message: 'PocketBase not configured' };
    try {
      await apiClient.pb.collection('blog_posts').delete(id);
      apiClient.notify();
      return { success: true, message: 'Blog post deleted successfully' };
    } catch (e: any) {
      console.error('[BlogService] Failed to delete post:', e?.message || e);
      return { success: false, message: e?.message || 'Failed to delete blog post' };
    }
  },
};
