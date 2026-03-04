
import { useState, useEffect, useCallback, useMemo } from 'react';
import { hrService } from '../../services/hrService';
import { AppNotification } from '../../types';

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  useEffect(() => {
    setIsLoading(true);
    fetchNotifications();
  }, [fetchNotifications]);

  // Subscribe for reactive updates
  useEffect(() => {
    const unsub = hrService.subscribe(() => {
      fetchNotifications();
    });
    return unsub;
  }, [fetchNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.isRead).length,
    [notifications]
  );

  const markAsRead = useCallback(async (id: string) => {
    await hrService.markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  }, []);

  const markAllAsRead = useCallback(async () => {
    await hrService.markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  return { notifications, unreadCount, isLoading, markAsRead, markAllAsRead };
}
