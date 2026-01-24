import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import EmployeeDirectory from './pages/EmployeeDirectory';
import Attendance from './pages/Attendance';
import AttendanceLogs from './pages/AttendanceLogs';
import Leave from './pages/Leave';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Organization from './pages/Organization';
import Login from './pages/Login';
import Setup from './pages/Setup';
import { hrService } from './services/hrService';
import { pb, isPocketBaseConfigured } from './services/pocketbase';
import { User } from './types';
import { 
  Database, 
  Menu, 
  X, 
  LayoutDashboard, 
  Clock, 
  CalendarDays, 
  UserCircle
} from 'lucide-react';

const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState('dashboard');
  const [navParams, setNavParams] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isConfigured, setIsConfigured] = useState(isPocketBaseConfigured());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isConfigured && pb?.authStore.isValid && pb?.authStore.model) {
      const model = pb.authStore.model;
      const rawRole = model.role || 'EMPLOYEE';
      const normalizedRole = rawRole.toString().toUpperCase() as any;

      setCurrentUser({
        id: model.id,
        employeeId: model.employee_id || '', 
        name: model.name || 'User',
        email: model.email,
        role: normalizedRole,
        department: model.department || 'Unassigned',
        designation: model.designation || 'Staff',
        teamId: model.team_id || undefined,
        avatar: model.avatar ? pb.files.getURL(model, model.avatar) : undefined
      });

      // Performance: Prefetch metadata in background
      hrService.prefetchMetadata();
    }

    const hrUnsub = hrService.subscribe(() => {
       if (pb?.authStore.model) {
         const m = pb.authStore.model;
         const normalized = (m.role || 'EMPLOYEE').toString().toUpperCase() as any;
         setCurrentUser({
            id: m.id,
            employeeId: m.employee_id || '', 
            name: m.name || 'User',
            email: m.email,
            role: normalized,
            department: m.department || 'Unassigned',
            designation: m.designation || 'Staff',
            teamId: m.team_id || undefined,
            avatar: m.avatar ? pb.files.getURL(m, m.avatar) : undefined
         });
       } else {
         setCurrentUser(null);
       }
    });

    return () => { hrUnsub(); };
  }, [isConfigured]);

  const handleLogout = async () => {
    await hrService.logout();
    setCurrentUser(null);
    setCurrentPath('dashboard');
    setNavParams(null);
    setIsMobileMenuOpen(false);
  };

  const handleNavigate = (path: string) => {
    if (path === 'attendance-quick-office') {
      setCurrentPath('attendance');
      setNavParams({ autoStart: 'OFFICE' });
    } else if (path === 'attendance-quick-factory') {
      setCurrentPath('attendance');
      setNavParams({ autoStart: 'FACTORY' });
    } else if (path === 'attendance-finish') {
      setCurrentPath('attendance');
      setNavParams({ autoStart: 'FINISH' });
    } else {
      setCurrentPath(path);
      setNavParams(null);
    }
    setIsMobileMenuOpen(false);
  };

  if (!isConfigured) {
    return <Setup onComplete={() => setIsConfigured(true)} />;
  }

  if (!currentUser) {
    return (
      <Login 
        onLoginSuccess={(u) => {
          setCurrentUser(u);
          hrService.prefetchMetadata();
        }} 
        onEnterSetup={() => setIsConfigured(false)} 
      />
    );
  }

  const renderContent = () => {
    switch (currentPath) {
      case 'dashboard': return <Dashboard user={currentUser} onNavigate={handleNavigate} />;
      case 'profile': return <Settings user={currentUser} />;
      case 'employees': return <EmployeeDirectory user={currentUser} />;
      case 'attendance': 
        return <Attendance 
          user={currentUser} 
          autoStart={navParams?.autoStart} 
          onFinish={() => handleNavigate('dashboard')} 
        />;
      case 'attendance-logs': return <AttendanceLogs user={currentUser} viewMode="MY" />;
      case 'attendance-audit': return <AttendanceLogs user={currentUser} viewMode="AUDIT" />;
      case 'leave': return <Leave user={currentUser} />;
      case 'settings': return <Settings user={currentUser} />;
      case 'reports': return <Reports user={currentUser} />;
      case 'organization': return <Organization />;
      default: return <Dashboard user={currentUser} onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="flex bg-[#fcfdfe] min-h-screen relative overflow-hidden">
      <div 
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] md:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      <div className={`fixed h-full z-[70] transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar 
          currentPath={currentPath} 
          onNavigate={handleNavigate} 
          onLogout={handleLogout} 
          role={currentUser.role} 
          user={currentUser}
        />
      </div>

      <main className="flex-1 md:ml-72 flex flex-col min-h-screen max-w-full overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-50 flex items-center justify-between px-6 md:px-10 sticky top-0 z-40">
           <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 -ml-2 text-slate-500 md:hidden hover:bg-slate-50 rounded-xl transition-all"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              
              <div className="flex items-center gap-2">
                 <div className="p-1.5 bg-[#2563eb] rounded-lg text-white md:hidden">
                    <img src="https://cdn-icons-png.flaticon.com/512/9167/9167014.png" className="w-5 h-5 invert" alt="Logo" />
                 </div>
                 <h2 className="font-black text-xl tracking-tighter text-[#2563eb] md:hidden truncate max-w-[150px]">OpenHRApp</h2>
                 <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full border bg-slate-50 text-slate-400 border-slate-100">
                   <Database size={12} />
                   <span className="text-[9px] font-black uppercase tracking-widest">Cloud Node Alpha</span>
                 </div>
              </div>
           </div>

           <div className="flex items-center gap-3">
              <div 
                className="cursor-pointer"
                onClick={() => setCurrentPath('profile')}
              >
                <img 
                  src={currentUser.avatar || `https://ui-avatars.com/api/?name=${currentUser.name}`} 
                  className="w-10 h-10 rounded-full bg-slate-50 object-cover ring-2 ring-transparent hover:ring-blue-500 transition-all shadow-sm" 
                  alt="Profile"
                />
              </div>
           </div>
        </header>

        <div className="flex-1 p-6 md:p-12 w-full pb-28 md:pb-12 overflow-x-hidden">
          <div className="max-w-4xl mx-auto w-full">
            {renderContent()}
          </div>
        </div>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-slate-100 flex items-center justify-around p-4 z-50 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button 
            onClick={() => handleNavigate('dashboard')}
            className={`flex flex-col items-center gap-1 transition-all ${currentPath === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <LayoutDashboard size={20} className={currentPath === 'dashboard' ? 'scale-110' : ''} />
            <span className="text-[9px] font-black uppercase tracking-tighter">Home</span>
          </button>
          <button 
            onClick={() => handleNavigate('attendance-logs')}
            className={`flex flex-col items-center gap-1 transition-all ${currentPath === 'attendance-logs' || currentPath === 'attendance-audit' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <Clock size={20} className={currentPath === 'attendance-logs' || currentPath === 'attendance-audit' ? 'scale-110' : ''} />
            <span className="text-[9px] font-black uppercase tracking-tighter">History</span>
          </button>
          <button 
            onClick={() => handleNavigate('leave')}
            className={`flex flex-col items-center gap-1 transition-all ${currentPath === 'leave' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <CalendarDays size={20} className={currentPath === 'leave' ? 'scale-110' : ''} />
            <span className="text-[9px] font-black uppercase tracking-tighter">Leave</span>
          </button>
          <button 
            onClick={() => handleNavigate('profile')}
            className={`flex flex-col items-center gap-1 transition-all ${currentPath === 'profile' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <UserCircle size={20} className={currentPath === 'profile' ? 'scale-110' : ''} />
            <span className="text-[9px] font-black uppercase tracking-tighter">Account</span>
          </button>
        </nav>
      </main>
    </div>
  );
};

export default App;