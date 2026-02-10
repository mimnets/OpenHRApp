
import React, { useState } from 'react';
import { ShieldCheck, RefreshCw, X, ArrowRight, FileCheck, Ban } from 'lucide-react';
import { hrService } from '../../services/hrService';
import { LeaveRequest } from '../../types';

interface Props {
  user: any;
  requests: LeaveRequest[];
  onRefresh: () => void;
}

export const HRLeaveModule: React.FC<Props> = ({ requests, onRefresh }) => {
  const [showVerify, setShowVerify] = useState<LeaveRequest | null>(null);
  const [remarks, setRemarks] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const pendingHR = requests.filter(r => r.status === 'PENDING_HR');

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h3 className="text-xl font-black text-slate-900">HR Compliance & Verification</h3>
           <p className="text-xs font-bold text-slate-400 mt-1">Finalize requests approved by managers</p>
        </div>
        <button onClick={onRefresh} className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-400 hover:text-primary transition-colors"><RefreshCw size={20} /></button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
        <div className="space-y-4">
          {pendingHR.map(req => (
            <div key={req.id} className="p-6 rounded-[2rem] bg-emerald-50/50 border border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:bg-white hover:shadow-lg transition-all">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-sm border border-emerald-500">
                  {req.employeeName[0]}
                </div>
                <div>
                  <h4 className="font-black text-slate-900 uppercase tracking-tighter text-lg">{req.employeeName}</h4>
                  <div className="flex items-center gap-2 mt-1">
                     <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1"><ShieldCheck size={10} /> Manager Approved</span>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{req.type}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowVerify(req)} className="px-8 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2">
                Verify <ArrowRight size={14}/>
              </button>
            </div>
          ))}
          {pendingHR.length === 0 && (
            <div className="text-center py-16">
               <FileCheck size={48} className="text-slate-200 mx-auto mb-4" />
               <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Compliance Check Complete</p>
               <p className="text-slate-300 text-[10px] font-bold mt-1">No requests waiting for HR.</p>
            </div>
          )}
        </div>
      </div>

      {showVerify && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in">
            <div className="p-8 bg-emerald-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-3"><ShieldCheck size={20}/><h3 className="text-lg font-black uppercase tracking-tight">Final Verification</h3></div>
              <button onClick={() => setShowVerify(null)} className="hover:bg-white/10 p-2 rounded-lg transition-colors"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-3">
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">User Reason</p>
                    <p className="text-xs font-bold text-slate-700">"{showVerify.reason}"</p>
                 </div>
                 <div className="w-full h-px bg-slate-200"></div>
                 <div>
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Manager's Evaluation</p>
                    <p className="text-xs font-bold text-slate-700">"{showVerify.managerRemarks || "Approved without remarks"}"</p>
                 </div>
              </div>

              <div className="space-y-2">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Audit Notes (Optional)</p>
                 <textarea placeholder="Document any adjustments or compliance notes..." className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold min-h-[100px] outline-none focus:ring-4 focus:ring-emerald-50 transition-all" value={remarks} onChange={e => setRemarks(e.target.value)} />
              </div>

              <div className="flex gap-4 pt-2">
                <button disabled={isProcessing} onClick={() => handleVerify('REJECTED')} className="flex-1 py-4 bg-rose-50 text-rose-600 rounded-[2rem] font-black uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-rose-100 transition-colors">
                   <Ban size={16}/> Decline
                </button>
                <button disabled={isProcessing} onClick={() => handleVerify('APPROVED')} className="flex-[1.5] py-4 bg-emerald-600 text-white rounded-[2rem] font-black uppercase text-[10px] shadow-xl flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors">
                   {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : <FileCheck size={16} />} Final Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
