
import { apiClient } from './api.client';
import { Announcement, AnnouncementPriority, Role } from '../types';
import { notificationService } from './notification.service';
import { employeeService } from './employee.service';
import { organizationService } from './organization.service';

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
      const record = await apiClient.pb.collection('announcements').create(payload);
      apiClient.notify();

      // Generate notifications for target users (if ANNOUNCEMENT type is enabled)
      try {
        const orgConfig = await organizationService.getNotificationConfig();
        if (!orgConfig.enabledTypes.includes('ANNOUNCEMENT')) {
          return; // Org has disabled announcement notifications
        }

        const employees = await employeeService.getEmployees();
        const targetUsers = employees.filter(emp => {
          // Exclude the author
          if (emp.id === data.authorId) return false;
          // Filter by target roles (empty = all users)
          if (data.targetRoles && data.targetRoles.length > 0) {
            return data.targetRoles.includes(emp.role);
          }
          return true;
        });

        if (targetUsers.length > 0) {
          await notificationService.createBulkNotifications(
            targetUsers.map(emp => ({
              userId: emp.id,
              type: 'ANNOUNCEMENT' as const,
              title: data.title,
              message: data.content.length > 200 ? data.content.substring(0, 200) + '...' : data.content,
              priority: data.priority,
              referenceId: record.id,
              referenceType: 'announcements',
              actionUrl: 'announcements',
            }))
          );
        }
      } catch (notifErr: any) {
        console.error("[AnnouncementService] Failed to create notifications:", notifErr?.message || notifErr);
      }
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
