
import React from 'react';
import { ReviewStatus } from '../../types';

interface Props {
  status: ReviewStatus;
}

const STATUS_CONFIG: Record<ReviewStatus, { label: string; bg: string; text: string }> = {
  DRAFT: { label: 'Draft', bg: 'bg-slate-100', text: 'text-slate-600' },
  SELF_REVIEW_SUBMITTED: { label: 'Self-Review Submitted', bg: 'bg-blue-100', text: 'text-blue-700' },
  MANAGER_REVIEWED: { label: 'Manager Reviewed', bg: 'bg-orange-100', text: 'text-orange-700' },
  COMPLETED: { label: 'Completed', bg: 'bg-green-100', text: 'text-green-700' },
};

const ReviewStatusBadge: React.FC<Props> = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

export default ReviewStatusBadge;
