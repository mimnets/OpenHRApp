import React, { useState, useEffect, useCallback } from 'react';
import { Send, Users, Globe, Building2, UserCheck, User as UserIcon, Bell, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { pushBroadcastService, type BroadcastTargetType, type BroadcastHistoryRow } from '../../services/pushBroadcast.service';
import { superAdminService } from '../../services/superadmin.service';
import { Organization } from '../../types';

interface PushBroadcastProps {
  onMessage: (msg: { type: 'success' | 'error'; text: string } | null) => void;
}

const ROLE_OPTIONS = ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] as const;

const PushBroadcast: React.FC<PushBroadcastProps> = ({ onMessage }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [targetType, setTargetType] = useState<BroadcastTargetType>('ALL');
  const [targetOrgId, setTargetOrgId] = useState('');
  const [targetRole, setTargetRole] = useState<typeof ROLE_OPTIONS[number]>('EMPLOYEE');
  const [targetUserId, setTargetUserId] = useState('');

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [history, setHistory] = useState<BroadcastHistoryRow[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    superAdminService.getAllOrganizations().then(setOrganizations).catch(() => undefined);
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const rows = await pushBroadcastService.listBroadcasts(20);
    setHistory(rows);
  };

  const currentTargetValue = useCallback((): string | undefined => {
    if (targetType === 'ORG') return targetOrgId || undefined;
    if (targetType === 'ROLE') return targetRole;
    if (targetType === 'USER') return targetUserId || undefined;
    return undefined;
  }, [targetType, targetOrgId, targetRole, targetUserId]);

  const refreshRecipientCount = useCallback(async () => {
    if ((targetType === 'ORG' && !targetOrgId) || (targetType === 'USER' && !targetUserId)) {
      setRecipientCount(null);
      return;
    }
    setIsPreviewLoading(true);
    try {
      const count = await pushBroadcastService.previewRecipientCount(targetType, currentTargetValue());
      setRecipientCount(count);
    } finally {
      setIsPreviewLoading(false);
    }
  }, [targetType, targetOrgId, targetUserId, currentTargetValue]);

  useEffect(() => {
    refreshRecipientCount();
  }, [refreshRecipientCount]);

  const titleCount = title.length;
  const bodyCount = body.length;
  const canSend = title.trim().length > 0 && body.trim().length > 0 && titleCount <= 100 && bodyCount <= 300
    && (targetType !== 'ORG' || !!targetOrgId)
    && (targetType !== 'USER' || !!targetUserId);

  const handleSendClick = () => {
    if (!canSend) return;
    setConfirmOpen(true);
  };

  const handleConfirmSend = async () => {
    setConfirmOpen(false);
    setIsSending(true);
    onMessage(null);

    const result = await pushBroadcastService.sendBroadcast({
      title: title.trim(),
      body: body.trim(),
      url: url.trim() || undefined,
      targetType,
      targetValue: currentTargetValue(),
    });

    setIsSending(false);

    if (result.success) {
      onMessage({
        type: 'success',
        text: `Broadcast sent. ${result.deliveredCount ?? 0}/${result.recipientCount ?? 0} delivered. ${result.staleCleaned ?? 0} stale cleaned.`,
      });
      setTitle('');
      setBody('');
      setUrl('');
      await loadHistory();
      await refreshRecipientCount();
    } else {
      onMessage({ type: 'error', text: result.message || 'Failed to send broadcast' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary-light rounded-xl">
            <Bell size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Push Broadcast</h2>
            <p className="text-sm text-slate-500">Send a push notification to subscribed users.</p>
          </div>
        </div>

        {/* Target selector */}
        <div className="space-y-2 mb-6">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setTargetType('ALL')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                targetType === 'ALL' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Globe size={16} /> All platform
            </button>
            <button
              type="button"
              onClick={() => setTargetType('ORG')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                targetType === 'ORG' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Building2 size={16} /> Organization
            </button>
            <button
              type="button"
              onClick={() => setTargetType('ROLE')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                targetType === 'ROLE' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <UserCheck size={16} /> Role
            </button>
            <button
              type="button"
              onClick={() => setTargetType('USER')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                targetType === 'USER' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <UserIcon size={16} /> Single user
            </button>
          </div>

          {targetType === 'ORG' && (
            <select
              value={targetOrgId}
              onChange={(e) => setTargetOrgId(e.target.value)}
              className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-primary-light outline-none"
            >
              <option value="">— Select organization —</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>{o.name} ({o.userCount ?? 0} users)</option>
              ))}
            </select>
          )}

          {targetType === 'ROLE' && (
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value as typeof ROLE_OPTIONS[number])}
              className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-primary-light outline-none"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          )}

          {targetType === 'USER' && (
            <input
              type="text"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value.trim())}
              placeholder="Paste user UUID (auth.users.id)"
              className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-primary-light outline-none font-mono text-sm"
            />
          )}

          {/* Recipient preview */}
          <div className="mt-3 flex items-center gap-2 text-sm">
            <Users size={16} className="text-slate-400" />
            {isPreviewLoading ? (
              <span className="text-slate-400">Counting recipients…</span>
            ) : recipientCount === null ? (
              <span className="text-slate-400">Select target to count recipients</span>
            ) : (
              <span className="font-bold text-slate-700">{recipientCount} active push subscription{recipientCount === 1 ? '' : 's'}</span>
            )}
            <button
              type="button"
              onClick={refreshRecipientCount}
              className="ml-auto p-1.5 hover:bg-slate-100 rounded-lg transition"
              title="Refresh count"
            >
              <RefreshCw size={14} className={`text-slate-500 ${isPreviewLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Message fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Title</label>
              <span className={`text-xs ${titleCount > 100 ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
                {titleCount}/100
              </span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., 📢 Scheduled maintenance tonight"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-primary-light outline-none"
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Body</label>
              <span className={`text-xs ${bodyCount > 300 ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
                {bodyCount}/300
              </span>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Notification body text…"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-primary-light outline-none resize-none"
              maxLength={350}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Click URL (optional)</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="/dashboard or /announcements"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-primary-light outline-none font-mono text-sm"
            />
            <p className="text-xs text-slate-400">Defaults to /dashboard if blank.</p>
          </div>
        </div>

        {/* Preview card */}
        {(title || body) && (
          <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Preview</p>
            <div className="flex items-start gap-3 p-3 bg-white rounded-xl shadow-sm border border-slate-100">
              <div className="w-10 h-10 bg-primary-light rounded-lg flex items-center justify-center shrink-0">
                <Bell size={18} className="text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-900 truncate">{title || 'Title here'}</p>
                <p className="text-sm text-slate-600 line-clamp-2">{body || 'Body text here'}</p>
                <p className="text-xs text-slate-400 mt-1">OpenHRApp · now</p>
              </div>
            </div>
          </div>
        )}

        {/* Send */}
        <div className="mt-6 pt-6 border-t border-slate-100 flex justify-end">
          <button
            onClick={handleSendClick}
            disabled={!canSend || isSending}
            className="px-6 py-3 bg-primary text-white rounded-xl font-bold flex items-center gap-2 hover:bg-primary-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
            {isSending ? 'Sending…' : 'Send broadcast'}
          </button>
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Recent broadcasts</h3>
          <button onClick={loadHistory} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
            <RefreshCw size={18} className="text-slate-500" />
          </button>
        </div>

        {history.length === 0 ? (
          <p className="text-center py-12 text-slate-400">No broadcasts yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((row) => (
              <div key={row.id} className="p-4 border border-slate-100 rounded-2xl">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 truncate">{row.title}</p>
                    <p className="text-sm text-slate-600 line-clamp-2">{row.body}</p>
                  </div>
                  <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold whitespace-nowrap">
                    {row.target_type}{row.target_value ? `: ${row.target_value.slice(0, 8)}` : ''}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span><strong className="text-emerald-600">{row.delivered_count}</strong> delivered</span>
                  <span>/ {row.recipient_count} recipients</span>
                  {row.failed_count > 0 && <span className="text-red-600"><strong>{row.failed_count}</strong> failed</span>}
                  {row.stale_cleaned > 0 && <span>{row.stale_cleaned} stale cleaned</span>}
                  <span className="ml-auto">
                    {row.sent_by_name ? `by ${row.sent_by_name} · ` : ''}
                    {new Date(row.created).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-xl">
                <AlertTriangle size={20} className="text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Confirm broadcast</h3>
            </div>
            <p className="text-sm text-slate-600 mb-2">
              Sending push to <strong>{recipientCount ?? '?'}</strong> subscription{recipientCount === 1 ? '' : 's'}.
            </p>
            {targetType === 'ALL' && (
              <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-xl mb-2">
                <strong>Cross-tenant:</strong> this reaches every organization on the platform.
              </p>
            )}
            <div className="bg-slate-50 rounded-xl p-3 mb-4 border border-slate-200">
              <p className="font-bold text-slate-900 text-sm truncate">{title}</p>
              <p className="text-xs text-slate-600 line-clamp-3">{body}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSend}
                className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} /> Send now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PushBroadcast;
