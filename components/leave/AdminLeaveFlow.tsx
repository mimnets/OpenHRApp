
import React, { useState } from 'react';
import { ShieldCheck, History, X, RefreshCw, ArrowRight } from 'lucide-react';
import { hrService } from '../../services/hrService';
import { LeaveRequest } from '../../types';

interface Props {
  user: any;
  requests: LeaveRequest[];
  onRefresh: () => void;
}

const AdminLeaveFlow: React.FC<Props> = ({ user, requests, onRefresh }) => {
  const [showVerify, setShowVerify] = useState<LeaveRequest | null>(null);
  const [remarks, setRemarks] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleVerify = async (action: 'APPROVED' | 'REJECTED') => {
    if (!showVerify) return;
    setIsProcessing(true);
    try {
      await hrService.updateLeaveStatus(showVerify.id, action, remarks, 'HR');
      onRefresh();
      setShowVerify(null);
      setRemarks('');
    } catch (e) { alert("Verification failed"); }
    finally { setIsProcessing(false); }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black text-slate-900">HR Verification Portal</h3>
        <button onClick={onRefresh} className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-400 hover:text-primary"><RefreshCw size={20} /></button>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 p-8">
        <div className="space-y-4">
          {requests.filter(r => r.status === 'PENDING_HR').map(req => (
            <div key={req.id} className="p-6 rounded-[32px] bg-slate-50 border border-slate-100 flex items-center justify-between group hover:bg-white transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center font-black text-white shadow-sm">{req.employeeName[0]}</div>
                <div>
                  <h4 className="font-black text-slate-900 uppercase tracking-tighter">{req.employeeName}</h4>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest font-bold">Manager Approved • {req.type}</p>
                </div>
              </div>
              <button onClick={() => setShowVerify(req)} className="px-6 py-2.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-hover transition-all">Verify</button>
            </div>
          ))}
          {requests.filter(r => r.status === 'PENDING_HR').length === 0 && <p className="text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest py-12">No requests requiring HR verification</p>}
        </div>
      </div>

      {showVerify && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in">
            <div className="p-8 bg-primary text-white flex justify-between items-center">
              <div className="flex items-center gap-3"><ShieldCheck size={20}/><h3 className="text-xl font-black uppercase tracking-tight">Final Verification</h3></div>
              <button onClick={() => setShowVerify(null)}><X size={28} /></button>
            </div>
            <div className="p-10 space-y-6">
              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                 <p className="text-[10px] font-black text-primary-hover uppercase tracking-widest mb-2">Manager's Evaluation</p>
                 <p className="text-sm font-bold text-slate-700">"{showVerify.managerRemarks || "No remarks provided"}"</p>
              </div>
              <textarea placeholder="HR/Admin Audit Notes..." className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-bold min-h-[100px] outline-none" value={remarks} onChange={e => setRemarks(e.target.value)} />
              <div className="flex gap-4">
                <button disabled={isProcessing} onClick={() => handleVerify('REJECTED')} className="flex-1 py-5 bg-rose-50 text-rose-600 rounded-[32px] font-black uppercase text-[10px]">Decline</button>
                <button disabled={isProcessing} onClick={() => handleVerify('APPROVED')} className="flex-1 py-5 bg-emerald-600 text-white rounded-[32px] font-black uppercase text-[10px] shadow-xl flex items-center justify-center gap-2">
                   {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : <ArrowRight size={16} />} Final Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLeaveFlow;
