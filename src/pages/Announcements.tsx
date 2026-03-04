
import React, { useState, useMemo } from 'react';
import { Megaphone, Plus, Loader2, AlertTriangle, Inbox } from 'lucide-react';
import { hrService } from '../services/hrService';
import { Announcement } from '../types';
import { useAnnouncements } from '../hooks/announcements/useAnnouncements';
import { useSubscription } from '../context/SubscriptionContext';
import { AnnouncementCard } from '../components/announcements/AnnouncementCard';
import { AnnouncementFormModal } from '../components/announcements/AnnouncementFormModal';

interface Props {
  user: any;
}

const Announcements: React.FC<Props> = ({ user }) => {
  const { canPerformAction, subscription } = useSubscription();
  const canWrite = canPerformAction('write');
  const { announcements, visibleAnnouncements, isLoading } = useAnnouncements(user);
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const isAdminHR = user.role === 'ADMIN' || user.role === 'HR';

  // Show all announcements for admin/HR (even expired/targeted), visible for others
  const displayAnnouncements = isAdminHR ? announcements : visibleAnnouncements;

  // Sort: urgent first, then by created date desc
  const sortedAnnouncements = useMemo(() => {
    return [...displayAnnouncements].sort((a, b) => {
      if (a.priority === 'URGENT' && b.priority !== 'URGENT') return -1;
      if (a.priority !== 'URGENT' && b.priority === 'URGENT') return 1;
      return new Date(b.created).getTime() - new Date(a.created).getTime();
    });
  }, [displayAnnouncements]);

  const handleCreate = async (data: any) => {
    await hrService.createAnnouncement({
      ...data,
      authorId: user.id,
      authorName: user.name,
    });
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setShowModal(true);
  };

  const handleUpdate = async (data: any) => {
    if (!editingAnnouncement) return;
    await hrService.updateAnnouncement(editingAnnouncement.id, data);
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await hrService.deleteAnnouncement(deleteConfirm);
    } catch (e) {
      console.error('Delete failed', e);
    }
    setDeleteConfirm(null);
  };

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Subscription Warning */}
      {!canWrite && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">
            {subscription?.status === 'EXPIRED'
              ? 'Your trial has expired. Creating announcements is disabled.'
              : 'Your account is suspended. Please contact support.'}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary-light rounded-2xl">
            <Megaphone size={22} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Announcements</h1>
            <p className="text-xs text-slate-400 font-medium">{sortedAnnouncements.length} announcement{sortedAnnouncements.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {canWrite && (
          <button
            onClick={() => { setEditingAnnouncement(null); setShowModal(true); }}
            className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-2xl font-semibold text-xs uppercase tracking-wider shadow-lg shadow-primary-light/50 hover:bg-primary-hover transition-all active:scale-95"
          >
            <Plus size={16} /> New
          </button>
        )}
      </div>

      {/* List */}
      {sortedAnnouncements.length === 0 ? (
        <div className="text-center py-16">
          <Inbox size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-400 font-medium">No announcements yet</p>
          <p className="text-xs text-slate-300 mt-1">Create one to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedAnnouncements.map(a => (
            <AnnouncementCard
              key={a.id}
              announcement={a}
              currentUserId={user.id}
              currentUserRole={user.role}
              onEdit={canWrite ? handleEdit : undefined}
              onDelete={canWrite ? handleDelete : undefined}
              truncate
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      <AnnouncementFormModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingAnnouncement(null); }}
        onSubmit={editingAnnouncement ? handleUpdate : handleCreate}
        editingAnnouncement={editingAnnouncement}
      />

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center animate-in slide-in-from-bottom-4 duration-300">
            <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} className="text-rose-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Announcement?</h3>
            <p className="text-sm text-slate-500 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-semibold text-sm hover:bg-rose-600 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;
