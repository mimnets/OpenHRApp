import React, { useState } from 'react';
import { Database, Menu, X, LayoutDashboard, Clock, CalendarDays, UserCircle } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { SubscriptionBanner } from '../components/subscription';
import { AdBanner } from '../components/ads';


interface MainLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, currentPath, onNavigate }) => {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavigate = (path: string) => {
    onNavigate(path);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    onNavigate('dashboard'); // Reset path on logout
  };

  if (!user) return null;

  return (
    <div className="flex bg-[#fcfdfe] min-h-screen relative overflow-hidden">
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] md:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Sidebar */}
      <div className={`fixed h-full z-[70] transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar 
          currentPath={currentPath} 
          onNavigate={handleNavigate} 
          onLogout={handleLogout} 
          role={user.role} 
          user={user}
        />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-80 flex flex-col min-h-screen max-w-full overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-50 flex items-center justify-between px-6 md:px-10 sticky top-0 z-40">
           <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 -ml-2 text-slate-500 md:hidden hover:bg-slate-50 rounded-xl transition-all"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-primary rounded-xl text-white md:hidden">
                    <img src="./img/mobile-logo.png" className="w-8 h-8 object-contain" alt="Logo" />
                 </div>
                 <h2 className="font-black text-xl tracking-tighter text-primary md:hidden truncate max-w-[150px]">OpenHRApp</h2>
                 <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full border bg-slate-50 text-slate-400 border-slate-100">
                   <Database size={12} />
                   <span className="text-[9px] font-black uppercase tracking-widest">Cloud Node Alpha</span>
                 </div>
              </div>
           </div>

           <div className="flex items-center gap-3">
              <div 
                className="cursor-pointer"
                onClick={() => handleNavigate('profile')}
              >
                <img 
                  src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} 
                  className="w-10 h-10 rounded-full bg-slate-50 object-cover ring-2 ring-transparent hover:ring-primary transition-all shadow-sm" 
                  alt="Profile"
                />
              </div>
           </div>
        </header>

        {/* Subscription Banner - visible to all org users */}
        <SubscriptionBanner onUpgradeClick={() => handleNavigate('upgrade')} userRole={user.role} />

        {/* Content */}
        <div className="flex-1 p-6 md:p-12 w-full pb-28 md:pb-12 overflow-x-hidden">
          <div className="max-w-4xl mx-auto w-full">
            {children}
          </div>

          {/* Footer Ad Banner (for AD_SUPPORTED orgs) */}
          <div className="max-w-4xl mx-auto mt-8 mb-20 md:mb-0 flex justify-center">
            <AdBanner slot="footer" className="rounded-xl overflow-hidden" />
          </div>
        </div>

        {/* Bottom Navigation (Mobile) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-slate-100 flex items-center justify-around p-4 z-50 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button 
            onClick={() => handleNavigate('dashboard')}
            className={`flex flex-col items-center gap-1 transition-all ${currentPath === 'dashboard' ? 'text-primary' : 'text-slate-400'}`}
          >
            <LayoutDashboard size={20} className={currentPath === 'dashboard' ? 'scale-110' : ''} />
            <span className="text-[9px] font-black uppercase tracking-tighter">Home</span>
          </button>
          <button 
            onClick={() => handleNavigate('attendance-logs')}
            className={`flex flex-col items-center gap-1 transition-all ${currentPath === 'attendance-logs' || currentPath === 'attendance-audit' ? 'text-primary' : 'text-slate-400'}`}
          >
            <Clock size={20} className={currentPath === 'attendance-logs' || currentPath === 'attendance-audit' ? 'scale-110' : ''} />
            <span className="text-[9px] font-black uppercase tracking-tighter">History</span>
          </button>
          <button 
            onClick={() => handleNavigate('leave')}
            className={`flex flex-col items-center gap-1 transition-all ${currentPath === 'leave' ? 'text-primary' : 'text-slate-400'}`}
          >
            <CalendarDays size={20} className={currentPath === 'leave' ? 'scale-110' : ''} />
            <span className="text-[9px] font-black uppercase tracking-tighter">Leave</span>
          </button>
          <button 
            onClick={() => handleNavigate('profile')}
            className={`flex flex-col items-center gap-1 transition-all ${currentPath === 'profile' ? 'text-primary' : 'text-slate-400'}`}
          >
            <UserCircle size={20} className={currentPath === 'profile' ? 'scale-110' : ''} />
            <span className="text-[9px] font-black uppercase tracking-tighter">Account</span>
          </button>
        </nav>
      </main>
    </div>
  );
};

export default MainLayout;
