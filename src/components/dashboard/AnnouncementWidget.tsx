
import React, { useMemo } from 'react';
import { Megaphone, ArrowRight, Inbox } from 'lucide-react';
import { useAnnouncements } from '../../hooks/announcements/useAnnouncements';
import { AnnouncementCard } from '../announcements/AnnouncementCard';

interface Props {
  user: any;
  onNavigate: (path: string) => void;
}

export const AnnouncementWidget: React.FC<Props> = ({ user, onNavigate }) => {
  const { visibleAnnouncements, isLoading } = useAnnouncements(user);

  // Urgent first, then by date, limit to 3
  const topAnnouncements = useMemo(() => {
    return [...visibleAnnouncements]
      .sort((a, b) => {
        if (a.priority === 'URGENT' && b.priority !== 'URGENT') return -1;
        if (a.priority !== 'URGENT' && b.priority === 'URGENT') return 1;
        return new Date(b.created).getTime() - new Date(a.created).getTime();
      })
      .slice(0, 3);
  }, [visibleAnnouncements]);

  if (isLoading) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-primary-light rounded-lg">
            <Megaphone size={14} className="text-primary" />
          </div>
          <h3 className="font-semibold text-sm text-slate-900">Announcements</h3>
          {visibleAnnouncements.length > 0 && (
            <span className="px-2 py-0.5 bg-primary-light text-primary text-[10px] font-bold rounded-full">
              {visibleAnnouncements.length}
            </span>
          )}
        </div>
        <button
          onClick={() => onNavigate('announcements')}
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
        >
          View All <ArrowRight size={12} />
        </button>
      </div>

      {/* Content */}
      <div className="p-3">
        {topAnnouncements.length === 0 ? (
          <div className="text-center py-6">
            <Inbox size={28} className="mx-auto text-slate-200 mb-2" />
            <p className="text-xs text-slate-400">No announcements</p>
          </div>
        ) : (
          <div className="space-y-2">
            {topAnnouncements.map(a => (
              <AnnouncementCard
                key={a.id}
                announcement={a}
                currentUserId={user.id}
                currentUserRole={user.role}
                truncate
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
