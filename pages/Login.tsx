import React, { useState, useEffect } from 'react';
import { Mail, Lock, ArrowRight, AlertCircle, RefreshCw, Settings, Database, Eye, EyeOff, RotateCcw, Smartphone, Download, Info } from 'lucide-react';
import { hrService } from '../services/hrService';
import { isPocketBaseConfigured } from '../services/pocketbase';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
  onEnterSetup?: () => void;
  initError?: string | null;
}

const BrandLogo = () => (
  <div className="flex flex-col items-center justify-center gap-4">
    <div className="relative w-20 h-20 md:w-24 md:h-24">
      <div className="absolute inset-0 bg-indigo-600/10 rounded-[2rem] blur-xl"></div>
      <div className="relative w-full h-full bg-white rounded-[1.5rem] shadow-lg border border-slate-100 flex items-center justify-center p-4">
        <img 
          src="https://cdn-icons-png.flaticon.com/512/9167/9167014.png" 
          style={{ width: '100%', height: '100%', maxHeight: '64px' }} 
          className="object-contain" 
          alt="OpenHR Logo" 
        />
      </div>
    </div>
    <div className="text-center">
      <h1 className="text-2xl font-black tracking-tighter">
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
  const [isInstallable, setIsInstallable] = useState(!!(window as any).deferredPWAPrompt);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  
  const isConfigured = isPocketBaseConfigured();

  useEffect(() => {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(!!isPWA);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIphone = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIphone);

    const handleAvailable = () => setIsInstallable(true);
    const handleInstalled = () => {
      setIsInstallable(false);
      setIsStandalone(true);
    };

    window.addEventListener('pwa-install-available', handleAvailable);
    window.addEventListener('pwa-installed', handleInstalled);

    return () => {
      window.removeEventListener('pwa-install-available', handleAvailable);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = (window as any).deferredPWAPrompt;
    if (!promptEvent) return;
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    (window as any).deferredPWAPrompt = null;
    setIsInstallable(false);
  };

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
    <div className="h-screen w-full flex flex-col lg:flex-row bg-slate-50 overflow-hidden">
      {/* Side Brand Panel (Fixed Height & Position on Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0f172a] h-full relative items-center justify-center p-20 flex-shrink-0">
        <div className="absolute top-12 left-12 flex items-center gap-3 text-white/90">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/40">
            <img src="https://cdn-icons-png.flaticon.com/512/9167/9167014.png" className="w-6 h-6 invert" alt="favicon" />
          </div>
          <span className="font-black text-2xl tracking-tight uppercase italic">OpenHR<span className="text-indigo-400">App</span></span>
        </div>
        <div className="space-y-8 max-w-md">
          <h1 className="text-7xl font-black text-white leading-[1.1] tracking-tighter">Secure Workforce Intelligence.</h1>
          <p className="text-slate-400 text-xl font-medium leading-relaxed">Smart HR management for modern organizations. Built for scale, secured for privacy.</p>
          <div className="flex items-center gap-4 text-slate-500 font-black uppercase text-[10px] tracking-[0.4em] pt-4">
             <div className="h-px flex-1 bg-slate-800"></div>
             <span>Open Source Foundation</span>
             <div className="h-px flex-1 bg-slate-800"></div>
          </div>
        </div>
      </div>

      {/* Main Scrollable Container */}
      <div className="flex-1 h-full overflow-y-auto no-scrollbar bg-slate-50 flex flex-col items-center">
        <div className="w-full max-w-md p-6 py-12 md:py-20 space-y-12">
          
          {/* Header Branding (Visible primarily on mobile) */}
          <div className="space-y-4">
            <BrandLogo />
            <div className="flex items-center gap-2 text-slate-500 font-medium justify-center">
              <Database size={14} className="text-indigo-500" />
              <span className={isConfigured ? 'text-emerald-600 font-black uppercase text-[10px] tracking-widest' : 'text-rose-500 font-black uppercase text-[10px] tracking-widest'}>
                {isConfigured ? 'Server Ready' : 'Database Offline'}
              </span>
            </div>
          </div>

          {/* Login Card */}
          <form onSubmit={handleLogin} className="space-y-6 bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl shadow-slate-200/60 border border-slate-100">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input type="email" required className="w-full pl-12 pr-4 py-4.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold shadow-sm outline-none transition-all focus:ring-4 focus:ring-indigo-50" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Access Key</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input type={showPassword ? "text" : "password"} required className="w-full pl-12 pr-12 py-4.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold shadow-sm outline-none transition-all focus:ring-4 focus:ring-indigo-50" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors">
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
          
          {/* Footer Actions Area */}
          <div className="space-y-8 pt-4 text-center">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] leading-relaxed max-w-[280px] mx-auto">
              Community-Powered OpenSource HR Intelligence
            </p>

            <div className="flex flex-col items-center gap-6 pt-6 border-t border-slate-100">
              {!isStandalone && (
                <div className="w-full flex justify-center">
                  {isInstallable ? (
                    <button 
                      onClick={handleInstallClick} 
                      className="px-10 py-4.5 bg-indigo-600 text-white rounded-[2rem] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse"
                    >
                      <Smartphone size={16} /> Install App to Device
                    </button>
                  ) : isIOS ? (
                    <div className="group relative">
                      <button className="px-6 py-3.5 bg-white border border-slate-100 text-slate-500 rounded-2xl flex items-center gap-2 text-[9px] font-black uppercase tracking-widest shadow-sm">
                        <Download size={14} /> iOS Home Screen Setup
                        <Info size={12} className="text-indigo-400" />
                      </button>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-60 p-4 bg-slate-900 text-white text-[10px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-2xl z-50">
                        Tap the <span className="text-indigo-400 font-bold">Share</span> icon below and select <span className="text-indigo-400 font-bold">"Add to Home Screen"</span>.
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              <div className="flex items-center gap-4">
                <button onClick={handleReset} className="px-6 py-3 bg-white border border-slate-100 text-slate-400 hover:text-rose-600 rounded-xl shadow-sm transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                  <RotateCcw size={12} /> Reset System
                </button>
                <button onClick={onEnterSetup} className="px-6 py-3 bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 rounded-xl shadow-sm transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                  <Settings size={12} /> Cloud Setup
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;