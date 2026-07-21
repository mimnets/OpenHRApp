import React, { useState, useEffect, useCallback } from 'react';
import { X, Eye, EyeOff, Copy, Check, LogIn, AlertCircle, RefreshCw, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface DemoAccount {
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  employeeId: string;
  department: string;
  designation: string;
}

interface DemoCredentialsData {
  password: string;
  accounts: DemoAccount[];
}

interface DemoLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLoginPage: () => void;
}

// ── Role badge styling ─────────────────────────────────────────────────────

const ROLE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  ADMIN: { bg: 'bg-indigo-50', text: 'text-indigo-600', label: 'Admin' },
  MANAGER: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Manager' },
  EMPLOYEE: { bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Employee' },
};

// ── Brand Logo (matches Login.tsx) ──────────────────────────────────────────

const BrandLogo = () => (
  <div className="flex flex-col items-center justify-center gap-3">
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 bg-primary-light blur-[30px] rounded-full -z-10 opacity-50"></div>
      <div className="relative w-full h-full bg-white rounded-2xl shadow-lg flex items-center justify-center p-2.5 border-2 border-primary/20">
        <img
          src="/img/logo.webp"
          className="w-full h-full object-contain"
          alt="OpenHRApp Logo"
        />
      </div>
    </div>
    <div className="text-center">
      <h2 className="text-xl font-semibold tracking-tighter flex items-center justify-center">
        <span className="text-primary">Open</span>
        <span className="text-[#f59e0b]">HR</span>
        <span className="text-[#10b981]">App</span>
      </h2>
      <p className="text-slate-400 font-bold text-[9px] uppercase tracking-[0.2em] mt-0.5">Personnel Gateway</p>
    </div>
  </div>
);

// ── Skeleton card for loading state ─────────────────────────────────────────

const SkeletonCard = () => (
  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100/80 animate-pulse">
    <div className="h-5 w-16 bg-slate-200 rounded-full mb-3"></div>
    <div className="h-3.5 w-32 bg-slate-200 rounded mb-2"></div>
    <div className="h-3 w-48 bg-slate-200 rounded mb-3"></div>
    <div className="h-3 w-40 bg-slate-200 rounded mb-3"></div>
    <div className="h-9 w-full bg-slate-200 rounded-xl mt-4"></div>
  </div>
);

// ── Copy button ─────────────────────────────────────────────────────────────

const CopyButton: React.FC<{ text: string; label: string }> = ({ text, label }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text for manual copy
      const input = document.createElement('input');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-primary transition-colors ml-1"
      title={`Copy ${label}`}
    >
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
    </button>
  );
};

// ── Main component ──────────────────────────────────────────────────────────

const DemoLoginModal: React.FC<DemoLoginModalProps> = ({ isOpen, onClose, onOpenLoginPage }) => {
  const [credentials, setCredentials] = useState<DemoCredentialsData | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loggingInEmail, setLoggingInEmail] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  // ── Fetch credentials when modal opens ────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;

    const fetchCredentials = async () => {
      setIsLoading(true);
      setFetchError(null);
      setLoginError(null);

      try {
        const { data, error } = await supabase.functions.invoke('demo-credentials');
        if (error) throw new Error(error.message);
        if (!data?.password || !data?.accounts) {
          throw new Error('Invalid response from server');
        }
        setCredentials(data as DemoCredentialsData);
      } catch (err) {
        console.error('[DemoLoginModal] Failed to fetch credentials:', err);
        setFetchError((err as Error).message || 'Failed to load demo accounts');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCredentials();
  }, [isOpen]);

  // ── Handle one-click login ───────────────────────────────────────────────

  const handleRoleLogin = async (account: DemoAccount) => {
    setLoggingInEmail(account.email);
    setLoginError(null);

    try {
      const roleKey = account.role.toLowerCase(); // ADMIN → admin, MANAGER → manager, EMPLOYEE → employee
      const { data, error } = await supabase.functions.invoke('demo-login', {
        body: { role: roleKey },
      });

      if (error) throw new Error(error.message);
      if (!data?.access_token || !data?.refresh_token) {
        throw new Error('No session tokens returned');
      }

      await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      window.location.href = '/';
    } catch (err) {
      console.error('[DemoLoginModal] Login failed:', err);
      setLoginError((err as Error).message || 'Login failed. Please try again.');
      setLoggingInEmail(null);
    }
  };

  // ── Handle "Go to Login Page" ────────────────────────────────────────────

  const handleGoToLogin = () => {
    onClose();
    onOpenLoginPage();
  };

  // ── Toggle password visibility ───────────────────────────────────────────

  const togglePasswordVisibility = (email: string) => {
    setVisiblePasswords(prev => {
      const next = new Set(prev);
      if (next.has(email)) {
        next.delete(email);
      } else {
        next.add(email);
      }
      return next;
    });
  };

  // ── Close handler ───────────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    setCredentials(null);
    setFetchError(null);
    setLoginError(null);
    setLoggingInEmail(null);
    setVisiblePasswords(new Set());
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl animate-in slide-in-from-bottom-10 duration-300">
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-3">
          <div className="flex-1">
            <BrandLogo />
          </div>
          <button
            onClick={handleClose}
            className="p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-900 transition-colors -mr-1 -mt-1"
          >
            <X size={16} />
          </button>
        </div>

        {/* Subtitle */}
        <div className="px-5 mb-4 text-center">
          <h3 className="text-sm font-bold text-slate-800">Choose a Demo Account</h3>
          <p className="text-xs text-slate-400 mt-1">
            Explore OpenHRApp from different role perspectives
          </p>
        </div>

        {/* Content */}
        <div className="px-5 pb-5 space-y-3">
          {/* ── Loading state ──────────────────────────────────────────── */}
          {isLoading && (
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}

          {/* ── Error state ────────────────────────────────────────────── */}
          {fetchError && !isLoading && (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-red-50 rounded-full mb-3">
                <AlertCircle size={24} className="text-red-500" />
              </div>
              <p className="text-sm font-semibold text-slate-800 mb-1">Unable to load demo accounts</p>
              <p className="text-xs text-slate-400 mb-4">{fetchError}</p>
              <button
                onClick={() => {
                  setCredentials(null);
                  setFetchError(null);
                  setIsLoading(true);
                  supabase.functions.invoke('demo-credentials').then(({ data, error }) => {
                    setIsLoading(false);
                    if (error || !data?.password) {
                      setFetchError((error?.message as string) || 'Failed to load demo accounts');
                    } else {
                      setCredentials(data as DemoCredentialsData);
                    }
                  }).catch((err) => {
                    setIsLoading(false);
                    setFetchError((err as Error).message);
                  });
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                <RefreshCw size={14} /> Try Again
              </button>
            </div>
          )}

          {/* ── Login error ────────────────────────────────────────────── */}
          {loginError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-medium text-red-600">
              <AlertCircle size={14} className="shrink-0" />
              {loginError}
            </div>
          )}

          {/* ── Account cards ──────────────────────────────────────────── */}
          {credentials && !isLoading && credentials.accounts.map((account) => {
            const roleStyle = ROLE_STYLES[account.role] || ROLE_STYLES.EMPLOYEE;
            const isLoggingIn = loggingInEmail === account.email;
            const isOtherLoggingIn = loggingInEmail !== null && loggingInEmail !== account.email;
            const showPassword = visiblePasswords.has(account.email);

            return (
              <div
                key={account.email}
                className={`p-4 bg-slate-50 rounded-xl border border-slate-100/80 transition-opacity ${isOtherLoggingIn ? 'opacity-50' : ''}`}
              >
                {/* Role badge + name */}
                <div className="flex items-center justify-between mb-1">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${roleStyle.bg} ${roleStyle.text}`}>
                    {roleStyle.label}
                  </span>
                  <CopyButton text={account.email} label="email" />
                </div>

                <p className="text-sm font-bold text-slate-800">{account.name}</p>
                <p className="text-xs text-slate-400">{account.designation} · {account.department}</p>

                {/* Email */}
                <div className="mt-2 flex items-center gap-1">
                  <span className="text-xs text-slate-500 font-mono select-all">{account.email}</span>
                </div>

                {/* Password */}
                <div className="mt-1.5 flex items-center gap-1">
                  <span className="text-xs text-slate-500 font-mono select-all">
                    {showPassword ? credentials.password : '•'.repeat(credentials.password.length)}
                  </span>
                  <button
                    onClick={() => togglePasswordVisibility(account.email)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                  <CopyButton text={credentials.password} label="password" />
                </div>

                {/* Login button */}
                <button
                  onClick={() => handleRoleLogin(account)}
                  disabled={isLoggingIn || isOtherLoggingIn}
                  className={`mt-3 w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    isLoggingIn
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-primary text-white hover:bg-primary-hover shadow-sm'
                  }`}
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn size={14} />
                      Login as {account.name.split(' ')[0]}
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {credentials && !isLoading && (
          <div className="px-5 pb-5">
            <div className="border-t border-slate-100 pt-4 space-y-2 text-center">
              <button
                onClick={handleGoToLogin}
                className="w-full py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
              >
                Go to Login Page <ArrowRight size={13} />
              </button>
              <p className="text-[10px] text-slate-400">
                Demo resets daily at midnight UTC. Data is not saved.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DemoLoginModal;
