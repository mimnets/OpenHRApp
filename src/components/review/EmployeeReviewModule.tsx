
import React, { useState, useEffect } from 'react';
import { Send, FileText, ChevronDown, ChevronUp, Loader2, CheckCircle2, Calendar, Download, RefreshCw } from 'lucide-react';
import { hrService } from '../../services/hrService';
import { apiClient } from '../../services/api.client';
import { PerformanceReview, ReviewCycle, CompetencyRating, OrgReviewConfig, CustomCompetency } from '../../types';
import CompetencyRatingCard from './CompetencyRatingCard';
import AttendanceLeaveCard from './AttendanceLeaveCard';
import ReviewStatusBadge from './ReviewStatusBadge';
import HelpButton from '../onboarding/HelpButton';

const fetchImageAsDataUrl = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
};

const getScaledLogoDims = (dataUrl: string, maxSize: number): Promise<{ w: number; h: number }> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxSize / img.naturalWidth, maxSize / img.naturalHeight);
      resolve({ w: img.naturalWidth * ratio, h: img.naturalHeight * ratio });
    };
    img.onerror = () => resolve({ w: maxSize, h: maxSize });
    img.src = dataUrl;
  });

interface Props {
  user: any;
  activeCycle: ReviewCycle | null;
  upcomingCycle?: ReviewCycle | null;
  myReview: PerformanceReview | null;
  pastReviews: PerformanceReview[];
  onRefresh: () => void;
  readOnly?: boolean;
  reviewConfig: OrgReviewConfig;
  cycles?: ReviewCycle[];
}

const EmployeeReviewModule: React.FC<Props> = ({ user, activeCycle, upcomingCycle, myReview, pastReviews, onRefresh, readOnly = false, reviewConfig, cycles }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);

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

  // Sync ratings state when competencies change (e.g. new competency added in settings)
  useEffect(() => {
    setRatings(prev => {
      const updated = { ...prev };
      let changed = false;
      competencies.forEach(c => {
        if (!(c.id in updated)) {
          const existing = myReview?.selfRatings.find(r => r.competencyId === c.id);
          updated[c.id] = { rating: existing?.rating || 0, comment: existing?.comment || '' };
          changed = true;
        }
      });
      return changed ? updated : prev;
    });
  }, [competencies, myReview]);

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

  const generateReviewPdf = async (review: PerformanceReview, cycleName?: string) => {
    setGeneratingPdfId(review.id);
    try {
      // Fetch org info
      let orgName = '', orgAddress = '', logoDataUrl: string | null = null;
      try {
        const orgId = apiClient.getOrganizationId();
        if (orgId && apiClient.pb) {
          const org = await apiClient.pb.collection('organizations').getOne(orgId);
          orgName = org.name || '';
          orgAddress = org.address || '';
          if (org.logo) {
            const logoUrl = apiClient.pb.files.getURL(org, org.logo);
            logoDataUrl = await fetchImageAsDataUrl(logoUrl);
          }
        }
      } catch { /* proceed without org info */ }

      const resolvedCycleName = cycleName || cycles?.find(c => c.id === review.cycleId)?.name || review.cycleId;

      const jsPDFModule = await import('jspdf');
      const autoTableModule = await import('jspdf-autotable');
      const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF;
      if (autoTableModule.applyPlugin) autoTableModule.applyPlugin(jsPDF);

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 15;

      // Header: logo + org name + address
      const logoSize = 18;
      let textStartX = 14;
      if (logoDataUrl) {
        try {
          const logoDims = await getScaledLogoDims(logoDataUrl, logoSize);
          doc.addImage(logoDataUrl, 'PNG', 14, y - 4, logoDims.w, logoDims.h);
          textStartX = 14 + logoDims.w + 5;
        } catch { /* skip logo */ }
      }
      if (orgName) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(orgName, textStartX, y + 2);
        if (orgAddress) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.text(orgAddress, textStartX, y + 8);
        }
      }
      y += 20;

      // HR line
      doc.setDrawColor(200);
      doc.setLineWidth(0.5);
      doc.line(14, y, pageWidth - 14, y);
      y += 12;

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Performance Review Report', pageWidth / 2, y, { align: 'center' });
      y += 10;

      // Cycle name
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(resolvedCycleName, pageWidth / 2, y, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      y += 10;

      // Helper for sections
      const pageHeight = doc.internal.pageSize.getHeight();
      const checkPageBreak = (needed: number) => {
        if (y + needed > pageHeight - 15) {
          doc.addPage();
          y = 20;
        }
      };

      const drawSection = (title: string, rows: [string, string][]) => {
        checkPageBreak(20);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 80);
        doc.text(title, 14, y);
        y += 2;
        doc.setDrawColor(220);
        doc.line(14, y, pageWidth - 14, y);
        y += 6;

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        rows.forEach(([label, value]) => {
          checkPageBreak(10);
          doc.setFont('helvetica', 'bold');
          doc.text(label + ':', 18, y);
          doc.setFont('helvetica', 'normal');
          const lines = doc.splitTextToSize(value || 'N/A', pageWidth - 70);
          doc.text(lines, 65, y);
          y += lines.length * 5 + 2;
        });
        y += 4;
      };

      // Employee Info
      drawSection('Employee Information', [
        ['Name', review.employeeName || user.name || ''],
        ['Employee ID', user.employeeId || ''],
        ['Department', user.department || ''],
        ['Designation', user.designation || ''],
        ['Manager', review.managerName || 'N/A'],
      ]);

      // Attendance Summary
      const att = review.attendanceSummary;
      drawSection('Attendance Summary', [
        ['Total Working Days', String(att.totalWorkingDays)],
        ['Present', String(att.presentDays)],
        ['Late', String(att.lateDays)],
        ['Absent', String(att.absentDays)],
        ['Early Out', String(att.earlyOutDays)],
        ['Attendance %', `${att.attendancePercentage}%`],
      ]);

      // Leave Summary
      const leaveRows: [string, string][] = Object.entries(review.leaveSummary.typeBreakdown || {}).map(
        ([type, days]) => [type.replace(/_/g, ' '), String(days)]
      );
      leaveRows.push(['Total Leave Days', String(review.leaveSummary.totalLeaveDays)]);
      drawSection('Leave Summary', leaveRows);

      // Competency Ratings Table
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text('Competency Ratings', 14, y);
      y += 2;
      doc.setDrawColor(220);
      doc.line(14, y, pageWidth - 14, y);
      y += 4;

      const tableBody = competencies.map(comp => {
        const selfR = review.selfRatings.find(r => r.competencyId === comp.id);
        const mgrR = review.managerRatings.find(r => r.competencyId === comp.id);
        return [
          comp.name,
          selfR?.rating ? `${selfR.rating}/${maxRating}` : '-',
          selfR?.comment || '-',
          mgrR?.rating ? `${mgrR.rating}/${maxRating}` : '-',
          mgrR?.comment || '-',
        ];
      });

      (doc as any).autoTable({
        startY: y,
        head: [['Competency', 'Self Rating', 'Self Comment', 'Manager Rating', 'Manager Comment']],
        body: tableBody,
        margin: { left: 14, right: 14 },
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [70, 70, 70] },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 18, halign: 'center' },
          2: { cellWidth: 45 },
          3: { cellWidth: 18, halign: 'center' },
          4: { cellWidth: 45 },
        },
      });
      y = (doc as any).lastAutoTable.finalY + 8;

      // Rating Summary
      drawSection('Rating Summary', [
        ['Self Average', `${avgRating(review.selfRatings)}/${maxRating}`],
        ['Manager Average', `${avgRating(review.managerRatings)}/${maxRating}`],
      ]);

      // HR Final Assessment (only if COMPLETED)
      if (review.status === 'COMPLETED') {
        drawSection('HR Final Assessment', [
          ['Overall Rating', review.hrOverallRating?.replace(/_/g, ' ') || 'N/A'],
          ['HR Remarks', review.hrFinalRemarks || 'N/A'],
        ]);
      }

      // Signature lines — ensure they fit on the page
      const sigSpaceNeeded = 30; // space needed for signature block
      if (y + sigSpaceNeeded > pageHeight - 15) {
        doc.addPage();
        y = 30;
      }
      const sigY = y + 20;
      doc.setDrawColor(0);
      doc.setLineWidth(0.3);
      doc.line(25, sigY, 90, sigY);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Employee Signature', 35, sigY + 5);
      doc.setFont('helvetica', 'bold');
      doc.text(review.employeeName || user.name || '', 40, sigY + 10);
      doc.line(pageWidth - 90, sigY, pageWidth - 25, sigY);
      doc.setFont('helvetica', 'normal');
      doc.text('Manager/Approver Signature', pageWidth - 85, sigY + 5);
      doc.setFont('helvetica', 'bold');
      doc.text(review.managerName || 'N/A', pageWidth - 70, sigY + 10);

      const safeCycleName = resolvedCycleName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeName = (review.employeeName || user.name || 'Employee').replace(/[^a-zA-Z0-9_-]/g, '_');
      doc.save(`Performance_Review_${safeCycleName}_${safeName}.pdf`);
    } catch (err) {
      console.error('Failed to generate review PDF', err);
    } finally {
      setGeneratingPdfId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2"><h2 className="text-xl font-bold text-slate-900">My Performance Review</h2><HelpButton helpPointId="review.employee" size={16} /></div>
          <p className="text-sm text-slate-500 mt-0.5">
            {activeCycle
              ? `${activeCycle.name} — ${new Date(activeCycle.startDate).toLocaleDateString()} to ${new Date(activeCycle.endDate).toLocaleDateString()}`
              : 'No active review cycle'}
          </p>
        </div>
        {myReview && (
          <div className="flex items-center gap-2">
            {(myReview.status === 'MANAGER_REVIEWED' || myReview.status === 'COMPLETED') && (
              <button
                onClick={() => generateReviewPdf(myReview, activeCycle?.name)}
                disabled={generatingPdfId === myReview.id}
                className="p-2 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/10 transition-all disabled:opacity-50"
                title="Download PDF"
              >
                {generatingPdfId === myReview.id ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
              </button>
            )}
            <ReviewStatusBadge status={myReview.status} />
          </div>
        )}
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
                      <p className="font-medium text-sm text-slate-900">Cycle: {cycles?.find(c => c.id === review.cycleId)?.name || review.cycleId}</p>
                      <p className="text-xs text-slate-400">Self Avg: {avgRating(review.selfRatings)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {(review.status === 'MANAGER_REVIEWED' || review.status === 'COMPLETED') && (
                        <button
                          onClick={(e) => { e.stopPropagation(); generateReviewPdf(review); }}
                          disabled={generatingPdfId === review.id}
                          className="p-2 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/10 transition-all disabled:opacity-50"
                          title="Download PDF"
                        >
                          {generatingPdfId === review.id ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                        </button>
                      )}
                      <ReviewStatusBadge status={review.status} />
                    </div>
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
