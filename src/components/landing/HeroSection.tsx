import React, { useState, useEffect } from 'react';
import { ArrowRight, Clock, CreditCard, Zap, LogIn, Mail, Lock, Eye, EyeOff, AlertCircle, RefreshCw, Building2, Download, RotateCcw, Share, MoreVertical, X, Send } from 'lucide-react';
import { hrService } from '../../services/hrService';
import { useToast } from '../../context/ToastContext';

interface HeroSectionProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onLoginSuccess?: (user: any) => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onLoginClick, onRegisterClick, onLoginSuccess }) => {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);
    setIsInstalled(
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
    if ((window as any).deferredPWAPrompt) setCanPrompt(true);
    const handler = () => setCanPrompt(true);
    window.addEventListener('pwa-install-available', handler);
    return () => window.removeEventListener('pwa-install-available', handler);
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = (window as any).deferredPWAPrompt;
    if (promptEvent) {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        (window as any).deferredPWAPrompt = null;
        setCanPrompt(false);
      }
    } else {
      setShowInstallGuide(true);
    }
  };

  const handleResetCache = async () => {
    if (!confirm('Reset App Cache? This will reload the application.')) return;
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) await reg.unregister();
    }
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  const handleResendVerification = async () => {
    if (!email) return;
    try {
      await hrService.requestVerificationEmail(email);
      showToast("A new verification link has been sent to your email.", "success");
      setShowResend(false);
      setError('');
    } catch (e) {
      showToast("Failed to send verification email.", "error");
    }
  };

  const handleMobileLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    setError('');
    setShowResend(false);
    try {
      const result = await hrService.login(email, password);
      if (result.user) {
        onLoginSuccess?.(result.user);
      } else {
        const msg = result.error || 'Login failed. Check your credentials.';
        setError(msg);
        if (msg.toLowerCase().includes('verified') || msg.toLowerCase().includes('verification')) {
          setShowResend(true);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="relative pt-28 md:pt-36 pb-16 md:pb-24 overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 right-[-20%] w-[60%] h-[60%] bg-primary/5 blur-[120px] rounded-full -z-10"></div>
      <div className="absolute bottom-0 left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[100px] rounded-full -z-10"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Mobile: Inline Login Form (above headline) */}
          <div className="sm:hidden mb-8">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-left">
              <div className="flex items-center gap-2 mb-4">
                <LogIn size={16} className="text-primary" />
                <h3 className="text-sm font-bold text-slate-900">Sign in to your account</h3>
              </div>

              <form onSubmit={handleMobileLogin} className="space-y-3" autoComplete="on">
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 placeholder:text-slate-400"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {error && (
                  <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={14} className="text-rose-500 flex-shrink-0" />
                      <p className="text-[11px] font-semibold text-rose-600">{error}</p>
                    </div>
                    {showResend && (
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        className="mt-2 w-full flex items-center justify-center gap-1.5 bg-white px-3 py-2 rounded-lg shadow-sm text-[11px] font-bold text-rose-600 hover:text-rose-800 border border-rose-100 transition-colors"
                      >
                        <Send size={12} /> Resend Verification Link
                      </button>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-sm"
                >
                  {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <><LogIn size={16} /> Login</>}
                </button>

                <button
                  type="button"
                  onClick={onRegisterClick}
                  className="w-full py-2.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl font-semibold text-xs hover:bg-white hover:border-slate-300 transition-all flex items-center justify-center gap-2"
                >
                  <Building2 size={14} /> Register New Organization
                </button>

                {/* Utils: Install / Download / Reset */}
                <div className="flex items-center justify-center gap-3 pt-3 border-t border-slate-100">
                  {!isInstalled && (
                    <button
                      type="button"
                      onClick={handleInstallClick}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-slate-400 text-[10px] font-semibold uppercase tracking-wider hover:text-primary transition-colors"
                    >
                      <Download size={12} /> {canPrompt ? 'Install' : 'Install Guide'}
                    </button>
                  )}
                  <div className="w-px h-3 bg-slate-200"></div>
                  <button
                    type="button"
                    onClick={handleResetCache}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-slate-400 text-[10px] font-semibold uppercase tracking-wider hover:text-rose-500 transition-colors"
                  >
                    <RotateCcw size={12} /> Reset
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/10 rounded-full mb-6">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-bold text-primary">Free & Open-Source HR Platform</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-slate-900 tracking-tight leading-[1.1] mb-6">
            Modern HR Management{' '}
            <span className="text-primary">Made Simple</span>
          </h1>

          {/* Subtext */}
          <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Streamline attendance tracking, leave management, and employee records — all in one powerful platform built for growing teams.
          </p>

          {/* Desktop: CTA Buttons */}
          <div className="hidden sm:flex items-center justify-center gap-4 mb-12">
            <button
              onClick={onLoginClick}
              className="px-8 py-4 bg-slate-900 text-white font-bold text-sm rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2"
            >
              <LogIn size={18} /> Login to Your Account
            </button>
            <button
              onClick={onRegisterClick}
              className="px-8 py-4 bg-primary text-white font-bold text-sm rounded-2xl hover:bg-primary-hover transition-all shadow-sm flex items-center justify-center gap-2"
            >
              Get Started Free <ArrowRight size={18} />
            </button>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 mb-16">
            <div className="flex items-center gap-2 text-slate-400">
              <Clock size={16} className="text-emerald-500" />
              <span className="text-xs font-semibold">14-day free trial</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <CreditCard size={16} className="text-emerald-500" />
              <span className="text-xs font-semibold">No credit card required</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Zap size={16} className="text-emerald-500" />
              <span className="text-xs font-semibold">Setup in 5 minutes</span>
            </div>
          </div>

          {/* Video Intro */}
          <div className="relative max-w-4xl mx-auto mb-16">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-6">See OpenHR in Action</h2>
            <div className="rounded-2xl overflow-hidden shadow-xl shadow-slate-900/10 border border-slate-200/60">
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  className="absolute top-0 left-0 w-full h-full"
                  src="https://www.youtube.com/embed/Wb-4mt90IFU"
                  title="OpenHR App Introduction"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          </div>

        </div>
      </div>
      {/* Install Guide Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl animate-in slide-in-from-bottom-10 border border-slate-100">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Download size={16} className="text-primary" /> Install Guide
              </h3>
              <button onClick={() => setShowInstallGuide(false)} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-900 transition-colors">
                <X size={16} />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 font-medium">Install OpenHR on your iPhone or iPad:</p>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-blue-500"><Share size={16} /></div>
                  <p className="text-xs font-bold text-slate-700">1. Tap the <span className="text-blue-600">Share</span> button in Safari</p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-900 font-bold text-sm">+</div>
                  <p className="text-xs font-bold text-slate-700">2. Select <span className="text-slate-900">Add to Home Screen</span></p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-blue-600 font-bold text-[10px]">Add</div>
                  <p className="text-xs font-bold text-slate-700">3. Tap <span className="text-blue-600">Add</span> to confirm</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 font-medium">Install OpenHR from your browser:</p>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-600"><MoreVertical size={16} /></div>
                  <p className="text-xs font-bold text-slate-700">1. Tap the <span className="text-slate-900">Menu</span> button (&#8942; or &#8943;)</p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-primary"><Download size={16} /></div>
                  <p className="text-xs font-bold text-slate-700">2. Select <span className="text-slate-900">Install App</span> or <span className="text-slate-900">Add to Home Screen</span></p>
                </div>

              </div>
            )}

            <button
              onClick={() => setShowInstallGuide(false)}
              className="w-full mt-5 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default HeroSection;
