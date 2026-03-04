
import { apiClient } from './api.client';
import {
  ReviewCycle,
  PerformanceReview,
  CompetencyRating,
  AttendanceSummary,
  LeaveSummary,
  CompetencyId,
  HROverallRating,
} from '../types';
import { consolidateAttendance } from '../utils/attendanceUtils';

const COMPETENCY_KEYS: CompetencyId[] = [
  'AGILITY',
  'COLLABORATION',
  'CUSTOMER_FOCUS',
  'DEVELOPING_OTHERS',
  'GLOBAL_MINDSET',
  'INNOVATION_MINDSET',
];

const competencyFieldName = (id: CompetencyId): string => {
  return id.toLowerCase(); // e.g. CUSTOMER_FOCUS -> customer_focus
};

const mapCycleRecord = (r: any): ReviewCycle => ({
  id: r.id,
  name: r.name,
  cycleType: r.cycle_type,
  startDate: r.start_date,
  endDate: r.end_date,
  reviewStartDate: r.review_start_date,
  reviewEndDate: r.review_end_date,
  activeCompetencies: r.active_competencies || COMPETENCY_KEYS,
  isActive: r.is_active || false,
  status: r.status || 'UPCOMING',
  organizationId: r.organization_id,
});

const mapReviewRecord = (r: any): PerformanceReview => {
  const selfRatings: CompetencyRating[] = COMPETENCY_KEYS.map(id => ({
    competencyId: id,
    rating: r[`self_${competencyFieldName(id)}_rating`] || 0,
    comment: r[`self_${competencyFieldName(id)}_comment`] || '',
  }));

  const managerRatings: CompetencyRating[] = COMPETENCY_KEYS.map(id => ({
    competencyId: id,
    rating: r[`manager_${competencyFieldName(id)}_rating`] || 0,
    comment: r[`manager_${competencyFieldName(id)}_comment`] || '',
  }));

  return {
    id: r.id,
    employeeId: r.employee_id || '',
    employeeName: r.employee_name || '',
    cycleId: r.cycle_id || '',
    lineManagerId: r.line_manager_id || undefined,
    managerName: r.manager_name || undefined,
    status: r.status || 'DRAFT',
    submittedAt: r.submitted_at || undefined,
    managerReviewedAt: r.manager_reviewed_at || undefined,
    completedAt: r.completed_at || undefined,
    selfRatings,
    managerRatings,
    attendanceSummary: {
      totalWorkingDays: r.total_working_days || 0,
      presentDays: r.present_days || 0,
      lateDays: r.late_days || 0,
      absentDays: r.absent_days || 0,
      earlyOutDays: r.early_out_days || 0,
      attendancePercentage: r.attendance_percentage || 0,
    },
    leaveSummary: {
      annualLeaveTaken: r.annual_leave_taken || 0,
      casualLeaveTaken: r.casual_leave_taken || 0,
      sickLeaveTaken: r.sick_leave_taken || 0,
      unpaidLeaveTaken: r.unpaid_leave_taken || 0,
      totalLeaveDays: r.total_leave_days || 0,
    },
    hrFinalRemarks: r.hr_final_remarks || undefined,
    hrOverallRating: r.hr_overall_rating || undefined,
    finalizedBy: r.finalized_by || undefined,
    organizationId: r.organization_id || '',
  };
};

export const reviewService = {
  // ─── Review Cycles ───────────────────────────────────────────

  async getReviewCycles(): Promise<ReviewCycle[]> {
    if (!apiClient.pb || !apiClient.isConfigured()) return [];
    try {
      const records = await apiClient.pb.collection('review_cycles').getFullList({ sort: '-created' });
      return records.map(mapCycleRecord);
    } catch (e: any) {
      console.error('[ReviewService] Failed to fetch cycles:', e?.message || e);
      return [];
    }
  },

  async createReviewCycle(data: Omit<ReviewCycle, 'id'>): Promise<ReviewCycle | null> {
    if (!apiClient.pb || !apiClient.isConfigured()) return null;
    const orgId = apiClient.getOrganizationId();
    const payload: any = {
      name: data.name,
      cycle_type: data.cycleType,
      start_date: data.startDate,
      end_date: data.endDate,
      review_start_date: data.reviewStartDate,
      review_end_date: data.reviewEndDate,
      active_competencies: data.activeCompetencies || COMPETENCY_KEYS,
      is_active: data.isActive || false,
      status: data.status || 'UPCOMING',
      organization_id: orgId,
    };
    try {
      const record = await apiClient.pb.collection('review_cycles').create(payload);
      apiClient.notify();
      return mapCycleRecord(record);
    } catch (e: any) {
      console.error('[ReviewService] Failed to create cycle:', e?.message || e);
      throw new Error('Failed to create review cycle');
    }
  },

  async updateReviewCycle(id: string, data: Partial<ReviewCycle>): Promise<ReviewCycle | null> {
    if (!apiClient.pb || !apiClient.isConfigured()) return null;
    const payload: any = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.cycleType !== undefined) payload.cycle_type = data.cycleType;
    if (data.startDate !== undefined) payload.start_date = data.startDate;
    if (data.endDate !== undefined) payload.end_date = data.endDate;
    if (data.reviewStartDate !== undefined) payload.review_start_date = data.reviewStartDate;
    if (data.reviewEndDate !== undefined) payload.review_end_date = data.reviewEndDate;
    if (data.activeCompetencies !== undefined) payload.active_competencies = data.activeCompetencies;
    if (data.isActive !== undefined) payload.is_active = data.isActive;
    if (data.status !== undefined) payload.status = data.status;
    try {
      const record = await apiClient.pb.collection('review_cycles').update(id, payload);
      apiClient.notify();
      return mapCycleRecord(record);
    } catch (e: any) {
      console.error('[ReviewService] Failed to update cycle:', e?.message || e);
      throw new Error('Failed to update review cycle');
    }
  },

  async deleteReviewCycle(id: string): Promise<void> {
    if (!apiClient.pb || !apiClient.isConfigured()) return;
    try {
      await apiClient.pb.collection('review_cycles').delete(id);
      apiClient.notify();
    } catch (e: any) {
      console.error('[ReviewService] Failed to delete cycle:', e?.message || e);
      throw new Error('Failed to delete review cycle');
    }
  },

  // ─── Performance Reviews ────────────────────────────────────

  async getReviews(): Promise<PerformanceReview[]> {
    if (!apiClient.pb || !apiClient.isConfigured()) return [];
    try {
      const records = await apiClient.pb.collection('performance_reviews').getFullList({ sort: '-created' });
      return records.map(mapReviewRecord);
    } catch (e: any) {
      console.error('[ReviewService] Failed to fetch reviews:', e?.message || e);
      return [];
    }
  },

  async getReviewById(id: string): Promise<PerformanceReview | null> {
    if (!apiClient.pb || !apiClient.isConfigured()) return null;
    try {
      const record = await apiClient.pb.collection('performance_reviews').getOne(id);
      return mapReviewRecord(record);
    } catch (e: any) {
      console.error('[ReviewService] Failed to fetch review:', e?.message || e);
      return null;
    }
  },

  async createReview(
    cycleId: string,
    employeeId: string,
    employeeName: string,
    lineManagerId?: string,
    managerName?: string,
  ): Promise<PerformanceReview | null> {
    if (!apiClient.pb || !apiClient.isConfigured()) return null;
    const orgId = apiClient.getOrganizationId();

    // Calculate attendance & leave summaries for the cycle period
    let attendanceSummary: AttendanceSummary = { totalWorkingDays: 0, presentDays: 0, lateDays: 0, absentDays: 0, earlyOutDays: 0, attendancePercentage: 0 };
    let leaveSummary: LeaveSummary = { annualLeaveTaken: 0, casualLeaveTaken: 0, sickLeaveTaken: 0, unpaidLeaveTaken: 0, totalLeaveDays: 0 };

    try {
      const cycle = await apiClient.pb.collection('review_cycles').getOne(cycleId);
      if (cycle) {
        attendanceSummary = await reviewService.calculateAttendanceSummary(employeeId, cycle.start_date, cycle.end_date);
        leaveSummary = await reviewService.calculateLeaveSummary(employeeId, cycle.start_date, cycle.end_date);
      }
    } catch (e) {
      console.warn('[ReviewService] Could not calculate summaries:', e);
    }

    const payload: any = {
      employee_id: employeeId.trim(),
      employee_name: employeeName,
      cycle_id: cycleId,
      line_manager_id: lineManagerId || '',
      manager_name: managerName || '',
      status: 'DRAFT',
      organization_id: orgId,
      // Attendance summary
      total_working_days: attendanceSummary.totalWorkingDays,
      present_days: attendanceSummary.presentDays,
      late_days: attendanceSummary.lateDays,
      absent_days: attendanceSummary.absentDays,
      early_out_days: attendanceSummary.earlyOutDays,
      attendance_percentage: attendanceSummary.attendancePercentage,
      // Leave summary
      annual_leave_taken: leaveSummary.annualLeaveTaken,
      casual_leave_taken: leaveSummary.casualLeaveTaken,
      sick_leave_taken: leaveSummary.sickLeaveTaken,
      unpaid_leave_taken: leaveSummary.unpaidLeaveTaken,
      total_leave_days: leaveSummary.totalLeaveDays,
    };

    try {
      const record = await apiClient.pb.collection('performance_reviews').create(payload);
      apiClient.notify();
      return mapReviewRecord(record);
    } catch (e: any) {
      if (e.response?.id) { apiClient.notify(); return null; }
      console.error('[ReviewService] Failed to create review:', e?.message || e);
      throw new Error('Failed to create performance review');
    }
  },

  async submitSelfAssessment(reviewId: string, selfRatings: CompetencyRating[]): Promise<void> {
    if (!apiClient.pb || !apiClient.isConfigured()) return;
    const now = new Date().toISOString().replace('T', ' ').split('.')[0];
    const payload: any = {
      status: 'SELF_REVIEW_SUBMITTED',
      submitted_at: now,
    };

    selfRatings.forEach(r => {
      const field = competencyFieldName(r.competencyId);
      payload[`self_${field}_rating`] = r.rating;
      payload[`self_${field}_comment`] = r.comment;
    });

    try {
      await apiClient.pb.collection('performance_reviews').update(reviewId, payload);
      apiClient.notify();
    } catch (e: any) {
      console.error('[ReviewService] Failed to submit self-assessment:', e?.message || e);
      throw new Error('Failed to submit self-assessment');
    }
  },

  async submitManagerReview(reviewId: string, managerRatings: CompetencyRating[]): Promise<void> {
    if (!apiClient.pb || !apiClient.isConfigured()) return;
    const now = new Date().toISOString().replace('T', ' ').split('.')[0];
    const payload: any = {
      status: 'MANAGER_REVIEWED',
      manager_reviewed_at: now,
    };

    managerRatings.forEach(r => {
      const field = competencyFieldName(r.competencyId);
      payload[`manager_${field}_rating`] = r.rating;
      payload[`manager_${field}_comment`] = r.comment;
    });

    try {
      await apiClient.pb.collection('performance_reviews').update(reviewId, payload);
      apiClient.notify();
    } catch (e: any) {
      console.error('[ReviewService] Failed to submit manager review:', e?.message || e);
      throw new Error('Failed to submit manager review');
    }
  },

  async finalizeReview(reviewId: string, hrRemarks: string, overallRating: HROverallRating, finalizedBy: string): Promise<void> {
    if (!apiClient.pb || !apiClient.isConfigured()) return;
    const now = new Date().toISOString().replace('T', ' ').split('.')[0];
    const payload: any = {
      status: 'COMPLETED',
      completed_at: now,
      hr_final_remarks: hrRemarks,
      hr_overall_rating: overallRating,
      finalized_by: finalizedBy,
    };

    try {
      await apiClient.pb.collection('performance_reviews').update(reviewId, payload);
      apiClient.notify();
    } catch (e: any) {
      console.error('[ReviewService] Failed to finalize review:', e?.message || e);
      throw new Error('Failed to finalize review');
    }
  },

  // ─── Attendance & Leave Summaries ───────────────────────────

  async calculateAttendanceSummary(employeeId: string, startDate: string, endDate: string): Promise<AttendanceSummary> {
    const summary: AttendanceSummary = { totalWorkingDays: 0, presentDays: 0, lateDays: 0, absentDays: 0, earlyOutDays: 0, attendancePercentage: 0 };
    if (!apiClient.pb || !apiClient.isConfigured()) return summary;

    try {
      const records = await apiClient.pb.collection('attendance').getFullList({
        filter: `employee_id = "${employeeId.trim()}" && date >= "${startDate}" && date <= "${endDate}"`,
        sort: 'date',
      });

      const logs = records.map(r => ({
        id: r.id,
        employeeId: r.employee_id || '',
        employeeName: r.employee_name || '',
        date: r.date,
        checkIn: r.check_in || undefined,
        checkOut: r.check_out || undefined,
        status: (r.status || 'PRESENT') as any,
        remarks: r.remarks || '',
      }));

      const consolidated = consolidateAttendance(logs);
      summary.totalWorkingDays = consolidated.length;

      consolidated.forEach(log => {
        const status = (log.status || '').toUpperCase();
        if (status === 'PRESENT') summary.presentDays++;
        else if (status === 'LATE') { summary.lateDays++; summary.presentDays++; }
        else if (status === 'ABSENT') summary.absentDays++;
        else if (status === 'EARLY_OUT') { summary.earlyOutDays++; summary.presentDays++; }
      });

      if (summary.totalWorkingDays > 0) {
        summary.attendancePercentage = Math.round((summary.presentDays / summary.totalWorkingDays) * 100);
      }
    } catch (e: any) {
      console.error('[ReviewService] Failed to calculate attendance summary:', e?.message || e);
    }

    return summary;
  },

  async calculateLeaveSummary(employeeId: string, startDate: string, endDate: string): Promise<LeaveSummary> {
    const summary: LeaveSummary = { annualLeaveTaken: 0, casualLeaveTaken: 0, sickLeaveTaken: 0, unpaidLeaveTaken: 0, totalLeaveDays: 0 };
    if (!apiClient.pb || !apiClient.isConfigured()) return summary;

    try {
      const records = await apiClient.pb.collection('leaves').getFullList({
        filter: `employee_id = "${employeeId.trim()}" && status = "APPROVED" && start_date >= "${startDate}" && end_date <= "${endDate}"`,
      });

      records.forEach(r => {
        const days = r.total_days || 0;
        const type = (r.type || '').toUpperCase();
        if (type === 'ANNUAL') summary.annualLeaveTaken += days;
        else if (type === 'CASUAL') summary.casualLeaveTaken += days;
        else if (type === 'SICK') summary.sickLeaveTaken += days;
        else if (type === 'UNPAID') summary.unpaidLeaveTaken += days;
        summary.totalLeaveDays += days;
      });
    } catch (e: any) {
      console.error('[ReviewService] Failed to calculate leave summary:', e?.message || e);
    }

    return summary;
  },
};
