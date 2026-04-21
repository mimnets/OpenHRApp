
import React, { useState, useEffect } from 'react';
import { Bell, Mail, Moon, Save, Loader2 } from 'lucide-react';
import { OrgNotificationConfig, NotificationType, EmailDigestFrequency } from '../../types';
import { useToast } from '../../context/ToastContext';

interface Props {
  config: OrgNotificationConfig;
  onSave: (config: OrgNotificationConfig) => Promise<void>;
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

export const OrgNotifications: React.FC<Props> = ({ config, onSave }) => {
  const { showToast } = useToast();
  const [localConfig, setLocalConfig] = useState<OrgNotificationConfig>(config);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalConfig(config);
    setHasChanges(false);
  }, [config]);

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
      showToast('Failed to save notification config.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 min-w-0">
                <label className="text-[10px] font-semibold text-slate-400 uppercase px-1">Start Time</label>
                <input
                  type="time"
                  value={localConfig.quietHoursStart}
                  onChange={e => updateConfig({ quietHoursStart: e.target.value })}
                  className="w-full min-w-0 px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>
              <div className="space-y-1 min-w-0">
                <label className="text-[10px] font-semibold text-slate-400 uppercase px-1">End Time</label>
                <input
                  type="time"
                  value={localConfig.quietHoursEnd}
                  onChange={e => updateConfig({ quietHoursEnd: e.target.value })}
                  className="w-full min-w-0 px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-4 focus:ring-primary/10 transition-all"
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
    </div>
  );
};
