
import { useState, useEffect, useCallback, useMemo } from 'react';
import { hrService } from '../../services/hrService';
import { AppNotification, UserNotificationPreferences } from '../../types';
import { DEFAULT_USER_NOTIFICATION_PREFS } from '../../constants';

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

  // Subscribe for reactive updates
  useEffect(() => {
    const unsub = hrService.subscribe(() => {
      fetchNotifications();
    });
    return unsub;
  }, [fetchNotifications]);

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
