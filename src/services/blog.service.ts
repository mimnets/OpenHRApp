
import { apiClient } from './api.client';
import { BlogPost } from '../types';

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
      const posts: BlogPost[] = (response.posts || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        content: '',
        excerpt: p.excerpt,
        coverImage: p.cover_image || '',
        status: 'PUBLISHED' as const,
        authorId: '',
        authorName: p.author_name || '',
        publishedAt: p.published_at || '',
        created: p.created || '',
        updated: p.updated || '',
      }));
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
      const response = await apiClient.pb.send(`/api/openhr/blog/posts/${encodeURIComponent(slug)}`, { method: 'GET' });
      if (!response.success || !response.post) return null;
      const p = response.post;
      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        content: p.content || '',
        excerpt: p.excerpt || '',
        coverImage: p.cover_image || '',
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
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('slug', data.slug);
      formData.append('content', data.content);
      formData.append('excerpt', data.excerpt);
      formData.append('status', data.status);
      formData.append('author_name', data.authorName);
      if (data.status === 'PUBLISHED') {
        formData.append('published_at', new Date().toISOString());
      }
      if (data.coverImage) {
        formData.append('cover_image', data.coverImage);
      }
      await apiClient.pb.collection('blog_posts').create(formData);
      apiClient.notify();
      return { success: true, message: 'Blog post created successfully' };
    } catch (e: any) {
      console.error('[BlogService] Failed to create post:', e?.message || e);
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
      const formData = new FormData();
      if (data.title !== undefined) formData.append('title', data.title);
      if (data.slug !== undefined) formData.append('slug', data.slug);
      if (data.content !== undefined) formData.append('content', data.content);
      if (data.excerpt !== undefined) formData.append('excerpt', data.excerpt);
      if (data.status !== undefined) formData.append('status', data.status);
      if (data.authorName !== undefined) formData.append('author_name', data.authorName);
      if (data.publishedAt !== undefined) formData.append('published_at', data.publishedAt);
      if (data.coverImage) {
        formData.append('cover_image', data.coverImage);
      }
      await apiClient.pb.collection('blog_posts').update(id, formData);
      apiClient.notify();
      return { success: true, message: 'Blog post updated successfully' };
    } catch (e: any) {
      console.error('[BlogService] Failed to update post:', e?.message || e);
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
