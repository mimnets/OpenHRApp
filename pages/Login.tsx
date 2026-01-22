
import React, { useState, useEffect } from 'react';
import { Mail, Lock, ArrowRight, AlertCircle, RefreshCw, Database, Eye, EyeOff, RotateCcw, Download, Moon, Share } from 'lucide-react';
import { hrService } from '../services/hrService';
import { isPocketBaseConfigured } from '../services/pocketbase';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
  onEnterSetup: () => void;
  initError?: string;
}

const BrandLogo = () => (
  <div className="flex flex-col items-center justify-center gap-4">
    <div className="relative w-16 h-16 md:w-20 md:h-20">
      <div className="absolute inset-0 bg-teal-900/10 rounded-[1.5rem] blur-xl transform translate-y-2"></div>
      <div className="relative w-full h-full bg-[#064e3b] rounded-[1.25rem] shadow-lg flex items-center justify-center p-4 border-2 border-white">
        <img 
          src="https://cdn-icons-png.flaticon.com/512/9167/9167014.png" 
          className="w-full h-full object-contain invert" 
          alt="OpenHR Logo" 
        />
      </div>
    </div>
    <div className="text-center">
      <h1 className="text-2xl md:text-3xl font-black tracking-tighter flex items-center justify-center">
        <span className="text-[#2563eb]">Open</span>
        <span className="text-[#f59e0b]">HR</span>
        <span className="text-[#10b981]">App</span>
      </h1>
      <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-0.5">Personnel Gateway</p>
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
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  
  const isConfigured = isPocketBaseConfigured();

  useEffect(() => {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(!!isPWA);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIphone = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
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
    if (isIOS) {
      setShowIosInstructions(true);
      return;
    }

    const promptEvent = (window as any).deferredPWAPrompt;
    if (!promptEvent) return;
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      (window as any).deferredPWAPrompt = null;
      setIsInstallable(false);
    }
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
    <div className="min-h-screen w-full flex flex-col bg-[#f8fafc] items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[100px] rounded-full -z-10"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-500/5 blur-[100px] rounded-full -z-10"></div>
      
      <div className="w-full max-w-[400px] animate-in fade-in zoom-in duration-500">
        <div className="bg-white md:shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:border border-slate-100 rounded-[2rem] overflow-hidden">
          
          <div className="p-8 md:p-10 space-y-8">
            {/* Brand Header */}
            <BrandLogo />

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Organization Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors z-10" size={18} />
                    <input 
                      type="email" 
                      required 
                      className="w-full pl-14 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 placeholder:text-slate-300" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      placeholder="e.g. name@company.com" 
                    />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Security Credentials</label>
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors z-10" size={18} />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required 
                      className="w-full pl-14 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 placeholder:text-slate-300" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      placeholder="Your secret key" 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500 transition-colors z-10 p-1"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3.5 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center gap-3 border border-rose-100 animate-in shake">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isLoading} 
                className="w-full py-4 bg-[#2563eb] text-white rounded-[1.25rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-[0.97] transition-all flex items-center justify-center gap-3 disabled:opacity-70 mt-2"
              >
                {isLoading ? <RefreshCw className="animate-spin" size={18} /> : <>Continue <ArrowRight size={16} /></>}
              </button>
            </form>

            {/* Action Buttons */}
            <div className="space-y-5 pt-2">
              {!isStandalone && (
                <div className="w-full flex flex-col gap-3">
                  <button 
                    onClick={handleInstallClick}
                    className="w-full py-3.5 bg-slate-50 border border-slate-100 text-slate-500 rounded-[1.25rem] font-black text-[10px] uppercase tracking-widest hover:bg-white hover:shadow-sm active:scale-[0.97] transition-all flex items-center justify-center gap-3"
                  >
                    <Download size={16} className="text-blue-500" /> 
                    {isIOS ? 'Install on Device' : 'App Installation'}
                  </button>
                  
                  {showIosInstructions && (
                    <div className="p-5 bg-blue-50 border border-blue-100 rounded-[1.5rem] animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center gap-3 mb-3">
                        <Share size={16} className="text-blue-600" />
                        <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest">PWA Setup</p>
                      </div>
                      <ol className="text-[11px] font-bold text-blue-700/80 space-y-2 list-decimal pl-4">
                        <li>Tap <span className="text-blue-900">Share</span> in Safari bottom bar.</li>
                        <li>Choose <span className="text-blue-900">Add to Home Screen</span>.</li>
                        <li>Tap <span className="text-blue-900">Add</span> to complete.</li>
                      </ol>
                      <button onClick={() => setShowIosInstructions(false)} className="mt-4 w-full py-2 bg-white text-blue-600 rounded-xl text-[9px] font-black uppercase border border-blue-100">Got it</button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-center gap-6 border-t border-slate-50 pt-6">
                <button onClick={handleReset} className="text-slate-400 font-black text-[9px] uppercase tracking-widest flex items-center gap-2 hover:text-rose-500 transition-colors">
                  <RotateCcw size={12} /> Reset
                </button>
                <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                <button onClick={onEnterSetup} className="text-slate-400 font-black text-[9px] uppercase tracking-widest flex items-center gap-2 hover:text-blue-600 transition-colors">
                  <Database size={12} /> Config
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* System Version */}
        <p className="text-center mt-6 text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">v2.7.0 Build-Stable</p>
      </div>

      {/* Database Connection Indicator */}
      <div className="fixed top-6 right-6 hidden md:flex items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-100 shadow-sm">
        <div className={`w-1.5 h-1.5 rounded-full ${isConfigured ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`}></div>
        <span className="text-[8px] font-black uppercase text-slate-500 tracking-[0.2em]">{isConfigured ? 'Node Connected' : 'No Connection'}</span>
      </div>
    </div>
  );
};

export default Login;
