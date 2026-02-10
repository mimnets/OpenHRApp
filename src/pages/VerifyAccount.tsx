
import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { hrService } from '../services/hrService';

interface VerifyAccountProps {
  token: string;
  onFinished: () => void;
}

export const VerifyAccount: React.FC<VerifyAccountProps> = ({ token, onFinished }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your credentials...');
  const hasVerified = useRef(false); // Prevent double-execution in Strict Mode

  useEffect(() => {
    const verify = async () => {
      // Guard against double invocation
      if (hasVerified.current) return;
      hasVerified.current = true;

      try {
        const result = await hrService.confirmVerification(token);
        if (result.success) {
          setStatus('success');
          setMessage('Account verified successfully!');
        } else {
          // If the token was just consumed by a previous racing call (edge case), 
          // we might want to assume success or let the user try login. 
          // But usually the ref guard above prevents the race in this component.
          // If the backend returns failure, it's likely expired or invalid.
          setStatus('error');
          setMessage(result.message || 'Verification token is invalid or expired.');
        }
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'An unexpected error occurred.');
      }
    };

    if (token) {
      verify();
    } else {
      setStatus('error');
      setMessage('No verification token found.');
    }
  }, [token]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[#f8fafc] relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary-light blur-[100px] rounded-full -z-10"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[100px] rounded-full -z-10"></div>

      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-10 animate-in zoom-in duration-300">
        <div className="flex flex-col items-center text-center gap-6">
          
          {status === 'loading' && (
            <>
              <div className="p-4 bg-indigo-50 rounded-full animate-pulse">
                <Loader2 size={48} className="text-primary animate-spin" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Verifying</h2>
                <p className="text-sm font-medium text-slate-500">{message}</p>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="p-4 bg-emerald-50 rounded-full animate-in zoom-in duration-300">
                <CheckCircle2 size={48} className="text-emerald-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Verified!</h2>
                <p className="text-sm font-medium text-slate-500">{message}</p>
              </div>
              <button 
                onClick={onFinished}
                className="w-full py-4 mt-4 bg-primary text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-primary-light hover:bg-primary-hover active:scale-[0.97] transition-all flex items-center justify-center gap-2"
              >
                Continue to Login <ArrowRight size={16} />
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="p-4 bg-rose-50 rounded-full animate-in shake">
                <XCircle size={48} className="text-rose-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Verification Failed</h2>
                <p className="text-sm font-medium text-slate-500">{message}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl w-full border border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Troubleshooting</p>
                <ul className="text-xs text-slate-600 text-left list-disc pl-4 space-y-1">
                  <li>Token may have expired (24h limit)</li>
                  <li>Link was already used</li>
                  <li>Account is already verified</li>
                </ul>
              </div>
              <button 
                onClick={onFinished}
                className="w-full py-4 mt-2 bg-slate-100 text-slate-600 rounded-[1.5rem] font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
              >
                Return to Login
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
};
