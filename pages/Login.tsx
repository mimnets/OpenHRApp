import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, AlertCircle, RefreshCw, Settings, Database, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { hrService } from '../services/hrService';
import { isPocketBaseConfigured } from '../services/pocketbase';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
  onEnterSetup?: () => void;
  initError?: string | null;
}

const BrandLogo = () => (
  <div className="flex flex-col items-center justify-center gap-4">
    <div className="relative w-24 h-24 sm:w-32 sm:h-32">
      {/* Decorative bubble gradient background mimicking the logo */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#10b981] via-[#2563eb] to-[#7c3aed] rounded-[2.5rem] rotate-12 opacity-20 blur-xl"></div>
      <div className="relative w-full h-full bg-white rounded-[2rem] shadow-xl border border-slate-100 p-4 flex items-center justify-center overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute -top-10 -left-10 w-20 h-20 bg-blue-500 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-10 -right-10 w-20 h-20 bg-emerald-500 rounded-full blur-2xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-purple-500 rounded-full blur-2xl"></div>
        </div>
        <img 
          src="https://cdn-icons-png.flaticon.com/512/9167/9167014.png" 
          className="w-16 h-16 sm:w-20 sm:h-20 object-contain z-10" 
          alt="OpenHR Logo" 
        />
      </div>
    </div>
    <div className="text-center">
      <h1 className="text-3xl font-black tracking-tighter">
        <span className="text-[#2563eb]">Open</span>
        <span className="text-[#f59e0b]">HR</span>
        <span className="text-[#10b981]">App</span>
      </h1>
    </div>
  </div>
);

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onEnterSetup, initError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(initError || '');
  const [isLoading, setIsLoading] = useState(false);
  
  const isConfigured = isPocketBaseConfigured();

  const handleReset = () => {
    if (confirm("Reset connection settings? This will clear the PocketBase URL configuration.")) {
      localStorage.removeItem('pocketbase_config');
      window.location.reload();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured) {
      setError(`CRITICAL: Backend is not configured.`);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const result = await hrService.login(email, password);
      if (result.user) {
        onLoginSuccess(result.user);
      } else {
        setError(result.error || 'Verification Failed. Check credentials.');
      }
    } catch (err: any) {
      setError(`System Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50 overflow-hidden relative">
      <div className="hidden lg:flex w-1/2 bg-[#0f172a] relative items-center justify-center p-20">
        <div className="absolute top-10 left-10 flex items-center gap-2 text-white/80">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <img src="https://cdn-icons-png.flaticon.com/512/9167/9167014.png" className="w-5 h-5 invert" alt="favicon" />
          </div>
          <span className="font-black text-xl tracking-tight text-white uppercase italic">OpenHR<span className="text-indigo-400">App</span></span>
        </div>
        <div className="space-y-8 max-w-md">
          <h1 className="text-6xl font-black text-white leading-tight">Secure Workforce Intelligence.</h1>
          <p className="text-slate-400 text-lg font-medium">Smart HR management for modern organizations. Built for scale, secured for privacy.</p>
          <div className="flex items-center gap-4 text-slate-500 font-black uppercase text-[10px] tracking-[0.3em]">
             <div className="h-px flex-1 bg-slate-800"></div>
             <span>Open Source Foundation</span>
             <div className="h-px flex-1 bg-slate-800"></div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative">
        <div className="absolute bottom-6 right-6 flex items-center gap-2">
          <button onClick={handleReset} className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-rose-600 rounded-xl shadow-sm transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
            <RotateCcw size={14} /> Reset
          </button>
          <button onClick={onEnterSetup} className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 rounded-xl shadow-sm transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
            <Settings size={14} /> Setup
          </button>
        </div>

        <div className="w-full max-w-md space-y-10">
          <div className="space-y-4">
            <BrandLogo />
            <div className="flex items-center gap-2 text-slate-500 font-medium justify-center">
              <Database size={14} className="text-indigo-500" />
              <span className={isConfigured ? 'text-emerald-600 font-black uppercase text-[10px] tracking-widest' : 'text-rose-500 font-black uppercase text-[10px] tracking-widest'}>
                {isConfigured ? 'Server Ready' : 'Database Offline'}
              </span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input type="email" required className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold shadow-sm outline-none transition-all focus:ring-4 focus:ring-indigo-50" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Access Key</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input type={showPassword ? "text" : "password"} required className="w-full pl-12 pr-12 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold shadow-sm outline-none transition-all focus:ring-4 focus:ring-indigo-50" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-start gap-3 border border-rose-100 animate-in shake">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={isLoading} className="w-full py-5 bg-[#0f172a] text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-50">
              {isLoading ? <RefreshCw className="animate-spin" size={18} /> : <>Continue to Dashboard <ArrowRight size={18} /></>}
            </button>
          </form>
          
          <div className="pt-4 text-center">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
              Community-Powered OpenSource HR Intelligence
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;