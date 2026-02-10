
import React from 'react';
import { Building, Building2, ArrowRight } from 'lucide-react';
import { Employee, Attendance, AppConfig } from '../../types';

interface Props {
  user: Employee;
  activeShift?: Attendance;
  appConfig: AppConfig | null;
  isLoading: boolean;
  onNavigate: (path: string) => void;
}

export const DashboardHeader: React.FC<Props> = ({ user, activeShift, appConfig, isLoading, onNavigate }) => {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 md:gap-6">
      <div>
        {appConfig?.companyName && (
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={12} className="text-primary" />
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{appConfig.companyName}</p>
          </div>
        )}
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{user.name}</h1>
        <p className="text-xs font-bold text-slate-400 mt-0.5">
          {user.designation} {user.department && user.department !== 'Unassigned' && `• ${user.department}`}
        </p>
      </div>
      
      <div className="flex items-center gap-3">
        {isLoading ? (
          <div className="w-48 h-16 bg-slate-100 rounded-[1.5rem] animate-pulse"></div>
        ) : activeShift ? (
          <button 
            onClick={() => onNavigate('attendance-finish')}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-3 md:py-4 bg-white border border-emerald-100 rounded-2xl md:rounded-[1.5rem] shadow-sm hover:shadow-md transition-all group active:scale-95 animate-in zoom-in"
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
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto animate-in slide-in-from-right-4">
            <button 
              onClick={() => onNavigate('attendance-quick-office')}
              className="flex items-center justify-center gap-2 px-4 py-3 md:px-5 md:py-4 bg-primary text-white rounded-2xl md:rounded-[1.5rem] shadow-lg shadow-primary-light hover:bg-primary-hover active:scale-95 transition-all"
            >
              <Building size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Office</span>
            </button>
            <button 
              onClick={() => onNavigate('attendance-quick-factory')}
              className="flex items-center justify-center gap-2 px-4 py-3 md:px-5 md:py-4 bg-emerald-600 text-white rounded-2xl md:rounded-[1.5rem] shadow-lg shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all"
            >
              <Building2 size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Factory</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
