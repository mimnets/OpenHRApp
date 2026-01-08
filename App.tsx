
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import EmployeeDirectory from './pages/EmployeeDirectory';
import Attendance from './pages/Attendance';
import Leave from './pages/Leave';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Organization from './pages/Organization';
import Login from './pages/Login';
import { hrService } from './services/hrService';
import { googleDriveService } from './services/googleDriveService';
import { User } from './types';
import { Search, Bell, Menu, X, Cloud } from 'lucide-react';

const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    hrService.initialize();
    const user = hrService.getCurrentUser();
    setCurrentUser(user);
    setIsInitialized(true);

    // Auto-sync logic & State Sync: listen for changes in hrService
    const unsubscribe = hrService.subscribe(() => {
      // Sync local state if profile was modified in another component
      const updatedUser = hrService.getCurrentUser();
      if (updatedUser) {
        setCurrentUser(updatedUser);
      }
      
      if (googleDriveService.isConnected()) {
        triggerAutoSync();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Debounced auto-sync to avoid excessive API calls
  let syncTimeout: any = null;
  const triggerAutoSync = () => {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(async () => {
      setIsSyncing(true);
      try {
        const data = hrService.exportFullData();
        await googleDriveService.syncToSingleFile(data);
        console.log('Auto-sync to Google Drive completed.');
      } catch (err) {
        console.error('Auto-sync failed:', err);
      } finally {
        setIsSyncing(false);
      }
    }, 5000); 
  };

  const handleLogout = () => {
    hrService.logout();
    setCurrentUser(null);
    setCurrentPath('dashboard');
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };

  if (!isInitialized) return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const renderContent = () => {
    switch (currentPath) {
      case 'dashboard': return <Dashboard user={currentUser} onNavigate={setCurrentPath} />;
      case 'employees': return <EmployeeDirectory />;
      case 'attendance': return <Attendance user={currentUser} />;
      case 'leave': return <Leave user={currentUser} />;
      case 'settings': return <Settings />;
      case 'reports': return <Reports user={currentUser} />;
      case 'organization': return <Organization />;
      default: return <Dashboard user={currentUser} onNavigate={setCurrentPath} />;
    }
  };

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <div className="hidden md:block fixed h-full">
        <Sidebar 
          currentPath={currentPath} 
          onNavigate={(path) => setCurrentPath(path)} 
          onLogout={handleLogout}
          role={currentUser.role}
        />
      </div>

      <div className={`fixed inset-y-0 left-0 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:hidden z-[60]`}>
        <div className="w-64 h-full flex flex-col bg-slate-900">
           <Sidebar 
              currentPath={currentPath} 
              onNavigate={(path) => {
                setCurrentPath(path);
                setIsMobileMenuOpen(false);
              }} 
              onLogout={handleLogout}
              role={currentUser.role}
            />
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[55] md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}
      
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen overflow-x-hidden">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-6 md:px-10 sticky top-0 z-40 transition-all">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 text-slate-600 hover:bg-slate-50 rounded-lg" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div className="hidden lg:flex items-center bg-slate-100 px-4 py-2 rounded-xl w-72">
              <Search size={18} className="text-slate-400" />
              <input type="text" placeholder="Search everything..." className="bg-transparent border-none focus:outline-none text-sm ml-3 w-full text-slate-700" />
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            {isSyncing && (
              <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100 animate-pulse">
                <Cloud size={14} className="animate-bounce" />
                <span className="text-[10px] font-black uppercase tracking-widest">Cloud Syncing...</span>
              </div>
            )}
            <button className="p-2.5 text-slate-500 hover:bg-slate-50 rounded-xl relative">
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 border-2 border-white rounded-full"></span>
            </button>
            <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
            <button onClick={() => setCurrentPath('settings')} className="flex items-center gap-3 p-1 pr-3 hover:bg-slate-50 rounded-2xl transition-all">
              <img src={currentUser.avatar || `https://ui-avatars.com/api/?name=${currentUser.name}`} className="w-10 h-10 rounded-xl object-cover bg-indigo-100 shadow-sm" />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-bold text-slate-900 leading-tight">{currentUser.name}</p>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{currentUser.role}</p>
              </div>
            </button>
          </div>
        </header>

        <div className="flex-1 p-6 md:p-10 pb-20 max-w-7xl mx-auto w-full">{renderContent()}</div>

        <footer className="px-10 py-6 border-t border-slate-100 bg-white/50 text-center flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400 font-medium">© 2024 OpenHR. Compliant with BD Labor Code 2006.</p>
          <span className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Server Status: Normal
          </span>
        </footer>
      </main>
    </div>
  );
};

export default App;
