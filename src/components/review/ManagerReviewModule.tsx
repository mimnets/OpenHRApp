
import React, { useState, useEffect } from 'react';
import { Users, Send, Loader2 } from 'lucide-react';
import { hrService } from '../../services/hrService';
import { PerformanceReview, CompetencyRating, OrgReviewConfig } from '../../types';
import CompetencyRatingCard from './CompetencyRatingCard';
import AttendanceLeaveCard from './AttendanceLeaveCard';
import ReviewStatusBadge from './ReviewStatusBadge';
import HelpButton from '../onboarding/HelpButton';

interface Props {
  user: any;
  directReportReviews: PerformanceReview[];
  onRefresh: () => void;
  readOnly?: boolean;
  reviewConfig: OrgReviewConfig;
}

const ManagerReviewModule: React.FC<Props> = ({ user: _user, directReportReviews, onRefresh, readOnly = false, reviewConfig }) => {
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const competencies = reviewConfig.competencies;
  const ratingScale = reviewConfig.ratingScale.labels;

  const [managerRatings, setManagerRatings] = useState<Record<string, { rating: number; comment: string }>>(() => {
    const initial: any = {};
    competencies.forEach(c => {
      initial[c.id] = { rating: 0, comment: '' };
    });
    return initial;
  });

  // Sync managerRatings state when competencies change (e.g. new competency added in settings)
  useEffect(() => {
    setManagerRatings(prev => {
      const updated = { ...prev };
      let changed = false;
      competencies.forEach(c => {
        if (!(c.id in updated)) {
          updated[c.id] = { rating: 0, comment: '' };
          changed = true;
        }
      });
      return changed ? updated : prev;
    });
  }, [competencies]);

  const pendingReviews = directReportReviews.filter(r => r.status === 'SELF_REVIEW_SUBMITTED');
  const reviewedByMe = directReportReviews.filter(r => r.status === 'MANAGER_REVIEWED' || r.status === 'COMPLETED');
  const selectedReview = directReportReviews.find(r => r.id === selectedReviewId);

  const openReview = (review: PerformanceReview) => {
    setSelectedReviewId(review.id);
    const initial: any = {};
    competencies.forEach(c => {
      const existing = review.managerRatings.find(r => r.competencyId === c.id);
      initial[c.id] = { rating: existing?.rating || 0, comment: existing?.comment || '' };
    });
    setManagerRatings(initial);
  };

  const canRate = selectedReview?.status === 'SELF_REVIEW_SUBMITTED' && !readOnly;
  const allRated = competencies.every(c => managerRatings[c.id]?.rating > 0);

  const handleSubmit = async () => {
    if (!selectedReview || !canRate || !allRated) return;
    setIsProcessing(true);
    try {
      const ratings: CompetencyRating[] = competencies.map(c => ({
        competencyId: c.id,
        rating: managerRatings[c.id].rating,
        comment: managerRatings[c.id].comment,
      }));
      await hrService.submitManagerReview(selectedReview.id, ratings);
      setSelectedReviewId(null);
      onRefresh();
    } catch (e) {
      console.error('Failed to submit manager review:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const updateRating = (id: string, rating: number) => {
    setManagerRatings(prev => ({ ...prev, [id]: { ...prev[id], rating } }));
  };

  const updateComment = (id: string, comment: string) => {
    setManagerRatings(prev => ({ ...prev, [id]: { ...prev[id], comment } }));
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Users size={20} className="text-primary" />
          <div className="flex items-center gap-2"><h2 className="text-xl font-bold text-slate-900">Team Reviews</h2><HelpButton helpPointId="review.manager" size={16} /></div>
        </div>
        <p className="text-sm text-slate-500">Review and rate your direct reports' performance assessments.</p>
      </div>

      {directReportReviews.length === 0 && (
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-8 text-center">
          <Users size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No reviews from your direct reports yet.</p>
        </div>
      )}

      {/* Pending Reviews List */}
      {pendingReviews.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Awaiting Your Review ({pendingReviews.length})</h3>
          <div className="space-y-2">
            {pendingReviews.map(review => (
              <button
                key={review.id}
                onClick={() => openReview(review)}
                className={`w-full text-left bg-white border rounded-xl p-4 hover:border-primary/30 transition-colors ${
                  selectedReviewId === review.id ? 'border-primary/50 ring-2 ring-primary/10' : 'border-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm text-slate-900">{review.employeeName}</p>
                    <p className="text-xs text-slate-400">Submitted {review.submittedAt ? new Date(review.submittedAt).toLocaleDateString() : 'recently'}</p>
                  </div>
                  <ReviewStatusBadge status={review.status} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Review Detail */}
      {selectedReview && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900">{selectedReview.employeeName}'s Review</h3>
            <button onClick={() => setSelectedReviewId(null)} className="text-xs text-slate-400 hover:text-slate-600">
              Close
            </button>
          </div>

          <AttendanceLeaveCard attendance={selectedReview.attendanceSummary} leave={selectedReview.leaveSummary} />

          {/* Side-by-side: Self vs Manager Ratings */}
          <div className="space-y-3">
            {competencies.map(comp => {
              const selfRating = selectedReview.selfRatings.find(r => r.competencyId === comp.id);
              return (
                <div key={comp.id} className="space-y-2">
                  {/* Employee's self-rating (read-only) */}
                  <CompetencyRatingCard
                    competencyName={comp.name}
                    description={comp.description}
                    behaviors={comp.behaviors}
                    rating={selfRating?.rating || 0}
                    comment={selfRating?.comment || ''}
                    readOnly
                    label="Employee Self"
                    ratingScale={ratingScale}
                  />
                  {/* Manager's rating */}
                  <CompetencyRatingCard
                    competencyName={comp.name}
                    description=""
                    behaviors={[]}
                    rating={managerRatings[comp.id]?.rating || 0}
                    comment={managerRatings[comp.id]?.comment || ''}
                    onRatingChange={canRate ? (v) => updateRating(comp.id, v) : undefined}
                    onCommentChange={canRate ? (v) => updateComment(comp.id, v) : undefined}
                    readOnly={!canRate}
                    label="Your Rating"
                    ratingScale={ratingScale}
                  />
                </div>
              );
            })}
          </div>

          {canRate && (
            <div className="flex justify-end pt-2">
              <button
                onClick={handleSubmit}
                disabled={isProcessing || !allRated}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50"
              >
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Submit Manager Review
              </button>
            </div>
          )}
          {canRate && !allRated && (
            <p className="text-xs text-slate-400 text-right">Please rate all {competencies.length} competencies before submitting.</p>
          )}
        </div>
      )}

      {/* Already Reviewed */}
      {reviewedByMe.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Reviewed ({reviewedByMe.length})</h3>
          <div className="space-y-2">
            {reviewedByMe.map(review => (
              <div key={review.id} className="bg-white border border-slate-100 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-slate-900">{review.employeeName}</p>
                    <p className="text-xs text-slate-400">
                      Reviewed {review.managerReviewedAt ? new Date(review.managerReviewedAt).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <ReviewStatusBadge status={review.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerReviewModule;
