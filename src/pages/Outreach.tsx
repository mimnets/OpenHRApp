import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Target, Users, KanbanSquare, Mail, CalendarClock, Flag, Plus, Upload, Search, Send, Save,
  Trash2, Archive, Loader2, AlertTriangle, MessageSquareReply, Ban, X, CheckCircle2,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { outreachService } from '../services/outreach.service';
import {
  PIPELINE, CLOSED, STATUS_LABEL, OUTREACH_BASIS, computeMetrics, campaignProgress, dueFollowUps,
  followUpsStopped, hasUnresolvedVariables, pct, prepareCsvImport, renderTemplate, sendBlockReason,
  stageChange, templateVars, validateProspect,
  type Campaign, type CsvPreviewRow, type FollowUpTask, type OutreachMessage, type OutreachTemplate,
  type Prospect, type ProspectInput, type ProspectStatus,
} from '../utils/outreach';

type Tab = 'dashboard' | 'prospects' | 'pipeline' | 'email' | 'followups' | 'campaigns';

const inputCls = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-primary-light';
const btn = 'px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all disabled:opacity-50';
const btnPrimary = `${btn} bg-primary text-white hover:bg-primary-hover`;
const btnGhost = `${btn} bg-slate-100 text-slate-700 hover:bg-slate-200`;
const card = 'bg-white rounded-2xl border border-slate-100 shadow-sm';
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString() : '—');
const SIGNATURE_KEY = 'openhr.outreach.signature';

const ALL_STATUSES = [...PIPELINE, ...CLOSED] as ProspectStatus[];

const Outreach: React.FC = () => {
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [messages, setMessages] = useState<OutreachMessage[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<OutreachTemplate[]>([]);
  const [tasks, setTasks] = useState<FollowUpTask[]>([]);
  const [composeFor, setComposeFor] = useState<{ prospectId: string; templateKey?: string } | null>(null);

  const reload = useCallback(async () => {
    try {
      const d = await outreachService.loadAll();
      setProspects(d.prospects); setMessages(d.messages); setCampaigns(d.campaigns);
      setTemplates(d.templates); setTasks(d.tasks); setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try { await fn(); if (ok) showToast(ok, 'success'); await reload(); return true; }
    catch (e) { showToast(e instanceof Error ? e.message : String(e), 'error'); return false; }
  };

  const openCompose = (prospectId: string, templateKey?: string) => { setComposeFor({ prospectId, templateKey }); setTab('email'); };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Target },
    { id: 'prospects', label: 'Prospects', icon: Users },
    { id: 'pipeline', label: 'Pipeline', icon: KanbanSquare },
    { id: 'email', label: 'Email Center', icon: Mail },
    { id: 'followups', label: 'Follow-ups', icon: CalendarClock },
    { id: 'campaigns', label: 'Campaigns', icon: Flag },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight flex items-center gap-3">
          <Target className="text-primary shrink-0" size={28} /> Outreach
        </h1>
        <p className="text-slate-500 mt-1 text-sm">Customer validation CRM. Every email is reviewed and sent one at a time.</p>
      </div>

      <div className="flex gap-1 overflow-x-auto bg-slate-100 p-1 rounded-2xl">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 whitespace-nowrap ${tab === id ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" /></div>
      ) : loadError ? (
        <div className="p-4 rounded-2xl bg-red-50 text-red-700 flex gap-3"><AlertTriangle size={20} />
          <span>{loadError}. If this is a new install, apply migration 0040_outreach_crm.sql.</span></div>
      ) : (
        <>
          {tab === 'dashboard' && <Dashboard prospects={prospects} messages={messages} campaigns={campaigns} tasks={tasks} />}
          {tab === 'prospects' && <Prospects prospects={prospects} messages={messages} campaigns={campaigns} run={run} onCompose={openCompose} />}
          {tab === 'pipeline' && <Pipeline prospects={prospects} run={run} />}
          {tab === 'email' && (
            <EmailCenter prospects={prospects} messages={messages} templates={templates} run={run}
              composeFor={composeFor} onComposeHandled={() => setComposeFor(null)} />
          )}
          {tab === 'followups' && <FollowUps prospects={prospects} tasks={tasks} messages={messages} templates={templates} run={run} onCompose={openCompose} />}
          {tab === 'campaigns' && <Campaigns campaigns={campaigns} prospects={prospects} messages={messages} run={run} />}
        </>
      )}
    </div>
  );
};

type Run = (fn: () => Promise<unknown>, ok?: string) => Promise<boolean>;

// ── Dashboard ───────────────────────────────────────────────────────────────
const Stat: React.FC<{ label: string; value: React.ReactNode; sub?: string }> = ({ label, value, sub }) => (
  <div className={`${card} p-4`}>
    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
    <p className="text-2xl font-semibold text-slate-900 mt-1">{value}</p>
    {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
  </div>
);

const Dashboard: React.FC<{ prospects: Prospect[]; messages: OutreachMessage[]; campaigns: Campaign[]; tasks: FollowUpTask[] }> =
  ({ prospects, messages, campaigns, tasks }) => {
    const m = computeMetrics(prospects, messages, campaigns);
    const due = dueFollowUps(tasks, prospects, messages, today());
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Stat label="Total prospects" value={m.prospects} />
          <Stat label="Contacted" value={m.contacted} sub="≥1 email accepted by Resend" />
          <Stat label="Replies" value={m.replies} sub={`${m.positiveReplies} positive`} />
          <Stat label="Interested" value={m.interested} />
          <Stat label="Demos" value={m.demosScheduled} sub={`${m.demosCompleted} completed`} />
          <Stat label="Pilots started" value={m.pilots} />
          <Stat label="Paying customers" value={m.paying} />
          <Stat label="Confirmed MRR" value={`$${m.confirmedMrr.toFixed(2)}`} sub={`Proposed pipeline $${m.proposedMrr.toFixed(2)}`} />
          <Stat label="Follow-ups due" value={due.length} sub={`${due.filter((d) => d.overdue).length} overdue`} />
          <Stat label="Emails" value={m.sent} sub={`${m.drafted} drafts · ${m.failed} failed · delivered not tracked`} />
        </div>
        <div className={`${card} p-4 text-sm text-slate-600`}>
          <p><strong>Sent</strong> = accepted by Resend. <strong>Delivered</strong> needs the Resend webhook, which is not connected,
            so it is not shown as a number. Replies are recorded manually with <em>Record reply</em>.</p>
        </div>
        {campaigns.map((c) => <CampaignReport key={c.id} c={c} prospects={prospects} messages={messages} />)}
      </div>
    );
  };

const Bar: React.FC<{ label: string; value: number; goal: number }> = ({ label, value, goal }) => (
  <div>
    <div className="flex justify-between text-xs font-bold text-slate-500"><span>{label}</span><span>{value} / {goal}</span></div>
    <div className="h-2 bg-slate-100 rounded-full mt-1 overflow-hidden" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemax={goal}>
      <div className="h-full bg-primary" style={{ width: `${Math.min(pct(value, goal), 100)}%` }} />
    </div>
  </div>
);

const CampaignReport: React.FC<{ c: Campaign; prospects: Prospect[]; messages: OutreachMessage[] }> = ({ c, prospects, messages }) => {
  const mine = prospects.filter((p) => p.campaign_id === c.id);
  const m = computeMetrics(mine, messages, [c]);
  const prog = campaignProgress(c);
  return (
    <div className={`${card} p-4 space-y-3`}>
      <div className="flex flex-wrap justify-between gap-2">
        <h3 className="font-bold text-slate-900">{c.name} <span className="text-slate-400 font-normal">· {c.length_days}-day · {c.industry_target || 'any industry'}</span></h3>
        <span className="text-sm text-slate-500">{prog.ended ? 'Ended' : `Day ${prog.day} of ${c.length_days}`} · {c.start_date} → {c.end_date}</span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Bar label="Contacts" value={m.contacted} goal={c.goal_contacts} />
        <Bar label="Interviews" value={m.interviews} goal={c.goal_interviews} />
        <Bar label="Demos" value={m.demosScheduled} goal={c.goal_demos} />
        <Bar label="Pilots" value={m.pilots} goal={c.goal_pilots} />
        <Bar label="Paying" value={m.paying} goal={c.goal_paying} />
      </div>
      <p className="text-xs text-slate-500">
        Conversion: contacted→reply {pct(m.replies, m.contacted)}% · reply→demo {pct(m.demosScheduled, m.replies)}% ·
        demo→pilot {pct(m.pilots, m.demosScheduled)}% · pilot→paying {pct(m.paying, m.pilots)}% ·
        Proposed ${m.proposedMrr.toFixed(2)} vs confirmed MRR ${m.confirmedMrr.toFixed(2)}
      </p>
    </div>
  );
};

// ── Prospects ───────────────────────────────────────────────────────────────
const emptyProspect = (): ProspectInput => ({ company_name: '', email: '', outreach_basis: 'UNVERIFIED', status: 'NEW' });

const Prospects: React.FC<{
  prospects: Prospect[]; messages: OutreachMessage[]; campaigns: Campaign[]; run: Run;
  onCompose: (id: string) => void;
}> = ({ prospects, messages, campaigns, run, onCompose }) => {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<{ id: string | null; data: ProspectInput } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [csv, setCsv] = useState<CsvPreviewRow[] | null>(null);
  const [replyFor, setReplyFor] = useState<Prospect | null>(null);

  const sentIds = useMemo(() => new Set(messages.filter((m) => m.direction === 'OUTBOUND' && m.status !== 'DRAFT').map((m) => m.prospect_id)), [messages]);
  const rows = prospects.filter((p) =>
    (showArchived || !p.archived) && (!status || p.status === status) &&
    (!q || [p.company_name, p.contact_name, p.email, p.industry, p.city].some((v) => v?.toLowerCase().includes(q.toLowerCase()))));

  const save = async () => {
    if (!editing) return;
    const err = validateProspect(editing.data);
    if (err) { setFormError(err); return; }
    if (await run(() => outreachService.saveProspect(editing.id, editing.data), 'Prospect saved')) setEditing(null);
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setCsv(prepareCsvImport(await f.text(), prospects.map((p) => p.email)));
  };

  const set = (k: keyof ProspectInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setEditing((s) => s && { ...s, data: { ...s.data, [k]: k === 'employee_count' ? (e.target.value === '' ? null : Number(e.target.value)) : (k === 'campaign_id' && !e.target.value ? null : e.target.value) } });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[12rem]">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input className={`${inputCls} pl-9`} placeholder="Search company, contact, email, city" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search prospects" />
        </div>
        <select className={`${inputCls} w-auto`} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Archived</label>
        <button className={btnPrimary} onClick={() => { setEditing({ id: null, data: emptyProspect() }); setFormError(null); }}><Plus size={16} /> Add</button>
        <label className={`${btnGhost} cursor-pointer`}><Upload size={16} /> Import CSV
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
      </div>

      {csv && (
        <div className={`${card} p-4 space-y-3`}>
          <div className="flex justify-between items-center">
            <h3 className="font-bold">CSV preview — {csv.filter((r) => !r.error).length} valid, {csv.filter((r) => r.error).length} skipped</h3>
            <button onClick={() => setCsv(null)} aria-label="Close preview"><X size={18} /></button>
          </div>
          <p className="text-xs text-slate-500">Columns: company, email, contact, industry, website, city, employees, source, basis, hr_method, problem, notes. Rows without a basis import as Unverified and cannot be emailed until reviewed.</p>
          <div className="max-h-64 overflow-auto text-sm">
            <table className="w-full"><tbody>
              {csv.map((r) => (
                <tr key={r.line} className={r.error ? 'text-rose-600' : ''}>
                  <td className="pr-2 text-slate-400">{r.line}</td><td className="pr-2">{r.data.company_name}</td>
                  <td className="pr-2">{r.data.email}</td><td>{r.error ?? 'OK'}</td>
                </tr>
              ))}
            </tbody></table>
          </div>
          <button className={btnPrimary} disabled={!csv.some((r) => !r.error)}
            onClick={async () => { if (await run(() => outreachService.importProspects(csv.filter((r) => !r.error).map((r) => r.data)), 'Import complete')) setCsv(null); }}>
            <Upload size={16} /> Import valid rows
          </button>
        </div>
      )}

      {editing && (
        <div className={`${card} p-4 space-y-3`}>
          <h3 className="font-bold">{editing.id ? 'Edit prospect' : 'New prospect'}</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {([['company_name', 'Company name *'], ['email', 'Business email *'], ['contact_name', 'Business contact name'],
              ['industry', 'Industry'], ['website', 'Website (https://…)'], ['city', 'City'], ['contact_source', 'Contact source (where you found this address)'],
              ['current_hr_method', 'Current HR method'], ['primary_problem', 'Primary problem']] as [keyof ProspectInput, string][]).map(([k, label]) => (
              <label key={k} className="text-xs font-bold text-slate-500">{label}
                <input className={inputCls} value={(editing.data[k] as string) ?? ''} onChange={set(k)} />
              </label>
            ))}
            <label className="text-xs font-bold text-slate-500">Approx. employees
              <input type="number" min={0} className={inputCls} value={editing.data.employee_count ?? ''} onChange={set('employee_count')} />
            </label>
            <label className="text-xs font-bold text-slate-500">Outreach basis
              <select className={inputCls} value={editing.data.outreach_basis} onChange={set('outreach_basis')}>
                {Object.entries(OUTREACH_BASIS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-500">Campaign
              <select className={inputCls} value={editing.data.campaign_id ?? ''} onChange={set('campaign_id')}>
                <option value="">None</option>
                {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-500">Next follow-up
              <input type="date" className={inputCls} value={editing.data.next_follow_up ?? ''} onChange={set('next_follow_up')} />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600 mt-5">
              <input type="checkbox" checked={!!editing.data.do_not_contact}
                onChange={(e) => setEditing((s) => s && { ...s, data: { ...s.data, do_not_contact: e.target.checked } })} /> Do not contact
            </label>
          </div>
          <label className="text-xs font-bold text-slate-500 block">Notes
            <textarea className={inputCls} rows={3} value={editing.data.notes ?? ''} onChange={set('notes')} />
          </label>
          {formError && <p className="text-sm text-rose-600">{formError}</p>}
          <div className="flex gap-2">
            <button className={btnPrimary} onClick={save}><Save size={16} /> Save</button>
            <button className={btnGhost} onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}

      {replyFor && <RecordReply prospect={replyFor} run={run} onClose={() => setReplyFor(null)} />}

      <div className={`${card} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-400">
            <tr><th className="p-3">Company</th><th className="p-3">Contact</th><th className="p-3">Status</th><th className="p-3">Basis</th>
              <th className="p-3">Last contact</th><th className="p-3">Next follow-up</th><th className="p-3">Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const blocked = sendBlockReason(p, false);
              const { id: _id, ...data } = p;
              return (
                <tr key={p.id} className={`border-t border-slate-100 ${p.archived ? 'opacity-50' : ''}`}>
                  <td className="p-3"><p className="font-bold">{p.company_name}</p><p className="text-xs text-slate-500">{[p.industry, p.city, p.employee_count && `~${p.employee_count} staff`].filter(Boolean).join(' · ')}</p></td>
                  <td className="p-3"><p>{p.contact_name || '—'}</p><p className="text-xs text-slate-500">{p.email}</p></td>
                  <td className="p-3">{STATUS_LABEL[p.status]}{p.do_not_contact && <span className="ml-1 text-xs text-rose-600 font-bold">DNC</span>}</td>
                  <td className="p-3 text-xs">{OUTREACH_BASIS[p.outreach_basis]}</td>
                  <td className="p-3">{fmtDate(p.last_contacted_at)}</td>
                  <td className="p-3">{p.next_follow_up ?? '—'}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      <button className="text-primary font-bold text-xs" onClick={() => { setEditing({ id: p.id, data }); setFormError(null); }}>Edit</button>
                      <button className="text-primary font-bold text-xs disabled:text-slate-300" disabled={!!blocked} title={blocked ?? 'Compose email'} onClick={() => onCompose(p.id)}>Email</button>
                      <button className="text-primary font-bold text-xs" onClick={() => setReplyFor(p)}>Record reply</button>
                      <button className="text-slate-500 text-xs" title="Archive" onClick={() => run(() => outreachService.saveProspect(p.id, { archived: !p.archived }), p.archived ? 'Restored' : 'Archived')}><Archive size={14} /></button>
                      {!sentIds.has(p.id) && (
                        <button className="text-rose-500 text-xs" title="Delete (only before any email was sent)"
                          onClick={() => window.confirm(`Delete ${p.company_name}?`) && run(() => outreachService.deleteProspect(p.id), 'Deleted')}><Trash2 size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-slate-400">No prospects.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const RecordReply: React.FC<{ prospect: Prospect; run: Run; onClose: () => void }> = ({ prospect, run, onClose }) => {
  const [sentiment, setSentiment] = useState<'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'>('POSITIVE');
  const [body, setBody] = useState('');
  return (
    <div className={`${card} p-4 space-y-3`}>
      <h3 className="font-bold flex items-center gap-2"><MessageSquareReply size={18} /> Record reply from {prospect.company_name}</h3>
      <p className="text-xs text-slate-500">Stops open follow-ups for this prospect. Moves New/Qualified/Contacted prospects to Replied.</p>
      <select className={inputCls} value={sentiment} onChange={(e) => setSentiment(e.target.value as typeof sentiment)} aria-label="Reply sentiment">
        <option value="POSITIVE">Positive</option><option value="NEUTRAL">Neutral</option><option value="NEGATIVE">Negative</option>
      </select>
      <textarea className={inputCls} rows={3} placeholder="Paste or summarise the reply" value={body} onChange={(e) => setBody(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <button className={btnPrimary} onClick={async () => { if (await run(() => outreachService.recordReply(prospect.id, sentiment, body), 'Reply recorded')) onClose(); }}>Save reply</button>
        <button className={btnGhost} onClick={async () => { if (await run(() => outreachService.suppress(prospect.email, 'UNSUBSCRIBED', 'Asked to stop by reply'), 'Unsubscribed')) onClose(); }}><Ban size={16} /> They asked to stop</button>
        <button className={btnGhost} onClick={async () => { if (await run(() => outreachService.suppress(prospect.email, 'HARD_BOUNCE', 'Bounce recorded manually'), 'Marked bounced')) onClose(); }}>Hard bounce</button>
        <button className={btnGhost} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
};

// ── Pipeline ────────────────────────────────────────────────────────────────
const Pipeline: React.FC<{ prospects: Prospect[]; run: Run }> = ({ prospects, run }) => {
  const live = prospects.filter((p) => !p.archived);
  const move = (p: Prospect, to: ProspectStatus) => {
    const patch = stageChange(p, to);
    if (to === 'PAYING') {
      const v = window.prompt('Confirmed monthly recurring revenue (USD)', String(p.confirmed_mrr ?? ''));
      if (v === null) return;
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) return;
      patch.confirmed_mrr = n;
    }
    run(() => outreachService.saveProspect(p.id, patch));
  };
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {ALL_STATUSES.map((s) => {
        const col = live.filter((p) => p.status === s);
        return (
          <div key={s} className="min-w-[15rem] w-60 bg-slate-50 rounded-2xl p-2 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">{STATUS_LABEL[s]} · {col.length}</p>
            {col.map((p) => (
              <div key={p.id} className="bg-white rounded-xl p-3 shadow-sm space-y-2">
                <p className="font-bold text-sm">{p.company_name}</p>
                <p className="text-xs text-slate-500">{p.contact_name || p.email}</p>
                <select className="w-full text-xs border border-slate-200 rounded-lg p-1" value={p.status} onChange={(e) => move(p, e.target.value as ProspectStatus)} aria-label={`Stage for ${p.company_name}`}>
                  {ALL_STATUSES.map((x) => <option key={x} value={x}>{STATUS_LABEL[x]}</option>)}
                </select>
                <div className="flex flex-wrap gap-2 text-xs">
                  {!p.interview_completed_at && <button className="text-primary font-bold" onClick={() => run(() => outreachService.saveProspect(p.id, { interview_completed_at: new Date().toISOString() }))}>Interview done</button>}
                  {p.demo_scheduled_at && !p.demo_completed_at && <button className="text-primary font-bold" onClick={() => run(() => outreachService.saveProspect(p.id, { demo_completed_at: new Date().toISOString() }))}>Demo completed</button>}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

// ── Email Center ────────────────────────────────────────────────────────────
const newKey = () => crypto.randomUUID();

const EmailCenter: React.FC<{
  prospects: Prospect[]; messages: OutreachMessage[]; templates: OutreachTemplate[]; run: Run;
  composeFor: { prospectId: string; templateKey?: string } | null; onComposeHandled: () => void;
}> = ({ prospects, messages, templates, run, composeFor, onComposeHandled }) => {
  const { showToast } = useToast();
  const [signature, setSignature] = useState(() => { try { return localStorage.getItem(SIGNATURE_KEY) ?? ''; } catch { return ''; } });
  const [editTpl, setEditTpl] = useState<OutreachTemplate | null>(null);
  const [prospectId, setProspectId] = useState('');
  const [templateKey, setTemplateKey] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [idemKey, setIdemKey] = useState(newKey);
  const [draftId, setDraftId] = useState<string | null>(null);

  const prospect = prospects.find((p) => p.id === prospectId) ?? null;
  const eligible = prospects.filter((p) => !sendBlockReason(p, false));

  const fill = (pid: string, key: string) => {
    const p = prospects.find((x) => x.id === pid);
    const t = templates.find((x) => x.key === key);
    if (p && t) {
      const vars = templateVars(p, signature);
      setSubject(renderTemplate(t.subject, vars));
      setBody(renderTemplate(t.body, vars));
    }
    setConfirmed(false); setIdemKey(newKey()); setDraftId(null);
  };

  useEffect(() => {
    if (!composeFor) return;
    const key = composeFor.templateKey ?? templates[0]?.key ?? '';
    setProspectId(composeFor.prospectId); setTemplateKey(key); fill(composeFor.prospectId, key);
    onComposeHandled();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composeFor]);

  const blocked = prospect ? sendBlockReason(prospect, false) : 'Choose a prospect';
  const unresolved = hasUnresolvedVariables(subject) || hasUnresolvedVariables(body);

  const send = async () => {
    if (!prospect || blocked || unresolved || !confirmed) return;
    setSending(true);
    try {
      await outreachService.send({ prospectId: prospect.id, confirmEmail: prospect.email, subject, body, templateKey: templateKey || null, idempotencyKey: idemKey });
      showToast(`Sent to ${prospect.email}`, 'success');
      if (draftId) await outreachService.deleteDraft(draftId).catch(() => {});
      setDraftId(null); setSubject(''); setBody(''); setProspectId(''); setConfirmed(false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      // A new key after any answer: the old one is now recorded server-side.
      setIdemKey(newKey()); setSending(false);
      await run(async () => {});
    }
  };

  const drafts = messages.filter((m) => m.status === 'DRAFT');
  const recent = messages.filter((m) => m.direction === 'OUTBOUND' && m.status !== 'DRAFT').slice(0, 20);
  const pname = (id: string) => prospects.find((p) => p.id === id)?.company_name ?? '—';

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className={`${card} p-4 space-y-3`}>
        <h3 className="font-bold flex items-center gap-2"><Send size={18} /> Compose</h3>
        <select className={inputCls} value={prospectId} aria-label="Prospect"
          onChange={(e) => { setProspectId(e.target.value); fill(e.target.value, templateKey); }}>
          <option value="">Choose an eligible prospect…</option>
          {eligible.map((p) => <option key={p.id} value={p.id}>{p.company_name} — {p.email}</option>)}
        </select>
        <select className={inputCls} value={templateKey} aria-label="Template"
          onChange={(e) => { setTemplateKey(e.target.value); fill(prospectId, e.target.value); }}>
          <option value="">Choose a template…</option>
          {templates.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
        </select>
        <input className={inputCls} value={subject} onChange={(e) => { setSubject(e.target.value); setConfirmed(false); }} placeholder="Subject" aria-label="Subject" />
        <textarea className={inputCls} rows={12} value={body} onChange={(e) => { setBody(e.target.value); setConfirmed(false); }} placeholder="Body (plain text)" aria-label="Body" />
        {unresolved && <p className="text-sm text-amber-700">Fill in the remaining {'{{variables}}'} — the prospect record is missing a value, or set your signature.</p>}
        {prospect && blocked && <p className="text-sm text-rose-600">{blocked}</p>}
        {prospect && !blocked && (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1" />
            <span>I reviewed this message. Send it to <strong>{prospect.email}</strong> ({prospect.company_name}). An unsubscribe link and the postal address are added automatically.</span>
          </label>
        )}
        <div className="flex flex-wrap gap-2">
          <button className={btnPrimary} disabled={!prospect || !!blocked || unresolved || !confirmed || sending || !subject.trim() || !body.trim()} onClick={send}>
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send
          </button>
          <button className={btnGhost} disabled={!prospect || !subject.trim()}
            onClick={() => prospect && run(() => outreachService.saveDraft({ prospect_id: prospect.id, template_key: templateKey || null, subject, body }), 'Draft saved')}>
            <Save size={16} /> Save draft
          </button>
        </div>
      </div>

      <div className={`${card} p-4 space-y-2`}>
        <h3 className="font-bold">Preview</h3>
        <p className="text-xs text-slate-500">To: {prospect?.email ?? '—'}</p>
        <p className="font-bold">{subject || '(no subject)'}</p>
        <div className="whitespace-pre-wrap text-sm text-slate-700 border-t border-slate-100 pt-2">{body}</div>
        <p className="text-xs text-slate-400 border-t border-slate-100 pt-2">[Postal address] · Unsubscribe</p>
      </div>

      <div className={`${card} p-4 space-y-3`}>
        <h3 className="font-bold">Sender signature</h3>
        <textarea className={inputCls} rows={3} value={signature} placeholder={'Monir\nFounder, OpenHRApp\nhttps://openhrapp.com'}
          onChange={(e) => { setSignature(e.target.value); try { localStorage.setItem(SIGNATURE_KEY, e.target.value); } catch { /* convenience only */ } }} />
        <h3 className="font-bold pt-2">Templates</h3>
        <p className="text-xs text-slate-500">Variables: {'{{first_name}} {{contact_name}} {{company_name}} {{industry}} {{city}} {{primary_problem}} {{current_hr_method}} {{sender_signature}}'}</p>
        <ul className="divide-y divide-slate-100">
          {templates.map((t) => (
            <li key={t.id} className="py-2 flex justify-between items-center">
              <span className="text-sm">{t.name}</span>
              <button className="text-primary text-xs font-bold" onClick={() => setEditTpl({ ...t })}>Edit</button>
            </li>
          ))}
        </ul>
        {editTpl && (
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <input className={inputCls} value={editTpl.name} onChange={(e) => setEditTpl({ ...editTpl, name: e.target.value })} aria-label="Template name" />
            <input className={inputCls} value={editTpl.subject} onChange={(e) => setEditTpl({ ...editTpl, subject: e.target.value })} aria-label="Template subject" />
            <textarea className={inputCls} rows={10} value={editTpl.body} onChange={(e) => setEditTpl({ ...editTpl, body: e.target.value })} aria-label="Template body" />
            <div className="flex gap-2">
              <button className={btnPrimary} onClick={async () => { if (await run(() => outreachService.saveTemplate(editTpl), 'Template saved')) setEditTpl(null); }}><Save size={16} /> Save</button>
              <button className={btnGhost} onClick={() => setEditTpl(null)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className={`${card} p-4 space-y-3`}>
        <h3 className="font-bold">Drafts</h3>
        {drafts.length === 0 && <p className="text-sm text-slate-400">No drafts.</p>}
        {drafts.map((d) => (
          <div key={d.id} className="flex justify-between items-center gap-2 text-sm">
            <span className="truncate">{pname(d.prospect_id)} — {d.subject}</span>
            <span className="flex gap-2 shrink-0">
              <button className="text-primary text-xs font-bold" onClick={() => {
                setProspectId(d.prospect_id); setTemplateKey(d.template_key ?? ''); setSubject(d.subject ?? ''); setBody(d.body ?? '');
                setConfirmed(false); setIdemKey(newKey()); setDraftId(d.id);
              }}>Open</button>
              <button className="text-rose-500" onClick={() => run(() => outreachService.deleteDraft(d.id), 'Draft deleted')} aria-label="Delete draft"><Trash2 size={14} /></button>
            </span>
          </div>
        ))}
        <h3 className="font-bold pt-2">Recent sends</h3>
        {recent.map((m) => (
          <div key={m.id} className="text-sm flex justify-between gap-2">
            <span className="truncate">{pname(m.prospect_id)} — {m.subject}</span>
            <span className={`text-xs font-bold shrink-0 ${m.status === 'SENT' ? 'text-emerald-600' : m.status === 'FAILED' ? 'text-rose-600' : 'text-slate-500'}`} title={m.error ?? m.provider_message_id ?? ''}>
              {m.status} {fmtDate(m.sent_at ?? m.created)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Follow-ups ──────────────────────────────────────────────────────────────
const FollowUps: React.FC<{
  prospects: Prospect[]; tasks: FollowUpTask[]; messages: OutreachMessage[]; templates: OutreachTemplate[]; run: Run;
  onCompose: (id: string, key?: string) => void;
}> = ({ prospects, tasks, messages, templates, run, onCompose }) => {
  const [pid, setPid] = useState('');
  const [due, setDue] = useState(today());
  const [key, setKey] = useState('');
  const [note, setNote] = useState('');
  const dueNow = dueFollowUps(tasks, prospects, messages, today());
  const upcoming = tasks.filter((t) => t.status === 'OPEN' && t.due_date > today());
  const pname = (id: string) => prospects.find((p) => p.id === id)?.company_name ?? '—';
  const schedulable = prospects.filter((p) => !followUpsStopped(p));

  return (
    <div className="space-y-4">
      <div className={`${card} p-4 space-y-3`}>
        <h3 className="font-bold">Schedule a follow-up</h3>
        <p className="text-xs text-slate-500">Follow-ups are reminders only. Nothing is sent automatically: each one opens a draft you review and send yourself. They stop on reply, unsubscribe, bounce, closure or payment.</p>
        <div className="grid sm:grid-cols-4 gap-2">
          <select className={inputCls} value={pid} onChange={(e) => setPid(e.target.value)} aria-label="Prospect">
            <option value="">Prospect…</option>
            {schedulable.map((p) => <option key={p.id} value={p.id}>{p.company_name}</option>)}
          </select>
          <input type="date" className={inputCls} value={due} onChange={(e) => setDue(e.target.value)} aria-label="Due date" />
          <select className={inputCls} value={key} onChange={(e) => setKey(e.target.value)} aria-label="Template">
            <option value="">Template…</option>
            {templates.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
          </select>
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" aria-label="Note" />
        </div>
        <button className={btnPrimary} disabled={!pid || !due}
          onClick={async () => { if (await run(() => outreachService.addTask({ prospect_id: pid, due_date: due, template_key: key || null, note: note || null }), 'Follow-up scheduled')) { setPid(''); setNote(''); } }}>
          <Plus size={16} /> Schedule
        </button>
      </div>

      <div className={`${card} p-4 space-y-2`}>
        <h3 className="font-bold">Due now ({dueNow.length})</h3>
        {dueNow.length === 0 && <p className="text-sm text-slate-400">Nothing due.</p>}
        {dueNow.map(({ task, prospect, overdue }) => (
          <div key={task.id} className="flex flex-wrap justify-between items-center gap-2 text-sm border-t border-slate-100 pt-2">
            <span><strong>{prospect.company_name}</strong> · {task.due_date} {overdue && <span className="text-rose-600 font-bold text-xs">OVERDUE</span>} {task.note && `· ${task.note}`}</span>
            <span className="flex gap-2">
              <button className="text-primary font-bold text-xs" onClick={() => onCompose(prospect.id, task.template_key ?? undefined)}>Prepare draft</button>
              <button className="text-emerald-600 text-xs flex items-center gap-1" onClick={() => run(() => outreachService.setTaskStatus(task.id, 'DONE'))}><CheckCircle2 size={14} /> Done</button>
              <button className="text-slate-500 text-xs" onClick={() => run(() => outreachService.setTaskStatus(task.id, 'CANCELLED'))}>Cancel</button>
            </span>
          </div>
        ))}
      </div>

      <div className={`${card} p-4 space-y-1`}>
        <h3 className="font-bold">Upcoming ({upcoming.length})</h3>
        {upcoming.map((t) => <p key={t.id} className="text-sm">{t.due_date} · {pname(t.prospect_id)} {t.note && `· ${t.note}`}</p>)}
      </div>
    </div>
  );
};

// ── Campaigns ───────────────────────────────────────────────────────────────
const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10);
};

const Campaigns: React.FC<{ campaigns: Campaign[]; prospects: Prospect[]; messages: OutreachMessage[]; run: Run }> =
  ({ campaigns, prospects, messages, run }) => {
    const blank = (): Omit<Campaign, 'id'> => ({
      name: '', length_days: 30, start_date: today(), end_date: addDays(today(), 30), industry_target: '',
      goal_contacts: 50, goal_interviews: 10, goal_demos: 5, goal_pilots: 3, goal_paying: 1, proposed_price: 0,
    });
    const [form, setForm] = useState<{ id: string | null; data: Omit<Campaign, 'id'> } | null>(null);
    const setNum = (k: keyof Omit<Campaign, 'id'>) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => f && { ...f, data: { ...f.data, [k]: Math.max(0, Number(e.target.value) || 0) } });
    const setLen = (len: 30 | 60, start: string) =>
      setForm((f) => f && { ...f, data: { ...f.data, length_days: len, start_date: start, end_date: addDays(start, len) } });

    return (
      <div className="space-y-4">
        <button className={btnPrimary} onClick={() => setForm({ id: null, data: blank() })}><Plus size={16} /> New campaign</button>
        {form && (
          <div className={`${card} p-4 space-y-3`}>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <label className="text-xs font-bold text-slate-500">Name
                <input className={inputCls} value={form.data.name} onChange={(e) => setForm({ ...form, data: { ...form.data, name: e.target.value } })} />
              </label>
              <label className="text-xs font-bold text-slate-500">Length
                <select className={inputCls} value={form.data.length_days} onChange={(e) => setLen(Number(e.target.value) as 30 | 60, form.data.start_date)}>
                  <option value={30}>30 days</option><option value={60}>60 days</option>
                </select>
              </label>
              <label className="text-xs font-bold text-slate-500">Start date
                <input type="date" className={inputCls} value={form.data.start_date} onChange={(e) => e.target.value && setLen(form.data.length_days, e.target.value)} />
              </label>
              <label className="text-xs font-bold text-slate-500">End date
                <input className={inputCls} value={form.data.end_date} readOnly />
              </label>
              <label className="text-xs font-bold text-slate-500">Industry target
                <input className={inputCls} value={form.data.industry_target ?? ''} onChange={(e) => setForm({ ...form, data: { ...form.data, industry_target: e.target.value } })} />
              </label>
              {([['goal_contacts', 'Contact goal'], ['goal_interviews', 'Interview goal'], ['goal_demos', 'Demo goal'], ['goal_pilots', 'Pilot goal'],
                ['goal_paying', 'Paying goal'], ['proposed_price', 'Proposed price / month (USD)']] as [keyof Omit<Campaign, 'id'>, string][]).map(([k, l]) => (
                <label key={k} className="text-xs font-bold text-slate-500">{l}
                  <input type="number" min={0} step={k === 'proposed_price' ? '0.01' : '1'} className={inputCls} value={form.data[k] as number} onChange={setNum(k)} />
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button className={btnPrimary} disabled={!form.data.name.trim()}
                onClick={async () => { if (await run(() => outreachService.saveCampaign(form.id, form.data), 'Campaign saved')) setForm(null); }}><Save size={16} /> Save</button>
              <button className={btnGhost} onClick={() => setForm(null)}>Cancel</button>
            </div>
          </div>
        )}
        {campaigns.length === 0 && <p className="text-sm text-slate-400">No campaigns yet. Create one, then assign prospects to it on the Prospects tab.</p>}
        {campaigns.map((c) => (
          <div key={c.id} className="space-y-1">
            <CampaignReport c={c} prospects={prospects} messages={messages} />
            <div className="flex gap-3 text-xs px-1">
              <button className="text-primary font-bold" onClick={() => { const { id, ...data } = c; setForm({ id, data }); }}>Edit</button>
              <button className="text-rose-500" onClick={() => window.confirm(`Delete campaign ${c.name}? Prospects are kept.`) && run(() => outreachService.deleteCampaign(c.id), 'Campaign deleted')}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    );
  };

export default Outreach;
