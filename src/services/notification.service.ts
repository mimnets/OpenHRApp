
import { supabase, isSupabaseConfigured } from './supabase';
import { apiClient } from './api.client';
import { AppNotification, NotificationType, NotificationPriority, UserNotificationPreferences } from '../types';
import { organizationService } from './organization.service';
import { DEFAULT_USER_NOTIFICATION_PREFS } from '../constants';

async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

const mapNotification = (r: any): AppNotification => ({
  id: r.id,
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
});

export const notificationService = {
  async getNotifications(): Promise<AppNotification[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const userId = await getCurrentUserId();
      if (!userId) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []).map(mapNotification);
    } catch (e: any) {
      console.error('[NotificationService] Failed to fetch notifications:', e?.message || e);
      return [];
    }
  },

  async getUnreadCount(): Promise<number> {
    if (!isSupabaseConfigured()) return 0;
    try {
      const userId = await getCurrentUserId();
      if (!userId) return 0;
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      if (error) throw error;
      return count ?? 0;
    } catch (e: any) {
      console.error('[NotificationService] Failed to get unread count:', e?.message || e);
      return 0;
    }
  },

  async markAsRead(id: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id.trim());
    if (error) throw new Error('Failed to mark notification as read');
    apiClient.notify();
  },

  async markAllAsRead(): Promise<void> {
    if (!isSupabaseConfigured()) return;
    try {
      const userId = await getCurrentUserId();
      if (!userId) return;
      const orgId = apiClient.getOrganizationId();
      let query = supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      if (orgId) query = query.eq('organization_id', orgId);
      const { error } = await query;
      if (error) throw error;
      apiClient.notify();
    } catch (err: any) {
      console.error('[NotificationService] Failed to mark all as read:', err?.message || err);
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
    if (!isSupabaseConfigured()) return;
    const orgId = apiClient.getOrganizationId();
    const { error } = await supabase.from('notifications').insert({
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
    });
    if (error) console.error('[NotificationService] Failed to create notification:', error.message);
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
    if (!isSupabaseConfigured() || notifications.length === 0) return;
    const orgId = apiClient.getOrganizationId();
    const rows = notifications.map(data => ({
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
    }));
    const { error } = await supabase.from('notifications').insert(rows);
    if (error) console.error('[NotificationService] Failed to create bulk notifications:', error.message);
    else apiClient.notify();
  },

  async getAllNotifications(): Promise<AppNotification[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []).map(mapNotification);
    } catch (e: any) {
      console.error('[NotificationService] Failed to fetch all notifications:', e?.message || e);
      return [];
    }
  },

  async deleteNotification(id: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) throw new Error('Failed to delete notification');
    apiClient.notify();
  },

  async deleteAllNotifications(): Promise<number> {
    if (!isSupabaseConfigured()) return 0;
    try {
      const userId = await getCurrentUserId();
      if (!userId) return 0;
      // Count first, then delete
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);
      if (error) throw error;
      const deleted = count ?? 0;
      console.log(`[NotificationService] Deleted ${deleted} notifications`);
      apiClient.notify();
      return deleted;
    } catch (e: any) {
      console.error('[NotificationService] Failed to delete all notifications:', e?.message || e);
      throw new Error('Failed to delete all notifications');
    }
  },

  async getUserPreferences(): Promise<UserNotificationPreferences> {
    const userId = await getCurrentUserId();
    if (!userId) return DEFAULT_USER_NOTIFICATION_PREFS;
    return organizationService.getSetting(`notification_prefs_${userId}`, DEFAULT_USER_NOTIFICATION_PREFS);
  },

  async setUserPreferences(prefs: UserNotificationPreferences): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) return;
    await organizationService.setSetting(`notification_prefs_${userId}`, prefs);
    apiClient.notify();
  },
};
