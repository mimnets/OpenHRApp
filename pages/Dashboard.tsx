
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
  ShieldCheck,
  Loader2,
  Building,
  Building2,
  Fingerprint,
  Network,
  GitBranch,
  User
} from 'lucide-react';
import { hrService } from '../services/hrService';
import { LeaveRequest, Attendance, LeaveBalance, Employee, Holiday, Team, AppConfig, LeaveWorkflow } from '../types';

interface DashboardProps {
  user: any;
  onNavigate: (path: string, params?: any) => void;
}

const SkeletonCard = () => (
  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm animate-pulse flex flex-col gap-3">
    <div className="w-10 h-10 bg-slate-100 rounded-xl"></div>
    <div className="space-y-2">
      <div className="h-6 bg-slate-100 rounded-lg w-3/4"></div>
      <div className="h-3 bg-slate-50 rounded-lg w-1/2"></div>
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate }) => {
  const isAdmin = user.role === 'ADMIN' || user.role === 'HR';
  const isManager = user.role === 'MANAGER';
  const isRegularEmployee = user.role === 'EMPLOYEE';
  
  const [activeShift, setActiveShift] = useState<Attendance | undefined>(undefined);
  const [userBalance, setUserBalance] = useState<LeaveBalance | null>(null);
  const [teamMembersCount, setTeamMembersCount] = useState(0);
  const [activeTeamMembers, setActiveTeamMembers] = useState(0);
  const [leaveUsed, setLeaveUsed] = useState(0);
  const [upcomingHoliday, setUpcomingHoliday] = useState<Holiday | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [teamInfo, setTeamInfo] = useState<Team | null>(null);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  
  // Context Data
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [workflows, setWorkflows] = useState<LeaveWorkflow[]>([]);
  
  // Fresh user data state
  const [freshUser, setFreshUser] = useState<Employee>(user);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        
        const [active, balance, emps, leaves, hols, atts, teams, config, wfs] = await Promise.all([
          hrService.getActiveAttendance(user.id),
          hrService.getLeaveBalance(user.id),
          hrService.getEmployees(),
          hrService.getLeaves(),
          hrService.getHolidays(),
          hrService.getAttendance(),
          hrService.getTeams(),
          hrService.getConfig(),
          hrService.getWorkflows()
        ]);

        // CRITICAL: Find fresh user record from the fetched list to ensure latest Team/Manager assignments are used
        const me = emps.find(e => e.id === user.id) || user;
        setFreshUser(me);

        setActiveShift(active);
        setUserBalance(balance);
        setAppConfig(config);
        setAllEmployees(emps);
        setAllTeams(teams);
        setWorkflows(wfs || []);

        const myUsedLeaves = leaves
          .filter(l => l.employeeId === user.id && l.status === 'APPROVED')
          .reduce((acc, curr) => acc + (curr.totalDays || 0), 0);
        setLeaveUsed(myUsedLeaves);

        // FILTER LOGIC: Strictly ensure 'unassigned' (no team) does not match 'unassigned'
        let visibleEmployees: Employee[] = [];
        if (isAdmin) {
          visibleEmployees = emps;
        } else if (isManager) {
          // If Manager, filter by THEIR fresh teamId (if they have one) OR people reporting to them
          visibleEmployees = emps.filter(e => 
            (me.teamId && e.teamId === me.teamId) || 
            (e.lineManagerId === me.id)
          );
          // Set team info for manager view using fresh data
          const myTeam = teams.find(t => t.id === me.teamId);
          if (myTeam) setTeamInfo(myTeam);
        } else {
          // Employee: only see teammates if they have a team
          visibleEmployees = emps.filter(e => me.teamId && e.teamId === me.teamId);
        }
        
        setTeamMembersCount(visibleEmployees.length);

        const visibleIds = visibleEmployees.map(t => t.id);
        const presentToday = atts.filter(a => a.date === today && visibleIds.includes(a.employeeId));
        setActiveTeamMembers(presentToday.length);

        const futureHols = hols
          .filter(h => h.date >= today)
          .sort((a, b) => a.date.localeCompare(b.date));
        setUpcomingHoliday(futureHols[0] || null);

      } catch (err) {
        console.error("Dashboard data fetch failed", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user.id, isAdmin, isManager, user.teamId]); // Dependencies

  const totalRemaining = (userBalance?.ANNUAL || 0) + (userBalance?.CASUAL || 0) + (userBalance?.SICK || 0);

  // Derived Info for Context Card using FRESH user data
  const myManager = allEmployees.find(e => e.id === freshUser.lineManagerId);
  const myTeamName = allTeams.find(t => t.id === freshUser.teamId)?.name || 'Unassigned';
  const myWorkflow = workflows.find(w => w.department === freshUser.department);
  const approverRole = myWorkflow?.approverRole || 'LINE_MANAGER';
  const approverLabel = approverRole === 'HR' ? 'HR Department' : (approverRole === 'ADMIN' ? 'Admin' : 'Line Manager');

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          {appConfig?.companyName && (
            <div className="flex items-center gap-2 mb-1">
              <Building2 size={12} className="text-indigo-500" />
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">{appConfig.companyName}</p>
            </div>
          )}
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{freshUser.name}</h1>
          <p className="text-xs font-bold text-slate-400 mt-1">
            {freshUser.designation} {freshUser.department && freshUser.department !== 'Unassigned' && `• ${freshUser.department}`}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="w-48 h-16 bg-slate-100 rounded-[1.5rem] animate-pulse"></div>
          ) : activeShift ? (
            <button 
              onClick={() => onNavigate('attendance-finish')}
              className="flex items-center gap-3 px-6 py-4 bg-white border border-emerald-100 rounded-[1.5rem] shadow-sm hover:shadow-md transition-all group active:scale-95 animate-in zoom-in"
            >
              <div className="relative">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-75"></div>
              </div>
              <div className="text-left">
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">Session Active</p>
                <p className="text-xs font-black text-slate-900 uppercase">Finish Session</p>
              </div>
              <ArrowRight size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors ml-2" />
            </button>
          ) : (
            <div className="flex gap-2 animate-in slide-in-from-right-4">
              <button 
                onClick={() => onNavigate('attendance-quick-office')}
                className="flex items-center gap-3 px-5 py-4 bg-indigo-600 text-white rounded-[1.5rem] shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
              >
                <Building size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Office</span>
              </button>
              <button 
                onClick={() => onNavigate('attendance-quick-factory')}
                className="flex items-center gap-3 px-5 py-4 bg-emerald-600 text-white rounded-[1.5rem] shadow-lg shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all"
              >
                <Building2 size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Factory</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <CalendarDays size={20} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 leading-none">{leaveUsed} Days</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-tight">Leave Used (Approved)</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <Gift size={20} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 leading-none">
                  {upcomingHoliday ? new Date(upcomingHoliday.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) : 'N/A'}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-tight truncate">
                  {upcomingHoliday?.name || 'No Upcoming Holidays'}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Content Area */}
      {isRegularEmployee ? (
        // EMPLOYEE VIEW: Context Info & COMPACT Apply Button
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-bottom-4">
           {/* Context Card */}
           <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between gap-6">
              <div className="flex items-start justify-between">
                 <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Network size={20}/></div>
                    <div>
                       <p className="text-[9px] uppercase text-slate-400 font-black tracking-widest">My Team</p>
                       <h3 className="font-black text-slate-800 text-lg leading-tight">{myTeamName}</h3>
                    </div>
                 </div>
              </div>
              
              <div className="w-full h-px bg-slate-50"></div>
              
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <p className="text-[9px] uppercase text-slate-400 font-black tracking-widest flex items-center gap-1"><User size={10} /> Reporting To</p>
                    <p className="font-bold text-slate-700 text-sm truncate">{myManager?.name || 'No Manager'}</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[9px] uppercase text-slate-400 font-black tracking-widest flex items-center gap-1"><GitBranch size={10} /> Workflow</p>
                    <p className="font-bold text-slate-700 text-sm truncate">{approverLabel}</p>
                 </div>
              </div>
           </div>

           {/* COMPACT Leave Action Card */}
           <div 
             onClick={() => onNavigate('leave', { autoOpen: true })}
             className="bg-[#2563eb] p-6 rounded-[2.5rem] border border-blue-600 shadow-xl shadow-blue-200 text-white flex flex-row items-center justify-between relative overflow-hidden group cursor-pointer active:scale-95 transition-all"
           >
              <ShieldCheck className="absolute -bottom-6 -right-6 w-32 h-32 text-white/10 group-hover:scale-110 transition-transform duration-500" />
              <div className="flex items-center gap-4 relative z-10">
                 <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <Plus size={28} />
                 </div>
                 <div>
                    <h3 className="text-lg font-black tracking-tight leading-none mb-1">New Leave Request</h3>
                    <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest">Submit Application</p>
                 </div>
              </div>
              <div className="bg-white text-[#2563eb] rounded-full p-3 shadow-lg group-hover:translate-x-1 transition-transform">
                 <ArrowRight size={20} />
              </div>
           </div>
        </div>
      ) : (
        // ADMIN/MANAGER VIEW: Detailed Allocation
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4">
          <div className="bg-[#4a89dc] p-8 pb-12 relative overflow-hidden flex items-center justify-between">
            <h2 className="text-2xl font-black text-white tracking-tight mt-4">Leave Allocation</h2>
            <ShieldCheck className="text-white/20 absolute -right-4 -bottom-4 w-32 h-32" />
          </div>
          
          <div className="px-8 -mt-6">
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-lg space-y-8">
              {isLoading ? (
                <div className="space-y-6 animate-pulse">
                   <div className="flex justify-around items-center h-12">
                     <div className="h-8 bg-slate-50 rounded w-16"></div>
                     <div className="h-8 bg-slate-50 rounded w-16"></div>
                     <div className="h-8 bg-slate-50 rounded w-16"></div>
                   </div>
                   <div className="h-4 bg-slate-50 rounded w-3/4 mx-auto"></div>
                   <div className="h-14 bg-slate-100 rounded-2xl w-full"></div>
                </div>
              ) : (
                <>
                  <div className="flex justify-around items-center divide-x divide-slate-100">
                    <div className="text-center flex-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Annual</p>
                      <p className="text-2xl font-black text-[#2563eb]">{userBalance?.ANNUAL || 0}</p>
                    </div>
                    <div className="text-center flex-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sick</p>
                      <p className="text-2xl font-black text-[#2563eb]">{userBalance?.SICK || 0}</p>
                    </div>
                    <div className="text-center flex-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Casual</p>
                      <p className="text-2xl font-black text-[#2563eb]">{userBalance?.CASUAL || 0}</p>
                    </div>
                  </div>

                  <p className="text-center text-sm text-slate-500 font-medium">
                    You have <span className="font-black text-slate-900">{totalRemaining} total days</span> remaining for the current fiscal year.
                  </p>

                  <button 
                    onClick={() => onNavigate('leave', { autoOpen: true })}
                    className="w-full py-5 bg-[#2563eb] text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
                  >
                    <Plus size={18} /> Apply for Leave
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="h-6"></div>
        </div>
      )}

      {/* Team Presence - HIDDEN FOR EMPLOYEES */}
      {(isAdmin || isManager) && (
        <div 
          className={`bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between transition-all cursor-pointer hover:bg-slate-50`} 
          onClick={() => onNavigate('employees')}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
              {isLoading ? <Loader2 size={24} className="animate-spin text-emerald-200" /> : <Users size={24} />}
            </div>
            <div>
              <h4 className="font-black text-slate-900 leading-none">Team Directory</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                {isAdmin ? 'Organization-wide' : (teamInfo?.name || freshUser.department)}
              </p>
            </div>
          </div>
          <div className="text-right">
            {isLoading ? (
              <div className="h-6 bg-slate-50 rounded w-16 animate-pulse"></div>
            ) : (
              <>
                <p className="text-xs font-black text-emerald-600">{activeTeamMembers} Active</p>
                <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Out of {teamMembersCount}</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
