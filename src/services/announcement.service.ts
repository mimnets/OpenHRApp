
import { supabase, isSupabaseConfigured } from './supabase';
import { apiClient } from './api.client';
import { Announcement, AnnouncementPriority, Role } from '../types';
import { notificationService } from './notification.service';
import { employeeService } from './employee.service';
import { organizationService } from './organization.service';

export const announcementService = {
  async getAnnouncements(): Promise<Announcement[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const orgId = apiClient.getOrganizationId();
      let query = supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (orgId) query = query.eq('organization_id', orgId);
      const { data, error } = await query;
      if (error) throw error;
      console.log(`[AnnouncementService] Fetched ${data?.length ?? 0} announcements`);
      return (data ?? []).map(r => ({
        id: r.id,
        title: r.title || '',
        content: r.content || '',
        authorId: r.author_id ? r.author_id.toString().trim() : '',
        authorName: r.author_name || '',
        priority: (r.priority || 'NORMAL') as AnnouncementPriority,
        targetRoles: (r.target_roles || []) as Role[],
        expiresAt: r.expires_at || undefined,
        organizationId: r.organization_id,
        created: r.created_at,
        updated: r.updated_at,
      }));
    } catch (e: any) {
      console.error('[AnnouncementService] Failed to fetch announcements:', e?.message || e);
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
    if (!isSupabaseConfigured()) return;
    const orgId = apiClient.getOrganizationId();

    const { data: record, error } = await supabase
      .from('announcements')
      .insert({
        title: data.title,
        content: data.content,
        author_id: data.authorId.trim(),
        author_name: data.authorName,
        priority: data.priority,
        target_roles: data.targetRoles,
        expires_at: data.expiresAt || null,
        organization_id: orgId,
      })
      .select('id')
      .single();

    if (error) throw new Error('Failed to create announcement');
    apiClient.notify();

    // Notify target users (fire-and-forget)
    try {
      const orgConfig = await organizationService.getNotificationConfig();
      if (!orgConfig.enabledTypes.includes('ANNOUNCEMENT')) return;

      const employees = await employeeService.getEmployees();
      const targetUsers = employees.filter(emp => {
        if (emp.id === data.authorId) return false;
        if (data.targetRoles && data.targetRoles.length > 0) {
          return data.targetRoles.includes(emp.role as Role);
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
      console.error('[AnnouncementService] Failed to create notifications:', notifErr?.message || notifErr);
    }
  },

  async updateAnnouncement(id: string, data: {
    title?: string;
    content?: string;
    priority?: AnnouncementPriority;
    targetRoles?: Role[];
    expiresAt?: string | null;
  }): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const update: any = {};
    if (data.title !== undefined)       update.title = data.title;
    if (data.content !== undefined)     update.content = data.content;
    if (data.priority !== undefined)    update.priority = data.priority;
    if (data.targetRoles !== undefined) update.target_roles = data.targetRoles;
    if (data.expiresAt !== undefined)   update.expires_at = data.expiresAt;
    const { error } = await supabase.from('announcements').update(update).eq('id', id.trim());
    if (error) throw new Error('Failed to update announcement');
    apiClient.notify();
  },

  async deleteAnnouncement(id: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from('announcements').delete().eq('id', id.trim());
    if (error) throw new Error('Failed to delete announcement');
    apiClient.notify();
  },
};
