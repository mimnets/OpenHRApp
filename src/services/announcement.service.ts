
import { apiClient } from './api.client';
import { Announcement, AnnouncementPriority, Role } from '../types';

export const announcementService = {
  async getAnnouncements(): Promise<Announcement[]> {
    if (!apiClient.pb || !apiClient.isConfigured()) {
      console.warn("[AnnouncementService] PocketBase not configured");
      return [];
    }
    try {
      const records = await apiClient.pb.collection('announcements').getFullList({ sort: '-created' });
      console.log(`[AnnouncementService] Fetched ${records.length} announcements`);
      return records.map(r => ({
        id: r.id.toString().trim(),
        title: r.title || '',
        content: r.content || '',
        authorId: r.author_id ? r.author_id.toString().trim() : '',
        authorName: r.author_name || '',
        priority: (r.priority || 'NORMAL') as AnnouncementPriority,
        targetRoles: (r.target_roles || []) as Role[],
        expiresAt: r.expires_at || undefined,
        organizationId: r.organization_id,
        created: r.created,
        updated: r.updated,
      }));
    } catch (e: any) {
      console.error("[AnnouncementService] Failed to fetch announcements:", e?.message || e);
      return [];
    }
  },

  async createAnnouncement(data: {
    title: string;
    content: string;
    authorId: string;
    authorName: string;
    priority: AnnouncementPriority;
    targetRoles: Role[];
    expiresAt?: string;
  }): Promise<void> {
    if (!apiClient.pb || !apiClient.isConfigured()) return;
    const orgId = apiClient.getOrganizationId();

    const payload: any = {
      title: data.title,
      content: data.content,
      author_id: data.authorId.trim(),
      author_name: data.authorName,
      priority: data.priority,
      target_roles: data.targetRoles,
      expires_at: data.expiresAt || null,
      organization_id: orgId,
    };

    try {
      await apiClient.pb.collection('announcements').create(payload);
      apiClient.notify();
    } catch (err: any) {
      if (err.response?.id) { apiClient.notify(); return; }
      throw new Error('Failed to create announcement');
    }
  },

  async updateAnnouncement(id: string, data: {
    title?: string;
    content?: string;
    priority?: AnnouncementPriority;
    targetRoles?: Role[];
    expiresAt?: string | null;
  }): Promise<void> {
    if (!apiClient.pb || !apiClient.isConfigured()) return;

    const update: any = {};
    if (data.title !== undefined) update.title = data.title;
    if (data.content !== undefined) update.content = data.content;
    if (data.priority !== undefined) update.priority = data.priority;
    if (data.targetRoles !== undefined) update.target_roles = data.targetRoles;
    if (data.expiresAt !== undefined) update.expires_at = data.expiresAt;

    try {
      await apiClient.pb.collection('announcements').update(id.trim(), update);
      apiClient.notify();
    } catch (err: any) {
      throw new Error('Failed to update announcement');
    }
  },

  async deleteAnnouncement(id: string): Promise<void> {
    if (!apiClient.pb || !apiClient.isConfigured()) return;
    try {
      await apiClient.pb.collection('announcements').delete(id.trim());
      apiClient.notify();
    } catch (err: any) {
      throw new Error('Failed to delete announcement');
    }
  },
};
