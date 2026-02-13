import React from 'react';
import { ArrowRight, Clock, CreditCard, Zap } from 'lucide-react';

interface HeroSectionProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onLoginClick, onRegisterClick }) => {
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
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] mb-6">
            Modern HR Management{' '}
            <span className="text-primary">Made Simple</span>
          </h1>

          {/* Subtext */}
          <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Streamline attendance tracking, leave management, and employee records — all in one powerful platform built for growing teams.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <button
              onClick={onRegisterClick}
              className="w-full sm:w-auto px-8 py-4 bg-primary text-white font-bold text-sm rounded-2xl hover:bg-primary-hover transition-all shadow-xl shadow-primary-light flex items-center justify-center gap-2"
            >
              Get Started Free <ArrowRight size={18} />
            </button>
            <button
              onClick={onLoginClick}
              className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 font-bold text-sm rounded-2xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              Login to Your Account
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

          {/* Screenshot Preview */}
          <div className="relative max-w-5xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-t from-[#f8fafc] via-transparent to-transparent z-10 pointer-events-none"></div>
            <div className="rounded-2xl overflow-hidden shadow-2xl shadow-slate-900/10 border border-slate-200/60">
              <img
                src="./img/screenshot-wide.png"
                alt="OpenHRApp Dashboard"
                className="w-full hidden sm:block"
              />
              <img
                src="./img/screenshot-mobile.png"
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
