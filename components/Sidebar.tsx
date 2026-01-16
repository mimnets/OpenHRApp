import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  CalendarDays, 
  BarChart3, 
  Settings, 
  LogOut,
  ShieldCheck,
  Network,
  UserCircle
} from 'lucide-react';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  role: string;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPath, onNavigate, onLogout, role }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] },
    { id: 'profile', label: 'My Profile', icon: UserCircle, roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] },
    { id: 'employees', label: 'Employees', icon: Users, roles: ['ADMIN', 'HR'] },
    { id: 'organization', label: 'Organization', icon: Network, roles: ['ADMIN', 'HR'] },
    { id: 'attendance', label: 'Attendance', icon: Clock, roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] },
    { id: 'leave', label: 'Leave', icon: CalendarDays, roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] },
    { id: 'reports', label: 'Reports', icon: BarChart3, roles: ['ADMIN', 'HR'] },
    { id: 'settings', label: 'System Settings', icon: Settings, roles: ['ADMIN', 'HR'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(role));

  return (
    <aside className="w-64 bg-slate-900 h-screen flex flex-col text-white shadow-xl relative z-50 overflow-hidden">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800 flex-shrink-0">
        <div className="bg-white p-1.5 rounded-lg shadow-lg flex-shrink-0">
          <img src="https://cdn-icons-png.flaticon.com/512/9167/9167014.png" className="w-8 h-8 object-contain" alt="OpenHR Logo" />
        </div>
        <div className="min-w-0">
          <h1 className="font-black text-lg leading-tight tracking-tighter truncate">
            <span className="text-white">Open</span>
            <span className="text-[#f59e0b]">HR</span>
            <span className="text-[#10b981]">App</span>
          </h1>
          <p className="text-[8px] font-black uppercase text-slate-500 tracking-[0.2em] truncate">Open Source HR</p>
        </div>
      </div>

      <nav className="flex-1 mt-6 px-4 space-y-2 overflow-y-auto no-scrollbar">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
              currentPath === item.id 
                ? 'bg-indigo-600 text-white shadow-lg' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon size={20} className="flex-shrink-0" />
            <span className="font-bold text-xs uppercase tracking-widest truncate">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-3 flex-shrink-0">
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-rose-900/40 rounded-lg transition-all"
        >
          <LogOut size={20} className="flex-shrink-0" />
          <span className="font-black text-xs uppercase tracking-widest">Sign Out</span>
        </button>

        <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
          <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-1 uppercase font-black tracking-tight">
            <ShieldCheck size={14} className="text-emerald-500 flex-shrink-0" />
            <span className="truncate">Secured</span>
          </div>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest truncate">v2.6.0-OS</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;