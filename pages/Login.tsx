
import React, { useState, useEffect } from 'react';
import { Mail, Lock, ArrowRight, AlertCircle, RefreshCw, Settings, Database, Eye, EyeOff, RotateCcw, Smartphone, Download, Info, Moon } from 'lucide-react';
import { hrService } from '../services/hrService';
import { isPocketBaseConfigured } from '../services/pocketbase';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
  onEnterSetup?: () => void;
  initError?: string | null;
}

const BrandLogo = () => (
  <div className="flex flex-col items-center justify-center gap-6">
    <div className="relative w-28 h-28">
      <div className="absolute inset-0 bg-teal-900/10 rounded-[2.5rem] blur-2xl transform translate-y-4"></div>
      <div className="relative w-full h-full bg-[#064e3b] rounded-[2rem] shadow-xl flex items-center justify-center p-6 border-4 border-white">
        <img 
          src="https://cdn-icons-png.flaticon.com/512/9167/9167014.png" 
          className="w-full h-full object-contain invert" 
          alt="OpenHR Logo" 
        />
      </div>
    </div>
    <div className="text-center space-y-1">
      <h1 className="text-4xl font-black tracking-tight flex items-center justify-center">
        <span className="text-[#2563eb]">Open</span>
        <span className="text-[#f59e0b]">HR</span>
        <span className="text-[#10b981]">App</span>
      </h1>
      <p className="text-slate-500 font-medium text-sm">Streamlining Human Resources</p>
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
    <div className="min-h-screen w-full flex flex-col bg-[#fcfdfe] overflow-y-auto no-scrollbar items-center px-6 py-12 md:py-24 relative">
      <div className="w-full max-w-sm space-y-12">
        
        {/* Brand Header */}
        <BrandLogo />

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] px-1">Email</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                <input 
                  type="email" 
                  required 
                  className="w-full pl-14 pr-5 py-4.5 bg-white border border-slate-200 rounded-2xl text-base font-medium text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="name@company.com" 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] px-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  className="w-full pl-14 pr-14 py-4.5 bg-white border border-slate-200 rounded-2xl text-base font-medium text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="••••••••" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl flex items-center gap-3 border border-rose-100 animate-in shake">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading} 
            className="w-full py-5 bg-[#2563eb] text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70"
          >
            {isLoading ? <RefreshCw className="animate-spin" size={20} /> : <>Login <ArrowRight size={20} /></>}
          </button>
        </form>

        {/* Action Buttons */}
        <div className="space-y-8 pt-4">
          <div className="w-full flex justify-center">
            <button 
              onClick={handleInstallClick}
              disabled={!isInstallable && !isIOS}
              className="w-full py-5 bg-white border-2 border-[#dbeafe] text-[#2563eb] rounded-2xl font-bold text-base shadow-sm hover:bg-blue-50 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              <Download size={22} className="text-[#2563eb]" /> App Installation
            </button>
          </div>

          <div className="flex items-center justify-center gap-10">
            <button onClick={handleReset} className="text-slate-500 font-bold text-sm flex items-center gap-2 hover:text-rose-600 transition-colors">
              <RotateCcw size={16} /> Reset
            </button>
            <div className="w-1.5 h-1.5 bg-slate-200 rounded-full"></div>
            <button onClick={onEnterSetup} className="text-slate-500 font-bold text-sm flex items-center gap-2 hover:text-blue-600 transition-colors">
              <Database size={16} /> Cloud Setup
            </button>
          </div>
        </div>
      </div>

      {/* Floating Dark Mode Toggle */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-white shadow-2xl rounded-full flex items-center justify-center text-slate-700 hover:scale-110 active:scale-95 transition-all border border-slate-100">
        <Moon size={24} />
      </button>

      {/* Database Status */}
      <div className="fixed top-8 right-8 flex items-center gap-2 bg-white/50 backdrop-blur-md px-4 py-2 rounded-full border border-slate-100">
        <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`}></div>
        <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{isConfigured ? 'Live' : 'Offline'}</span>
      </div>
    </div>
  );
};

export default Login;
