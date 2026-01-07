
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Calendar, 
  Info,
  CheckCircle,
  Clock,
  X,
  Send,
  UserCheck,
  UserX,
  MessageCircle,
  AlertTriangle,
  ChevronRight,
  Trash2,
  Filter,
  ShieldCheck,
  ArrowRight,
  UserPen
} from 'lucide-react';
import { hrService } from '../services/hrService';
import { LeaveRequest, LeaveBalance, Employee } from '../types';

const Leave: React.FC<{ user: any }> = ({ user }) => {
  const isAdmin = user.role === 'ADMIN' || user.role === 'HR';
  const isManager = hrService.isManagerOfSomeone(user.id);
  
  const [showForm, setShowForm] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState<LeaveRequest | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState('');
  
  const [formData, setFormData] = useState({ 
    type: 'ANNUAL', 
    start: '', 
    end: '', 
    reason: '' 
  });
  
  const [activeTab, setActiveTab] = useState<'MY' | 'MANAGEMENT'>( (isAdmin || isManager) ? 'MANAGEMENT' : 'MY');
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    refreshData();
  }, [user.id]);

  const refreshData = () => {
    setLeaves(hrService.getLeaves());
    setBalance(hrService.getLeaveBalance(user.id));
    setAllEmployees(hrService.getEmployees());
  };

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diff = e.getTime() - s.getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 3600 * 24)) + 1);
  };

  const handleSubmitLeave = (e: React.FormEvent) => {
    e.preventDefault();
    const days = calculateDays(formData.start, formData.end);
    
    hrService.saveLeaveRequest({
      id: Math.random().toString(36).substr(2, 9),
      employeeId: user.id,
      employeeName: user.name,
      type: formData.type as any,
      startDate: formData.start,
      endDate: formData.end,
      totalDays: days,
      reason: formData.reason,
      status: 'PENDING_MANAGER',
      appliedDate: new Date().toISOString()
    });
    
    refreshData();
    setShowForm(false);
    setFormData({ type: 'ANNUAL', start: '', end: '', reason: '' });
  };

  const handleAction = (request: LeaveRequest, action: 'APPROVED' | 'REJECTED') => {
    // Determine the user's role in this context
    const roleForApproval = isAdmin ? (user.role as any) : 'MANAGER';
    hrService.updateLeaveStatus(request.id, action, reviewRemarks, roleForApproval);
    refreshData();
    setShowReviewModal(null);
    setReviewRemarks('');
  };

  const handleDeleteRequest = (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    const all = hrService.getLeaves();
    const filtered = all.filter(l => l.id !== id);
    localStorage.setItem('hr_leaves', JSON.stringify(filtered));
    refreshData();
  };

  const getFilteredLeavesForManagement = () => {
    if (isAdmin) {
       // HR sees everything but specifically needs to approve those in PENDING_HR
       return leaves;
    }
    // Managers only see PENDING_MANAGER for their reports
    const reportIds = allEmployees.filter(e => e.lineManagerId === user.id).map(e => e.id);
    return leaves.filter(l => reportIds.includes(l.employeeId));
  };

  const myLeaves = leaves.filter(l => l.employeeId === user.id);
  const managementLeaves = getFilteredLeavesForManagement();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Leave Management</h1>
          <p className="text-sm text-slate-500 font-medium">Multi-stage approval workflow & entitlement tracking</p>
        </div>
        <div className="flex gap-2">
          {(isAdmin || isManager) && (
            <div className="flex p-1 bg-slate-100 rounded-2xl mr-2">
              <button onClick={() => setActiveTab('MANAGEMENT')} className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'MANAGEMENT' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                Review Hub
              </button>
              <button onClick={() => setActiveTab('MY')} className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'MY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                My Requests
              </button>
            </div>
          )}
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-indigo-700 transition-all">
            <Plus size={18} /> New Request
          </button>
        </div>
      </header>

      {/* Entitlement Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Calendar size={24} /></div>
              <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Annual</span>
           </div>
           <p className="text-4xl font-black text-slate-900 tracking-tighter">{balance?.ANNUAL || 0} <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Days Left</span></p>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><Clock size={24} /></div>
              <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">Casual</span>
           </div>
           <p className="text-4xl font-black text-slate-900 tracking-tighter">{balance?.CASUAL || 0} <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Days Left</span></p>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl"><AlertTriangle size={24} /></div>
              <span className="text-[10px] font-black uppercase text-rose-600 bg-rose-50 px-3 py-1 rounded-full">Sick</span>
           </div>
           <p className="text-4xl font-black text-slate-900 tracking-tighter">{balance?.SICK || 0} <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Days Left</span></p>
        </div>
      </div>

      {activeTab === 'MANAGEMENT' ? (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
              <Filter className="text-indigo-600" /> {isAdmin ? 'HR/Admin Final Review Desk' : 'Managerial Approval Queue'}
            </h3>
            <div className="px-4 py-1.5 bg-slate-100 rounded-full text-[10px] font-black uppercase text-slate-500 tracking-widest">
              {managementLeaves.filter(l => isAdmin ? l.status === 'PENDING_HR' : l.status === 'PENDING_MANAGER').length} Awaiting Action
            </div>
          </div>

          <div className="space-y-4">
            {managementLeaves.length === 0 ? (
              <div className="py-20 text-center text-slate-300">
                <p className="text-xs font-black uppercase">No applications in your queue</p>
              </div>
            ) : managementLeaves.sort((a, b) => b.appliedDate.localeCompare(a.appliedDate)).map((req) => (
              <div key={req.id} className="p-6 rounded-[32px] bg-slate-50 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white hover:shadow-xl transition-all group">
                <div className="flex gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center font-black text-indigo-600 text-xl uppercase shrink-0">
                    {req.employeeName[0]}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-lg leading-tight">{req.employeeName}</h4>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-widest rounded">{req.type}</span>
                      <p className="text-[10px] font-black text-slate-400 uppercase">{req.startDate} — {req.endDate} ({req.totalDays} Days)</p>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                       <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${req.status === 'PENDING_MANAGER' ? 'bg-amber-100 text-amber-700' : req.status === 'PENDING_HR' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {req.status.replace('_', ' ')}
                       </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {( (isAdmin && req.status === 'PENDING_HR') || (!isAdmin && isManager && req.status === 'PENDING_MANAGER') ) ? (
                    <button onClick={() => setShowReviewModal(req)} className="px-6 py-3.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center gap-2 shadow-lg">
                      <UserCheck size={16} /> {isAdmin ? 'Final Decision' : 'Verify Request'}
                    </button>
                  ) : (
                    <div className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${
                      req.status === 'APPROVED' ? 'bg-emerald-500 text-white' : req.status === 'REJECTED' ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {req.status.replace('_', ' ')}
                    </div>
                  )}
                  {isAdmin && (
                    <button onClick={() => handleDeleteRequest(req.id)} className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all" title="Delete record">
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-[40px] shadow-sm border border-slate-100 p-8">
            <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
              <Clock className="text-indigo-600" /> My Application History
            </h3>
            <div className="space-y-4">
              {myLeaves.length === 0 ? (
                <div className="py-20 text-center text-slate-300">
                  <p className="text-xs font-black uppercase">No records found</p>
                </div>
              ) : myLeaves.sort((a, b) => b.appliedDate.localeCompare(a.appliedDate)).map((req) => (
                <div key={req.id} className="flex flex-col p-6 rounded-[32px] bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                        req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' : 
                        req.status === 'REJECTED' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        <Calendar size={20} />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 uppercase tracking-tight">{req.type} LEAVE</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{req.startDate} — {req.endDate}</p>
                      </div>
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase shadow-sm ${
                      req.status === 'APPROVED' ? 'bg-emerald-500 text-white' : 
                      req.status === 'REJECTED' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
                    }`}>
                      {req.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  {/* Approval Progress Visualization */}
                  <div className="flex items-center gap-2 mb-4 px-2">
                     <div className={`h-1 flex-1 rounded-full ${['PENDING_MANAGER', 'PENDING_HR', 'APPROVED'].includes(req.status) ? 'bg-indigo-500' : 'bg-slate-200'}`}></div>
                     <ChevronRight size={12} className="text-slate-300" />
                     <div className={`h-1 flex-1 rounded-full ${['PENDING_HR', 'APPROVED'].includes(req.status) ? 'bg-indigo-500' : 'bg-slate-200'}`}></div>
                     <ChevronRight size={12} className="text-slate-300" />
                     <div className={`h-1 flex-1 rounded-full ${req.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                  </div>
                  <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2">
                    <span>Manager Review</span>
                    <span>HR Audit</span>
                    <span>Final Approved</span>
                  </div>

                  {(req.managerRemarks || req.approverRemarks) && (
                    <div className="mt-2 space-y-2">
                      {req.managerRemarks && (
                        <div className="p-3 bg-white border border-slate-100 rounded-2xl text-[11px] font-medium text-slate-600 flex gap-2 items-start">
                          <MessageCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                          <div><p className="text-[9px] font-black text-slate-400 uppercase">Manager Note</p>"{req.managerRemarks}"</div>
                        </div>
                      )}
                      {req.approverRemarks && (
                        <div className="p-3 bg-white border border-slate-100 rounded-2xl text-[11px] font-medium text-slate-600 flex gap-2 items-start">
                          <ShieldCheck size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                          <div><p className="text-[9px] font-black text-slate-400 uppercase">HR Final Note</p>"{req.approverRemarks}"</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-slate-900 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden">
             <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl"></div>
             <h3 className="text-xl font-black mb-6 flex items-center gap-2 relative z-10">
               <Info size={24} className="text-indigo-400" /> Approval Policy
             </h3>
             <div className="space-y-4 relative z-10">
               <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                 <p className="text-xs font-bold text-white mb-1">Staged Workflow</p>
                 <p className="text-[10px] text-slate-400 leading-relaxed">Requests must be verified by your Line Manager before reaching the HR Desk for final audit and balance deduction.</p>
               </div>
               <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                 <p className="text-xs font-bold text-white mb-1">Final Authority</p>
                 <p className="text-[10px] text-slate-400 leading-relaxed">The HR Department / Administrator holds the final decision authority on all organization-wide leave applications.</p>
               </div>
             </div>
          </div>
        </div>
      )}

      {/* Decision Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className={`p-8 flex justify-between items-center text-white ${isAdmin ? 'bg-indigo-600' : 'bg-slate-900'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl"><UserCheck size={20}/></div>
                <h3 className="text-xl font-black uppercase tracking-tight">{isAdmin ? 'HR Final Review' : 'Managerial Verification'}</h3>
              </div>
              <button onClick={() => setShowReviewModal(null)} className="hover:bg-white/10 p-2 rounded-xl"><X size={28} /></button>
            </div>
            <div className="p-10 space-y-6 max-h-[75vh] overflow-y-auto no-scrollbar">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Applicant Profile</p>
                 <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center font-black uppercase">{showReviewModal.employeeName[0]}</div>
                    <div><p className="font-black text-slate-900">{showReviewModal.employeeName}</p><p className="text-xs font-bold text-slate-500">{showReviewModal.type} — {showReviewModal.totalDays} Days</p></div>
                 </div>
                 <div className="space-y-1">
                   <p className="text-[9px] font-black text-slate-400 uppercase">Reason for Leave</p>
                   <p className="text-sm font-medium text-slate-600 italic">"{showReviewModal.reason}"</p>
                 </div>
              </div>

              {/* Manager Evaluation Display for HR/Admin Reviewers */}
              {isAdmin && showReviewModal.status === 'PENDING_HR' && (
                <div className="bg-amber-50 p-6 rounded-3xl border border-amber-200">
                   <div className="flex items-center gap-2 mb-3">
                      <UserPen size={16} className="text-amber-600" />
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Manager Evaluation</p>
                   </div>
                   <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-amber-200 text-amber-700 text-[9px] font-black uppercase rounded">Status: Verified</span>
                      <span className="text-[10px] text-amber-800 font-bold italic">Clearance provided</span>
                   </div>
                   <div className="p-3 bg-white/60 rounded-xl border border-amber-100">
                      <p className="text-[11px] font-medium text-slate-700 leading-relaxed">
                        {showReviewModal.managerRemarks ? `"${showReviewModal.managerRemarks}"` : "The Line Manager verified this request without specific remarks."}
                      </p>
                   </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <MessageCircle size={14} className="text-indigo-600" />
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Evaluation Remarks</label>
                </div>
                <textarea 
                  placeholder="Provide feedback for the applicant..."
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-bold min-h-[100px] outline-none focus:ring-4 focus:ring-indigo-50 transition-all resize-none"
                  value={reviewRemarks}
                  onChange={e => setReviewRemarks(e.target.value)}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={() => handleAction(showReviewModal, 'REJECTED')} className="flex-1 py-5 bg-rose-50 text-rose-600 rounded-[32px] font-black uppercase text-[10px] tracking-widest hover:bg-rose-100 transition-all">Decline</button>
                <button onClick={() => handleAction(showReviewModal, 'APPROVED')} className="flex-1 py-5 bg-indigo-600 text-white rounded-[32px] font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                   {isAdmin ? 'Final Approve' : 'Verify & Forward'} <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-indigo-600 p-8 flex justify-between items-center text-white">
              <div className="flex items-center gap-3"><Plus size={24} className="bg-white/20 p-1 rounded-lg" /><h3 className="text-xl font-black uppercase tracking-tight">Apply for Leave</h3></div>
              <button onClick={() => setShowForm(false)} className="hover:bg-white/10 p-2 rounded-xl transition-all"><X size={28} /></button>
            </div>
            <form onSubmit={handleSubmitLeave} className="p-10 space-y-8">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Select Type</label>
                <select className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl font-black text-sm outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                  <option value="ANNUAL">Annual Leave ({balance?.ANNUAL} Left)</option>
                  <option value="CASUAL">Casual Leave ({balance?.CASUAL} Left)</option>
                  <option value="SICK">Sick Leave ({balance?.SICK} Left)</option>
                  <option value="UNPAID">Unpaid Leave</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Start Date</label>
                  <input type="date" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl" value={formData.start} onChange={e => setFormData({...formData, start: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">End Date</label>
                  <input type="date" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl" value={formData.end} onChange={e => setFormData({...formData, end: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Detailed Reason</label>
                <textarea placeholder="Describe why you need this time off..." className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl font-bold text-sm h-32 resize-none outline-none" required value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})}></textarea>
              </div>

              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-3xl flex items-center gap-3">
                 <div className="p-2 bg-white rounded-xl shadow-sm"><Info size={20} className="text-indigo-600" /></div>
                 <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Calculated Duration: {calculateDays(formData.start, formData.end)} Days</p>
              </div>

              <button type="submit" className="w-full bg-indigo-600 text-white py-6 rounded-[32px] font-black uppercase tracking-[0.2em] text-xs shadow-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"><Send size={20} /> Submit Application</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leave;
