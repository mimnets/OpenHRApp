
import { useState, useEffect, useCallback, useMemo } from 'react';
import { hrService } from '../../services/hrService';
import { supabase } from '../../services/supabase';
import { AppNotification, UserNotificationPreferences } from '../../types';
import { DEFAULT_USER_NOTIFICATION_PREFS } from '../../constants';

const mapRealtimeRecord = (r: any): AppNotification => ({
  id: r.id,
  userId: r.user_id || '',
  type: r.type || 'SYSTEM',
  title: r.title || '',
  message: r.message || undefined,
  isRead: !!r.is_read,
  priority: r.priority || 'NORMAL',
  referenceId: r.reference_id || undefined,
  referenceType: r.reference_type || undefined,
  actionUrl: r.action_url || undefined,
  metadata: r.metadata || undefined,
  organizationId: r.organization_id,
  created: r.created,
  updated: r.updated,
});

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userPreferences, setUserPreferences] = useState<UserNotificationPreferences>(DEFAULT_USER_NOTIFICATION_PREFS);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await hrService.getNotifications();
      setNotifications(data);
    } catch (e) {
      console.error('[useNotifications] Fetch failed', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPreferences = useCallback(async () => {
    try {
      const prefs = await hrService.getUserNotificationPreferences();
      setUserPreferences(prefs);
    } catch (e) {
      console.error('[useNotifications] Prefs fetch failed', e);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchNotifications();
    fetchPreferences();
  }, [fetchNotifications, fetchPreferences]);

  // Subscribe for reactive updates via local event bus
  useEffect(() => {
    const unsub = hrService.subscribe(() => {
      fetchNotifications();
    });
    return unsub;
  }, [fetchNotifications]);

  // Supabase real-time subscription — picks up server-created notifications
  // (e.g. from edge functions) without needing a page refresh.
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function setupRealtime() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('notifications-realtime')
        .on(
          'postgres_changes' as any,
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload: any) => {
            const record = payload.new;
            setNotifications(prev => {
              // Avoid duplicates (race with initial fetch)
              if (prev.some(n => n.id === record.id)) return prev;
              return [mapRealtimeRecord(record), ...prev];
            });
          },
        )
        .on(
          'postgres_changes' as any,
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload: any) => {
            const record = payload.new;
            setNotifications(prev =>
              prev.map(n => (n.id === record.id ? mapRealtimeRecord(record) : n)),
            );
          },
        )
        .subscribe();
    }

    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel as any).catch(() => {});
      }
    };
  }, []);

  // Filter out muted types
  const filteredNotifications = useMemo(
    () => notifications.filter(n => !userPreferences.mutedTypes.includes(n.type)),
    [notifications, userPreferences.mutedTypes]
  );

  const unreadCount = useMemo(
    () => filteredNotifications.filter(n => !n.isRead).length,
    [filteredNotifications]
  );

  const markAsRead = useCallback(async (id: string) => {
    await hrService.markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  }, []);

  const markAllAsRead = useCallback(async () => {
    await hrService.markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  const updatePreferences = useCallback(async (prefs: UserNotificationPreferences) => {
    await hrService.setUserNotificationPreferences(prefs);
    setUserPreferences(prefs);
  }, []);

  return { notifications: filteredNotifications, unreadCount, isLoading, markAsRead, markAllAsRead, userPreferences, updatePreferences };
}
