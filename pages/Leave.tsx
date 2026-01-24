import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Calendar, 
  Clock, 
  X, 
  Send, 
  UserCheck, 
  Filter, 
  ArrowRight, 
  AlertTriangle,
  History as HistoryIcon,
  Loader2,
  FileText,
  CalendarDays,
  RefreshCw,
  Info,
  ChevronRight,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { hrService } from '../services/hrService';
import { LeaveRequest, LeaveBalance, Employee } from '../types';

const SummarySkeleton = () => (
  <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm animate-pulse">
    <div className="flex justify-between items-start mb-4">
      <div className="w-12 h-12 bg-slate-100 rounded-2xl"></div>
      <div className="w-16 h-6 bg-slate-50 rounded-full"></div>
    </div>
    <div className="h-10 bg-slate-100 rounded-lg w-1/2"></div>
  </div>
);

const LeaveItemSkeleton = () => (
  <div className="p-6 rounded-[32px] bg-slate-50 border border-slate-100 flex items-center justify-between animate-pulse">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 bg-slate-200 rounded-2xl"></div>
      <div className="space-y-2">
        <div className="h-4 bg-slate-200 rounded w-32"></div>
        <div className="h-3 bg-slate-100 rounded w-48"></div>
      </div>
    </div>
    <div className="h-8 bg-slate-200 rounded-xl w-24"></div>
  </div>
);

const Leave: React.FC<{ user: any }> = ({ user }) => {
  const isAdmin = user.role === 'ADMIN' || user.role === 'HR';
  const isManager = user.role === 'MANAGER';
  
  const [showForm, setShowForm] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState<LeaveRequest | null>(null);
  const [showReviewModal, setShowReviewModal] = useState<LeaveRequest | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ 
    type: 'ANNUAL', 
    start: '', 
    end: '', 
    reason: '' 
  });
  
  const [activeTab, setActiveTab] = useState<'MY' | 'MANAGEMENT'>( (isAdmin || isManager) ? 'MANAGEMENT' : 'MY');
  const [filterMode, setFilterMode] = useState<'TASKS' | 'ALL'>('TASKS');
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    refreshData();
  }, [user.id, user.role, user.teamId]);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [fetchedLeaves, userBalance, fetchedEmps] = await Promise.all([
        hrService.getLeaves(),
        hrService.getLeaveBalance(user.id),
        hrService.getEmployees()
      ]);

      setLeaves(fetchedLeaves);
      setBalance(userBalance);
      setAllEmployees(fetchedEmps);
    } catch (e) {
      console.error("Data refresh failed:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
    const diff = e.getTime() - s.getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 3600 * 24)) + 1);
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setSubmissionError(null);
    
    const days = calculateDays(formData.start, formData.end);
    if (days <= 0) {
      setSubmissionError("Invalid date range selected.");
      setIsProcessing(false);
      return;
    }

    const me = allEmployees.find(emp => emp.id === user.id);
    const lineManagerId = me?.lineManagerId;

    try {
      await hrService.saveLeaveRequest({
        id: '', 
        employeeId: user.id,
        employeeName: user.name,
        lineManagerId: lineManagerId,
        type: formData.type as any,
        startDate: formData.start,
        endDate: formData.end,
        totalDays: days,
        reason: formData.reason,
        status: 'PENDING_MANAGER',
        appliedDate: new Date().toISOString()
      });
      
      await refreshData();
      setShowForm(false);
      setFormData({ type: 'ANNUAL', start: '', end: '', reason: '' });
    } catch (err: any) {
      setSubmissionError(err.message || "Request failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAction = async (request: LeaveRequest, action: 'APPROVED' | 'REJECTED') => {
    setIsProcessing(true);
    let decisionRole = user.role;
    if (request.status === 'PENDING_MANAGER' && !isAdmin) {
       decisionRole = 'MANAGER';
    }

    try {
      await hrService.updateLeaveStatus(request.id, action, reviewRemarks, decisionRole);
      await refreshData();
      setShowReviewModal(null);
      setReviewRemarks('');
    } catch (e: any) {
      alert("Action failed: " + (e.message || "Access denied."));
    } finally {
      setIsProcessing(false);
    }
  };

  const getFilteredLeavesForManagement = () => {
    if (isAdmin) {
       if (filterMode === 'ALL') return leaves;
       return leaves.filter(l => 
         l.status === 'PENDING_HR' || 
         l.status === 'PENDING_MANAGER'
       );
    }
    
    // MANAGER FILTER (Using immediate allEmployees data)
    const reportIds = allEmployees
      .filter(e => e.teamId === user.teamId || e.lineManagerId === user.id)
      .map(e => e.id);
      
    const teamLeaves = leaves.filter(l => reportIds.includes(l.employeeId));

    if (filterMode === 'ALL') return teamLeaves;
    return teamLeaves.filter(l => l.status === 'PENDING_MANAGER');
  };

  const myLeaves = leaves.filter(l => l.employeeId === user.id);
  const managementLeaves = getFilteredLeavesForManagement();
  const currentDisplayList = activeTab === 'MY' ? myLeaves : managementLeaves;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Leave Management</h1>
          <p className="text-sm text-slate-500 font-medium">Entitlement tracking and audit portal</p>
        </div>
        <div className="flex gap-2">
          {(isAdmin || isManager) && (
            <div className="flex p-1 bg-slate-100 rounded-2xl mr-2">
              <button onClick={() => setActiveTab('MANAGEMENT')} className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'MANAGEMENT' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Review Hub</button>
              <button onClick={() => setActiveTab('MY')} className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'MY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>My Portal</button>
            </div>
          )}
          <button onClick={() => { setSubmissionError(null); setShowForm(true); }} className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-indigo-700 transition-all">
            <Plus size={18} /> New Request
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading ? (
          <>
            <SummarySkeleton />
            <SummarySkeleton />
            <SummarySkeleton />
          </>
        ) : (
          <>
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
               <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Calendar size={24} /></div>
                  <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Annual</span>
               </div>
               <p className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums">{balance?.ANNUAL || 0} <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Left</span></p>
            </div>
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
               <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><Clock size={24} /></div>
                  <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">Casual</span>
               </div>
               <p className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums">{balance?.CASUAL || 0} <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Left</span></p>
            </div>
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
               <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl"><AlertTriangle size={24} /></div>
                  <span className="text-[10px] font-black uppercase text-rose-600 bg-rose-50 px-3 py-1 rounded-full">Sick</span>
               </div>
               <p className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums">{balance?.SICK || 0} <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Left</span></p>
            </div>
          </>
        )}
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
            {activeTab === 'MY' ? <HistoryIcon className="text-indigo-600" /> : <Filter className="text-indigo-600" />}
            {activeTab === 'MY' ? 'Application History' : 'Action Queue'}
          </h3>
          <div className="flex gap-2">
            {activeTab === 'MANAGEMENT' && (
              <div className="flex p-1 bg-slate-50 rounded-xl border border-slate-200">
                 <button onClick={() => setFilterMode('TASKS')} className={`px-4 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${filterMode === 'TASKS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>To Review</button>
                 <button onClick={() => setFilterMode('ALL')} className={`px-4 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${filterMode === 'ALL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>All History</button>
              </div>
            )}
            <button onClick={refreshData} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><RefreshCw size={18} className={isLoading ? 'animate-spin' : ''}/></button>
          </div>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <>
              <LeaveItemSkeleton />
              <LeaveItemSkeleton />
              <LeaveItemSkeleton />
            </>
          ) : (
            currentDisplayList.sort((a,b) => b.appliedDate.localeCompare(a.appliedDate)).map(req => (
              <div key={req.id} className="p-6 rounded-[32px] bg-slate-50 border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-lg transition-all cursor-pointer" onClick={() => activeTab === 'MY' && setShowDetailsModal(req)}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-indigo-600 shadow-sm uppercase">{req.employeeName[0]}</div>
                  <div>
                    <h4 className="font-black text-slate-900 uppercase tracking-tighter">{activeTab === 'MY' ? req.type + ' LEAVE' : req.employeeName}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{req.startDate} — {req.endDate} ({req.totalDays} Days)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {activeTab === 'MANAGEMENT' && (req.status.includes('PENDING')) ? (
                    <button onClick={(e) => { e.stopPropagation(); setShowReviewModal(req); }} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all">Review</button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${req.status === 'APPROVED' ? 'bg-emerald-500 text-white' : req.status === 'REJECTED' ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        {req.status.replace('_', ' ')}
                      </span>
                      {activeTab === 'MY' && <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {!isLoading && currentDisplayList.length === 0 && (
            <div className="py-12 text-center space-y-4">
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No leave records found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Decision Details Modal for Employees */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl"><Info size={20}/></div>
                <h3 className="text-xl font-black uppercase tracking-tight">Request Details</h3>
              </div>
              <button onClick={() => setShowDetailsModal(null)}><X size={28} /></button>
            </div>
            <div className="p-10 space-y-6 max-h-[75vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                  <p className={`text-xs font-black uppercase ${showDetailsModal.status === 'APPROVED' ? 'text-emerald-600' : showDetailsModal.status === 'REJECTED' ? 'text-rose-600' : 'text-indigo-600'}`}>{showDetailsModal.status.replace('_', ' ')}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Days</p>
                  <p className="text-xs font-black text-slate-900 uppercase">{showDetailsModal.totalDays} Days</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><FileText size={10} className="text-indigo-600" /> My Reason</p>
                  <p className="text-sm font-medium text-slate-600 italic">"{showDetailsModal.reason || "No reason provided."}"</p>
                </div>

                {(showDetailsModal.managerRemarks) && (
                  <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100">
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2"><MessageSquare size={10} className="text-indigo-600" /> Manager Remarks</p>
                    <p className="text-sm font-bold text-slate-700">{showDetailsModal.managerRemarks}</p>
                  </div>
                )}

                {(showDetailsModal.approverRemarks) && (
                  <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100">
                    <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2"><MessageSquare size={10} className="text-emerald-600" /> HR/Admin Remarks</p>
                    <p className="text-sm font-bold text-slate-700">{showDetailsModal.approverRemarks}</p>
                  </div>
                )}
              </div>
              
              <button onClick={() => setShowDetailsModal(null)} className="w-full py-5 bg-slate-900 text-white rounded-[32px] font-black uppercase text-[10px] tracking-widest shadow-xl">Close View</button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal for Admins/Managers */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in">
            <div className={`p-8 flex justify-between items-center text-white ${showReviewModal.status === 'PENDING_HR' ? 'bg-indigo-600' : 'bg-slate-900'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl"><UserCheck size={20}/></div>
                <h3 className="text-xl font-black uppercase tracking-tight">{showReviewModal.status === 'PENDING_HR' ? 'HR Final Approval' : 'Review & Verify'}</h3>
              </div>
              <button onClick={() => setShowReviewModal(null)}><X size={28} /></button>
            </div>
            <div className="p-10 space-y-6 max-h-[75vh] overflow-y-auto no-scrollbar">
              <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
                 <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center font-black text-indigo-600 shadow-sm uppercase text-xl">{showReviewModal.employeeName[0]}</div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Applicant Name</p>
                      <p className="font-black text-slate-900 text-lg leading-none">{showReviewModal.employeeName}</p>
                    </div>
                 </div>
                 
                 <div className="space-y-4">
                   <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><FileText size={10} className="text-indigo-600" /> Reason for Leave</p>
                      <p className="text-sm font-medium text-slate-600 italic">"{showReviewModal.reason || "No reason provided."}"</p>
                   </div>

                   {showReviewModal.status === 'PENDING_HR' && showReviewModal.managerRemarks && (
                     <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-1"><MessageSquare size={10} className="text-indigo-600" /> Manager Evaluation</p>
                        <p className="text-xs font-bold text-slate-700">"{showReviewModal.managerRemarks}"</p>
                     </div>
                   )}
                 </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Your Evaluation / Remarks</label>
                <textarea 
                  placeholder="Evaluation remarks..."
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-bold min-h-[100px] outline-none"
                  value={reviewRemarks}
                  onChange={e => setReviewRemarks(e.target.value)}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button disabled={isProcessing} onClick={() => handleAction(showReviewModal, 'REJECTED')} className="flex-1 py-5 bg-rose-50 text-rose-600 rounded-[32px] font-black uppercase text-[10px] tracking-widest hover:bg-rose-100 transition-all">Reject</button>
                <button disabled={isProcessing} onClick={() => handleAction(showReviewModal, 'APPROVED')} className="flex-1 py-5 bg-indigo-600 text-white rounded-[32px] font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                   {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : <><ArrowRight size={16} /> {showReviewModal.status === 'PENDING_HR' ? 'Final Approve' : 'Approve'}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in">
            <div className="p-8 bg-indigo-600 text-white flex justify-between items-center">
              <h3 className="text-xl font-black uppercase tracking-tight">Submit Leave</h3>
              <button onClick={() => setShowForm(false)}><X size={28} /></button>
            </div>
            
            <form onSubmit={handleSubmitLeave} className="p-10 space-y-8">
              {submissionError && (
                <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-700 animate-in shake">
                  <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                  <p className="text-xs font-bold leading-relaxed">{submissionError}</p>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Type</label>
                <select className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl font-black text-sm outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                   <option value="ANNUAL">Annual Leave</option>
                   <option value="CASUAL">Casual Leave</option>
                   <option value="SICK">Sick Leave</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="date" required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl font-bold text-sm" value={formData.start} onChange={e => setFormData({...formData, start: e.target.value})} />
                <input type="date" required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl font-bold text-sm" value={formData.end} onChange={e => setFormData({...formData, end: e.target.value})} />
              </div>
              <textarea required placeholder="Briefly describe the reason..." className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl font-bold text-sm min-h-[100px] outline-none" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} />
              <button type="submit" disabled={isProcessing} className="w-full py-5 bg-indigo-600 text-white rounded-[32px] font-black uppercase tracking-widest text-[10px] shadow-xl flex items-center justify-center gap-2">
                 {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : <><Send size={16} /> Send Application</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leave;