
import { useState, useEffect, useCallback } from 'react';
import { hrService } from '../../services/hrService';
import { ReviewCycle, PerformanceReview, OrgReviewConfig } from '../../types';
import { DEFAULT_REVIEW_CONFIG } from '../../constants';

export interface PerformanceReviewData {
  cycles: ReviewCycle[];
  activeCycle: ReviewCycle | null;
  upcomingCycle: ReviewCycle | null;
  reviews: PerformanceReview[];
  myReview: PerformanceReview | null;
  directReportReviews: PerformanceReview[];
  allReviews: PerformanceReview[];
  reviewConfig: OrgReviewConfig;
}

export const usePerformanceReview = (user: any) => {
  const [data, setData] = useState<PerformanceReviewData>({
    cycles: [],
    activeCycle: null,
    upcomingCycle: null,
    reviews: [],
    myReview: null,
    directReportReviews: [],
    allReviews: [],
    reviewConfig: DEFAULT_REVIEW_CONFIG,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user.role === 'ADMIN' || user.role === 'HR' || user.role === 'SUPER_ADMIN';

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      // Fetch independently so one failure doesn't block others
      let cycles: ReviewCycle[] = [];
      let reviews: PerformanceReview[] = [];
      let reviewConfig: OrgReviewConfig = DEFAULT_REVIEW_CONFIG;

      try {
        cycles = await hrService.getReviewCycles();
      } catch (e: any) {
        console.error('[usePerformanceReview] Failed to fetch cycles:', e);
        setError('Failed to load review cycles. Check browser console for details.');
      }

      try {
        reviews = await hrService.getReviews();
      } catch (e: any) {
        console.error('[usePerformanceReview] Failed to fetch reviews:', e);
      }

      try {
        reviewConfig = await hrService.getReviewConfig();
      } catch (e: any) {
        console.error('[usePerformanceReview] Failed to fetch review config:', e);
      }

      console.log('[usePerformanceReview] Fetched:', { cyclesCount: cycles.length, reviewsCount: reviews.length });

      // Auto-transition cycles based on dates
      const today = new Date().toISOString().split('T')[0];
      for (const cycle of cycles) {
        const reviewStart = (cycle.reviewStartDate || '').split(' ')[0];
        const reviewEnd = (cycle.reviewEndDate || '').split(' ')[0];

        // Auto-OPEN: UPCOMING cycle whose review start date has been reached
        if (cycle.status === 'UPCOMING' && reviewStart && reviewStart <= today) {
          try {
            await hrService.updateReviewCycle(cycle.id, { status: 'OPEN', isActive: true });
            cycle.status = 'OPEN';
            cycle.isActive = true;
            console.log('[usePerformanceReview] Auto-opened cycle:', cycle.name);
          } catch (e) {
            console.warn('[usePerformanceReview] Failed to auto-open cycle:', e);
          }
        }

        // Auto-CLOSE: OPEN cycle whose review end date has passed
        if (cycle.status === 'OPEN' && reviewEnd && reviewEnd < today) {
          try {
            await hrService.updateReviewCycle(cycle.id, { status: 'CLOSED', isActive: false });
            cycle.status = 'CLOSED';
            cycle.isActive = false;
            console.log('[usePerformanceReview] Auto-closed cycle:', cycle.name);
          } catch (e) {
            console.warn('[usePerformanceReview] Failed to auto-close cycle:', e);
          }
        }
      }

      const activeCycle = cycles.find(c => c.isActive && c.status === 'OPEN') || null;

      // Find the nearest upcoming cycle for employees to see
      const upcomingCycle = !activeCycle
        ? cycles
            .filter(c => c.status === 'UPCOMING')
            .sort((a, b) => (a.reviewStartDate || '').localeCompare(b.reviewStartDate || ''))[0] || null
        : null;

      // My review for the active cycle
      const myReview = activeCycle
        ? reviews.find(r => r.employeeId === user.id && r.cycleId === activeCycle.id) || null
        : null;

      // Direct reports' reviews (for anyone assigned as line manager)
      const directReportReviews = reviews.filter(r => r.lineManagerId === user.id);

      setData({
        cycles,
        activeCycle,
        upcomingCycle,
        reviews,
        myReview,
        directReportReviews,
        allReviews: isAdmin ? reviews : [],
        reviewConfig,
      });
    } catch (e) {
      console.error('[usePerformanceReview] Critical fetch failure:', e);
      setError('Failed to load performance review data.');
    } finally {
      setIsLoading(false);
    }
  }, [user.id, user.role]);

  useEffect(() => {
    setIsLoading(true);
    fetchData();
  }, [fetchData]);

  // Subscribe to global updates
  useEffect(() => {
    const unsub = hrService.subscribe(() => {
      fetchData();
    });
    return unsub;
  }, [fetchData]);

  return { data, isLoading, error, refreshData: fetchData };
};
