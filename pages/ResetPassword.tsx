
import React, { useState } from 'react';
import { Globe, ShieldCheck, Lock, ArrowRight, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { hrService } from '../services/hrService';

interface ResetPasswordProps {
  initialToken: string;
  onBackToLogin: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ initialToken, onBackToLogin }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPassword !== confirmPassword) {
      setErrorMsg("Keys do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const success = await hrService.finalizePasswordReset(initialToken, newPassword);
      if (success) {
        setStatus('success');
        setTimeout(onBackToLogin, 5000);
      } else {
        setErrorMsg("The recovery link is invalid or has expired.");
      }
    } catch (err) {
      setErrorMsg("Security Error: Unable to verify recovery token.");
    } finally {
      setIsLoading(false);
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
          <h1 className="text-5xl font-black text-white leading-tight">Identity Recovery.</h1>
          <p className="text-slate-400 text-lg font-medium">Resetting your access credentials securely via our Authentication engine.</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-8 animate-in fade-in">
          {status === 'success' ? (
            <div className="text-center space-y-6 animate-in zoom-in">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xl">
                <CheckCircle size={56} />
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Access Restored</h2>
              <p className="text-slate-500 font-medium">Your secret key has been updated. Returning to portal...</p>
              <button onClick={onBackToLogin} className="w-full py-5 bg-[#0f172a] text-white rounded-2xl font-black uppercase text-xs">Sign In Now</button>
            </div>
          ) : (
            <>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">Set New Key</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">New Secret Key</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="password" required className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl font-bold shadow-sm outline-none" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Confirm Key</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="password" required className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl font-bold shadow-sm outline-none" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                  </div>
                </div>
                {errorMsg && <div className="p-4 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl">{errorMsg}</div>}
                <button type="submit" disabled={isLoading} className="w-full py-5 bg-[#0f172a] text-white rounded-2xl font-black uppercase text-xs disabled:opacity-50">
                  {isLoading ? 'Processing...' : 'Update Secret Key'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
