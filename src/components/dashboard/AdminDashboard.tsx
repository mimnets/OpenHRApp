
import React from 'react';
import { ShieldCheck, Plus, Users, List, CalendarDays, Network, BarChart3, Settings, History, UserCircle } from 'lucide-react';
import { DashboardData } from '../../hooks/dashboard/useDashboard';
import { DashboardHeader } from './DashboardHeader';
import { DashboardStats } from './DashboardStats';
import { AdBanner } from '../ads';

interface Props {
  data: DashboardData;
  isLoading: boolean;
  onNavigate: (path: string, params?: any) => void;
}

export const AdminDashboard: React.FC<Props> = ({ data, isLoading, onNavigate }) => {
  const totalRemaining = (data.userBalance?.ANNUAL || 0) + (data.userBalance?.CASUAL || 0) + (data.userBalance?.SICK || 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <DashboardHeader 
        user={data.freshUser} 
        activeShift={data.activeShift} 
        appConfig={data.appConfig} 
        isLoading={isLoading}
        onNavigate={onNavigate} 
      />

      <DashboardStats 
        leaveUsed={data.leaveUsed} 
        upcomingHoliday={data.upcomingHoliday} 
        isLoading={isLoading} 
      />

      {/* Quick Access Tabs */}
      <div className="space-y-2">
        {/* Row 1 — Management */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Management</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => onNavigate('attendance-audit')}
              className="py-3 px-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-1.5 text-slate-500 hover:text-slate-700 hover:bg-white"
            >
              <List size={16} /> <span className="truncate">Audit</span>
            </button>
            <button
              onClick={() => onNavigate('leave')}
              className="py-3 px-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-1.5 text-slate-500 hover:text-slate-700 hover:bg-white"
            >
              <CalendarDays size={16} /> <span className="truncate">Leave</span>
            </button>
            <button
              onClick={() => onNavigate('employees')}
              className="py-3 px-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-1.5 text-slate-500 hover:text-slate-700 hover:bg-white"
            >
              <Users size={16} /> <span className="truncate">Directory</span>
            </button>
            <button
              onClick={() => onNavigate('organization')}
              className="py-3 px-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-1.5 text-slate-500 hover:text-slate-700 hover:bg-white"
            >
              <Network size={16} /> <span className="truncate">Org</span>
            </button>
            <button
              onClick={() => onNavigate('reports')}
              className="py-3 px-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-1.5 text-slate-500 hover:text-slate-700 hover:bg-white"
            >
              <BarChart3 size={16} /> <span className="truncate">Reports</span>
            </button>
          </div>
        </div>
        {/* Row 2 — Personal */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Personal</p>
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => onNavigate('attendance-logs')}
              className="py-3 px-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-1.5 text-slate-500 hover:text-slate-700 hover:bg-white"
            >
              <History size={16} /> <span className="truncate">Attendance</span>
            </button>
            <button
              onClick={() => onNavigate('profile')}
              className="py-3 px-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-1.5 text-slate-500 hover:text-slate-700 hover:bg-white"
            >
              <UserCircle size={16} /> <span className="truncate">Profile</span>
            </button>
            <button
              onClick={() => onNavigate('settings')}
              className="py-3 px-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-1.5 text-slate-500 hover:text-slate-700 hover:bg-white"
            >
              <Settings size={16} /> <span className="truncate">Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Ad Banner (for AD_SUPPORTED orgs) */}
      <div className="flex justify-center">
        <AdBanner slot="dashboard" className="rounded-xl overflow-hidden" />
      </div>

      {!isLoading && (
        <>
          {/* Leave Allocation Card - Identical to Manager for now, but separated for future extensibility */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4">
            <div className="bg-[#4a89dc] p-8 pb-12 relative overflow-hidden flex items-center justify-between">
              <h2 className="text-2xl font-black text-white tracking-tight mt-4">Leave Allocation</h2>
              <ShieldCheck className="text-white/20 absolute -right-4 -bottom-4 w-32 h-32" />
            </div>
            
            <div className="px-8 -mt-6">
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-lg space-y-8">
                <div className="flex justify-around items-center divide-x divide-slate-100">
                  <div className="text-center flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Annual</p>
                    <p className="text-2xl font-black text-[#2563eb]">{data.userBalance?.ANNUAL || 0}</p>
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sick</p>
                    <p className="text-2xl font-black text-[#2563eb]">{data.userBalance?.SICK || 0}</p>
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Casual</p>
                    <p className="text-2xl font-black text-[#2563eb]">{data.userBalance?.CASUAL || 0}</p>
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
              </div>
            </div>
            <div className="h-6"></div>
          </div>

          {/* Org Directory Shortcut */}
          <div 
            className={`bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between transition-all cursor-pointer hover:bg-slate-50`} 
            onClick={() => onNavigate('employees')}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <Users size={24} />
              </div>
              <div>
                <h4 className="font-black text-slate-900 leading-none">Global Directory</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                  Organization-wide
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-black text-emerald-600">{data.activeTeamMembers} Active</p>
              <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Out of {data.teamMembersCount}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
