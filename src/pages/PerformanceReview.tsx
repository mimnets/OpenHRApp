
import React from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';
import { usePerformanceReview } from '../hooks/review/usePerformanceReview';
import EmployeeReviewModule from '../components/review/EmployeeReviewModule';
import ManagerReviewModule from '../components/review/ManagerReviewModule';
import HRReviewModule from '../components/review/HRReviewModule';

interface Props {
  user: any;
}

const PerformanceReview: React.FC<Props> = ({ user }) => {
  const isAdmin = user.role === 'ADMIN' || user.role === 'HR';
  const isManager = user.role === 'MANAGER' || user.role === 'TEAM_LEAD' || user.role === 'MANAGEMENT';

  const { canPerformAction, subscription } = useSubscription();
  const canWrite = canPerformAction('write');

  const { data, isLoading, refreshData } = usePerformanceReview(user);

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  // Past reviews for the employee (from non-active cycles)
  const pastReviews = data.reviews.filter(
    r => r.employeeId === user.id && r.cycleId !== data.activeCycle?.id
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
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
        myReview={data.myReview}
        pastReviews={pastReviews}
        onRefresh={refreshData}
        readOnly={!canWrite}
      />

      {/* Manager Module */}
      {isManager && (
        <div className="pt-12 border-t border-slate-100">
          <ManagerReviewModule
            user={user}
            directReportReviews={data.directReportReviews}
            onRefresh={refreshData}
            readOnly={!canWrite}
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
            onRefresh={refreshData}
            readOnly={!canWrite}
          />
        </div>
      )}
    </div>
  );
};

export default PerformanceReview;
