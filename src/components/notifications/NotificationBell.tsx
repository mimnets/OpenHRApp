
import React, { useState, useRef, useEffect } from 'react';
import { Bell, Megaphone, CalendarDays, Clock, ClipboardCheck, Info, CheckCheck } from 'lucide-react';
import { useNotifications } from '../../hooks/notifications/useNotifications';
import { AppNotification, NotificationType } from '../../types';

interface NotificationBellProps {
  onNavigate: (path: string) => void;
}

const typeIcons: Record<NotificationType, React.ReactNode> = {
  ANNOUNCEMENT: <Megaphone size={16} className="text-blue-500" />,
  LEAVE: <CalendarDays size={16} className="text-green-500" />,
  ATTENDANCE: <Clock size={16} className="text-amber-500" />,
  REVIEW: <ClipboardCheck size={16} className="text-purple-500" />,
  SYSTEM: <Info size={16} className="text-slate-500" />,
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigate }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const handleNotificationClick = async (notification: AppNotification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    if (notification.actionUrl) {
      onNavigate(notification.actionUrl);
    }
    setIsOpen(false);
  };

  const displayNotifications = notifications.slice(0, 10);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 rounded-xl text-slate-500 hover:text-primary hover:bg-slate-100 transition-all relative"
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold px-1 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="font-semibold text-sm text-slate-800">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {displayNotifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                No notifications
              </div>
            ) : (
              displayNotifications.map(notification => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${
                    notification.priority === 'URGENT' ? 'bg-rose-50/50' : ''
                  }`}
                >
                  {/* Type Icon */}
                  <div className="mt-0.5 shrink-0">
                    {typeIcons[notification.type]}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug truncate ${!notification.isRead ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                      {notification.title}
                    </p>
                    {notification.message && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{notification.message}</p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1">{timeAgo(notification.created)}</p>
                  </div>

                  {/* Unread dot */}
                  {!notification.isRead && (
                    <div className="mt-1.5 shrink-0">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    </div>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-4 py-2.5">
            <button
              onClick={() => { onNavigate('announcements'); setIsOpen(false); }}
              className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
            >
              View All Announcements
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
