
import React, { useState } from 'react';
import { Globe, ShieldCheck, Mail, Lock, ArrowRight, User as UserIcon, X, CheckCircle, AlertCircle } from 'lucide-react';
import { hrService } from '../services/hrService';
import { emailService } from '../services/emailService';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleMode, setRoleMode] = useState<'ADMIN' | 'EMPLOYEE'>('EMPLOYEE');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Forgot Password State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    setTimeout(() => {
      const user = hrService.login(email, password);
      if (user) {
        const isAdminRole = ['ADMIN', 'HR'].includes(user.role);
        
        if (roleMode === 'ADMIN' && !isAdminRole) {
          setError('Access Denied. Please use the Employee Login tab.');
          setIsLoading(false);
          return;
        }
        
        onLoginSuccess(user);
      } else {
        setError('Verification Failed: Invalid credentials.');
      }
      setIsLoading(false);
    }, 800);
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetting(true);
    setResetError(null);
    
    // Check if user even exists in local DB first
    const employees = hrService.getEmployees();
    const targetUser = employees.find(emp => emp.email.toLowerCase() === forgotEmail.trim().toLowerCase() || emp.username?.toLowerCase() === forgotEmail.trim().toLowerCase());
    
    if (!targetUser) {
      setResetError("No account associated with this email or username found.");
      setIsResetting(false);
      return;
    }

    const config = hrService.getConfig().smtp;
    const relayUrl = config?.relayUrl || '';
    
    if (!relayUrl || relayUrl === 'http://localhost:5000') {
      // If still default, remind them it might need setup
      console.warn("Using default or empty relay URL for password reset.");
    }

    const result = await emailService.sendPasswordReset(targetUser.email);
    
    setIsResetting(false);
    if (result.success) {
      setResetSuccess(true);
      setTimeout(() => {
        setShowForgotModal(false);
        setResetSuccess(false);
        setForgotEmail('');
      }, 4000);
    } else {
      setResetError("Relay connection failed. Please check your backend status in Settings.");
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50 overflow-hidden relative">
      <div className="hidden lg:flex w-1/2 bg-[#0f172a] relative items-center justify-center p-20">
        <div className="absolute top-10 left-10 flex items-center gap-2 text-white/80">
          <Globe size={24} className="text-indigo-500" />
          <span className="font-bold text-xl tracking-tight text-white">OpenHR</span>
        </div>
        <div className="space-y-8 max-w-md">
          <h1 className="text-5xl font-black text-white leading-tight">Secure Workforce Intelligence.</h1>
          <p className="text-slate-400 text-lg font-medium">Enterprise HRMS solution built for regional compliance and modern operational speed.</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">System Portal</h2>
            <p className="text-slate-500 font-medium">Securely access your organization's environment.</p>
          </div>

          <div className="flex p-1.5 bg-slate-100 rounded-2xl">
            <button onClick={() => setRoleMode('EMPLOYEE')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${roleMode === 'EMPLOYEE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Employee</button>
            <button onClick={() => setRoleMode('ADMIN')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${roleMode === 'ADMIN' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Administrator</button>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Identifier</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" required className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-indigo-50 transition-all" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Secret Key</label>
                <button type="button" onClick={() => { setShowForgotModal(true); setResetError(null); }} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Forgot Key?</button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="password" required className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-indigo-50 transition-all" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
            </div>

            {error && <div className="p-4 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl border border-rose-100">{error}</div>}

            <button type="submit" disabled={isLoading} className="w-full py-5 bg-[#0f172a] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-95">
              {isLoading ? 'Verifying...' : <>Sign In <ArrowRight size={18} /></>}
            </button>
          </form>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-[#0f172a] p-8 flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                <Lock size={24} className="text-indigo-400" />
                <h3 className="text-xl font-black uppercase tracking-tight">Recover Access</h3>
              </div>
              <button onClick={() => setShowForgotModal(false)} className="hover:bg-white/10 p-2 rounded-xl"><X size={28} /></button>
            </div>
            <div className="p-8 space-y-6">
              {resetSuccess ? (
                <div className="py-12 text-center space-y-4 animate-in fade-in">
                   <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                     <CheckCircle size={48} />
                   </div>
                   <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">Email Dispatched</h4>
                   <p className="text-xs text-slate-500 font-medium px-4">A recovery link has been requested via the Express Relay to {forgotEmail}.</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed italic">Enter your identifier below. We will attempt to send recovery instructions via the system outbox.</p>
                  <form onSubmit={handleForgotSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Registered Email or Username</label>
                      <input type="text" required className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-50" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="e.g. sabbir@vclbd.net" />
                    </div>
                    {resetError && (
                      <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600">
                        <AlertCircle size={16} />
                        <p className="text-[10px] font-black uppercase">{resetError}</p>
                      </div>
                    )}
                    <button type="submit" disabled={isResetting} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">
                      {isResetting ? 'Processing SMTP Relay...' : 'Request Recovery Key'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
