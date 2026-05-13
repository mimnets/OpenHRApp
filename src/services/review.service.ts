
import { supabase, isSupabaseConfigured } from './supabase';
import { apiClient } from './api.client';
import {
  ReviewCycle,
  PerformanceReview,
  CompetencyRating,
  AttendanceSummary,
  LeaveSummary,
} from '../types';
import { consolidateAttendance } from '../utils/attendanceUtils';

const LEGACY_COMPETENCY_KEYS = [
  'AGILITY', 'COLLABORATION', 'CUSTOMER_FOCUS',
  'DEVELOPING_OTHERS', 'GLOBAL_MINDSET', 'INNOVATION_MINDSET',
];

const competencyFieldName = (id: string) => id.toLowerCase();

const mapCycleRecord = (r: any): ReviewCycle => ({
  id: r.id,
  name: r.name,
  cycleType: r.cycle_type,
  startDate: r.start_date,
  endDate: r.end_date,
  reviewStartDate: r.review_start_date,
  reviewEndDate: r.review_end_date,
  activeCompetencies: r.active_competencies || LEGACY_COMPETENCY_KEYS,
  isActive: r.is_active || false,
  status: r.status || 'UPCOMING',
  organizationId: r.organization_id,
});

const parseJsonField = (val: any): any[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') { try { return JSON.parse(val); } catch { return []; } }
  return [];
};

const mapReviewRecord = (r: any): PerformanceReview => {
  let selfRatings: CompetencyRating[] = parseJsonField(r.self_ratings);
  let managerRatings: CompetencyRating[] = parseJsonField(r.manager_ratings);

  // Backward compat: if JSON fields empty, read legacy individual columns
  if (selfRatings.length === 0) {
    selfRatings = LEGACY_COMPETENCY_KEYS.map(id => ({
      competencyId: id,
      rating: r[`self_${competencyFieldName(id)}_rating`] || 0,
      comment: r[`self_${competencyFieldName(id)}_comment`] || '',
    }));
  }
  if (managerRatings.length === 0) {
    managerRatings = LEGACY_COMPETENCY_KEYS.map(id => ({
      competencyId: id,
      rating: r[`manager_${competencyFieldName(id)}_rating`] || 0,
      comment: r[`manager_${competencyFieldName(id)}_comment`] || '',
    }));
  }

  let leaveSummary: LeaveSummary;
  const leaveSummaryJson = r.leave_summary_json ? parseJsonField(r.leave_summary_json) : null;
  if (leaveSummaryJson && typeof leaveSummaryJson === 'object' && !Array.isArray(leaveSummaryJson)) {
    leaveSummary = leaveSummaryJson as any;
  } else {
    const typeBreakdown: Record<string, number> = {};
    if (r.annual_leave_taken) typeBreakdown['ANNUAL'] = r.annual_leave_taken;
    if (r.casual_leave_taken) typeBreakdown['CASUAL'] = r.casual_leave_taken;
    if (r.sick_leave_taken) typeBreakdown['SICK'] = r.sick_leave_taken;
    if (r.unpaid_leave_taken) typeBreakdown['UNPAID'] = r.unpaid_leave_taken;
    leaveSummary = {
      typeBreakdown,
      totalLeaveDays: r.total_leave_days || 0,
      annualLeaveTaken: r.annual_leave_taken || 0,
      casualLeaveTaken: r.casual_leave_taken || 0,
      sickLeaveTaken: r.sick_leave_taken || 0,
      unpaidLeaveTaken: r.unpaid_leave_taken || 0,
    };
  }

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
    leaveSummary,
    hrFinalRemarks: r.hr_final_remarks || undefined,
    hrOverallRating: r.hr_overall_rating || undefined,
    finalizedBy: r.finalized_by || undefined,
    organizationId: r.organization_id || '',
  };
};

export const reviewService = {
  // ─── Review Cycles ────────────────────────────────────────────

  async getReviewCycles(): Promise<ReviewCycle[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const orgId = apiClient.getOrganizationId();
      let query = supabase.from('review_cycles').select('*').order('created', { ascending: false }).limit(50);
      if (orgId) query = query.eq('organization_id', orgId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map(mapCycleRecord);
    } catch (e: any) {
      console.error('[ReviewService] Failed to fetch cycles:', e?.message || e);
      return [];
    }
  },

  async createReviewCycle(data: Omit<ReviewCycle, 'id'>): Promise<ReviewCycle | null> {
    if (!isSupabaseConfigured()) return null;
    const orgId = apiClient.getOrganizationId();
    const { data: record, error } = await supabase
      .from('review_cycles')
      .insert({
        name: data.name,
        cycle_type: data.cycleType,
        start_date: data.startDate,
        end_date: data.endDate,
        review_start_date: data.reviewStartDate,
        review_end_date: data.reviewEndDate,
        active_competencies: data.activeCompetencies || [],
        is_active: data.isActive || false,
        status: data.status || 'UPCOMING',
        organization_id: orgId,
      })
      .select()
      .single();
    if (error) throw new Error('Failed to create review cycle');
    apiClient.notify();
    return mapCycleRecord(record);
  },

  async updateReviewCycle(id: string, data: Partial<ReviewCycle>): Promise<ReviewCycle | null> {
    if (!isSupabaseConfigured()) return null;
    const payload: any = {};
    if (data.name !== undefined)               payload.name = data.name;
    if (data.cycleType !== undefined)          payload.cycle_type = data.cycleType;
    if (data.startDate !== undefined)          payload.start_date = data.startDate;
    if (data.endDate !== undefined)            payload.end_date = data.endDate;
    if (data.reviewStartDate !== undefined)    payload.review_start_date = data.reviewStartDate;
    if (data.reviewEndDate !== undefined)      payload.review_end_date = data.reviewEndDate;
    if (data.activeCompetencies !== undefined) payload.active_competencies = data.activeCompetencies;
    if (data.isActive !== undefined)           payload.is_active = data.isActive;
    if (data.status !== undefined)             payload.status = data.status;
    const { data: record, error } = await supabase
      .from('review_cycles').update(payload).eq('id', id).select().single();
    if (error) throw new Error('Failed to update review cycle');
    apiClient.notify();
    return mapCycleRecord(record);
  },

  async deleteReviewCycle(id: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from('review_cycles').delete().eq('id', id);
    if (error) throw new Error('Failed to delete review cycle');
    apiClient.notify();
  },

  // ─── Performance Reviews ──────────────────────────────────────

  async getReviews(): Promise<PerformanceReview[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const orgId = apiClient.getOrganizationId();
      let query = supabase.from('performance_reviews').select('*').order('created', { ascending: false }).limit(200);
      if (orgId) query = query.eq('organization_id', orgId);
      const { data, error } = await query;
      if (error) throw error;
      const reviews: PerformanceReview[] = [];
      for (const r of data ?? []) {
        try { reviews.push(mapReviewRecord(r)); }
        catch (mapErr) { console.warn('[ReviewService] Failed to map review:', r.id, mapErr); }
      }
      return reviews;
    } catch (e: any) {
      console.error('[ReviewService] Failed to fetch reviews:', e?.message || e);
      return [];
    }
  },

  async getReviewById(id: string): Promise<PerformanceReview | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase.from('performance_reviews').select('*').eq('id', id).single();
      if (error) throw error;
      return mapReviewRecord(data);
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
    if (!isSupabaseConfigured()) return null;
    const orgId = apiClient.getOrganizationId();

    let attendanceSummary: AttendanceSummary = { totalWorkingDays: 0, presentDays: 0, lateDays: 0, absentDays: 0, earlyOutDays: 0, attendancePercentage: 0 };
    let leaveSummary: LeaveSummary = { typeBreakdown: {}, totalLeaveDays: 0 };

    try {
      const { data: cycle } = await supabase.from('review_cycles').select('start_date, end_date').eq('id', cycleId).single();
      if (cycle) {
        attendanceSummary = await reviewService.calculateAttendanceSummary(employeeId, cycle.start_date, cycle.end_date);
        leaveSummary = await reviewService.calculateLeaveSummary(employeeId, cycle.start_date, cycle.end_date);
      }
    } catch (e) {
      console.warn('[ReviewService] Could not calculate summaries:', e);
    }

    const { data: record, error } = await supabase
      .from('performance_reviews')
      .insert({
        employee_id: employeeId.trim(),
        employee_name: employeeName,
        cycle_id: cycleId,
        line_manager_id: lineManagerId || '',
        manager_name: managerName || '',
        status: 'DRAFT',
        organization_id: orgId,
        present_days: attendanceSummary.presentDays,
        late_days: attendanceSummary.lateDays,
        absent_days: attendanceSummary.absentDays,
        early_out_days: attendanceSummary.earlyOutDays,
        attendance_percentage: attendanceSummary.attendancePercentage,
        annual_leave_taken: leaveSummary.typeBreakdown['ANNUAL'] || 0,
        casual_leave_taken: leaveSummary.typeBreakdown['CASUAL'] || 0,
        sick_leave_taken: leaveSummary.typeBreakdown['SICK'] || 0,
        leave_summary_json: leaveSummary,
      })
      .select()
      .single();

    if (error) throw new Error('Failed to create performance review');
    apiClient.notify();
    return mapReviewRecord(record);
  },

  async submitSelfAssessment(reviewId: string, selfRatings: CompetencyRating[]): Promise<void> {
    if (!isSupabaseConfigured()) return;
    // Supabase uses jsonb — store as object, not stringified
    const { error } = await supabase
      .from('performance_reviews')
      .update({
        status: 'SELF_REVIEW_SUBMITTED',
        submitted_at: new Date().toISOString(),
        self_ratings: selfRatings,
      })
      .eq('id', reviewId);
    if (error) throw new Error('Failed to submit self-assessment');
    apiClient.notify();
  },

  async submitManagerReview(reviewId: string, managerRatings: CompetencyRating[]): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase
      .from('performance_reviews')
      .update({
        status: 'MANAGER_REVIEWED',
        manager_reviewed_at: new Date().toISOString(),
        manager_ratings: managerRatings,
      })
      .eq('id', reviewId);
    if (error) throw new Error('Failed to submit manager review');
    apiClient.notify();
  },

  async finalizeReview(reviewId: string, hrRemarks: string, overallRating: string, finalizedBy: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase
      .from('performance_reviews')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        hr_final_remarks: hrRemarks,
        hr_overall_rating: overallRating,
        finalized_by: finalizedBy,
      })
      .eq('id', reviewId);
    if (error) throw new Error('Failed to finalize review');
    apiClient.notify();
  },

  async deleteReview(id: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from('performance_reviews').delete().eq('id', id);
    if (error) throw new Error('Failed to delete performance review');
    apiClient.notify();
  },

  async adminUpdateReview(id: string, data: { lineManagerId?: string; managerName?: string; status?: string }): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const payload: any = {};
    if (data.lineManagerId !== undefined) payload.line_manager_id = data.lineManagerId;
    if (data.managerName !== undefined)   payload.manager_name = data.managerName;
    if (data.status !== undefined)        payload.status = data.status;
    const { error } = await supabase.from('performance_reviews').update(payload).eq('id', id);
    if (error) throw new Error('Failed to update performance review');
    apiClient.notify();
  },

  // ─── Attendance & Leave Summaries ────────────────────────────

  async calculateAttendanceSummary(employeeId: string, startDate: string, endDate: string): Promise<AttendanceSummary> {
    const summary: AttendanceSummary = { totalWorkingDays: 0, presentDays: 0, lateDays: 0, absentDays: 0, earlyOutDays: 0, attendancePercentage: 0 };
    if (!isSupabaseConfigured()) return summary;
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('id, employee_id, employee_name, date, check_in, check_out, status, remarks')
        .eq('employee_id', employeeId.trim())
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date');
      if (error) throw error;

      const logs = (data ?? []).map(r => ({
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
    const typeBreakdown: Record<string, number> = {};
    let totalLeaveDays = 0;
    if (!isSupabaseConfigured()) return { typeBreakdown, totalLeaveDays };
    try {
      const { data, error } = await supabase
        .from('leaves')
        .select('type, total_days')
        .eq('employee_id', employeeId.trim())
        .eq('status', 'APPROVED')
        .gte('start_date', startDate)
        .lte('end_date', endDate);
      if (error) throw error;
      (data ?? []).forEach(r => {
        const days = r.total_days || 0;
        const type = (r.type || '').toUpperCase();
        typeBreakdown[type] = (typeBreakdown[type] || 0) + days;
        totalLeaveDays += days;
      });
    } catch (e: any) {
      console.error('[ReviewService] Failed to calculate leave summary:', e?.message || e);
    }
    return { typeBreakdown, totalLeaveDays };
  },
};
