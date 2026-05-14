import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { authService } from '../services/auth.service';

interface ResetPasswordProps {
  onFinished: () => void;
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({ onFinished }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setStatus('loading');
    const ok = await authService.finalizePasswordReset('', password);
    if (ok) {
      setStatus('success');
    } else {
      setStatus('error');
      setError('Failed to update password. The reset link may have expired.');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[#f8fafc] relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary-light blur-[100px] rounded-full -z-10"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-500/5 blur-[100px] rounded-full -z-10"></div>

      <div className="w-full max-w-[400px] animate-in fade-in zoom-in duration-500">
        <div className="bg-white md:shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:border border-slate-100 rounded-xl overflow-hidden">
          <div className="p-8 md:p-12 space-y-8">

            <div className="flex flex-col items-center gap-3 text-center">
              <div className="p-4 bg-primary-light rounded-2xl">
                <Lock size={28} className="text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Set New Password</h2>
                <p className="text-xs text-slate-400 mt-1">Choose a strong password for your account.</p>
              </div>
            </div>

            {status === 'success' ? (
              <div className="flex flex-col items-center gap-6 text-center py-4">
                <div className="p-4 bg-emerald-50 rounded-full">
                  <CheckCircle2 size={40} className="text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Password updated!</p>
                  <p className="text-xs text-slate-400 mt-1">You can now log in with your new password.</p>
                </div>
                <button
                  onClick={onFinished}
                  className="w-full py-4 bg-primary text-white rounded-xl font-semibold text-xs uppercase tracking-[0.2em] shadow-sm hover:bg-primary-hover active:scale-[0.97] transition-all flex items-center justify-center gap-3"
                >
                  Go to Login <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest px-1">New Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors z-10" size={18} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className="w-full pl-14 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary-light placeholder:text-slate-300"
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary transition-colors z-10 p-1">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest px-1">Confirm Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors z-10" size={18} />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      className="w-full pl-14 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary-light placeholder:text-slate-300"
                      placeholder="Repeat your password"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary transition-colors z-10 p-1">
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {(error || status === 'error') && (
                  <div className="p-3.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider">
                    <AlertCircle size={14} className="flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full py-4 bg-primary text-white rounded-xl font-semibold text-xs uppercase tracking-[0.2em] shadow-sm hover:bg-primary-hover active:scale-[0.97] transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                >
                  {status === 'loading' ? <RefreshCw className="animate-spin" size={18} /> : <>Update Password <ArrowRight size={16} /></>}
                </button>

                <button
                  type="button"
                  onClick={onFinished}
                  className="w-full py-2.5 text-slate-400 text-[10px] font-semibold uppercase tracking-widest hover:text-primary transition-colors"
                >
                  Cancel — Back to Login
                </button>
              </form>
            )}
          </div>
        </div>
        <p className="text-center mt-6 text-[8px] font-semibold text-slate-300 uppercase tracking-[0.4em]">v3.0 Multi-Tenant</p>
      </div>
    </div>
  );
};

export default ResetPassword;
