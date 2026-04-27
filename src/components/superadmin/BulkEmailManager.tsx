import React, { useEffect, useMemo, useState } from 'react';
import {
  Mail, Send, Eye, Users, Building2, AlertTriangle, CheckCircle2, XCircle,
  Clock, RefreshCw, History, Pencil, X, Loader2, Info,
} from 'lucide-react';
import RichTextEditor from '../blog/RichTextEditor';
import {
  superAdminService,
  type BulkEmailFilter,
  type BulkCampaignSummary,
  type BulkCampaignDetailRow,
} from '../../services/superadmin.service';
import { Organization, SubscriptionStatus } from '../../types';

interface BulkEmailManagerProps {
  onMessage: (msg: { type: 'success' | 'error'; text: string }) => void;
}

type Audience = 'ALL_ADMINS' | 'ALL_USERS' | 'ORG' | 'BY_SUBSCRIPTION';
type RolesScope = 'ALL' | 'ADMINS';
type View = 'compose' | 'history';

const SUBSCRIPTION_OPTIONS: SubscriptionStatus[] = ['TRIAL', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'AD_SUPPORTED'];

const BulkEmailManager: React.FC<BulkEmailManagerProps> = ({ onMessage }) => {
  const [view, setView] = useState<View>('compose');

  // Compose state
  const [audience, setAudience] = useState<Audience>('ALL_ADMINS');
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [orgRolesScope, setOrgRolesScope] = useState<RolesScope>('ALL');
  const [subStatuses, setSubStatuses] = useState<SubscriptionStatus[]>(['TRIAL']);
  const [subRolesScope, setSubRolesScope] = useState<RolesScope>('ADMINS');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [preview, setPreview] = useState<{ count: number; sampleEmails: string[] } | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // History state
  const [campaigns, setCampaigns] = useState<BulkCampaignSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [detailCampaign, setDetailCampaign] = useState<BulkCampaignSummary | null>(null);
  const [detailRows, setDetailRows] = useState<BulkCampaignDetailRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setOrgsLoading(true);
    superAdminService.getAllOrganizations().then(o => {
      if (alive) setOrgs(o);
      setOrgsLoading(false);
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (view === 'history') loadHistory();
  }, [view]);

  // Reset preview whenever audience inputs change
  useEffect(() => {
    setPreview(null);
  }, [audience, selectedOrgId, orgRolesScope, subStatuses, subRolesScope]);

  const buildFilter = (): BulkEmailFilter | null => {
    if (audience === 'ALL_ADMINS') return { kind: 'ALL_ADMINS' };
    if (audience === 'ALL_USERS') return { kind: 'ALL_USERS' };
    if (audience === 'ORG') {
      if (!selectedOrgId) return null;
      return { kind: 'ORG', organizationId: selectedOrgId, rolesScope: orgRolesScope };
    }
    if (audience === 'BY_SUBSCRIPTION') {
      if (subStatuses.length === 0) return null;
      return { kind: 'BY_SUBSCRIPTION', statuses: subStatuses, rolesScope: subRolesScope };
    }
    return null;
  };

  const audienceLabel = useMemo(() => {
    if (audience === 'ALL_ADMINS') return 'All organization admins (ADMIN + HR roles)';
    if (audience === 'ALL_USERS') return 'All verified users (excluding Super Admins)';
    if (audience === 'ORG') {
      const o = orgs.find(x => x.id === selectedOrgId);
      const role = orgRolesScope === 'ADMINS' ? 'admins (ADMIN + HR)' : 'users';
      return o ? `${role} of ${o.name}` : 'Specific organization';
    }
    if (audience === 'BY_SUBSCRIPTION') {
      const role = subRolesScope === 'ADMINS' ? 'admins (ADMIN + HR)' : 'users';
      return `${role} in orgs with status: ${subStatuses.join(', ') || '—'}`;
    }
    return '';
  }, [audience, orgs, selectedOrgId, orgRolesScope, subStatuses, subRolesScope]);

  const handlePreview = async () => {
    const filter = buildFilter();
    if (!filter) {
      onMessage({ type: 'error', text: 'Please complete the audience selection first' });
      return;
    }
    setPreviewing(true);
    try {
      const result = await superAdminService.previewBulkRecipients(filter);
      setPreview(result);
      if (result.count === 0) {
        onMessage({ type: 'error', text: 'No verified recipients matched this audience' });
      }
    } catch {
      onMessage({ type: 'error', text: 'Preview failed. Check console for details.' });
    } finally {
      setPreviewing(false);
    }
  };

  const handleSend = async () => {
    const filter = buildFilter();
    if (!filter) return;
    setSending(true);
    try {
      const result = await superAdminService.sendBulkEmail(filter, subject, body);
      if (result.success) {
        onMessage({ type: 'success', text: result.message });
        setSubject('');
        setBody('');
        setPreview(null);
      } else {
        onMessage({ type: 'error', text: result.message });
      }
    } catch (err) {
      console.error('[BulkEmail] sendBulkEmail failed:', err);
      onMessage({ type: 'error', text: 'Send failed. Check console for details.' });
    } finally {
      setSending(false);
      setConfirmOpen(false);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const list = await superAdminService.getRecentBulkCampaigns(30);
      setCampaigns(list);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openDetail = async (c: BulkCampaignSummary) => {
    setDetailCampaign(c);
    setDetailLoading(true);
    try {
      const rows = await superAdminService.getBulkCampaignDetail(c.campaignId);
      setDetailRows(rows);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailCampaign(null);
    setDetailRows([]);
  };

  const toggleSubStatus = (s: SubscriptionStatus) => {
    setSubStatuses(prev => (prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]));
  };

  const canSend =
    !!preview && preview.count > 0 && subject.trim().length > 0 && body.trim().length > 0 && !sending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Mail size={22} className="text-primary" />
            Bulk Email
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Broadcast announcements, alerts, or warnings to organization admins or users across the platform.
          </p>
        </div>
        <div className="flex gap-2 self-start">
          <button
            onClick={() => setView('compose')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
              view === 'compose' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Pencil size={16} /> Compose
          </button>
          <button
            onClick={() => setView('history')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
              view === 'history' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <History size={16} /> History
          </button>
        </div>
      </div>

      {view === 'compose' && (
        <div className="space-y-6">
          {/* Audience selector */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-2 text-slate-900">
              <Users size={18} />
              <h4 className="font-bold">Audience</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                { v: 'ALL_ADMINS', label: 'All org admins', desc: 'Every ADMIN across all organizations' },
                { v: 'ALL_USERS', label: 'All users', desc: 'Every verified user (excluding Super Admins)' },
                { v: 'ORG', label: 'Specific organization', desc: 'Pick one org and target its admins or users' },
                { v: 'BY_SUBSCRIPTION', label: 'By subscription status', desc: 'Target orgs in TRIAL / EXPIRED / etc.' },
              ] as Array<{ v: Audience; label: string; desc: string }>).map(opt => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setAudience(opt.v)}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    audience === opt.v
                      ? 'border-primary bg-primary/5'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="font-bold text-slate-900 text-sm">{opt.label}</div>
                  <div className="text-xs text-slate-500 mt-1">{opt.desc}</div>
                </button>
              ))}
            </div>

            {audience === 'ORG' && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Organization</label>
                  <select
                    value={selectedOrgId}
                    onChange={e => setSelectedOrgId(e.target.value)}
                    disabled={orgsLoading}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                  >
                    <option value="">{orgsLoading ? 'Loading…' : 'Select an organization'}</option>
                    {orgs.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.name} {o.userCount ? `(${o.userCount} users)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <ScopeRadio value={orgRolesScope} onChange={setOrgRolesScope} />
              </div>
            )}

            {audience === 'BY_SUBSCRIPTION' && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2">Subscription statuses</label>
                  <div className="flex flex-wrap gap-2">
                    {SUBSCRIPTION_OPTIONS.map(s => {
                      const active = subStatuses.includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleSubStatus(s)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                            active
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <ScopeRadio value={subRolesScope} onChange={setSubRolesScope} />
              </div>
            )}

            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 text-amber-800 text-xs">
              <Info size={14} className="mt-0.5 shrink-0" />
              <span>
                We only email <b>verified</b>, non-Super-Admin users. The recipient list is de-duplicated by email.
              </span>
            </div>
          </div>

          {/* Compose card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-2 text-slate-900">
              <Pencil size={18} />
              <h4 className="font-bold">Message</h4>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value.slice(0, 200))}
                placeholder="e.g. Important: scheduled maintenance this weekend"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
              />
              <p className="text-[10px] text-slate-400 mt-1">{subject.length}/200</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Body</label>
              <RichTextEditor
                value={body}
                onChange={setBody}
                placeholder="Write your announcement, warning, or alert here. Formatting and links are supported."
              />
            </div>
          </div>

          {/* Preview + send */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-2 text-slate-900">
              <Eye size={18} />
              <h4 className="font-bold">Recipients preview</h4>
            </div>
            <p className="text-sm text-slate-500">
              Audience: <span className="font-medium text-slate-700">{audienceLabel}</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handlePreview}
                disabled={previewing}
                className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-200 transition-all disabled:opacity-60"
              >
                {previewing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                {previewing ? 'Counting…' : 'Preview recipients'}
              </button>
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={!canSend}
                className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} /> Send to {preview?.count ?? '—'} recipients
              </button>
            </div>

            {preview && (
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">{preview.count}</span>
                  <span className="text-sm text-slate-500">verified recipient{preview.count === 1 ? '' : 's'}</span>
                </div>
                {preview.sampleEmails.length > 0 && (
                  <div className="mt-2 text-xs text-slate-500">
                    Sample: {preview.sampleEmails.join(', ')}
                    {preview.count > preview.sampleEmails.length && ` …and ${preview.count - preview.sampleEmails.length} more`}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <History size={18} /> Recent campaigns
            </h4>
            <button
              onClick={loadHistory}
              disabled={historyLoading}
              className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold flex items-center gap-1 hover:bg-slate-200"
            >
              {historyLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh
            </button>
          </div>

          {historyLoading ? (
            <div className="text-center py-8 text-slate-400 text-sm">Loading…</div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No bulk campaigns yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-100">
                    <th className="py-2 pr-3">Sent at</th>
                    <th className="py-2 pr-3">Subject</th>
                    <th className="py-2 pr-3">Total</th>
                    <th className="py-2 pr-3">Sent</th>
                    <th className="py-2 pr-3">Failed</th>
                    <th className="py-2 pr-3">Pending</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(c => (
                    <tr key={c.campaignId} className="border-b border-slate-50">
                      <td className="py-2 pr-3 text-slate-600 whitespace-nowrap">
                        {c.sentAt ? new Date(c.sentAt).toLocaleString() : '—'}
                      </td>
                      <td className="py-2 pr-3 text-slate-900 font-medium max-w-xs truncate">{c.subject}</td>
                      <td className="py-2 pr-3 text-slate-600">{c.totalRows}</td>
                      <td className="py-2 pr-3 text-emerald-700 font-medium">{c.sentCount}</td>
                      <td className={`py-2 pr-3 font-medium ${c.failedCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                        {c.failedCount}
                      </td>
                      <td className={`py-2 pr-3 font-medium ${c.pendingCount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {c.pendingCount}
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() => openDetail(c)}
                          className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Confirm send modal */}
      {confirmOpen && preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle size={20} />
              <h4 className="font-bold text-slate-900">Confirm bulk send</h4>
            </div>
            <p className="text-sm text-slate-600">
              You are about to send an email to <b>{preview.count}</b> recipient{preview.count === 1 ? '' : 's'} (
              {audienceLabel}). This cannot be undone.
            </p>
            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
              <div><span className="font-bold text-slate-700">Subject:</span> {subject}</div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={sending}
                className="flex-1 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 px-4 py-2 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary-hover transition-all disabled:opacity-60"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {sending ? 'Queuing…' : 'Yes, send now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign detail modal */}
      {detailCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h4 className="font-bold text-slate-900">{detailCampaign.subject}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {detailCampaign.totalRows} recipients · {detailCampaign.sentCount} sent ·{' '}
                  {detailCampaign.failedCount} failed · {detailCampaign.pendingCount} pending
                </p>
              </div>
              <button onClick={closeDetail} className="p-2 rounded-lg hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {detailLoading ? (
                <div className="text-center py-8 text-slate-400 text-sm">Loading…</div>
              ) : detailRows.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">No rows.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-100">
                      <th className="py-2 pr-3">Recipient</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Sent at</th>
                      <th className="py-2">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailRows.map(r => (
                      <tr key={r.id} className="border-b border-slate-50">
                        <td className="py-2 pr-3 text-slate-700">{r.recipientEmail}</td>
                        <td className="py-2 pr-3">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="py-2 pr-3 text-slate-500 whitespace-nowrap">
                          {r.sentAt ? new Date(r.sentAt).toLocaleString() : '—'}
                        </td>
                        <td className="py-2 text-red-600 text-xs max-w-xs truncate">{r.errorMessage || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ScopeRadio: React.FC<{ value: RolesScope; onChange: (v: RolesScope) => void }> = ({ value, onChange }) => (
  <div className="flex items-center gap-3 text-sm">
    <span className="text-xs font-bold text-slate-600">Scope:</span>
    {(['ALL', 'ADMINS'] as RolesScope[]).map(v => (
      <label key={v} className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="radio"
          checked={value === v}
          onChange={() => onChange(v)}
          className="accent-primary"
        />
        <span>{v === 'ALL' ? 'All users' : 'Admins only'}</span>
      </label>
    ))}
  </div>
);

const StatusBadge: React.FC<{ status: 'PENDING' | 'SENT' | 'FAILED' }> = ({ status }) => {
  const map = {
    SENT: { cls: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 size={12} /> },
    FAILED: { cls: 'bg-red-100 text-red-700', icon: <XCircle size={12} /> },
    PENDING: { cls: 'bg-amber-100 text-amber-700', icon: <Clock size={12} /> },
  } as const;
  const m = map[status];
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${m.cls}`}>
      {m.icon} {status}
    </span>
  );
};

// Suppress unused warning for Building2 (kept for future audience iconography)
void Building2;

export default BulkEmailManager;
