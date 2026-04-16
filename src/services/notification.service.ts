
import { apiClient } from './api.client';
import { AppNotification, NotificationType, NotificationPriority, UserNotificationPreferences } from '../types';
import { organizationService } from './organization.service';
import { DEFAULT_USER_NOTIFICATION_PREFS } from '../constants';

export const notificationService = {
  async getNotifications(): Promise<AppNotification[]> {
    if (!apiClient.pb || !apiClient.isConfigured()) {
      console.warn("[NotificationService] PocketBase not configured");
      return [];
    }
    try {
      const userId = apiClient.pb.authStore.model?.id;
      if (!userId) return [];

      const result = await apiClient.pb.collection('notifications').getList(1, 100, {
        sort: '-created',
        filter: `user_id = "${userId}"`,
      });
      const records = result.items;
      return records.map(r => ({
        id: r.id.toString().trim(),
        userId: r.user_id || '',
        type: (r.type || 'SYSTEM') as NotificationType,
        title: r.title || '',
        message: r.message || undefined,
        isRead: !!r.is_read,
        priority: (r.priority || 'NORMAL') as NotificationPriority,
        referenceId: r.reference_id || undefined,
        referenceType: r.reference_type || undefined,
        actionUrl: r.action_url || undefined,
        metadata: r.metadata || undefined,
        organizationId: r.organization_id,
        created: r.created,
        updated: r.updated,
      }));
    } catch (e: any) {
      console.error("[NotificationService] Failed to fetch notifications:", e?.message || e);
      return [];
    }
  },

  async getUnreadCount(): Promise<number> {
    if (!apiClient.pb || !apiClient.isConfigured()) return 0;
    try {
      const userId = apiClient.pb.authStore.model?.id;
      if (!userId) return 0;

      const result = await apiClient.pb.collection('notifications').getList(1, 1, {
        filter: `user_id = "${userId}" && is_read = false`,
      });
      return result.totalItems;
    } catch (e: any) {
      console.error("[NotificationService] Failed to get unread count:", e?.message || e);
      return 0;
    }
  },

  async markAsRead(id: string): Promise<void> {
    if (!apiClient.pb || !apiClient.isConfigured()) return;
    try {
      await apiClient.pb.collection('notifications').update(id.trim(), { is_read: true });
      apiClient.notify();
    } catch (err: any) {
      throw new Error('Failed to mark notification as read');
    }
  },

  async markAllAsRead(): Promise<void> {
    if (!apiClient.pb || !apiClient.isConfigured()) return;
    try {
      const userId = apiClient.pb.authStore.model?.id;
      if (!userId) return;

      const unread = await apiClient.pb.collection('notifications').getFullList({
        filter: `user_id = "${userId}" && is_read = false`,
      });

      await Promise.all(
        unread.map(r => apiClient.pb!.collection('notifications').update(r.id, { is_read: true }))
      );
      apiClient.notify();
    } catch (err: any) {
      console.error("[NotificationService] Failed to mark all as read:", err?.message || err);
    }
  },

  async createNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message?: string;
    priority?: NotificationPriority;
    referenceId?: string;
    referenceType?: string;
    actionUrl?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    if (!apiClient.pb || !apiClient.isConfigured()) return;
    const orgId = apiClient.getOrganizationId();

    const payload: any = {
      user_id: data.userId.trim(),
      type: data.type,
      title: data.title,
      message: data.message || null,
      is_read: false,
      priority: data.priority || 'NORMAL',
      reference_id: data.referenceId || null,
      reference_type: data.referenceType || null,
      action_url: data.actionUrl || null,
      metadata: data.metadata || null,
      organization_id: orgId,
    };

    try {
      await apiClient.pb.collection('notifications').create(payload);
    } catch (err: any) {
      console.error("[NotificationService] Failed to create notification:", err?.message || err);
    }
  },

  async createBulkNotifications(notifications: Array<{
    userId: string;
    type: NotificationType;
    title: string;
    message?: string;
    priority?: NotificationPriority;
    referenceId?: string;
    referenceType?: string;
    actionUrl?: string;
    metadata?: Record<string, any>;
  }>): Promise<void> {
    if (!apiClient.pb || !apiClient.isConfigured()) return;
    const orgId = apiClient.getOrganizationId();

    const promises = notifications.map(data => {
      const payload: any = {
        user_id: data.userId.trim(),
        type: data.type,
        title: data.title,
        message: data.message || null,
        is_read: false,
        priority: data.priority || 'NORMAL',
        reference_id: data.referenceId || null,
        reference_type: data.referenceType || null,
        action_url: data.actionUrl || null,
        metadata: data.metadata || null,
        organization_id: orgId,
      };
      return apiClient.pb!.collection('notifications').create(payload).catch(err => {
        console.error("[NotificationService] Failed to create bulk notification:", err?.message || err);
      });
    });

    await Promise.all(promises);
    apiClient.notify();
  },

  async getAllNotifications(): Promise<AppNotification[]> {
    if (!apiClient.pb || !apiClient.isConfigured()) return [];
    try {
      const result = await apiClient.pb.collection('notifications').getList(1, 200, {
        sort: '-created',
      });
      const records = result.items;
      return records.map(r => ({
        id: r.id.toString().trim(),
        userId: r.user_id || '',
        type: (r.type || 'SYSTEM') as NotificationType,
        title: r.title || '',
        message: r.message || undefined,
        isRead: !!r.is_read,
        priority: (r.priority || 'NORMAL') as NotificationPriority,
        referenceId: r.reference_id || undefined,
        referenceType: r.reference_type || undefined,
        actionUrl: r.action_url || undefined,
        metadata: r.metadata || undefined,
        organizationId: r.organization_id,
        created: r.created,
        updated: r.updated,
      }));
    } catch (e: any) {
      console.error("[NotificationService] Failed to fetch all notifications:", e?.message || e);
      return [];
    }
  },

  async deleteNotification(id: string): Promise<void> {
    if (!apiClient.pb || !apiClient.isConfigured()) return;
    try {
      await apiClient.pb.collection('notifications').delete(id);
      apiClient.notify();
    } catch (e: any) {
      console.error("[NotificationService] Failed to delete notification:", e?.message || e);
      throw new Error('Failed to delete notification');
    }
  },

  async deleteAllNotifications(): Promise<number> {
    if (!apiClient.pb || !apiClient.isConfigured()) return 0;
    try {
      const records = await apiClient.pb.collection('notifications').getFullList({
        fields: 'id',
      });

      let deleted = 0;
      for (const r of records) {
        try {
          await apiClient.pb.collection('notifications').delete(r.id);
          deleted++;
        } catch (e: any) {
          console.error("[NotificationService] Failed to delete notification", r.id, ":", e?.message || e);
        }
      }

      console.log(`[NotificationService] Deleted ${deleted}/${records.length} notifications`);
      apiClient.notify();
      return deleted;
    } catch (e: any) {
      console.error("[NotificationService] Failed to delete all notifications:", e?.message || e);
      throw new Error('Failed to delete all notifications');
    }
  },

  async getUserPreferences(): Promise<UserNotificationPreferences> {
    const userId = apiClient.pb?.authStore.model?.id;
    if (!userId) return DEFAULT_USER_NOTIFICATION_PREFS;
    return organizationService.getSetting(`notification_prefs_${userId}`, DEFAULT_USER_NOTIFICATION_PREFS);
  },

  async setUserPreferences(prefs: UserNotificationPreferences): Promise<void> {
    const userId = apiClient.pb?.authStore.model?.id;
    if (!userId) return;
    await organizationService.setSetting(`notification_prefs_${userId}`, prefs);
    apiClient.notify();
  },
};
