
import { useState, useEffect, useCallback } from 'react';
import { hrService } from '../../services/hrService';
import { ReviewCycle, PerformanceReview } from '../../types';

export interface PerformanceReviewData {
  cycles: ReviewCycle[];
  activeCycle: ReviewCycle | null;
  reviews: PerformanceReview[];
  myReview: PerformanceReview | null;
  directReportReviews: PerformanceReview[];
  allReviews: PerformanceReview[];
}

export const usePerformanceReview = (user: any) => {
  const [data, setData] = useState<PerformanceReviewData>({
    cycles: [],
    activeCycle: null,
    reviews: [],
    myReview: null,
    directReportReviews: [],
    allReviews: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = user.role === 'ADMIN' || user.role === 'HR';
  const isManager = user.role === 'MANAGER' || user.role === 'TEAM_LEAD' || user.role === 'MANAGEMENT';

  const fetchData = useCallback(async () => {
    try {
      const [cycles, reviews] = await Promise.all([
        hrService.getReviewCycles(),
        hrService.getReviews(),
      ]);

      const activeCycle = cycles.find(c => c.isActive && c.status === 'OPEN') || null;

      // My review for the active cycle
      const myReview = activeCycle
        ? reviews.find(r => r.employeeId === user.id && r.cycleId === activeCycle.id) || null
        : null;

      // Direct reports' reviews (for managers)
      const directReportReviews = isManager || isAdmin
        ? reviews.filter(r => r.lineManagerId === user.id)
        : [];

      setData({
        cycles,
        activeCycle,
        reviews,
        myReview,
        directReportReviews,
        allReviews: isAdmin ? reviews : [],
      });
    } catch (e) {
      console.error('[usePerformanceReview] Failed to fetch data:', e);
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

  return { data, isLoading, refreshData: fetchData };
};
