
import { apiClient } from './api.client';
import { BlogPost } from '../types';
import { convertFileToWebP } from '../utils/imageConvert';
import { getReadingMinutes } from '../utils/readingTime';
import { supabase, isSupabaseConfigured, getSupabaseStorageUrl } from './supabase';

export const blogService = {
  async getPublishedPosts(page: number = 1, limit: number = 10): Promise<{
    posts: BlogPost[];
    page: number;
    totalPages: number;
    totalPosts: number;
  }> {
    if (!isSupabaseConfigured()) {
      return { posts: [], page: 1, totalPages: 0, totalPosts: 0 };
    }
    try {
      const { data, count, error } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact' })
        .eq('status', 'PUBLISHED')
        .order('published_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;

      const posts: BlogPost[] = (data || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        content: '',
        excerpt: r.excerpt || '',
        coverImage: r.cover_image ? getSupabaseStorageUrl('content-images', r.cover_image) : '',
        status: 'PUBLISHED' as const,
        authorId: '',
        authorName: r.author_name || '',
        publishedAt: r.published_at || '',
        created: r.created || '',
        updated: r.updated || '',
        readingTime: r.reading_time ?? 1,
      }));

      const totalPosts = count ?? posts.length;
      return {
        posts,
        page,
        totalPages: Math.ceil(totalPosts / limit),
        totalPosts,
      };
    } catch (e: any) {
      console.error('[BlogService] Failed to fetch published posts:', e?.message || e);
      return { posts: [], page: 1, totalPages: 0, totalPosts: 0 };
    }
  },

  async getPostBySlug(slug: string): Promise<BlogPost | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '');
      const { data, error } = await supabase
        .from('blog_posts')
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
        authorId: '',
        authorName: r.author_name || '',
        publishedAt: r.published_at || '',
        created: r.created || '',
        updated: r.updated || '',
        readingTime: r.reading_time ?? 1,
      };
    } catch (e: any) {
      console.error('[BlogService] Failed to fetch post by slug:', e?.message || e);
      return null;
    }
  },

  async getAllPosts(): Promise<BlogPost[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
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
        authorId: '',
        authorName: r.author_name || '',
        publishedAt: r.published_at || '',
        created: r.created || '',
        updated: r.updated || '',
        readingTime: r.reading_time ?? 1,
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
    if (!isSupabaseConfigured()) return { success: false, message: 'Supabase not configured' };
    try {
      let coverPath: string | null = null;

      if (data.coverImage) {
        const webpCover = await convertFileToWebP(data.coverImage, 0.8, 1920);
        const path = `blog-covers/${Date.now()}.webp`;
        const { error: uploadError } = await supabase.storage
          .from('content-images')
          .upload(path, webpCover, { contentType: 'image/webp', upsert: true });
        if (uploadError) {
          console.error('[BlogService] Cover image upload failed:', uploadError);
          throw uploadError;
        }
        coverPath = path;
      }

      const record: Record<string, any> = {
        title: data.title,
        slug: data.slug,
        content: data.content,
        excerpt: data.excerpt,
        status: data.status,
        author_name: data.authorName,
        reading_time: getReadingMinutes(data.content),
      };
      if (coverPath) record.cover_image = coverPath;
      if (data.status === 'PUBLISHED') record.published_at = new Date().toISOString();

      const { error } = await supabase.from('blog_posts').insert(record);
      if (error) {
        console.error('[BlogService] Insert failed:', error);
        throw error;
      }

      apiClient.notify();
      return { success: true, message: 'Blog post created successfully' };
    } catch (e: any) {
      console.error('[BlogService] createPost error:', e?.message || e);
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
    publishedAt?: string | null;
  }): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured()) return { success: false, message: 'Supabase not configured' };
    try {
      const record: Record<string, any> = {};
      if (data.title !== undefined) record.title = data.title;
      if (data.slug !== undefined) record.slug = data.slug;
      if (data.content !== undefined) {
        record.content = data.content;
        record.reading_time = getReadingMinutes(data.content);
      }
      if (data.excerpt !== undefined) record.excerpt = data.excerpt;
      if (data.status !== undefined) record.status = data.status;
      if (data.authorName !== undefined) record.author_name = data.authorName;
      if (data.publishedAt !== undefined) {
        // null → clear the timestamp (unpublish); string → set it
        record.published_at = data.publishedAt;
      }

      if (data.coverImage) {
        const webpCover = await convertFileToWebP(data.coverImage, 0.8, 1920);
        const path = `blog-covers/${Date.now()}.webp`;
        const { error: uploadError } = await supabase.storage
          .from('content-images')
          .upload(path, webpCover, { contentType: 'image/webp', upsert: true });
        if (uploadError) {
          console.error('[BlogService] Cover image upload failed:', uploadError);
          throw uploadError;
        }
        record.cover_image = path;
      }

      const { error } = await supabase.from('blog_posts').update(record).eq('id', id);
      if (error) {
        console.error('[BlogService] Update failed:', error);
        throw error;
      }

      apiClient.notify();
      return { success: true, message: 'Blog post updated successfully' };
    } catch (e: any) {
      console.error('[BlogService] updatePost error:', e?.message || e);
      return { success: false, message: e?.message || 'Failed to update blog post' };
    }
  },

  async deletePost(id: string): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured()) return { success: false, message: 'Supabase not configured' };
    try {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) throw error;
      apiClient.notify();
      return { success: true, message: 'Blog post deleted successfully' };
    } catch (e: any) {
      console.error('[BlogService] Failed to delete post:', e?.message || e);
      return { success: false, message: e?.message || 'Failed to delete blog post' };
    }
  },
};
