
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
  UserCircle,
  ChevronRight
} from 'lucide-react';
import { pb } from '../services/pocketbase';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  role: string;
  user?: any;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPath, onNavigate, onLogout, role, user }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] },
    { id: 'profile', label: 'My Profile', icon: UserCircle, roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] },
    { id: 'attendance', label: 'Attendance', icon: Clock, roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] },
    { id: 'leave', label: 'Leave', icon: CalendarDays, roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] },
    { id: 'employees', label: 'Employees', icon: Users, roles: ['ADMIN', 'HR'] },
    { id: 'organization', label: 'Organization', icon: Network, roles: ['ADMIN', 'HR'] },
    { id: 'reports', label: 'Reports', icon: BarChart3, roles: ['ADMIN', 'HR'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['ADMIN', 'HR'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(role));

  return (
    <aside className="w-72 bg-white h-screen flex flex-col border-r border-slate-100 shadow-sm relative z-50">
      {/* Profile Header */}
      <div className="p-10 pb-8 flex flex-col items-center text-center">
        <div className="relative mb-4">
          <img 
            src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=random`} 
            className="w-24 h-24 rounded-full border-4 border-white shadow-xl bg-slate-50 object-cover" 
            alt="Profile" 
          />
          <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-4 border-white rounded-full"></div>
        </div>
        <h2 className="text-xl font-black text-slate-900 leading-tight">{user?.name || 'User Name'}</h2>
        <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-tight">{user?.designation || 'Specialist'}</p>
        <div className="w-full h-px bg-slate-50 mt-8"></div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 relative group ${
              currentPath === item.id 
                ? 'bg-blue-50/50 text-[#2563eb]' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {currentPath === item.id && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-[#2563eb] rounded-r-full"></div>
            )}
            <item.icon size={22} className={currentPath === item.id ? 'text-[#2563eb]' : 'text-slate-400'} />
            <span className="font-bold text-sm tracking-tight">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Footer / Sign Out */}
      <div className="p-6 pt-0 space-y-4">
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-between p-6 bg-slate-50 border border-slate-100 rounded-3xl group hover:bg-rose-50 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-2xl shadow-sm text-slate-600 group-hover:text-rose-600 transition-colors">
              <LogOut size={20} />
            </div>
            <span className="font-black text-sm text-slate-900 uppercase tracking-tight">Sign Out</span>
          </div>
          <ChevronRight size={18} className="text-slate-300 group-hover:text-rose-300 transition-colors" />
        </button>

        <div className="text-center">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">OpenHRApp v2.4.0</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
