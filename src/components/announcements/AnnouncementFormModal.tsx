
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Announcement, AnnouncementPriority, Role } from '../../types';

const ALL_ROLES: Role[] = ['ADMIN', 'HR', 'MANAGER', 'TEAM_LEAD', 'MANAGEMENT', 'EMPLOYEE'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    content: string;
    priority: AnnouncementPriority;
    targetRoles: Role[];
    expiresAt?: string;
  }) => Promise<void>;
  editingAnnouncement?: Announcement | null;
}

export const AnnouncementFormModal: React.FC<Props> = ({ isOpen, onClose, onSubmit, editingAnnouncement }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('NORMAL');
  const [targetRoles, setTargetRoles] = useState<Role[]>([]);
  const [expiresAt, setExpiresAt] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingAnnouncement) {
      setTitle(editingAnnouncement.title);
      setContent(editingAnnouncement.content);
      setPriority(editingAnnouncement.priority);
      setTargetRoles(editingAnnouncement.targetRoles || []);
      setExpiresAt(editingAnnouncement.expiresAt ? editingAnnouncement.expiresAt.split(' ')[0] : '');
    } else {
      setTitle('');
      setContent('');
      setPriority('NORMAL');
      setTargetRoles([]);
      setExpiresAt('');
    }
  }, [editingAnnouncement, isOpen]);

  const toggleRole = (role: Role) => {
    setTargetRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setIsSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        content: content.trim(),
        priority,
        targetRoles,
        expiresAt: expiresAt || undefined,
      });
      onClose();
    } catch (err) {
      console.error('Failed to save announcement', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">
            {editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={200}
              required
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              placeholder="Announcement title..."
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Content</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              required
              rows={4}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
              placeholder="Write your announcement..."
            />
          </div>

          {/* Priority Toggle */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Priority</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPriority('NORMAL')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  priority === 'NORMAL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => setPriority('URGENT')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  priority === 'URGENT'
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                Urgent
              </button>
            </div>
          </div>

          {/* Target Roles */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Target Roles <span className="text-slate-400 normal-case font-medium">(empty = everyone)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_ROLES.map(role => (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    targetRoles.includes(role)
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {role.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Expiry Date <span className="text-slate-400 normal-case font-medium">(optional)</span>
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSaving || !title.trim() || !content.trim()}
            className="w-full py-4 bg-primary text-white rounded-2xl font-semibold text-sm uppercase tracking-widest shadow-lg shadow-primary-light/50 hover:bg-primary-hover transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : editingAnnouncement ? 'Update Announcement' : 'Post Announcement'}
          </button>
        </form>
      </div>
    </div>
  );
};
