import React, { useState, useEffect } from 'react';
import { Loader2, Bell, Clock, AlertTriangle, CheckCircle2, RefreshCw, Mail, MailOpen, Zap } from 'lucide-react';
import { apiClient } from '../../services/api.client';

interface NotificationStats {
  totalNotifications: number;
  readNotifications: number;
  unreadNotifications: number;
  retentionDays: number;
  lastCleanup: {
    lastRun: string;
    recordsCleaned: number;
    errors: number;
    cutoffDate: string;
  } | null;
}

interface NotificationRetentionProps {
  onMessage: (msg: { type: 'success' | 'error'; text: string }) => void;
}

const RETENTION_OPTIONS = [
  { value: 7, label: '7 days', description: 'Aggressive - Minimal retention' },
  { value: 14, label: '14 days', description: 'Short - Low retention' },
  { value: 30, label: '30 days', description: 'Standard - Recommended' },
  { value: 60, label: '60 days', description: 'Extended - Moderate retention' },
  { value: 90, label: '90 days', description: 'Long - Higher retention' },
];

const NotificationRetention: React.FC<NotificationRetentionProps> = ({ onMessage }) => {
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [retentionDays, setRetentionDays] = useState(30);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      // Get retention setting
      let currentRetention = 30;
      try {
        const setting = await apiClient.pb?.collection('settings').getFirstListItem(
          'key = "notification_retention_days"',
          { requestKey: 'get_notif_retention' }
        );
        if (setting?.value) {
          currentRetention = parseInt(setting.value as string) || 30;
        }
      } catch (e) {
        // Not found, use default
      }
      setRetentionDays(currentRetention);

      // Get cleanup log
      let lastCleanup = null;
      try {
        const logSetting = await apiClient.pb?.collection('settings').getFirstListItem(
          'key = "notification_cleanup_log"',
          { requestKey: 'get_notif_cleanup_log' }
        );
        if (logSetting?.value) {
          lastCleanup = logSetting.value as NotificationStats['lastCleanup'];
        }
      } catch (e) {
        // Not found
      }

      // Get platform-wide notification counts via custom endpoint (bypasses API rules)
      let totalNotifications = 0;
      let readNotifications = 0;
      let unreadNotifications = 0;
      try {
        const response = await apiClient.pb?.send('/api/openhr/notification-stats', { method: 'GET' });
        if (response) {
          totalNotifications = response.total || 0;
          readNotifications = response.read || 0;
          unreadNotifications = response.unread || 0;
        }
      } catch (e) {
        console.log('[NotificationRetention] Error fetching notification stats:', e);
      }

      setStats({
        totalNotifications,
        readNotifications,
        unreadNotifications,
        retentionDays: currentRetention,
        lastCleanup
      });
    } catch (e) {
      console.error('[NotificationRetention] Load error:', e);
      onMessage({ type: 'error', text: 'Failed to load notification statistics' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRetention = async () => {
    setIsSaving(true);
    try {
      let existingSetting = null;
      try {
        existingSetting = await apiClient.pb?.collection('settings').getFirstListItem(
          'key = "notification_retention_days"',
          { requestKey: 'find_notif_retention' }
        );
      } catch (e) {
        // Not found
      }

      let systemOrgId = apiClient.pb?.authStore.model?.organization_id;
      if (!systemOrgId) {
        try {
          const sysOrg = await apiClient.pb?.collection('organizations').getFirstListItem(
            'name = "__SYSTEM__"',
            { requestKey: 'get_system_org_notif' }
          );
          systemOrgId = sysOrg?.id;
        } catch (e) {
          const newOrg = await apiClient.pb?.collection('organizations').create({
            name: '__SYSTEM__',
            subscription_status: 'ACTIVE'
          });
          systemOrgId = newOrg?.id;
        }
      }

      if (existingSetting) {
        await apiClient.pb?.collection('settings').update(existingSetting.id, {
          value: retentionDays.toString()
        });
      } else {
        await apiClient.pb?.collection('settings').create({
          key: 'notification_retention_days',
          value: retentionDays.toString(),
          organization_id: systemOrgId
        });
      }

      onMessage({ type: 'success', text: `Notification retention updated to ${retentionDays} days` });
      await loadStats();
    } catch (e: any) {
      console.error('[NotificationRetention] Save error:', e);
      onMessage({ type: 'error', text: 'Failed to save retention setting' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePurgeAll = async () => {
    if (!confirm('Are you sure you want to DELETE ALL notifications?\n\nThis will permanently remove every notification for ALL users across ALL organizations.\n\nThis action cannot be undone.')) {
      return;
    }

    setIsPurging(true);
    try {
      const response = await apiClient.pb?.send('/api/openhr/purge-all-notifications', { method: 'POST' });
      const deleted = response?.deleted || 0;
      const errors = response?.errors || 0;

      onMessage({
        type: errors > 0 ? 'error' : 'success',
        text: `Purge complete! Deleted ${deleted} notifications${errors > 0 ? `, ${errors} errors` : ''}`
      });
      await loadStats();
    } catch (e: any) {
      console.error('[NotificationRetention] Purge error:', e);
      onMessage({ type: 'error', text: 'Failed to purge notifications: ' + (e.message || 'Unknown error') });
    } finally {
      setIsPurging(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Notification Retention</h3>
          <p className="text-sm text-slate-500 mt-1">Manage notification retention to keep the database clean</p>
        </div>
        <button
          onClick={loadStats}
          disabled={isLoading}
          className="p-2 hover:bg-slate-100 rounded-xl transition-all"
        >
          <RefreshCw size={20} className={`text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Bell size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">{stats?.totalNotifications || 0}</p>
              <p className="text-xs text-slate-500 font-medium">Total</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <MailOpen size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">{stats?.readNotifications || 0}</p>
              <p className="text-xs text-slate-500 font-medium">Read</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-xl">
              <Mail size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">{stats?.unreadNotifications || 0}</p>
              <p className="text-xs text-slate-500 font-medium">Unread</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 rounded-xl">
              <Clock size={20} className="text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">{stats?.retentionDays || 30} days</p>
              <p className="text-xs text-slate-500 font-medium">Retention</p>
            </div>
          </div>
        </div>
      </div>

      {/* Purge All Section */}
      <div className="bg-red-50 rounded-2xl border border-red-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-red-900">Purge All Notifications</h4>
            <p className="text-sm text-red-700 mt-1">
              Permanently delete every notification for all users across all organizations.
            </p>
          </div>
          <button
            onClick={handlePurgeAll}
            disabled={isPurging || (stats?.totalNotifications || 0) === 0}
            className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPurging ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
            Purge All ({stats?.totalNotifications || 0})
          </button>
        </div>
      </div>

      {/* Last Cleanup Info */}
      {stats?.lastCleanup && (
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <div className="flex items-center gap-2 text-slate-600 mb-2">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <span className="font-bold text-sm">Last Automatic Cleanup</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-400 text-xs">Run Time</p>
              <p className="font-medium text-slate-700">
                {new Date(stats.lastCleanup.lastRun).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Notifications Deleted</p>
              <p className="font-medium text-slate-700">{stats.lastCleanup.recordsCleaned}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Errors</p>
              <p className={`font-medium ${stats.lastCleanup.errors > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {stats.lastCleanup.errors}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Cutoff Date</p>
              <p className="font-medium text-slate-700">{stats.lastCleanup.cutoffDate}</p>
            </div>
          </div>
        </div>
      )}

      {/* Retention Settings */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h4 className="font-bold text-slate-900 mb-4">Notification Retention Policy</h4>
        <p className="text-sm text-slate-500 mb-4">
          Notifications older than the retention period will be automatically deleted daily at 3 AM server time.
          This applies to all notifications across all organizations.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
          {RETENTION_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => setRetentionDays(option.value)}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                retentionDays === option.value
                  ? 'border-primary bg-primary-light/30'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <p className={`font-bold ${retentionDays === option.value ? 'text-primary' : 'text-slate-900'}`}>
                {option.label}
              </p>
              <p className="text-xs text-slate-500 mt-1">{option.description}</p>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleSaveRetention}
            disabled={isSaving || retentionDays === stats?.retentionDays}
            className="px-6 py-3 bg-primary text-white rounded-xl font-bold flex items-center gap-2 hover:bg-primary-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
            Save Retention Policy
          </button>
        </div>

        {/* Warning */}
        <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800 text-sm">Important Notes</p>
            <ul className="text-xs text-amber-700 mt-1 space-y-1">
              <li>- Deleted notifications cannot be recovered</li>
              <li>- Automatic cleanup runs daily at 3:00 AM server time</li>
              <li>- Both read and unread notifications will be deleted after the retention period</li>
              <li>- This affects notifications across all organizations on the platform</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationRetention;
