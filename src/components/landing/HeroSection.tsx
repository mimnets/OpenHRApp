import React, { useState } from 'react';
import { ArrowRight, Clock, CreditCard, Zap, LogIn, Mail, Lock, Eye, EyeOff, AlertCircle, RefreshCw, Building2 } from 'lucide-react';
import { hrService } from '../../services/hrService';

interface HeroSectionProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onLoginSuccess?: (user: any) => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onLoginClick, onRegisterClick, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleMobileLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    setError('');
    try {
      const result = await hrService.login(email, password);
      if (result.user) {
        onLoginSuccess?.(result.user);
      } else {
        setError(result.error || 'Login failed. Check your credentials.');
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

          {/* Mobile: Inline Login Form */}
          <div className="sm:hidden mb-10">
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
                  <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-100 rounded-xl">
                    <AlertCircle size={14} className="text-rose-500 flex-shrink-0" />
                    <p className="text-[11px] font-semibold text-rose-600">{error}</p>
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
              </form>
            </div>
          </div>

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

          {/* Screenshot Preview */}
          <div className="relative max-w-5xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-t from-[#f8fafc] via-transparent to-transparent z-10 pointer-events-none"></div>
            <div className="rounded-2xl overflow-hidden shadow-xl shadow-slate-900/10 border border-slate-200/60">
              <img
                src="./img/screenshot-wide.webp"
                alt="OpenHRApp Dashboard"
                className="w-full hidden sm:block"
              />
              <img
                src="./img/screenshot-mobile.webp"
                alt="OpenHRApp Mobile"
                className="w-full sm:hidden"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
