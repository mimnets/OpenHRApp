
import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Send, Trash2, Search, Loader2 } from 'lucide-react';
import { hrService } from '../services/hrService';
import { AppNotification, NotificationType } from '../types';
import AdminNotificationFormModal from '../components/notifications/AdminNotificationFormModal';
import HelpButton from '../components/onboarding/HelpButton';

interface Employee {
  id: string;
  name: string;
  department: string;
  role?: string;
}

interface Props {
  user: any;
}

const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  ANNOUNCEMENT: 'Announcements',
  LEAVE: 'Leave Requests',
  ATTENDANCE: 'Attendance',
  REVIEW: 'Performance Reviews',
  SYSTEM: 'System',
};

const TYPE_COLORS: Record<string, string> = {
  ANNOUNCEMENT: 'bg-blue-100 text-blue-700',
  LEAVE: 'bg-green-100 text-green-700',
  ATTENDANCE: 'bg-orange-100 text-orange-700',
  REVIEW: 'bg-purple-100 text-purple-700',
  SYSTEM: 'bg-slate-200 text-slate-600',
};

const AdminNotifications: React.FC<Props> = (_props) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const loadNotifications = useCallback(async () => {
    try {
      const notifs = await hrService.getAllNotifications();
      setNotifications(notifs.slice(0, 100));
    } catch {
      console.error('Failed to load notifications');
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    try {
      const emps = await hrService.getEmployees();
      setEmployees(emps.map((e: any) => ({ id: e.id, name: e.name, department: e.department || '', role: e.role })));
    } catch {
      console.error('Failed to load employees');
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([loadNotifications(), loadEmployees()]);
      setIsLoading(false);
    };
    init();
  }, [loadNotifications, loadEmployees]);

  // Subscribe for real-time updates
  useEffect(() => {
    const unsub = hrService.subscribe(() => {
      loadNotifications();
    });
    return () => { unsub(); };
  }, [loadNotifications]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this notification?')) return;
    try {
      await hrService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch {
      alert('Failed to delete notification.');
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Are you sure you want to delete ALL notifications?\n\nThis will permanently remove all notifications (read and unread) for the entire organization.\n\nThis action cannot be undone.')) return;
    setIsDeletingAll(true);
    try {
      const deleted = await hrService.deleteAllNotifications();
      setNotifications([]);
      alert(`Successfully deleted ${deleted} notifications.`);
    } catch {
      alert('Failed to delete all notifications.');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const filtered = notifications.filter(n => {
    const matchesSearch = !search ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      (n.message || '').toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'ALL' || n.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <Bell size={24} className="text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2"><h1 className="text-2xl font-bold text-slate-900">Notifications</h1><HelpButton helpPointId="notifications.admin" size={16} /></div>
            <p className="text-xs text-slate-400 font-medium">Send and manage notifications for your organization</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDeleteAll}
            disabled={isDeletingAll || notifications.length === 0}
            className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-red-700 bg-red-50 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeletingAll ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Delete All
          </button>
          <button
            onClick={() => setShowSendModal(true)}
            className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-primary rounded-xl hover:opacity-90 transition-colors shadow-sm"
          >
            <Send size={16} /> Send Notification
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="ALL">All Types</option>
            {(Object.keys(NOTIFICATION_TYPE_LABELS) as NotificationType[]).map(type => (
              <option key={type} value={type}>{NOTIFICATION_TYPE_LABELS[type]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Notification List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">
            All Notifications {!isLoading && <span className="text-slate-400 font-medium">({filtered.length})</span>}
          </h3>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Bell size={32} className="mx-auto text-slate-200 mb-3" />
              <p className="text-sm text-slate-400">No notifications found.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filtered.map(notif => (
                <div key={notif.id} className="flex items-center justify-between bg-slate-50 rounded-xl p-3 hover:bg-slate-100 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${TYPE_COLORS[notif.type] || TYPE_COLORS.SYSTEM}`}>
                        {notif.type}
                      </span>
                      {notif.priority === 'URGENT' && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-700">URGENT</span>
                      )}
                      <p className="font-medium text-sm text-slate-900 truncate">{notif.title}</p>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      To: {notif.userId?.slice(0, 8)}... | {notif.created ? new Date(notif.created).toLocaleDateString() : '—'}
                      {notif.isRead && ' | Read'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(notif.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    title="Delete notification"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Send Notification Modal */}
      {showSendModal && (
        <AdminNotificationFormModal
          employees={employees}
          onClose={() => setShowSendModal(false)}
          onSent={() => { setShowSendModal(false); loadNotifications(); }}
        />
      )}
    </div>
  );
};

export default AdminNotifications;
