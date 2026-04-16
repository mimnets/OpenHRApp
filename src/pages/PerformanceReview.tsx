
import React, { useState, useEffect } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';
import { usePerformanceReview } from '../hooks/review/usePerformanceReview';
import { hrService } from '../services/hrService';
import EmployeeReviewModule from '../components/review/EmployeeReviewModule';
import ManagerReviewModule from '../components/review/ManagerReviewModule';
import HRReviewModule from '../components/review/HRReviewModule';

interface Props {
  user: any;
}

const PerformanceReview: React.FC<Props> = ({ user }) => {
  const isAdmin = user.role === 'ADMIN' || user.role === 'HR' || user.role === 'SUPER_ADMIN';
  const isManager = user.role === 'MANAGER' || user.role === 'TEAM_LEAD' || user.role === 'MANAGEMENT';

  const { canPerformAction, subscription } = useSubscription();
  const canWrite = canPerformAction('write');

  const { data, isLoading, error, refreshData } = usePerformanceReview(user);

  const [employees, setEmployees] = useState<{ id: string; name: string; department: string }[]>([]);

  useEffect(() => {
    if (isAdmin) {
      hrService.getEmployees().then(emps =>
        setEmployees(emps.map((e: any) => ({ id: e.id, name: e.name, department: e.department || '' })))
      ).catch((err) => {
        console.error('Failed to load employees for performance review:', err);
      });
    }
  }, [isAdmin]);

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  // Show fetch error if any
  if (error) {
    console.warn('[PerformanceReview] Error state:', error);
  }

  // Past reviews for the employee (from non-active cycles)
  const pastReviews = data.reviews.filter(
    r => r.employeeId === user.id && r.cycleId !== data.activeCycle?.id
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Data Fetch Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Subscription Warning */}
      {!canWrite && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">
            {subscription?.status === 'EXPIRED'
              ? 'Your trial has expired. Review submissions are disabled. You can still view existing reviews.'
              : 'Your account is suspended. Please contact support.'}
          </span>
        </div>
      )}

      {/* Employee Module (everyone sees this) */}
      <EmployeeReviewModule
        user={user}
        activeCycle={data.activeCycle}
        upcomingCycle={data.upcomingCycle}
        myReview={data.myReview}
        pastReviews={pastReviews}
        onRefresh={refreshData}
        readOnly={!canWrite}
        reviewConfig={data.reviewConfig}
        cycles={data.cycles}
      />

      {/* Manager Module */}
      {(isManager || data.directReportReviews.length > 0) && (
        <div className="pt-12 border-t border-slate-100">
          <ManagerReviewModule
            user={user}
            directReportReviews={data.directReportReviews}
            onRefresh={refreshData}
            readOnly={!canWrite}
            reviewConfig={data.reviewConfig}
          />
        </div>
      )}

      {/* HR/Admin Module */}
      {isAdmin && (
        <div className="pt-12 border-t border-slate-100">
          <HRReviewModule
            user={user}
            cycles={data.cycles}
            allReviews={data.allReviews}
            employees={employees}
            onRefresh={refreshData}
            readOnly={!canWrite}
            reviewConfig={data.reviewConfig}
          />
        </div>
      )}
    </div>
  );
};

export default PerformanceReview;
