import React, { useState, useEffect } from 'react';
import { Loader2, HardDrive, Trash2, Clock, AlertTriangle, CheckCircle2, RefreshCw, Camera } from 'lucide-react';
import { apiClient } from '../../services/api.client';

interface StorageStats {
  totalAttendanceRecords: number;
  recordsWithSelfies: number;
  estimatedStorageMB: number;
  retentionDays: number;
  lastCleanup: {
    lastRun: string;
    recordsCleaned: number;
    errors: number;
    cutoffDate: string;
  } | null;
}

interface StorageManagementProps {
  onMessage: (msg: { type: 'success' | 'error'; text: string }) => void;
}

const RETENTION_OPTIONS = [
  { value: 7, label: '7 days', description: 'Aggressive - Minimal storage' },
  { value: 14, label: '14 days', description: 'Short - Low storage' },
  { value: 30, label: '30 days', description: 'Standard - Recommended' },
  { value: 60, label: '60 days', description: 'Extended - Moderate storage' },
  { value: 90, label: '90 days', description: 'Long - Higher storage' },
];

const StorageManagement: React.FC<StorageManagementProps> = ({ onMessage }) => {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunningCleanup, setIsRunningCleanup] = useState(false);
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
          'key = "selfie_retention_days"',
          { requestKey: 'get_retention' }
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
          'key = "selfie_cleanup_log"',
          { requestKey: 'get_cleanup_log' }
        );
        if (logSetting?.value) {
          lastCleanup = logSetting.value as StorageStats['lastCleanup'];
        }
      } catch (e) {
        // Not found
      }

      // Count attendance records with selfies
      let totalRecords = 0;
      let recordsWithSelfies = 0;
      try {
        const allRecords = await apiClient.pb?.collection('attendance').getList(1, 1, {
          requestKey: 'count_all'
        });
        totalRecords = allRecords?.totalItems || 0;

        const selfieRecords = await apiClient.pb?.collection('attendance').getList(1, 1, {
          filter: 'selfie_in != "" || selfie_out != ""',
          requestKey: 'count_selfies'
        });
        recordsWithSelfies = selfieRecords?.totalItems || 0;
      } catch (e) {
        console.log('[Storage] Error counting records:', e);
      }

      // Estimate storage (average 150KB per selfie, 2 selfies per record)
      const estimatedStorageMB = Math.round((recordsWithSelfies * 2 * 150) / 1024);

      setStats({
        totalAttendanceRecords: totalRecords,
        recordsWithSelfies,
        estimatedStorageMB,
        retentionDays: currentRetention,
        lastCleanup
      });
    } catch (e) {
      console.error('[Storage] Load error:', e);
      onMessage({ type: 'error', text: 'Failed to load storage statistics' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRetention = async () => {
    setIsSaving(true);
    try {
      // Find or create the retention setting
      let existingSetting = null;
      try {
        existingSetting = await apiClient.pb?.collection('settings').getFirstListItem(
          'key = "selfie_retention_days"',
          { requestKey: 'find_retention' }
        );
      } catch (e) {
        // Not found
      }

      // Get system org for storing global settings
      let systemOrgId = apiClient.pb?.authStore.model?.organization_id;
      if (!systemOrgId) {
        try {
          const sysOrg = await apiClient.pb?.collection('organizations').getFirstListItem(
            'name = "__SYSTEM__"',
            { requestKey: 'get_system_org' }
          );
          systemOrgId = sysOrg?.id;
        } catch (e) {
          // Create system org
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
          key: 'selfie_retention_days',
          value: retentionDays.toString(),
          organization_id: systemOrgId
        });
      }

      onMessage({ type: 'success', text: `Retention period updated to ${retentionDays} days` });
      await loadStats();
    } catch (e: any) {
      console.error('[Storage] Save error:', e);
      onMessage({ type: 'error', text: 'Failed to save retention setting' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualCleanup = async () => {
    if (!confirm(`This will permanently delete all selfie images older than ${retentionDays} days.\n\nThis action cannot be undone. Continue?`)) {
      return;
    }

    setIsRunningCleanup(true);
    try {
      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      const cutoffStr = cutoffDate.toISOString().split('T')[0];

      // Fetch records with selfies older than retention period
      let cleaned = 0;
      let errors = 0;
      const BATCH_SIZE = 100;

      const records = await apiClient.pb?.collection('attendance').getFullList({
        filter: `date < "${cutoffStr}" && (selfie_in != "" || selfie_out != "")`,
        sort: '-date',
        requestKey: 'cleanup_fetch'
      });

      if (records && records.length > 0) {
        for (const record of records) {
          try {
            await apiClient.pb?.collection('attendance').update(record.id, {
              selfie_in: '',
              selfie_out: ''
            });
            cleaned++;
          } catch (e) {
            errors++;
          }
        }
      }

      onMessage({
        type: 'success',
        text: `Cleanup complete! Cleaned ${cleaned} records${errors > 0 ? `, ${errors} errors` : ''}`
      });
      await loadStats();
    } catch (e: any) {
      console.error('[Storage] Cleanup error:', e);
      onMessage({ type: 'error', text: 'Failed to run cleanup: ' + (e.message || 'Unknown error') });
    } finally {
      setIsRunningCleanup(false);
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
          <h3 className="text-xl font-bold text-slate-900">Storage Management</h3>
          <p className="text-sm text-slate-500 mt-1">Manage attendance selfie retention to optimize storage</p>
        </div>
        <button
          onClick={loadStats}
          disabled={isLoading}
          className="p-2 hover:bg-slate-100 rounded-xl transition-all"
        >
          <RefreshCw size={20} className={`text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Storage Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <HardDrive size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{stats?.totalAttendanceRecords || 0}</p>
              <p className="text-xs text-slate-500 font-medium">Total Records</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 rounded-xl">
              <Camera size={20} className="text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{stats?.recordsWithSelfies || 0}</p>
              <p className="text-xs text-slate-500 font-medium">With Selfies</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-xl">
              <HardDrive size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">~{stats?.estimatedStorageMB || 0} MB</p>
              <p className="text-xs text-slate-500 font-medium">Est. Storage</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <Clock size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{stats?.retentionDays || 30} days</p>
              <p className="text-xs text-slate-500 font-medium">Retention</p>
            </div>
          </div>
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
              <p className="text-slate-400 text-xs">Records Cleaned</p>
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
        <h4 className="font-bold text-slate-900 mb-4">Selfie Retention Policy</h4>
        <p className="text-sm text-slate-500 mb-4">
          Selfies older than the retention period will be automatically deleted daily at 2 AM server time.
          Attendance records will be preserved, only the selfie images are removed.
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

          <button
            onClick={handleManualCleanup}
            disabled={isRunningCleanup}
            className="px-6 py-3 bg-red-50 text-red-700 rounded-xl font-bold flex items-center gap-2 hover:bg-red-100 transition-all disabled:opacity-50"
          >
            {isRunningCleanup ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
            Run Cleanup Now
          </button>
        </div>

        {/* Warning */}
        <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800 text-sm">Important Notes</p>
            <ul className="text-xs text-amber-700 mt-1 space-y-1">
              <li>- Deleted selfies cannot be recovered</li>
              <li>- Automatic cleanup runs daily at 2:00 AM server time</li>
              <li>- Consider local labor laws before setting retention period</li>
              <li>- Storage estimates are approximate (~150KB per selfie)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageManagement;
