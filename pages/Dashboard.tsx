
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CalendarDays, 
  Clock, 
  Calendar,
  UserCheck,
  Check,
  X,
  ArrowRight,
  LogOut,
  Play,
  Plus,
  LayoutDashboard,
  UserCircle,
  Gift,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { hrService } from '../services/hrService';
import { LeaveRequest, Attendance, LeaveBalance, Employee } from '../types';

interface DashboardProps {
  user: any;
  onNavigate: (path: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate }) => {
  const isAdmin = user.role === 'ADMIN' || user.role === 'HR';
  const [activeShift, setActiveShift] = useState<Attendance | undefined>(undefined);
  const [userBalance, setUserBalance] = useState<LeaveBalance | null>(null);
  const [teamCount, setTeamCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const active = await hrService.getActiveAttendance(user.id);
      setActiveShift(active);
      const balance = await hrService.getLeaveBalance(user.id);
      setUserBalance(balance);
      const emps = await hrService.getEmployees();
      setTeamCount(emps.length);
    };
    fetchData();
  }, [user.id]);

  const totalRemaining = (userBalance?.ANNUAL || 0) + (userBalance?.CASUAL || 0) + (userBalance?.SICK || 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Header with Status Pill */}
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">Welcome back,</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{user.name}</h1>
        </div>
        
        {/* Interactive Status Pill */}
        <button 
          onClick={() => onNavigate('attendance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all hover:scale-105 active:scale-95 group shadow-sm ${
            activeShift 
              ? 'bg-emerald-50 border-emerald-100 hover:bg-emerald-100' 
              : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${activeShift ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
          <span className={`text-[10px] font-black uppercase tracking-[0.1em] ${activeShift ? 'text-emerald-600' : 'text-slate-400'}`}>
            {activeShift ? 'Active' : 'Offline'}
          </span>
        </button>
      </header>

      {/* Top Small Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <CalendarDays size={20} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 leading-none">12 Days</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-tight">Personal Leave Used</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <Gift size={20} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 leading-none">July 4th</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-tight">Independence Day</p>
          </div>
        </div>
      </div>

      {/* Leave Allocation Main Card */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="bg-[#4a89dc] p-8 pb-12 relative overflow-hidden flex items-center justify-between">
          <h2 className="text-2xl font-black text-white tracking-tight mt-4">Leave Allocation</h2>
          <ShieldCheck className="text-white/20 absolute -right-4 -bottom-4 w-32 h-32" />
        </div>
        
        <div className="px-8 -mt-6">
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-lg space-y-8">
            <div className="flex justify-around items-center divide-x divide-slate-100">
              <div className="text-center flex-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Annual</p>
                <p className="text-2xl font-black text-[#2563eb]">{userBalance?.ANNUAL || 20}</p>
              </div>
              <div className="text-center flex-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sick</p>
                <p className="text-2xl font-black text-[#2563eb]">{userBalance?.SICK || 10}</p>
              </div>
              <div className="text-center flex-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Casual</p>
                <p className="text-2xl font-black text-[#2563eb]">{String(userBalance?.CASUAL || 5).padStart(2, '0')}</p>
              </div>
            </div>

            <p className="text-center text-sm text-slate-500 font-medium">
              You have <span className="font-black text-slate-900">{totalRemaining} total days</span> remaining for the current fiscal year.
            </p>

            <button 
              onClick={() => onNavigate('leave')}
              className="w-full py-5 bg-[#2563eb] text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
            >
              <Plus size={18} /> Apply for Leave
            </button>
          </div>
        </div>
        <div className="h-6"></div>
      </div>

      {/* Team Presence Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <h4 className="font-black text-slate-900 leading-none">Team Presence</h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Design & Engineering</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-black text-emerald-600">5 Active</p>
          <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Today</p>
        </div>
      </div>

      {/* Avatar Stack Placeholder */}
      <div className="flex items-center gap-2 px-2">
        <div className="flex -space-x-3">
          {[1,2,3].map(i => (
            <div key={i} className="w-10 h-10 rounded-full border-4 border-white bg-amber-100 overflow-hidden shadow-sm">
              <img src={`https://ui-avatars.com/api/?name=User+${i}&background=random`} alt="user" className="w-full h-full object-cover" />
            </div>
          ))}
          <div className="w-10 h-10 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 shadow-sm">
            +2
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
