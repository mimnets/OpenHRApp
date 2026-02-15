
import React, { useState } from 'react';
import { Edit3, Trash2, CheckCircle, XCircle, RefreshCw, AlertTriangle, FileCheck, Search } from 'lucide-react';
import { hrService } from '../../services/hrService';
import { LeaveRequest } from '../../types';

interface Props {
  requests: LeaveRequest[];
  onEdit: (leave: LeaveRequest) => void;
  onRefresh: () => void;
  readOnly?: boolean;
}

const statusBadge = (status: string) => {
  switch (status) {
    case 'APPROVED': return 'bg-emerald-100 text-emerald-700';
    case 'REJECTED': return 'bg-rose-100 text-rose-700';
    case 'PENDING_HR': return 'bg-amber-100 text-amber-700';
    case 'PENDING_MANAGER': return 'bg-orange-100 text-orange-700';
    default: return 'bg-slate-100 text-slate-700';
  }
};

const statusBar = (status: string) => {
  switch (status) {
    case 'APPROVED': return 'bg-emerald-500';
    case 'REJECTED': return 'bg-rose-500';
    default: return 'bg-amber-500';
  }
};

const AdminAllLeaves: React.FC<Props> = ({ requests, onEdit, onRefresh, readOnly = false }) => {
  const [deleteTarget, setDeleteTarget] = useState<LeaveRequest | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [approveTarget, setApproveTarget] = useState<LeaveRequest | null>(null);
  const [approveRemarks, setApproveRemarks] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = requests.filter(r =>
    r.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await hrService.adminDeleteLeave(deleteTarget.id);
      onRefresh();
    } catch { alert('Delete failed'); }
    finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleQuickApprove = async (action: 'APPROVED' | 'REJECTED') => {
    if (!approveTarget) return;
    setIsApproving(true);
    try {
      await hrService.updateLeaveStatus(approveTarget.id, action, approveRemarks, 'ADMIN');
      onRefresh();
      setApproveTarget(null);
      setApproveRemarks('');
    } catch { alert('Action failed'); }
    finally { setIsApproving(false); }
  };

  const isPending = (s: string) => s === 'PENDING_MANAGER' || s === 'PENDING_HR';

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
        <input
          type="text"
          placeholder="Search by name, type, or status..."
          className="w-full pl-12 pr-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Leave List */}
      <div className="space-y-3">
        {filtered.map(req => (
          <div key={req.id} className="p-5 rounded-[2rem] bg-slate-50 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white hover:shadow-md transition-all group">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className={`w-2 h-12 rounded-full flex-shrink-0 ${statusBar(req.status)}`} />
              <div className="min-w-0">
                <h4 className="font-black text-slate-800 text-sm uppercase leading-tight truncate">{req.employeeName}</h4>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{req.type}</span>
                  <span className="text-[10px] font-bold text-slate-300">|</span>
                  <span className="text-[10px] font-bold text-slate-400">{req.startDate?.split(' ')[0]} — {req.endDate?.split(' ')[0]}</span>
                  <span className="text-[10px] font-bold text-slate-300">|</span>
                  <span className="text-[10px] font-bold text-slate-400">{req.totalDays}d</span>
                </div>
                {req.reason && (
                  <p className="text-[10px] font-bold text-slate-400 mt-1 truncate max-w-xs" title={req.reason}>"{req.reason}"</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase whitespace-nowrap ${statusBadge(req.status)}`}>
                {req.status.replace('_', ' ')}
              </span>

              {/* Approve/Reject for any pending */}
              {!readOnly && isPending(req.status) && (
                <button
                  onClick={() => setApproveTarget(req)}
                  className="px-3 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-colors"
                >
                  Review
                </button>
              )}

              {/* Edit */}
              {!readOnly && (
                <button
                  onClick={() => onEdit(req)}
                  className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-amber-600 hover:border-amber-200 transition-colors"
                  title="Edit"
                >
                  <Edit3 size={14} />
                </button>
              )}

              {/* Delete */}
              {!readOnly && (
                <button
                  onClick={() => setDeleteTarget(req)}
                  className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <FileCheck size={48} className="text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-black uppercase text-xs tracking-widest">No Leaves Found</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in">
            <div className="p-8 bg-rose-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-3"><AlertTriangle size={20} /><h3 className="text-lg font-black uppercase tracking-tight">Confirm Delete</h3></div>
              <button onClick={() => setDeleteTarget(null)} className="hover:bg-white/10 p-2 rounded-lg transition-colors"><span className="sr-only">Close</span>✕</button>
            </div>
            <div className="p-8 space-y-6">
              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-2">
                <p className="text-sm font-black text-slate-800">{deleteTarget.employeeName}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{deleteTarget.type} — {deleteTarget.startDate?.split(' ')[0]} to {deleteTarget.endDate?.split(' ')[0]}</p>
                <p className="text-[10px] font-bold text-slate-400">Status: {deleteTarget.status.replace('_', ' ')}</p>
              </div>
              <p className="text-xs font-bold text-slate-500 text-center">This action cannot be undone. The leave record will be permanently removed.</p>
              <div className="flex gap-4">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-[2rem] font-black uppercase text-[10px] hover:bg-slate-200 transition-colors">Cancel</button>
                <button disabled={isDeleting} onClick={handleDelete} className="flex-1 py-4 bg-rose-600 text-white rounded-[2rem] font-black uppercase text-[10px] shadow-xl flex items-center justify-center gap-2 hover:bg-rose-700 transition-colors">
                  {isDeleting ? <RefreshCw className="animate-spin" size={16} /> : <Trash2 size={16} />} Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve/Reject Modal */}
      {approveTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in">
            <div className="p-8 bg-emerald-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-3"><CheckCircle size={20} /><h3 className="text-lg font-black uppercase tracking-tight">Admin Review</h3></div>
              <button onClick={() => { setApproveTarget(null); setApproveRemarks(''); }} className="hover:bg-white/10 p-2 rounded-lg transition-colors"><span className="sr-only">Close</span>✕</button>
            </div>
            <div className="p-8 space-y-6">
              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-3">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</p>
                  <p className="text-sm font-black text-slate-800">{approveTarget.employeeName}</p>
                </div>
                <div className="w-full h-px bg-slate-200" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</p>
                    <p className="text-xs font-bold text-slate-700">{approveTarget.type}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</p>
                    <p className="text-xs font-bold text-slate-700">{approveTarget.totalDays} Day(s)</p>
                  </div>
                </div>
                <div className="w-full h-px bg-slate-200" />
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dates</p>
                  <p className="text-xs font-bold text-slate-700">{approveTarget.startDate?.split(' ')[0]} — {approveTarget.endDate?.split(' ')[0]}</p>
                </div>
                <div className="w-full h-px bg-slate-200" />
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason</p>
                  <p className="text-xs font-bold text-slate-700">"{approveTarget.reason || 'No reason provided'}"</p>
                </div>
                <div className="w-full h-px bg-slate-200" />
                <div>
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Current Status</p>
                  <p className="text-xs font-bold text-slate-700">{approveTarget.status.replace('_', ' ')}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Admin Remarks (Optional)</p>
                <textarea
                  placeholder="Add approval or rejection notes..."
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold min-h-[80px] outline-none focus:ring-4 focus:ring-emerald-50 transition-all"
                  value={approveRemarks}
                  onChange={e => setApproveRemarks(e.target.value)}
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button disabled={isApproving} onClick={() => handleQuickApprove('REJECTED')} className="flex-1 py-4 bg-rose-50 text-rose-600 rounded-[2rem] font-black uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-rose-100 transition-colors">
                  <XCircle size={16} /> Reject
                </button>
                <button disabled={isApproving} onClick={() => handleQuickApprove('APPROVED')} className="flex-[1.5] py-4 bg-emerald-600 text-white rounded-[2rem] font-black uppercase text-[10px] shadow-xl flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors">
                  {isApproving ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle size={16} />} Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAllLeaves;
