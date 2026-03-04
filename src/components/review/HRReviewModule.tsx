
import React, { useState } from 'react';
import {
  Settings, Plus, Trash2, Edit3, Loader2, X, CheckCircle2, ChevronDown, ChevronUp,
  Calendar, BarChart3, Sliders,
} from 'lucide-react';
import { hrService } from '../../services/hrService';
import {
  ReviewCycle, PerformanceReview, OrgReviewConfig, CustomCompetency,
  ReviewCycleType, ReviewCycleStatus,
} from '../../types';
import ReviewStatusBadge from './ReviewStatusBadge';
import AttendanceLeaveCard from './AttendanceLeaveCard';
import AdminReviewFormModal from './AdminReviewFormModal';

interface Employee {
  id: string;
  name: string;
  department: string;
}

interface Props {
  user: any;
  cycles: ReviewCycle[];
  allReviews: PerformanceReview[];
  employees?: Employee[];
  onRefresh: () => void;
  readOnly?: boolean;
  reviewConfig: OrgReviewConfig;
}

const CYCLE_TYPES: { value: ReviewCycleType; label: string }[] = [
  { value: 'MID_YEAR', label: 'Mid-Year' },
  { value: 'YEAR_END', label: 'Year-End' },
];

const CYCLE_STATUSES: { value: ReviewCycleStatus; label: string }[] = [
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const HRReviewModule: React.FC<Props> = ({ user, cycles, allReviews, employees = [], onRefresh, readOnly = false, reviewConfig }) => {
  const [showCycleForm, setShowCycleForm] = useState(false);
  const [editingCycle, setEditingCycle] = useState<ReviewCycle | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [showCycles, setShowCycles] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [editingReview, setEditingReview] = useState<PerformanceReview | null>(null);

  const competencies = reviewConfig.competencies;
  const ratingScale = reviewConfig.ratingScale;
  const overallRatings = reviewConfig.overallRatings;

  // Cycle form state
  const [cycleForm, setCycleForm] = useState({
    name: '',
    cycleType: 'MID_YEAR' as ReviewCycleType,
    startDate: '',
    endDate: '',
    reviewStartDate: '',
    reviewEndDate: '',
    status: 'UPCOMING' as ReviewCycleStatus,
    isActive: false,
  });

  // Finalization form state
  const [finalRemarks, setFinalRemarks] = useState('');
  const [overallRating, setOverallRating] = useState<string>('');

  // Review Settings state
  const [editConfig, setEditConfig] = useState<OrgReviewConfig>(reviewConfig);
  const [editingCompetencyIdx, setEditingCompetencyIdx] = useState<number | null>(null);
  const [compForm, setCompForm] = useState<CustomCompetency>({ id: '', name: '', description: '', behaviors: [] });
  const [compBehaviorInput, setCompBehaviorInput] = useState('');

  const selectedReview = allReviews.find(r => r.id === selectedReviewId);

  const resolveCompetency = (competencyId: string): CustomCompetency => {
    const found = competencies.find(c => c.id === competencyId);
    if (found) return found;
    return { id: competencyId, name: competencyId.replace(/_/g, ' '), description: '', behaviors: [] };
  };

  const resetCycleForm = () => {
    setCycleForm({
      name: '', cycleType: 'MID_YEAR', startDate: '', endDate: '',
      reviewStartDate: '', reviewEndDate: '', status: 'UPCOMING', isActive: false,
    });
    setEditingCycle(null);
    setShowCycleForm(false);
  };

  const openEditCycle = (cycle: ReviewCycle) => {
    setEditingCycle(cycle);
    setCycleForm({
      name: cycle.name,
      cycleType: cycle.cycleType,
      startDate: cycle.startDate?.split(' ')[0] || '',
      endDate: cycle.endDate?.split(' ')[0] || '',
      reviewStartDate: cycle.reviewStartDate?.split(' ')[0] || '',
      reviewEndDate: cycle.reviewEndDate?.split(' ')[0] || '',
      status: cycle.status,
      isActive: cycle.isActive,
    });
    setShowCycleForm(true);
  };

  const handleSaveCycle = async () => {
    if (!cycleForm.name || !cycleForm.startDate || !cycleForm.endDate) return;
    setIsProcessing(true);
    try {
      const data: any = {
        name: cycleForm.name,
        cycleType: cycleForm.cycleType,
        startDate: cycleForm.startDate,
        endDate: cycleForm.endDate,
        reviewStartDate: cycleForm.reviewStartDate,
        reviewEndDate: cycleForm.reviewEndDate,
        status: cycleForm.status,
        isActive: cycleForm.isActive,
        activeCompetencies: competencies.map(c => c.id),
        organizationId: '',
      };
      if (editingCycle) {
        await hrService.updateReviewCycle(editingCycle.id, data);
      } else {
        await hrService.createReviewCycle(data);
      }
      resetCycleForm();
      onRefresh();
    } catch (e) {
      console.error('Failed to save cycle:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteCycle = async (id: string) => {
    if (!confirm('Delete this review cycle? This cannot be undone.')) return;
    setIsProcessing(true);
    try {
      await hrService.deleteReviewCycle(id);
      onRefresh();
    } catch (e) {
      console.error('Failed to delete cycle:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalize = async () => {
    if (!selectedReview || !overallRating || readOnly) return;
    setIsProcessing(true);
    try {
      await hrService.finalizeReview(selectedReview.id, finalRemarks, overallRating, user.id);
      setSelectedReviewId(null);
      setFinalRemarks('');
      setOverallRating('');
      onRefresh();
    } catch (e) {
      console.error('Failed to finalize review:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!confirm('Delete this performance review? This cannot be undone.')) return;
    setIsProcessing(true);
    try {
      await hrService.deleteReview(id);
      setSelectedReviewId(null);
      onRefresh();
    } catch (e) {
      console.error('Failed to delete review:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const openCreateReview = () => {
    setEditingReview(null);
    setShowReviewModal(true);
  };

  const openEditReview = (review: PerformanceReview) => {
    setEditingReview(review);
    setShowReviewModal(true);
  };

  // ─── Review Settings Handlers ──────────────────────────────────

  const openSettings = () => {
    setEditConfig(JSON.parse(JSON.stringify(reviewConfig)));
    setShowSettings(true);
    setEditingCompetencyIdx(null);
  };

  const openCompetencyForm = (idx: number | null) => {
    setEditingCompetencyIdx(idx);
    if (idx !== null) {
      const c = editConfig.competencies[idx];
      setCompForm({ ...c });
      setCompBehaviorInput('');
    } else {
      setCompForm({ id: '', name: '', description: '', behaviors: [] });
      setCompBehaviorInput('');
    }
  };

  const saveCompetency = () => {
    if (!compForm.name.trim()) return;
    const next = { ...editConfig };
    const comp = {
      ...compForm,
      id: compForm.id || compForm.name.toUpperCase().replace(/\s+/g, '_'),
    };
    if (editingCompetencyIdx !== null) {
      next.competencies[editingCompetencyIdx] = comp;
    } else {
      next.competencies = [...next.competencies, comp];
    }
    setEditConfig(next);
    setEditingCompetencyIdx(null);
  };

  const deleteCompetency = (idx: number) => {
    const next = { ...editConfig };
    next.competencies = next.competencies.filter((_, i) => i !== idx);
    setEditConfig(next);
  };

  const addBehavior = () => {
    if (!compBehaviorInput.trim()) return;
    setCompForm(prev => ({ ...prev, behaviors: [...prev.behaviors, compBehaviorInput.trim()] }));
    setCompBehaviorInput('');
  };

  const removeBehavior = (idx: number) => {
    setCompForm(prev => ({ ...prev, behaviors: prev.behaviors.filter((_, i) => i !== idx) }));
  };

  const updateRatingScaleMax = (max: number) => {
    const labels: { value: number; label: string; color: string }[] = [];
    for (let i = 1; i <= max; i++) {
      const existing = editConfig.ratingScale.labels.find(l => l.value === i);
      labels.push(existing || { value: i, label: `Level ${i}`, color: 'bg-slate-500' });
    }
    setEditConfig(prev => ({ ...prev, ratingScale: { min: 1, max, labels } }));
  };

  const updateRatingLabel = (idx: number, label: string) => {
    const next = { ...editConfig };
    next.ratingScale.labels[idx] = { ...next.ratingScale.labels[idx], label };
    setEditConfig(next);
  };

  const addOverallRating = () => {
    setEditConfig(prev => ({
      ...prev,
      overallRatings: [...prev.overallRatings, { value: `CUSTOM_${Date.now()}`, label: 'New Rating', color: 'bg-slate-500' }],
    }));
  };

  const updateOverallRating = (idx: number, field: string, value: string) => {
    const next = { ...editConfig };
    (next.overallRatings[idx] as any)[field] = value;
    if (field === 'label') {
      next.overallRatings[idx].value = value.toUpperCase().replace(/\s+/g, '_');
    }
    setEditConfig(next);
  };

  const deleteOverallRating = (idx: number) => {
    setEditConfig(prev => ({
      ...prev,
      overallRatings: prev.overallRatings.filter((_, i) => i !== idx),
    }));
  };

  const handleSaveSettings = async () => {
    setIsProcessing(true);
    try {
      await hrService.setReviewConfig(editConfig);
      setShowSettings(false);
      onRefresh();
    } catch (e) {
      console.error('Failed to save review config:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredReviews = filterStatus === 'ALL'
    ? allReviews
    : allReviews.filter(r => r.status === filterStatus);

  const stats = {
    total: allReviews.length,
    draft: allReviews.filter(r => r.status === 'DRAFT').length,
    submitted: allReviews.filter(r => r.status === 'SELF_REVIEW_SUBMITTED').length,
    reviewed: allReviews.filter(r => r.status === 'MANAGER_REVIEWED').length,
    completed: allReviews.filter(r => r.status === 'COMPLETED').length,
  };

  const avgRating = (ratingsArr: { rating: number }[]) => {
    const rated = ratingsArr.filter(r => r.rating > 0);
    if (rated.length === 0) return '—';
    return (rated.reduce((sum, r) => sum + r.rating, 0) / rated.length).toFixed(1);
  };

  const maxRating = ratingScale.max;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings size={20} className="text-primary" />
          <h2 className="text-xl font-bold text-slate-900">HR Review Management</h2>
        </div>
        {!readOnly && (
          <button
            onClick={openSettings}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-primary bg-primary-light/50 rounded-xl hover:bg-primary-light transition-colors"
          >
            <Sliders size={14} /> Review Settings
          </button>
        )}
      </div>

      {/* Stats Row */}
      {allReviews.length > 0 && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-slate-900' },
            { label: 'Draft', value: stats.draft, color: 'text-slate-500' },
            { label: 'Submitted', value: stats.submitted, color: 'text-blue-600' },
            { label: 'Reviewed', value: stats.reviewed, color: 'text-orange-600' },
            { label: 'Completed', value: stats.completed, color: 'text-green-600' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-slate-100 rounded-xl p-3 text-center">
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Cycle Management */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowCycles(!showCycles)}
          className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-primary" />
            <h3 className="font-semibold text-slate-900">Review Cycles ({cycles.length})</h3>
          </div>
          {showCycles ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>

        {showCycles && (
          <div className="px-5 pb-5 space-y-3">
            {cycles.map(cycle => (
              <div key={cycle.id} className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
                <div>
                  <p className="font-medium text-sm text-slate-900">{cycle.name}</p>
                  <p className="text-xs text-slate-400">
                    {cycle.startDate?.split(' ')[0]} — {cycle.endDate?.split(' ')[0]}
                    {cycle.isActive && <span className="ml-2 text-green-600 font-semibold">Active</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    cycle.status === 'OPEN' ? 'bg-green-100 text-green-700' :
                    cycle.status === 'UPCOMING' ? 'bg-blue-100 text-blue-700' :
                    cycle.status === 'CLOSED' ? 'bg-slate-200 text-slate-600' :
                    'bg-slate-100 text-slate-400'
                  }`}>{cycle.status}</span>
                  {!readOnly && (
                    <>
                      <button onClick={() => openEditCycle(cycle)} className="p-1.5 text-slate-400 hover:text-primary">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => handleDeleteCycle(cycle.id)} className="p-1.5 text-slate-400 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {!readOnly && !showCycleForm && (
              <button
                onClick={() => { resetCycleForm(); setShowCycleForm(true); }}
                className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:border-primary/30 hover:text-primary transition-colors"
              >
                <Plus size={16} /> Create Review Cycle
              </button>
            )}

            {showCycleForm && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm text-slate-900">{editingCycle ? 'Edit' : 'New'} Review Cycle</h4>
                  <button onClick={resetCycleForm} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                </div>

                <input
                  type="text"
                  placeholder="Cycle name (e.g., Mid-Year 2025)"
                  value={cycleForm.name}
                  onChange={e => setCycleForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />

                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={cycleForm.cycleType}
                    onChange={e => setCycleForm(f => ({ ...f, cycleType: e.target.value as ReviewCycleType }))}
                    className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {CYCLE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <select
                    value={cycleForm.status}
                    onChange={e => setCycleForm(f => ({ ...f, status: e.target.value as ReviewCycleStatus }))}
                    className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {CYCLE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Period Start</label>
                    <input type="date" value={cycleForm.startDate} onChange={e => setCycleForm(f => ({ ...f, startDate: e.target.value }))}
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Period End</label>
                    <input type="date" value={cycleForm.endDate} onChange={e => setCycleForm(f => ({ ...f, endDate: e.target.value }))}
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Review Opens</label>
                    <input type="date" value={cycleForm.reviewStartDate} onChange={e => setCycleForm(f => ({ ...f, reviewStartDate: e.target.value }))}
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Review Deadline</label>
                    <input type="date" value={cycleForm.reviewEndDate} onChange={e => setCycleForm(f => ({ ...f, reviewEndDate: e.target.value }))}
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={cycleForm.isActive} onChange={e => setCycleForm(f => ({ ...f, isActive: e.target.checked }))}
                    className="rounded border-slate-300" />
                  Set as active cycle
                </label>

                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={resetCycleForm} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Cancel</button>
                  <button
                    onClick={handleSaveCycle}
                    disabled={isProcessing || !cycleForm.name || !cycleForm.startDate || !cycleForm.endDate}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 size={14} className="animate-spin" /> : null}
                    {editingCycle ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* All Reviews List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-primary" />
            <h3 className="font-semibold text-slate-900">All Reviews</h3>
          </div>
          <div className="flex items-center gap-2">
            {!readOnly && (
              <button
                onClick={openCreateReview}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary rounded-lg hover:opacity-90 transition-colors"
              >
                <Plus size={14} /> Create Review
              </button>
            )}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="SELF_REVIEW_SUBMITTED">Submitted</option>
              <option value="MANAGER_REVIEWED">Manager Reviewed</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>

        {filteredReviews.length === 0 && (
          <div className="bg-slate-50 rounded-xl p-6 text-center">
            <p className="text-sm text-slate-400">No reviews found.</p>
          </div>
        )}

        {filteredReviews.map(review => (
          <div
            key={review.id}
            onClick={() => {
              setSelectedReviewId(selectedReviewId === review.id ? null : review.id);
              setFinalRemarks(review.hrFinalRemarks || '');
              setOverallRating(review.hrOverallRating || '');
            }}
            className={`bg-white border rounded-xl p-4 cursor-pointer transition-colors ${
              selectedReviewId === review.id ? 'border-primary/50 ring-2 ring-primary/10' : 'border-slate-100 hover:border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-slate-900">{review.employeeName}</p>
                <p className="text-xs text-slate-400">
                  Manager: {review.managerName || 'None'} | Self Avg: {avgRating(review.selfRatings)}
                  {review.managerRatings.some(r => r.rating > 0) && ` | Mgr Avg: ${avgRating(review.managerRatings)}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!readOnly && (
                  <>
                    <button
                      onClick={e => { e.stopPropagation(); openEditReview(review); }}
                      className="p-1.5 text-slate-400 hover:text-primary transition-colors"
                      title="Edit review"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteReview(review.id); }}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                      title="Delete review"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
                <ReviewStatusBadge status={review.status} />
              </div>
            </div>

            {/* Expanded Detail */}
            {selectedReviewId === review.id && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-4" onClick={e => e.stopPropagation()}>
                <AttendanceLeaveCard attendance={review.attendanceSummary} leave={review.leaveSummary} />

                {/* Self Ratings Summary */}
                {review.selfRatings.some(r => r.rating > 0) && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">Self-Assessment</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {review.selfRatings.filter(r => r.rating > 0).map(r => {
                        const comp = resolveCompetency(r.competencyId);
                        return (
                          <div key={r.competencyId} className="bg-slate-50 rounded-lg p-2">
                            <p className="text-xs font-medium text-slate-700">{comp.name}</p>
                            <p className="text-lg font-bold text-slate-900">{r.rating}<span className="text-xs text-slate-400">/{maxRating}</span></p>
                            {r.comment && <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{r.comment}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Manager Ratings Summary */}
                {review.managerRatings.some(r => r.rating > 0) && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">Manager Assessment</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {review.managerRatings.filter(r => r.rating > 0).map(r => {
                        const comp = resolveCompetency(r.competencyId);
                        return (
                          <div key={r.competencyId} className="bg-slate-50 rounded-lg p-2">
                            <p className="text-xs font-medium text-slate-700">{comp.name}</p>
                            <p className="text-lg font-bold text-slate-900">{r.rating}<span className="text-xs text-slate-400">/{maxRating}</span></p>
                            {r.comment && <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{r.comment}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Finalization Form (for MANAGER_REVIEWED status) */}
                {review.status === 'MANAGER_REVIEWED' && !readOnly && (
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4 space-y-3">
                    <h4 className="font-semibold text-sm text-green-800">Finalize Review</h4>

                    <div>
                      <label className="text-xs text-green-700 font-medium mb-1 block">Overall Rating</label>
                      <select
                        value={overallRating}
                        onChange={e => setOverallRating(e.target.value)}
                        className="w-full text-sm border border-green-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-200 bg-white"
                      >
                        <option value="">Select rating...</option>
                        {overallRatings.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-green-700 font-medium mb-1 block">Final Remarks</label>
                      <textarea
                        value={finalRemarks}
                        onChange={e => setFinalRemarks(e.target.value)}
                        placeholder="Add final HR remarks..."
                        className="w-full text-sm border border-green-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-green-200 bg-white"
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleFinalize}
                        disabled={isProcessing || !overallRating}
                        className="inline-flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 disabled:opacity-50"
                      >
                        {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        Finalize
                      </button>
                    </div>
                  </div>
                )}

                {/* Already Completed */}
                {review.status === 'COMPLETED' && (
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 size={16} className="text-green-600" />
                      <h4 className="font-semibold text-sm text-green-800">Finalized</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-green-600 font-medium">Overall Rating</p>
                        <p className="font-bold text-green-900">{review.hrOverallRating?.replace(/_/g, ' ') || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-green-600 font-medium">Completed</p>
                        <p className="font-bold text-green-900">{review.completedAt ? new Date(review.completedAt).toLocaleDateString() : '—'}</p>
                      </div>
                    </div>
                    {review.hrFinalRemarks && (
                      <div className="mt-2">
                        <p className="text-xs text-green-600 font-medium">HR Remarks</p>
                        <p className="text-sm text-green-800">{review.hrFinalRemarks}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ─── Admin Review Form Modal ───────────────────────────── */}
      {showReviewModal && (
        <AdminReviewFormModal
          mode={editingReview ? 'edit' : 'create'}
          review={editingReview}
          employees={employees}
          cycles={cycles}
          onClose={() => { setShowReviewModal(false); setEditingReview(null); }}
          onSaved={() => { setShowReviewModal(false); setEditingReview(null); onRefresh(); }}
        />
      )}

      {/* ─── Review Settings Modal ──────────────────────────────── */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 bg-primary text-white flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-3">
                <Sliders size={20} />
                <h3 className="text-lg font-semibold uppercase tracking-tight">Review Settings</h3>
              </div>
              <button onClick={() => setShowSettings(false)} className="hover:bg-white/10 p-2 rounded-lg"><X size={24} /></button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Competencies Section */}
              <div>
                <h4 className="font-semibold text-sm text-slate-900 mb-3">Competencies ({editConfig.competencies.length})</h4>
                <div className="space-y-2">
                  {editConfig.competencies.map((comp, idx) => (
                    <div key={comp.id} className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
                      <div>
                        <p className="font-medium text-sm text-slate-900">{comp.name}</p>
                        <p className="text-[10px] text-slate-400">{comp.description.slice(0, 80)}{comp.description.length > 80 ? '...' : ''}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openCompetencyForm(idx)} className="p-1.5 text-slate-400 hover:text-primary"><Edit3 size={14} /></button>
                        <button onClick={() => deleteCompetency(idx)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>

                {editingCompetencyIdx !== null || editingCompetencyIdx === null ? null : null}
                {/* Competency Form */}
                {editingCompetencyIdx !== undefined && editingCompetencyIdx !== null ? (
                  <div className="mt-3 bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    <h5 className="font-semibold text-xs text-slate-700">Edit Competency</h5>
                    <input placeholder="Name" className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" value={compForm.name} onChange={e => setCompForm(p => ({ ...p, name: e.target.value }))} />
                    <textarea placeholder="Description" className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" rows={2} value={compForm.description} onChange={e => setCompForm(p => ({ ...p, description: e.target.value }))} />
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Behaviors</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {compForm.behaviors.map((b, i) => (
                          <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                            {b} <button onClick={() => removeBehavior(i)} className="text-slate-400 hover:text-red-500"><X size={10} /></button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input placeholder="Add behavior..." className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5" value={compBehaviorInput} onChange={e => setCompBehaviorInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addBehavior())} />
                        <button type="button" onClick={addBehavior} className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-semibold hover:bg-slate-200">Add</button>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingCompetencyIdx(null)} className="px-3 py-1.5 text-xs text-slate-500">Cancel</button>
                      <button onClick={saveCompetency} className="px-4 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold">Save</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => openCompetencyForm(null)}
                    className="mt-3 w-full flex items-center justify-center gap-2 p-2.5 border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-500 hover:border-primary/30 hover:text-primary"
                  >
                    <Plus size={14} /> Add Competency
                  </button>
                )}
                {/* Show add form when adding new (editingCompetencyIdx is null but form was opened) */}
              </div>

              {/* Rating Scale Section */}
              <div>
                <h4 className="font-semibold text-sm text-slate-900 mb-3">Rating Scale (1—{editConfig.ratingScale.max})</h4>
                <div className="flex items-center gap-3 mb-3">
                  <label className="text-xs text-slate-500">Max Rating:</label>
                  <input type="number" min={2} max={10} className="w-20 text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-center font-bold" value={editConfig.ratingScale.max} onChange={e => updateRatingScaleMax(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  {editConfig.ratingScale.labels.map((label, idx) => (
                    <div key={label.value} className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-600 w-6 text-center">{label.value}</span>
                      <input className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5" value={label.label} onChange={e => updateRatingLabel(idx, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Overall Ratings Section */}
              <div>
                <h4 className="font-semibold text-sm text-slate-900 mb-3">Overall HR Ratings</h4>
                <div className="space-y-2">
                  {editConfig.overallRatings.map((rating, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5" value={rating.label} onChange={e => updateOverallRating(idx, 'label', e.target.value)} placeholder="Label" />
                      <button onClick={() => deleteOverallRating(idx)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addOverallRating}
                  className="mt-2 w-full flex items-center justify-center gap-2 p-2 border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-500 hover:border-primary/30 hover:text-primary"
                >
                  <Plus size={14} /> Add Rating Option
                </button>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
              <button onClick={() => setShowSettings(false)} className="px-5 py-2.5 text-sm text-slate-600 hover:text-slate-900">Cancel</button>
              <button
                onClick={handleSaveSettings}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRReviewModule;
