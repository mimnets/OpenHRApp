
import React, { useState } from 'react';
import { UserCheck, RefreshCw, X, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { hrService } from '../../services/hrService';
import { Employee, LeaveRequest, Team } from '../../types';
import { teamLeaveRequests } from '../../utils/teamLeave';
import { useToast } from '../../context/ToastContext';
import HelpButton from '../onboarding/HelpButton';

const STATUS_LABEL: Record<LeaveRequest['status'], string> = {
  PENDING_MANAGER: 'Awaiting manager',
  PENDING_HR: 'Forwarded to HR',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};
const STATUS_STYLE: Record<LeaveRequest['status'], string> = {
  PENDING_MANAGER: 'bg-amber-50 text-amber-700',
  PENDING_HR: 'bg-sky-50 text-sky-700',
  APPROVED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-rose-50 text-rose-700',
};

interface Props {
  user: any;
  requests: LeaveRequest[];
  employees: Employee[];
  teams: Team[];
  onRefresh: () => void;
  roleLabel: string; // "Team Lead" | "Manager" | "Director"
  readOnly?: boolean;
}

const ManagerialLeaveModule: React.FC<Props> = ({ user, requests, employees, teams, onRefresh, roleLabel, readOnly = false }) => {
  const { showToast } = useToast();
  const [showReview, setShowReview] = useState<LeaveRequest | null>(null);
  const [remarks, setRemarks] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Pending = awaiting my decision. History = every other request from my team, in any status.
  const { pending: myPendingRequests, history } = teamLeaveRequests(requests, user.id, employees, teams);

  const handleAction = async (action: 'APPROVED' | 'REJECTED') => {
    if (!showReview || readOnly) return;
    setIsProcessing(true);
    try {
      await hrService.updateLeaveStatus(showReview.id, action, remarks, 'MANAGER');
      onRefresh();
      setShowReview(null);
      setRemarks('');
    } catch (e) { showToast('Action failed. Please try again.', 'error'); }
    finally { setIsProcessing(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <div className="flex items-center gap-2"><h3 className="text-xl font-semibold text-slate-900">{roleLabel} Approval Hub</h3><HelpButton helpPointId="leave.manager" size={16} /></div>
           <p className="text-xs font-bold text-slate-400 mt-1">Pending approvals from your direct reports</p>
        </div>
        <button onClick={onRefresh} className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-400 hover:text-primary transition-colors"><RefreshCw size={20} /></button>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 p-8 shadow-sm">
        <div className="space-y-4">
          {myPendingRequests.map(req => (
            <div key={req.id} className="p-6 rounded-xl bg-primary-light/30 border border-primary-light flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:bg-white hover:shadow-lg transition-all">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center font-semibold text-xl text-primary shadow-sm border border-primary-light">
                  {req.employeeName[0]}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 uppercase tracking-tighter text-lg">{req.employeeName}</h4>
                  <div className="flex items-center gap-2 mt-1">
                     <span className="px-2 py-0.5 bg-primary-light text-primary rounded-md text-[9px] font-semibold uppercase tracking-widest">{req.type}</span>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{req.totalDays} Days • {req.startDate}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => !readOnly && setShowReview(req)}
                disabled={readOnly}
                className={`px-8 py-3 rounded-xl text-[10px] font-semibold uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 ${
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
               <p className="text-slate-400 font-semibold uppercase text-xs tracking-widest">You're all caught up!</p>
               <p className="text-slate-300 text-[10px] font-bold mt-1">No pending requests from your team.</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 p-8 shadow-sm space-y-4">
        <div>
          <h4 className="text-lg font-semibold text-slate-900">Team leave history</h4>
          <p className="text-xs font-bold text-slate-400 mt-1">Every request from your team in the last 6 months, including ones you approved or rejected</p>
        </div>
        {history.length === 0 && <p className="text-sm text-slate-400 py-4">No other requests from your team.</p>}
        <ul className="divide-y divide-slate-100">
          {history.map(req => (
            <li key={req.id} className="py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900">{req.employeeName}</p>
                <p className="text-xs text-slate-500">{req.type} · {req.totalDays} days · {req.startDate} → {req.endDate}</p>
                {req.managerRemarks && <p className="text-xs text-slate-600 mt-1">Manager: {req.managerRemarks}</p>}
                {req.approverRemarks && <p className="text-xs text-slate-600 mt-1">HR: {req.approverRemarks}</p>}
              </div>
              <span className={`self-start px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-widest ${STATUS_STYLE[req.status]}`}>
                {STATUS_LABEL[req.status]}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {showReview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in">
            <div className="p-8 bg-primary text-white flex justify-between items-center">
              <div className="flex items-center gap-3"><UserCheck size={20}/><h3 className="text-lg font-semibold uppercase tracking-tight">Evaluate Request</h3></div>
              <button onClick={() => setShowReview(null)}><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-2">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Reason for Absence</p>
                <p className="text-sm font-bold text-slate-700 leading-relaxed">"{showReview.reason}"</p>
              </div>
              
              <div className="space-y-2">
                 <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Managerial Remarks</p>
                 <textarea placeholder="Add context for HR or reason for rejection..." className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold min-h-[100px] outline-none focus:ring-4 focus:ring-slate-100 transition-all" value={remarks} onChange={e => setRemarks(e.target.value)} />
              </div>

              <div className="flex gap-4 pt-2">
                <button disabled={isProcessing} onClick={() => handleAction('REJECTED')} className="flex-1 py-4 bg-rose-50 text-rose-600 rounded-xl font-semibold uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-rose-100 transition-colors">
                  <XCircle size={16}/> Reject
                </button>
                <button disabled={isProcessing} onClick={() => handleAction('APPROVED')} className="flex-[1.5] py-4 bg-primary text-white rounded-xl font-semibold uppercase text-[10px] shadow-xl flex items-center justify-center gap-2 hover:bg-primary-hover transition-colors">
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
