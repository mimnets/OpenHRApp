
import React from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  BarChart3,
  Settings,
  LogOut,
  Network,
  UserCircle,
  ChevronRight,
  List,
  History,
  Shield
} from 'lucide-react';
import { AdBanner } from './ads';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  role: string;
  user?: any;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPath, onNavigate, onLogout, role, user }) => {
  const isSuperAdmin = role === 'SUPER_ADMIN';

  // Super Admin has a different menu
  const superAdminMenuItems = [
    { id: 'super-admin', label: 'Organizations', icon: Shield, roles: ['SUPER_ADMIN'] },
    { id: 'profile', label: 'My Profile', icon: UserCircle, roles: ['SUPER_ADMIN'] },
  ];

  const regularMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] },
    { id: 'profile', label: 'My Profile', icon: UserCircle, roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] },
    { id: 'attendance-logs', label: 'My Attendance', icon: History, roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] },
    { id: 'attendance-audit', label: 'Attendance Audit', icon: List, roles: ['ADMIN', 'HR', 'MANAGER'] },
    { id: 'leave', label: 'Leave', icon: CalendarDays, roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] },
    { id: 'employees', label: 'Team Directory', icon: Users, roles: ['ADMIN', 'HR', 'MANAGER'] },
    { id: 'organization', label: 'Organization', icon: Network, roles: ['ADMIN', 'HR'] },
    { id: 'reports', label: 'Reports', icon: BarChart3, roles: ['ADMIN', 'HR'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['ADMIN', 'HR'] },
  ];

  const menuItems = isSuperAdmin ? superAdminMenuItems : regularMenuItems;
  const filteredItems = menuItems.filter(item => item.roles.includes(role));

  return (
    <aside className="w-80 bg-white h-screen flex flex-col border-r border-slate-100 shadow-sm relative z-50">
      {/* Profile Header */}
      <div className="p-10 pb-8 flex flex-col items-center text-center">
        <div className="relative mb-4">
          <img 
            src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=random`} 
            className="w-24 h-24 rounded-full border-4 border-white shadow-xl bg-slate-50 object-cover" 
            alt="Profile" 
          />
          <div className="absolute bottom-1 right-1 w-5 h-5 bg-primary border-4 border-white rounded-full"></div>
        </div>
        <h2 className="text-xl font-black text-slate-900 leading-tight">{user?.name || 'User Name'}</h2>
        <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-tight">{user?.designation || 'Specialist'}</p>
        <div className="w-full h-px bg-slate-50 mt-8"></div>
      </div>

      {/* Navigation + Sign Out (all scrollable) */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
        {filteredItems.map((item) => (
          <div key={item.id} className="space-y-1">
            <button
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all duration-300 relative group ${
                currentPath === item.id
                  ? 'bg-primary-light/50 text-primary'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-4">
                {currentPath === item.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-primary rounded-r-full"></div>
                )}
                <item.icon size={22} className={currentPath === item.id ? 'text-primary' : 'text-slate-400'} />
                <span className="font-bold text-sm tracking-tight">{item.label}</span>
              </div>
              <ChevronRight size={16} className={`transition-all duration-300 ${currentPath === item.id ? 'text-primary opacity-100 translate-x-0' : 'text-slate-200 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}`} />
            </button>
          </div>
        ))}

        {/* Ad Banner (for AD_SUPPORTED orgs) */}
        <div className="px-2 pt-4 pb-2 justify-center hidden md:flex">
          <AdBanner slot="sidebar" className="rounded-xl overflow-hidden" />
        </div>

        {/* Sign Out */}
        <div className="pt-4 pb-2 space-y-4">
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
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">OpenHRApp v2.9.0</p>
          </div>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
