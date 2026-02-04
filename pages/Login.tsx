
import React, { useState, useEffect } from 'react';
import { Mail, Lock, ArrowRight, AlertCircle, RefreshCw, Eye, EyeOff, Download, X, Share, MoreVertical, RotateCcw, Building2 } from 'lucide-react';
import { hrService } from '../services/hrService';
import { isPocketBaseConfigured } from '../services/pocketbase';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
  onRegisterClick: () => void; // New prop
  initError?: string;
}

const BrandLogo = () => (
  <div className="flex flex-col items-center justify-center gap-6">
    <div className="relative w-24 h-24 md:w-32 md:h-32">
      <div className="absolute inset-0 bg-primary-light blur-[50px] rounded-full -z-10 opacity-50"></div>
      <div className="relative w-full h-full bg-primary rounded-[1.75rem] shadow-2xl flex items-center justify-center p-5 border-4 border-white">
        <img 
          src="./img/logo.png" 
          className="w-full h-full object-contain drop-shadow-md" 
          alt="OpenHRApp Logo" 
        />
      </div>
    </div>
    <div className="text-center">
      <h1 className="text-3xl md:text-4xl font-black tracking-tighter flex items-center justify-center">
        <span className="text-primary">Open</span>
        <span className="text-[#f59e0b]">HR</span>
        <span className="text-[#10b981]">App</span>
      </h1>
      <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">Personnel Gateway</p>
    </div>
  </div>
);

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onRegisterClick, initError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(initError || '');
  const [isLoading, setIsLoading] = useState(false);
  
  // Install Help State
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  
  const isConfigured = isPocketBaseConfigured();

  useEffect(() => {
    // 1. Check iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // 2. Check Native Prompt Status (Immediate)
    if ((window as any).deferredPWAPrompt) {
      setCanPrompt(true);
    }

    // 3. Listen for Native Prompt Event (Async)
    const handlePwaReady = () => setCanPrompt(true);
    window.addEventListener('pwa-install-available', handlePwaReady);

    return () => window.removeEventListener('pwa-install-available', handlePwaReady);
  }, []);

  const handleInstallClick = async () => {
    // 1. Try Native Prompt First (Android/Desktop)
    const promptEvent = (window as any).deferredPWAPrompt;
    
    if (promptEvent) {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      
      // We no longer need the prompt if accepted
      if (outcome === 'accepted') {
        (window as any).deferredPWAPrompt = null;
        setCanPrompt(false);
      }
    } else {
      // 2. Fallback to Instructions (iOS or Prompt Blocked)
      setShowInstallHelp(true);
    }
  };

  const handleSystemReset = async () => {
    if(!confirm("Reset App Cache? This will reload the application and update icons.")) return;
    
    // Unregister Service Workers to force update
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for(let registration of registrations) {
        await registration.unregister();
      }
    }
    // Clear storage
    localStorage.clear();
    sessionStorage.clear();
    // Force reload
    window.location.reload();
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
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary-light blur-[100px] rounded-full -z-10"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-500/5 blur-[100px] rounded-full -z-10"></div>
      
      <div className="w-full max-w-[400px] animate-in fade-in zoom-in duration-500">
        <div className="bg-white md:shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:border border-slate-100 rounded-[2.5rem] overflow-hidden">
          
          <div className="p-8 md:p-12 space-y-10">
            {/* Brand Header */}
            <BrandLogo />

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Organization Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors z-10" size={18} />
                    <input 
                      type="email" 
                      required 
                      className="w-full pl-14 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary-light placeholder:text-slate-300" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      placeholder="e.g. name@company.com" 
                    />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Security Credentials</label>
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors z-10" size={18} />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required 
                      className="w-full pl-14 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary-light placeholder:text-slate-300" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      placeholder="Your secret key" 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary transition-colors z-10 p-1"
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

              <div className="space-y-4">
                <button 
                  type="submit" 
                  disabled={isLoading} 
                  className="w-full py-4 bg-primary text-white rounded-[1.25rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary-light hover:bg-primary-hover active:scale-[0.97] transition-all flex items-center justify-center gap-3 disabled:opacity-70 mt-2"
                >
                  {isLoading ? <RefreshCw className="animate-spin" size={18} /> : <>Continue <ArrowRight size={16} /></>}
                </button>

                <button
                  type="button"
                  onClick={onRegisterClick}
                  className="w-full py-3 bg-slate-50 text-slate-600 border border-slate-200 rounded-[1.25rem] font-black text-[10px] uppercase tracking-widest hover:bg-white hover:border-slate-300 transition-all flex items-center justify-center gap-2"
                >
                  <Building2 size={14} /> Register New Organization
                </button>

                {/* Utils Row: Install & Reset */}
                <div className="flex justify-center items-center gap-4 pt-4 border-t border-slate-50">
                   <button 
                     type="button"
                     onClick={handleInstallClick}
                     className="flex items-center gap-2 px-4 py-2 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-primary transition-colors"
                   >
                     <Download size={12} /> {canPrompt ? 'Install App' : 'App Guide'}
                   </button>
                   
                   <div className="w-px h-3 bg-slate-200"></div>

                   <button 
                     type="button"
                     onClick={handleSystemReset}
                     className="flex items-center gap-2 px-4 py-2 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-rose-600 transition-colors"
                     title="Clear Cache & Reload"
                   >
                     <RotateCcw size={12} /> Reset Cache
                   </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* System Version */}
        <p className="text-center mt-6 text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">v3.0 Multi-Tenant</p>
      </div>

      {/* Database Connection Indicator */}
      <div className="fixed top-6 right-6 hidden md:flex items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-100 shadow-sm">
        <div className={`w-1.5 h-1.5 rounded-full ${isConfigured ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`}></div>
        <span className="text-[8px] font-black uppercase text-slate-500 tracking-[0.2em]">{isConfigured ? 'Node Connected' : 'No Connection'}</span>
      </div>

      {/* Installation Instructions Popup */}
      {showInstallHelp && (
        <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                   <Download size={16} className="text-primary"/> Install Guide
                 </h3>
                 <button onClick={() => setShowInstallHelp(false)} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-900 transition-colors"><X size={16}/></button>
              </div>
              
              {isIOS ? (
                <div className="space-y-5">
                   <p className="text-xs font-medium text-slate-500 leading-relaxed">To install this app on your iPhone or iPad, please follow these steps:</p>
                   <div className="space-y-3">
                      <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl">
                         <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-blue-500"><Share size={18} /></div>
                         <div className="text-xs font-bold text-slate-700">1. Tap the <span className="text-blue-600">Share</span> button</div>
                      </div>
                      <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl">
                         <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-900 font-black text-[10px]">+</div>
                         <div className="text-xs font-bold text-slate-700">2. Select <span className="text-slate-900">Add to Home Screen</span></div>
                      </div>
                      <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl">
                         <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-900 font-black text-[10px]">Add</div>
                         <div className="text-xs font-bold text-slate-700">3. Tap <span className="text-blue-600">Add</span> (top right)</div>
                      </div>
                   </div>
                </div>
              ) : (
                <div className="space-y-5">
                   <p className="text-xs font-medium text-slate-500 leading-relaxed">If the automatic prompt didn't appear, you can install manually:</p>
                   <div className="space-y-3">
                      <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl">
                         <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-600"><MoreVertical size={18} /></div>
                         <div className="text-xs font-bold text-slate-700">1. Tap the <span className="text-slate-900">Browser Menu</span> (3 dots)</div>
                      </div>
                      <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl">
                         <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary"><Download size={18} /></div>
                         <div className="text-xs font-bold text-slate-700">2. Select <span className="text-slate-900">Install App</span> or <span className="text-slate-900">Add to Home Screen</span></div>
                      </div>
                   </div>
                </div>
              )}
              
              <button onClick={() => setShowInstallHelp(false)} className="w-full mt-6 py-4 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary-light">Close Instructions</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default Login;
