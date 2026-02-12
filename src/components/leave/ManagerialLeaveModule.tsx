
import React, { useState } from 'react';
import { UserCheck, RefreshCw, X, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { hrService } from '../../services/hrService';
import { LeaveRequest } from '../../types';

interface Props {
  user: any;
  requests: LeaveRequest[];
  onRefresh: () => void;
  roleLabel: string; // "Team Lead" | "Manager" | "Director"
  readOnly?: boolean;
}

const ManagerialLeaveModule: React.FC<Props> = ({ user, requests, onRefresh, roleLabel, readOnly = false }) => {
  const [showReview, setShowReview] = useState<LeaveRequest | null>(null);
  const [remarks, setRemarks] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter requests: Show if I am the line manager OR (if the requester is in my team and I am the leader)
  const myPendingRequests = requests.filter(r => 
    r.status === 'PENDING_MANAGER' && 
    (r.lineManagerId === user.id)
  );

  const handleAction = async (action: 'APPROVED' | 'REJECTED') => {
    if (!showReview || readOnly) return;
    setIsProcessing(true);
    try {
      await hrService.updateLeaveStatus(showReview.id, action, remarks, 'MANAGER');
      onRefresh();
      setShowReview(null);
      setRemarks('');
    } catch (e) { alert("Action failed. Please try again."); }
    finally { setIsProcessing(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h3 className="text-xl font-black text-slate-900">{roleLabel} Approval Hub</h3>
           <p className="text-xs font-bold text-slate-400 mt-1">Pending approvals from your direct reports</p>
        </div>
        <button onClick={onRefresh} className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-400 hover:text-primary transition-colors"><RefreshCw size={20} /></button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
        <div className="space-y-4">
          {myPendingRequests.map(req => (
            <div key={req.id} className="p-6 rounded-[2rem] bg-primary-light/30 border border-primary-light flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:bg-white hover:shadow-lg transition-all">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center font-black text-xl text-primary shadow-sm border border-primary-light">
                  {req.employeeName[0]}
                </div>
                <div>
                  <h4 className="font-black text-slate-900 uppercase tracking-tighter text-lg">{req.employeeName}</h4>
                  <div className="flex items-center gap-2 mt-1">
                     <span className="px-2 py-0.5 bg-primary-light text-primary rounded-md text-[9px] font-black uppercase tracking-widest">{req.type}</span>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{req.totalDays} Days • {req.startDate}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => !readOnly && setShowReview(req)}
                disabled={readOnly}
                className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 ${
                  readOnly
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-primary-hover'
                }`}
              >
                Evaluate <ArrowRight size={14}/>
              </button>
            </div>
          ))}
          {myPendingRequests.length === 0 && (
            <div className="text-center py-16">
               <UserCheck size={48} className="text-slate-200 mx-auto mb-4" />
               <p className="text-slate-400 font-black uppercase text-xs tracking-widest">You're all caught up!</p>
               <p className="text-slate-300 text-[10px] font-bold mt-1">No pending requests from your team.</p>
            </div>
          )}
        </div>
      </div>

      {showReview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in">
            <div className="p-8 bg-primary text-white flex justify-between items-center">
              <div className="flex items-center gap-3"><UserCheck size={20}/><h3 className="text-lg font-black uppercase tracking-tight">Evaluate Request</h3></div>
              <button onClick={() => setShowReview(null)}><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason for Absence</p>
                <p className="text-sm font-bold text-slate-700 leading-relaxed">"{showReview.reason}"</p>
              </div>
              
              <div className="space-y-2">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Managerial Remarks</p>
                 <textarea placeholder="Add context for HR or reason for rejection..." className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold min-h-[100px] outline-none focus:ring-4 focus:ring-slate-100 transition-all" value={remarks} onChange={e => setRemarks(e.target.value)} />
              </div>

              <div className="flex gap-4 pt-2">
                <button disabled={isProcessing} onClick={() => handleAction('REJECTED')} className="flex-1 py-4 bg-rose-50 text-rose-600 rounded-[2rem] font-black uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-rose-100 transition-colors">
                  <XCircle size={16}/> Reject
                </button>
                <button disabled={isProcessing} onClick={() => handleAction('APPROVED')} className="flex-[1.5] py-4 bg-primary text-white rounded-[2rem] font-black uppercase text-[10px] shadow-xl flex items-center justify-center gap-2 hover:bg-primary-hover transition-colors">
                   {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} Approve & Forward
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerialLeaveModule;
