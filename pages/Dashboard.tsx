
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
      const allEmployees = hrService.getEmployees();
      const reportIds = allEmployees.filter(e => e.lineManagerId === user.id).map(e => e.id);
      
      const hrTasks = isAdmin ? allLeaves.filter(l => l.status === 'PENDING_HR') : [];
      const managerTasks = isManager ? allLeaves.filter(l => l.status === 'PENDING_MANAGER' && reportIds.includes(l.employeeId)) : [];

      const combined = [...hrTasks];
      managerTasks.forEach(task => {
        if (!combined.find(t => t.id === task.id)) {
          combined.push(task);
        }
      });

      setPendingLeaves(combined);
    }
  };

  const handleAction = (status: 'APPROVED' | 'REJECTED') => {
    if (!showReviewModal) return;
    let roleToUse = user.role;
    if (showReviewModal.status === 'PENDING_MANAGER' && !isAdmin) {
      roleToUse = 'MANAGER';
    }
    hrService.updateLeaveStatus(showReviewModal.id, status, reviewRemarks, roleToUse);
    setPendingLeaves(prev => prev.filter(l => l.id !== showReviewModal.id));
    refreshDashboardData();
    setShowReviewModal(null);
    setReviewRemarks('');
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
                ? 'bg-rose-50 border-rose-100 text-rose-600' 
                : 'bg-indigo-600 border-indigo-700 text-white shadow-indigo-200'
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
            {attendanceHistory.map((row, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 overflow-hidden shadow-sm flex items-center justify-center">
                    {row.selfie ? <img src={row.selfie} className="w-full h-full object-cover" /> : <Clock size={16} className="text-slate-200" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{new Date(row.date).toLocaleDateString('en-GB')}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">In: {row.checkIn} {row.checkOut ? `• Out: ${row.checkOut}` : '• Active'}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg ${row.checkOut ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700 animate-pulse'}`}>
                  {row.checkOut ? 'COMPLETED' : 'LIVE'}
                </span>
              </div>
            ))}
          </div>
          <button onClick={() => onNavigate('attendance')} className="w-full mt-6 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest border border-slate-100 transition-all flex items-center justify-center gap-2">
            View Full Station <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
          <h3 className="text-xl font-black text-slate-900 mb-6">Leave Allocation</h3>
          <div className="flex-1 w-full min-h-[220px]" style={{ minWidth: 0 }}>
            <ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={0}>
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

      {showReviewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className={`p-8 flex justify-between items-center text-white ${showReviewModal.status === 'PENDING_HR' ? 'bg-indigo-600' : 'bg-slate-900'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl"><UserCheck size={20}/></div>
                <h3 className="text-xl font-black uppercase tracking-tight">{showReviewModal.status === 'PENDING_HR' ? 'HR Final Approval' : 'Review & Verify'}</h3>
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
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Your Remarks</label>
                <textarea 
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-bold min-h-[100px] outline-none"
                  value={reviewRemarks}
                  onChange={e => setReviewRemarks(e.target.value)}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={() => handleAction('REJECTED')} className="flex-1 py-5 bg-rose-50 text-rose-600 rounded-[32px] font-black uppercase text-[10px] tracking-widest hover:bg-rose-100 transition-all">Decline</button>
                <button onClick={() => handleAction('APPROVED')} className="flex-1 py-5 bg-indigo-600 text-white rounded-[32px] font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                   {showReviewModal.status === 'PENDING_HR' ? 'Final Approve' : 'Verify & Forward'} <ArrowRight size={16} />
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
