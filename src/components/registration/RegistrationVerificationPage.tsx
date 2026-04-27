import React, { useEffect, useRef, useState } from 'react';
import { Mail, CheckCircle2, AlertTriangle, RefreshCw, ArrowRight, Home, Loader2 } from 'lucide-react';
import { verificationService } from '../../services/verification.service';

interface RegistrationVerificationPageProps {
  email: string;
  onVerificationComplete: () => void;
}

const POLL_INTERVAL_MS = 8000;
const POLL_MAX_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export const RegistrationVerificationPage: React.FC<RegistrationVerificationPageProps> = ({
  email,
  onVerificationComplete,
}) => {
  const [status, setStatus] = useState<'waiting' | 'verified' | 'resending' | 'timeout'>('waiting');
  const [resendMessage, setResendMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (cancelled) return;
      const elapsed = Date.now() - startedAtRef.current;
      if (elapsed > POLL_MAX_DURATION_MS) {
        setStatus(prev => (prev === 'verified' ? prev : 'timeout'));
        return;
      }

      const verified = await verificationService.checkVerified(email);
      if (cancelled) return;
      if (verified) {
        setStatus('verified');
        return;
      }
      timeoutId = setTimeout(tick, POLL_INTERVAL_MS);
    };

    tick();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [email]);

  const handleResend = async () => {
    setStatus('resending');
    setResendMessage(null);
    const result = await verificationService.resendVerificationEmail(email);
    if (result.success) {
      setResendMessage({ tone: 'success', text: result.message || 'Verification email sent.' });
    } else {
      setResendMessage({ tone: 'error', text: result.message || 'Could not resend the verification email.' });
    }
    startedAtRef.current = Date.now();
    setStatus('waiting');
  };

  const handleBackHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[#f8fafc] relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary-light blur-[100px] rounded-full -z-10" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[100px] rounded-full -z-10" />

      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 p-8 sm:p-10 space-y-6 animate-in fade-in slide-in-from-bottom-8">
        {status === 'verified' ? (
          <div className="flex flex-col items-center text-center gap-5">
            <div className="p-4 bg-emerald-50 rounded-full">
              <CheckCircle2 size={48} className="text-emerald-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Email verified!</h2>
              <p className="text-sm text-slate-500">
                Your account is ready. You can now log in.
              </p>
            </div>
            <button
              onClick={onVerificationComplete}
              className="w-full py-3.5 bg-primary text-white rounded-2xl font-semibold uppercase text-xs tracking-wide hover:bg-primary-hover active:scale-[0.97] transition-all flex items-center justify-center gap-2"
            >
              Continue to Login <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-4 bg-primary-light/40 rounded-full">
                <Mail size={36} className="text-primary" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-900">Verify your email</h2>
                <p className="text-sm text-slate-500">
                  We sent a verification link to <span className="font-semibold text-slate-700 break-all">{email}</span>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-800">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <div className="text-sm leading-relaxed">
                <p className="font-bold">Don't see the email?</p>
                <p className="mt-1">
                  <span className="font-semibold">Check your spam or junk folder.</span> Verification emails sometimes
                  land there. The message comes from <span className="font-mono text-xs">noreply@openhrapp.com</span>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 justify-center">
              {status === 'resending' ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Resending verification email…</span>
                </>
              ) : status === 'timeout' ? (
                <span className="text-amber-700 font-medium">
                  We've stopped checking automatically. Click the link in your email, then refresh this page.
                </span>
              ) : (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Waiting for you to click the link… this page updates automatically.</span>
                </>
              )}
            </div>

            {resendMessage && (
              <div
                className={`text-sm rounded-xl px-4 py-3 border ${
                  resendMessage.tone === 'success'
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                    : 'bg-rose-50 border-rose-100 text-rose-700'
                }`}
              >
                {resendMessage.text}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleResend}
                disabled={status === 'resending'}
                className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 rounded-2xl font-semibold text-sm hover:bg-slate-200 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} /> Resend verification email
              </button>
              <button
                onClick={handleBackHome}
                className="flex-1 py-3 px-4 bg-white text-slate-700 border border-slate-200 rounded-2xl font-semibold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
              >
                <Home size={16} /> Back to home
              </button>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-700">What's next?</p>
              <ol className="list-decimal pl-5 space-y-0.5">
                <li>Check your inbox (and spam/junk folder) for the verification email.</li>
                <li>Click the verification link — it expires after 24 hours.</li>
                <li>This page will detect the verification automatically and take you to login.</li>
              </ol>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
