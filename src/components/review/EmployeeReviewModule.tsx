
import React, { useState } from 'react';
import { Send, FileText, ChevronDown, ChevronUp, Loader2, CheckCircle2, Calendar } from 'lucide-react';
import { hrService } from '../../services/hrService';
import { PerformanceReview, ReviewCycle, CompetencyRating, OrgReviewConfig, CustomCompetency } from '../../types';
import CompetencyRatingCard from './CompetencyRatingCard';
import AttendanceLeaveCard from './AttendanceLeaveCard';
import ReviewStatusBadge from './ReviewStatusBadge';

interface Props {
  user: any;
  activeCycle: ReviewCycle | null;
  upcomingCycle?: ReviewCycle | null;
  myReview: PerformanceReview | null;
  pastReviews: PerformanceReview[];
  onRefresh: () => void;
  readOnly?: boolean;
  reviewConfig: OrgReviewConfig;
}

const EmployeeReviewModule: React.FC<Props> = ({ user, activeCycle, upcomingCycle, myReview, pastReviews, onRefresh, readOnly = false, reviewConfig }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const competencies = reviewConfig.competencies;
  const ratingScale = reviewConfig.ratingScale.labels;

  const [ratings, setRatings] = useState<Record<string, { rating: number; comment: string }>>(() => {
    const initial: any = {};
    competencies.forEach(c => {
      const existing = myReview?.selfRatings.find(r => r.competencyId === c.id);
      initial[c.id] = {
        rating: existing?.rating || 0,
        comment: existing?.comment || '',
      };
    });
    return initial;
  });

  const canSubmit = myReview?.status === 'DRAFT' && !readOnly;
  const allRated = competencies.every(c => ratings[c.id]?.rating > 0);

  const handleCreateAndOpen = async () => {
    if (!activeCycle || readOnly) return;
    setIsProcessing(true);
    try {
      const employees = await hrService.getEmployees();
      const me = employees.find((e: any) => e.id === user.id);
      const manager = me?.lineManagerId ? employees.find((e: any) => e.id === me.lineManagerId) : null;

      await hrService.createReview(
        activeCycle.id,
        user.id,
        user.name,
        me?.lineManagerId || manager?.id,
        manager?.name,
      );
      onRefresh();
    } catch (e) {
      console.error('Failed to create review:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async () => {
    if (!myReview || !canSubmit || !allRated) return;
    setIsProcessing(true);
    try {
      const selfRatings: CompetencyRating[] = competencies.map(c => ({
        competencyId: c.id,
        rating: ratings[c.id].rating,
        comment: ratings[c.id].comment,
      }));
      await hrService.submitSelfAssessment(myReview.id, selfRatings);
      onRefresh();
    } catch (e) {
      console.error('Failed to submit self-assessment:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const updateRating = (id: string, rating: number) => {
    setRatings(prev => ({ ...prev, [id]: { ...prev[id], rating } }));
  };

  const updateComment = (id: string, comment: string) => {
    setRatings(prev => ({ ...prev, [id]: { ...prev[id], comment } }));
  };

  const avgRating = (ratingsArr: CompetencyRating[]) => {
    const rated = ratingsArr.filter(r => r.rating > 0);
    if (rated.length === 0) return 0;
    return (rated.reduce((sum, r) => sum + r.rating, 0) / rated.length).toFixed(1);
  };

  // Resolve competency info: try org config first, then fall back for legacy IDs
  const resolveCompetency = (competencyId: string): CustomCompetency => {
    const found = competencies.find(c => c.id === competencyId);
    if (found) return found;
    return { id: competencyId, name: competencyId.replace(/_/g, ' '), description: '', behaviors: [] };
  };

  const maxRating = reviewConfig.ratingScale.max;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">My Performance Review</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {activeCycle
              ? `${activeCycle.name} — ${new Date(activeCycle.startDate).toLocaleDateString()} to ${new Date(activeCycle.endDate).toLocaleDateString()}`
              : 'No active review cycle'}
          </p>
        </div>
        {myReview && <ReviewStatusBadge status={myReview.status} />}
      </div>

      {/* No Active Cycle */}
      {!activeCycle && !upcomingCycle && (
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-8 text-center">
          <FileText size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No active review cycle at this time.</p>
          <p className="text-xs text-slate-400 mt-1">Your HR team will open a cycle when it's time for reviews.</p>
        </div>
      )}

      {/* Upcoming Cycle Preview */}
      {!activeCycle && upcomingCycle && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-center">
          <Calendar size={36} className="mx-auto text-blue-400 mb-3" />
          <p className="font-semibold text-blue-800">{upcomingCycle.name}</p>
          <p className="text-sm text-blue-600 mt-1">
            Review period: {new Date(upcomingCycle.startDate).toLocaleDateString()} — {new Date(upcomingCycle.endDate).toLocaleDateString()}
          </p>
          <p className="text-xs text-blue-500 mt-2">
            Opens on <span className="font-semibold">{new Date(upcomingCycle.reviewStartDate).toLocaleDateString()}</span> — you'll be able to start your self-assessment then.
          </p>
        </div>
      )}

      {/* Active Cycle but no review created yet */}
      {activeCycle && !myReview && (
        <div className="bg-primary-light/30 border border-primary/10 rounded-2xl p-6 text-center">
          <FileText size={40} className="mx-auto text-primary mb-3" />
          <p className="text-slate-700 font-medium mb-3">A review cycle is open. Start your self-assessment now.</p>
          <button
            onClick={handleCreateAndOpen}
            disabled={isProcessing || readOnly}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50"
          >
            {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            Begin Self-Assessment
          </button>
        </div>
      )}

      {/* Active Review Form */}
      {myReview && (
        <div className="space-y-4">
          {/* Attendance & Leave */}
          <AttendanceLeaveCard
            attendance={myReview.attendanceSummary}
            leave={myReview.leaveSummary}
          />

          {/* Self-Assessment Competencies */}
          <div>
            <h3 className="font-semibold text-slate-800 mb-3">Self-Assessment</h3>
            <div className="space-y-3">
              {competencies.map(comp => (
                <CompetencyRatingCard
                  key={comp.id}
                  competencyName={comp.name}
                  description={comp.description}
                  behaviors={comp.behaviors}
                  rating={canSubmit ? (ratings[comp.id]?.rating || 0) : (myReview.selfRatings.find(r => r.competencyId === comp.id)?.rating || 0)}
                  comment={canSubmit ? (ratings[comp.id]?.comment || '') : (myReview.selfRatings.find(r => r.competencyId === comp.id)?.comment || '')}
                  onRatingChange={canSubmit ? (v) => updateRating(comp.id, v) : undefined}
                  onCommentChange={canSubmit ? (v) => updateComment(comp.id, v) : undefined}
                  readOnly={!canSubmit}
                  label="Self"
                  ratingScale={ratingScale}
                />
              ))}
            </div>
          </div>

          {/* Manager Ratings (visible after manager review) */}
          {(myReview.status === 'MANAGER_REVIEWED' || myReview.status === 'COMPLETED') && (
            <div>
              <h3 className="font-semibold text-slate-800 mb-3">Manager Assessment</h3>
              <div className="space-y-3">
                {myReview.managerRatings.filter(r => r.rating > 0).map(mRating => {
                  const comp = resolveCompetency(mRating.competencyId);
                  return (
                    <CompetencyRatingCard
                      key={mRating.competencyId}
                      competencyName={comp.name}
                      description={comp.description}
                      behaviors={comp.behaviors}
                      rating={mRating.rating}
                      comment={mRating.comment}
                      readOnly
                      label="Manager"
                      ratingScale={ratingScale}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* HR Final Remarks (visible when completed) */}
          {myReview.status === 'COMPLETED' && (
            <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={18} className="text-green-600" />
                <h3 className="font-semibold text-green-800">Final Assessment</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-green-600 font-medium mb-1">Overall Rating</p>
                  <p className="font-bold text-green-900">{myReview.hrOverallRating?.replace(/_/g, ' ') || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-green-600 font-medium mb-1">Self Average</p>
                  <p className="font-bold text-green-900">{avgRating(myReview.selfRatings)}</p>
                </div>
              </div>
              {myReview.hrFinalRemarks && (
                <div className="mt-3">
                  <p className="text-xs text-green-600 font-medium mb-1">HR Remarks</p>
                  <p className="text-sm text-green-800">{myReview.hrFinalRemarks}</p>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          {canSubmit && (
            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={isProcessing || !allRated}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50"
              >
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Submit Self-Assessment
              </button>
            </div>
          )}
          {canSubmit && !allRated && (
            <p className="text-xs text-slate-400 text-right">Please rate all {competencies.length} competencies before submitting.</p>
          )}
        </div>
      )}

      {/* Past Reviews History */}
      {pastReviews.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Past Reviews ({pastReviews.length})
          </button>
          {showHistory && (
            <div className="mt-3 space-y-2">
              {pastReviews.map(review => (
                <div
                  key={review.id}
                  className="bg-white border border-slate-100 rounded-xl p-4 cursor-pointer hover:border-slate-200 transition-colors"
                  onClick={() => setExpandedHistoryId(expandedHistoryId === review.id ? null : review.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-slate-900">Cycle: {review.cycleId}</p>
                      <p className="text-xs text-slate-400">Self Avg: {avgRating(review.selfRatings)}</p>
                    </div>
                    <ReviewStatusBadge status={review.status} />
                  </div>
                  {expandedHistoryId === review.id && (
                    <div className="mt-3 pt-3 border-t border-slate-50">
                      <AttendanceLeaveCard attendance={review.attendanceSummary} leave={review.leaveSummary} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeeReviewModule;
