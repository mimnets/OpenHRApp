
import React, { useState } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { Announcement } from '../../types';

interface Props {
  announcement: Announcement;
  currentUserId: string;
  currentUserRole: string;
  onEdit?: (announcement: Announcement) => void;
  onDelete?: (id: string) => void;
  truncate?: boolean;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export const AnnouncementCard: React.FC<Props> = ({
  announcement,
  currentUserId,
  currentUserRole,
  onEdit,
  onDelete,
  truncate = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const isUrgent = announcement.priority === 'URGENT';
  const isAuthor = announcement.authorId === currentUserId;
  const isAdminHR = currentUserRole === 'ADMIN' || currentUserRole === 'HR';
  const canManage = isAuthor || isAdminHR;
  const contentLong = announcement.content.length > 200;
  const showTruncated = truncate && !expanded && contentLong;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
      isUrgent ? 'border-l-4 border-l-rose-400 border-rose-100' : 'border-slate-100'
    }`}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {isUrgent && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-bold uppercase tracking-wider rounded-full">
                  <AlertTriangle size={10} /> Urgent
                </span>
              )}
              <h3 className="font-semibold text-slate-900 text-sm leading-tight">{announcement.title}</h3>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="font-medium text-slate-500">{announcement.authorName}</span>
              <span>·</span>
              <span>{timeAgo(announcement.created)}</span>
            </div>
          </div>

          {canManage && (onEdit || onDelete) && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {onEdit && (
                <button
                  onClick={() => onEdit(announcement)}
                  className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary-light rounded-lg transition-colors"
                >
                  <Pencil size={14} />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(announcement.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="mt-3">
          <p className={`text-sm text-slate-600 leading-relaxed whitespace-pre-wrap ${showTruncated ? 'line-clamp-3' : ''}`}>
            {announcement.content}
          </p>
          {truncate && contentLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-xs font-medium text-primary hover:text-primary-hover flex items-center gap-0.5"
            >
              {expanded ? <>Show less <ChevronUp size={12} /></> : <>Read more <ChevronDown size={12} /></>}
            </button>
          )}
        </div>

        {/* Target Roles */}
        {announcement.targetRoles && announcement.targetRoles.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            {announcement.targetRoles.map(role => (
              <span key={role} className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider rounded-full">
                {role.replace('_', ' ')}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
