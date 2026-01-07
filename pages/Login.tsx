
import React, { useState } from 'react';
import { Globe, ShieldCheck, Mail, Lock, ArrowRight, User as UserIcon } from 'lucide-react';
import { hrService } from '../services/hrService';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleMode, setRoleMode] = useState<'ADMIN' | 'EMPLOYEE'>('EMPLOYEE');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    setTimeout(() => {
      const user = hrService.login(email, password);
      if (user) {
        const isAdminRole = ['ADMIN', 'HR'].includes(user.role);
        
        if (roleMode === 'ADMIN' && !isAdminRole) {
          setError('Access Denied. This account is registered as a Standard Employee/Manager. Please use the Employee Login tab.');
          setIsLoading(false);
          return;
        }
        
        // If they are Admin/HR and trying to use Employee tab, we allow it but notify them
        // or just let them in as they have higher privileges. 
        // For strict compliance as per previous requirement:
        if (roleMode === 'EMPLOYEE' && isAdminRole) {
          setError('System Policy: HR/Admin accounts must use the Administrative Login tab.');
          setIsLoading(false);
          return;
        }

        onLoginSuccess(user);
      } else {
        setError('Verification Failed: Invalid credentials or account not found in system.');
      }
      setIsLoading(false);
    }, 800);
  };

  const handleDemoAccess = (demoEmail: string, mode: 'ADMIN' | 'EMPLOYEE') => {
    setEmail(demoEmail);
    setPassword('123'); // Demo accounts always use '123'
    setRoleMode(mode);
    setError('');
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50 overflow-hidden">
      {/* Left Decoration */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative items-center justify-center p-20">
        <div className="absolute top-10 left-10 flex items-center gap-2 text-white/80">
          <Globe size={24} className="text-indigo-500" />
          <span className="font-bold text-xl tracking-tight text-white">OpenHR</span>
        </div>
        
        <div className="space-y-8 max-w-md">
          <div className="space-y-2">
            <h1 className="text-5xl font-black text-white leading-tight">Empowering Teams Globally.</h1>
            <p className="text-slate-400 text-lg">Comprehensive HR solution for mid-size organizations, built for speed and local compliance.</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
              <ShieldCheck className="text-emerald-500 mb-2" size={24} />
              <p className="text-white font-bold text-sm">Compliant</p>
              <p className="text-slate-500 text-xs font-medium">BD Labor Code 2006</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
              <ShieldCheck className="text-indigo-500 mb-2" size={24} />
              <p className="text-white font-bold text-sm">Secure</p>
              <p className="text-slate-500 text-xs font-medium">RBAC Protection</p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-10 left-10 text-slate-500 text-xs font-bold uppercase tracking-widest">
          © 2024 OpenHR Solutions Ltd.
        </div>
      </div>

      {/* Right Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Globe size={28} className="text-indigo-600" />
            <span className="font-bold text-2xl tracking-tight text-slate-900">OpenHR</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">System Access</h2>
            <p className="text-slate-500 font-medium">Please verify your credentials to continue.</p>
          </div>

          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button 
              onClick={() => { setRoleMode('EMPLOYEE'); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${roleMode === 'EMPLOYEE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Employee Login
            </button>
            <button 
              onClick={() => { setRoleMode('ADMIN'); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${roleMode === 'ADMIN' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Admin Login
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Identity (Email/Username)</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  required
                  placeholder="name@company.com"
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Security Key</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold text-rose-600 animate-in shake">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-4 rounded-xl font-black text-sm tracking-wide shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>Sign In as {roleMode === 'ADMIN' ? 'Administrator' : 'Staff Member'} <ArrowRight size={18} /></>
              )}
            </button>
          </form>

          <div className="pt-4 text-center">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-3">System Quick Access</p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => handleDemoAccess('admin@probashi.com', 'ADMIN')}
                className="text-[10px] py-2 px-3 bg-slate-100 rounded-lg text-slate-600 font-black uppercase hover:bg-indigo-50 hover:text-indigo-600 transition-all"
              >
                Admin Demo
              </button>
              <button 
                onClick={() => handleDemoAccess('anis@probashi.com', 'EMPLOYEE')}
                className="text-[10px] py-2 px-3 bg-slate-100 rounded-lg text-slate-600 font-black uppercase hover:bg-indigo-50 hover:text-indigo-600 transition-all"
              >
                Staff Demo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
