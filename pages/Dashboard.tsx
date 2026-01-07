
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CalendarDays, 
  Clock, 
  TrendingUp, 
  AlertCircle,
  Calendar,
  ChevronRight,
  UserCheck,
  Bell,
  Check,
  X,
  ArrowUpRight,
  ArrowRight,
  Play,
  LogOut,
  Zap,
  MessageCircle,
  ShieldCheck,
  UserPen
} from 'lucide-react';
import DashboardCard from '../components/DashboardCard';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { hrService } from '../services/hrService';
import { LeaveRequest, Attendance, LeaveBalance } from '../types';

interface DashboardProps {
  user: any;
  onNavigate: (path: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate }) => {
  const isAdmin = user.role === 'ADMIN' || user.role === 'HR';
  const isManager = hrService.isManagerOfSomeone(user.id);
  
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [activeShift, setActiveShift] = useState<Attendance | undefined>(undefined);
  const [attendanceHistory, setAttendanceHistory] = useState<Attendance[]>([]);
  const [userBalance, setUserBalance] = useState<LeaveBalance | null>(null);

  // Review Modal state
  const [showReviewModal, setShowReviewModal] = useState<LeaveRequest | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState('');

  useEffect(() => {
    refreshDashboardData();
  }, [isAdmin, isManager, user.id]);

  const refreshDashboardData = () => {
    setActiveShift(hrService.getActiveAttendance(user.id));
    setUserBalance(hrService.getLeaveBalance(user.id));
    
    const userHistory = hrService.getAttendance()
      .filter(a => a.employeeId === user.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
    setAttendanceHistory(userHistory);

    if (isAdmin || isManager) {
      const allLeaves = hrService.getLeaves();
      let actionable: LeaveRequest[] = [];

      if (isAdmin) {
        actionable = allLeaves.filter(l => l.status === 'PENDING_HR');
      } else if (isManager) {
        const reportIds = hrService.getEmployees().filter(e => e.lineManagerId === user.id).map(e => e.id);
        actionable = allLeaves.filter(l => l.status === 'PENDING_MANAGER' && reportIds.includes(l.employeeId));
      }
      setPendingLeaves(actionable);
    }
  };

  const handleAction = (status: 'APPROVED' | 'REJECTED') => {
    if (!showReviewModal) return;
    
    hrService.updateLeaveStatus(showReviewModal.id, status, reviewRemarks, user.role);
    setPendingLeaves(prev => prev.filter(l => l.id !== showReviewModal.id));
    refreshDashboardData();
    setShowReviewModal(null);
    setReviewRemarks('');
    alert(status === 'APPROVED' ? 'Request successfully processed.' : 'Request rejected.');
  };

  const leaveData = [
    { name: 'Annual', value: userBalance?.ANNUAL || 0 },
    { name: 'Sick', value: userBalance?.SICK || 0 },
    { name: 'Casual', value: userBalance?.CASUAL || 0 },
  ];
  const COLORS = ['#4f46e5', '#10b981', '#f59e0b'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome back, {user.name}</h1>
          <p className="text-slate-500 font-medium tracking-tight">
            {isAdmin ? 'Organization Administrator Overview' : isManager ? 'Team Manager Overview' : 'Personal Employee Overview'}
          </p>
        </div>
        
        <div className="flex-shrink-0">
           <button 
              onClick={() => onNavigate('attendance')}
              className={`flex items-center gap-3 px-6 py-4 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl transition-all active:scale-95 group border-2 ${
                activeShift 
                ? 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100' 
                : 'bg-indigo-600 border-indigo-700 text-white hover:bg-indigo-700 shadow-indigo-200'
              }`}
            >
              <div className={`p-2 rounded-full ${activeShift ? 'bg-rose-500 text-white animate-pulse' : 'bg-white text-indigo-600'}`}>
                {activeShift ? <LogOut size={16} /> : <Play size={16} />}
              </div>
              <div className="text-left leading-tight">
                <p className="opacity-70 text-[10px]">Quick Action</p>
                <p className="text-sm">{activeShift ? 'End Session' : 'Punch In Now'}</p>
              </div>
            </button>
        </div>
      </header>

      {(isAdmin || isManager) && pendingLeaves.length > 0 && (
        <section className="bg-amber-50 border border-amber-100 rounded-3xl p-6 md:p-8 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-amber-200 text-amber-700 rounded-xl">
              <AlertCircle size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Task Center</h3>
              <p className="text-xs font-medium text-amber-700">Awaiting your verification or final approval</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingLeaves.map((leave) => (
              <div key={leave.id} className="bg-white p-5 rounded-2xl shadow-sm border border-amber-100 flex flex-col justify-between hover:shadow-md transition-all">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-widest rounded">Leave Review</span>
                    <p className="text-[10px] text-slate-400 font-bold">{new Date(leave.appliedDate).toLocaleDateString()}</p>
                  </div>
                  <h4 className="font-bold text-slate-900 leading-tight">{leave.employeeName}</h4>
                  <p className="text-xs text-slate-500 font-medium mt-1">{leave.type} • {leave.totalDays} Days</p>
                  <p className="text-[11px] text-slate-400 mt-2 line-clamp-1 italic">"{leave.reason}"</p>
                </div>
                <div className="mt-4">
                  <button 
                    onClick={() => setShowReviewModal(leave)}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Check size={14} /> Review & Action
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard title="Personal Leave" value={`${userBalance?.ANNUAL || 0} Days`} icon={CalendarDays} color="bg-indigo-600" subtitle="Remaining Annual Leave" />
        <DashboardCard title="Organization Size" value={isAdmin ? "482 Staff" : "Department Wide"} icon={Users} color="bg-emerald-600" subtitle="Active Personnel" />
        <DashboardCard title="Attendance Rate" value="98%" icon={Clock} color="bg-amber-600" subtitle="Current Month Stats" />
        <DashboardCard title="Next Holiday" value="Victory Day" icon={Calendar} color="bg-rose-600" subtitle="Dec 16, 2024" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
          <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
            <Clock className="text-indigo-600" /> My Recent Sessions
          </h3>
          <div className="space-y-4 flex-1">
            {attendanceHistory.length > 0 ? (
              attendanceHistory.map((row, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 overflow-hidden shadow-sm">
                      {row.selfie ? <img src={row.selfie} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-200"><Clock size={16} /></div>}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{new Date(row.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">In: {row.checkIn} {row.checkOut ? `• Out: ${row.checkOut}` : '• Active'}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg ${row.checkOut ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700 animate-pulse'}`}>
                    {row.checkOut ? 'COMPLETED' : 'LIVE'}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-300"><Clock size={48} className="mx-auto mb-2 opacity-20" /><p className="text-xs font-black uppercase tracking-widest">No activity history</p></div>
            )}
          </div>
          <button onClick={() => onNavigate('attendance')} className="w-full mt-6 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 border border-slate-100 transition-all flex items-center justify-center gap-2">
            View Full Station <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
          <h3 className="text-xl font-black text-slate-900 mb-6">Leave Allocation</h3>
          <div className="flex-1 min-h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={leaveData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {leaveData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {leaveData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[idx]}}></div>
                  <span className="text-xs font-bold text-slate-600">{item.name}</span>
                </div>
                <span className="text-xs font-black text-slate-900">{item.value} Days Left</span>
              </div>
            ))}
          </div>
          <button onClick={() => onNavigate('leave')} className="mt-8 p-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">Apply for Leave <ArrowRight size={14}/></button>
        </div>
      </div>

      {/* Decision Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className={`p-8 flex justify-between items-center text-white ${isAdmin ? 'bg-indigo-600' : 'bg-slate-900'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl"><UserCheck size={20}/></div>
                <h3 className="text-xl font-black uppercase tracking-tight">{isAdmin ? 'Final Approval' : 'Review Request'}</h3>
              </div>
              <button onClick={() => setShowReviewModal(null)} className="hover:bg-white/10 p-2 rounded-xl"><X size={28} /></button>
            </div>
            <div className="p-10 space-y-6 max-h-[75vh] overflow-y-auto no-scrollbar">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Applicant Summary</p>
                 <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center font-black uppercase">{showReviewModal.employeeName[0]}</div>
                    <div>
                      <p className="font-black text-slate-900">{showReviewModal.employeeName}</p>
                      <p className="text-xs font-bold text-slate-500">{showReviewModal.type} — {showReviewModal.totalDays} Days</p>
                    </div>
                 </div>
                 <div className="space-y-1">
                   <p className="text-[9px] font-black text-slate-400 uppercase">Employee Reason</p>
                   <p className="text-sm font-medium text-slate-600 italic">"{showReviewModal.reason}"</p>
                 </div>
              </div>

              {/* Manager Evaluation Display for HR/Admin */}
              {isAdmin && showReviewModal.status === 'PENDING_HR' && (
                <div className="bg-amber-50 p-6 rounded-3xl border border-amber-200">
                   <div className="flex items-center gap-2 mb-3">
                      <UserPen size={16} className="text-amber-600" />
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Manager Evaluation</p>
                   </div>
                   <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-amber-200 text-amber-700 text-[9px] font-black uppercase rounded">Status: Verified</span>
                      <span className="text-[10px] text-amber-800 font-bold italic">Forwarded for final approval</span>
                   </div>
                   <div className="p-3 bg-white/60 rounded-xl border border-amber-100">
                      <p className="text-[11px] font-medium text-slate-700">
                        {showReviewModal.managerRemarks ? `"${showReviewModal.managerRemarks}"` : "Verified without additional comments."}
                      </p>
                   </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                   <MessageCircle size={14} className="text-indigo-600" />
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Your Remarks</label>
                </div>
                <textarea 
                  placeholder="Enter your feedback or justification for this decision..."
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-bold min-h-[100px] outline-none focus:ring-4 focus:ring-indigo-50 transition-all resize-none"
                  value={reviewRemarks}
                  onChange={e => setReviewRemarks(e.target.value)}
                />
                <p className="text-[9px] text-slate-400 font-bold uppercase px-1">
                   {isAdmin ? "Your remarks will be visible to the employee as final audit notes." : "Forwarding this will send it to the HR Department for final decision."}
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={() => handleAction('REJECTED')} className="flex-1 py-5 bg-rose-50 text-rose-600 rounded-[32px] font-black uppercase text-[10px] tracking-widest hover:bg-rose-100 transition-all">Decline</button>
                <button onClick={() => handleAction('APPROVED')} className="flex-1 py-5 bg-indigo-600 text-white rounded-[32px] font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                   {isAdmin ? 'Confirm & Approve' : 'Forward to HR'} <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
