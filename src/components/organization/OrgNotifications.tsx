
import React, { useState, useEffect } from 'react';
import { Bell, Mail, Moon, Save, Loader2, Send, Trash2, Search } from 'lucide-react';
import { OrgNotificationConfig, NotificationType, EmailDigestFrequency, AppNotification } from '../../types';
import { hrService } from '../../services/hrService';
import AdminNotificationFormModal from '../notifications/AdminNotificationFormModal';

interface Employee {
  id: string;
  name: string;
  department: string;
  role?: string;
}

interface Props {
  config: OrgNotificationConfig;
  onSave: (config: OrgNotificationConfig) => Promise<void>;
  employees?: Employee[];
}

const NOTIFICATION_TYPE_LABELS: Record<NotificationType, { label: string; description: string }> = {
  ANNOUNCEMENT: { label: 'Announcements', description: 'Noticeboard and company-wide announcements' },
  LEAVE: { label: 'Leave Requests', description: 'Leave submissions, approvals, and rejections' },
  ATTENDANCE: { label: 'Attendance', description: 'Check-in reminders, late alerts, missed check-outs' },
  REVIEW: { label: 'Performance Reviews', description: 'Review cycle updates and assessment notifications' },
  SYSTEM: { label: 'System', description: 'System alerts, maintenance, and admin notifications' },
};

const DIGEST_OPTIONS: { value: EmailDigestFrequency; label: string }[] = [
  { value: 'IMMEDIATE', label: 'Immediate' },
  { value: 'DAILY', label: 'Daily Digest' },
  { value: 'WEEKLY', label: 'Weekly Digest' },
  { value: 'OFF', label: 'Off' },
];

export const OrgNotifications: React.FC<Props> = ({ config, onSave, employees = [] }) => {
  const [localConfig, setLocalConfig] = useState<OrgNotificationConfig>(config);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Notification management state
  const [allNotifications, setAllNotifications] = useState<AppNotification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [notifSearch, setNotifSearch] = useState('');
  const [notifTypeFilter, setNotifTypeFilter] = useState<string>('ALL');

  useEffect(() => {
    setLocalConfig(config);
    setHasChanges(false);
  }, [config]);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setIsLoadingNotifications(true);
    try {
      const notifs = await hrService.getAllNotifications();
      setAllNotifications(notifs.slice(0, 100));
    } catch {
      console.error('Failed to load notifications');
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  const updateConfig = (updates: Partial<OrgNotificationConfig>) => {
    setLocalConfig(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const toggleType = (type: NotificationType) => {
    const enabled = localConfig.enabledTypes.includes(type);
    const next = enabled
      ? localConfig.enabledTypes.filter(t => t !== type)
      : [...localConfig.enabledTypes, type];
    updateConfig({ enabledTypes: next });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(localConfig);
      setHasChanges(false);
    } catch {
      alert('Failed to save notification config.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    if (!confirm('Delete this notification?')) return;
    try {
      await hrService.deleteNotification(id);
      setAllNotifications(prev => prev.filter(n => n.id !== id));
    } catch {
      alert('Failed to delete notification.');
    }
  };

  const filteredNotifications = allNotifications.filter(n => {
    const matchesSearch = !notifSearch ||
      n.title.toLowerCase().includes(notifSearch.toLowerCase()) ||
      (n.message || '').toLowerCase().includes(notifSearch.toLowerCase());
    const matchesType = notifTypeFilter === 'ALL' || n.type === notifTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Section 1: Enabled Notification Types */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <Bell size={18} className="text-primary" />
          <div>
            <h3 className="text-sm font-bold text-slate-800">Enabled Notification Types</h3>
            <p className="text-[10px] text-slate-400 font-medium">Control which notification types are active for your organization</p>
          </div>
        </div>
        <div className="p-6 space-y-3">
          {(Object.keys(NOTIFICATION_TYPE_LABELS) as NotificationType[]).map(type => {
            const { label, description } = NOTIFICATION_TYPE_LABELS[type];
            const isEnabled = localConfig.enabledTypes.includes(type);
            return (
              <label key={type} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${isEnabled ? 'bg-primary/5 border-primary/20' : 'bg-slate-50 border-slate-100'}`}>
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() => toggleType(type)}
                  className="w-4 h-4 accent-primary rounded"
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-700">{label}</p>
                  <p className="text-[10px] text-slate-400">{description}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Section 2: Email Digest */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <Mail size={18} className="text-primary" />
          <div>
            <h3 className="text-sm font-bold text-slate-800">Email Digest Frequency</h3>
            <p className="text-[10px] text-slate-400 font-medium">Default email digest frequency for all users</p>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {DIGEST_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateConfig({ emailDigestFrequency: opt.value })}
                className={`py-3 px-4 rounded-xl text-xs font-semibold border transition-all ${localConfig.emailDigestFrequency === opt.value ? 'bg-primary text-white border-primary shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-slate-200'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section 3: Quiet Hours */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <Moon size={18} className="text-primary" />
          <div>
            <h3 className="text-sm font-bold text-slate-800">Quiet Hours</h3>
            <p className="text-[10px] text-slate-400 font-medium">Suppress notifications during specified hours</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer">
            <input
              type="checkbox"
              checked={localConfig.quietHoursEnabled}
              onChange={e => updateConfig({ quietHoursEnabled: e.target.checked })}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm font-semibold text-slate-700">Enable Quiet Hours</span>
          </label>

          {localConfig.quietHoursEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase px-1">Start Time</label>
                <input
                  type="time"
                  value={localConfig.quietHoursStart}
                  onChange={e => updateConfig({ quietHoursStart: e.target.value })}
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase px-1">End Time</label>
                <input
                  type="time"
                  value={localConfig.quietHoursEnd}
                  onChange={e => updateConfig({ quietHoursEnd: e.target.value })}
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-8 py-3.5 bg-primary text-white rounded-xl font-semibold text-sm shadow-lg hover:bg-primary-hover transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Notification Settings
          </button>
        </div>
      )}

      {/* Section 4: Notification Management */}
      {employees.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Send size={18} className="text-primary" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Notification Management</h3>
                <p className="text-[10px] text-slate-400 font-medium">Send and manage notifications for your organization</p>
              </div>
            </div>
            <button
              onClick={() => setShowSendModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary rounded-xl hover:opacity-90 transition-colors"
            >
              <Send size={14} /> Send Notification
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Search & Filter */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={notifSearch}
                  onChange={e => setNotifSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <select
                value={notifTypeFilter}
                onChange={e => setNotifTypeFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="ALL">All Types</option>
                {(Object.keys(NOTIFICATION_TYPE_LABELS) as NotificationType[]).map(type => (
                  <option key={type} value={type}>{NOTIFICATION_TYPE_LABELS[type].label}</option>
                ))}
              </select>
            </div>

            {/* Notification List */}
            {isLoadingNotifications ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-slate-400" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-400">No notifications found.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredNotifications.map(notif => (
                  <div key={notif.id} className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          notif.type === 'ANNOUNCEMENT' ? 'bg-blue-100 text-blue-700' :
                          notif.type === 'LEAVE' ? 'bg-green-100 text-green-700' :
                          notif.type === 'ATTENDANCE' ? 'bg-orange-100 text-orange-700' :
                          notif.type === 'REVIEW' ? 'bg-purple-100 text-purple-700' :
                          'bg-slate-200 text-slate-600'
                        }`}>{notif.type}</span>
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
                      onClick={() => handleDeleteNotification(notif.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
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
      )}

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
