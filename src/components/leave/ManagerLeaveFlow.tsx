
import React, { useState } from 'react';
import { UserCheck, RefreshCw, X, ArrowRight } from 'lucide-react';
import { hrService } from '../../services/hrService';
import { LeaveRequest } from '../../types';

interface Props {
  user: any;
  requests: LeaveRequest[];
  onRefresh: () => void;
}

const ManagerLeaveFlow: React.FC<Props> = ({ requests, onRefresh }) => {
  const [showReview, setShowReview] = useState<LeaveRequest | null>(null);
  const [remarks, setRemarks] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = async (action: 'APPROVED' | 'REJECTED') => {
    if (!showReview) return;
    setIsProcessing(true);
    try {
      await hrService.updateLeaveStatus(showReview.id, action, remarks, 'MANAGER');
      onRefresh();
      setShowReview(null);
      setRemarks('');
    } catch (e) { alert("Action failed"); }
    finally { setIsProcessing(false); }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black text-slate-900">Managerial Review Hub</h3>
        <button onClick={onRefresh} className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-400 hover:text-primary"><RefreshCw size={20} /></button>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 p-8">
        <div className="space-y-4">
          {requests.filter(r => r.status === 'PENDING_MANAGER').map(req => (
            <div key={req.id} className="p-6 rounded-[32px] bg-slate-50 border border-slate-100 flex items-center justify-between group hover:bg-white transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-primary shadow-sm">{req.employeeName[0]}</div>
                <div>
                  <h4 className="font-black text-slate-900 uppercase tracking-tighter">{req.employeeName}</h4>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{req.type} | {req.totalDays} Days</p>
                </div>
              </div>
              <button onClick={() => setShowReview(req)} className="px-6 py-2.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-hover transition-all">Review</button>
            </div>
          ))}
          {requests.filter(r => r.status === 'PENDING_MANAGER').length === 0 && <p className="text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest py-12">No pending reviews</p>}
        </div>
      </div>

      {showReview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in">
            <div className="p-8 bg-primary text-white flex justify-between items-center">
              <div className="flex items-center gap-3"><UserCheck size={20}/><h3 className="text-xl font-black uppercase tracking-tight">Review Request</h3></div>
              <button onClick={() => setShowReview(null)}><X size={28} /></button>
            </div>
            <div className="p-10 space-y-6">
              <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Reason for Leave</p>
                <p className="text-sm font-medium text-slate-600 italic">"{showReview.reason}"</p>
              </div>
              <textarea placeholder="Your evaluation remarks..." className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-bold min-h-[100px] outline-none" value={remarks} onChange={e => setRemarks(e.target.value)} />
              <div className="flex gap-4">
                <button disabled={isProcessing} onClick={() => handleAction('REJECTED')} className="flex-1 py-5 bg-rose-50 text-rose-600 rounded-[32px] font-black uppercase text-[10px]">Reject</button>
                <button disabled={isProcessing} onClick={() => handleAction('APPROVED')} className="flex-1 py-5 bg-primary text-white rounded-[32px] font-black uppercase text-[10px] shadow-xl flex items-center justify-center gap-2 hover:bg-primary-hover">
                   {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : <ArrowRight size={16} />} Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerLeaveFlow;
