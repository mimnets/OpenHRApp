import React from 'react';
import { Heart, Coffee, Shield, Zap, Users, Calendar, MapPin, BarChart3, ClipboardCheck, Globe } from 'lucide-react';

interface PricingSectionProps {
  onRegisterClick: () => void;
}

const features = [
  { icon: MapPin, label: 'Selfie-based attendance with GPS' },
  { icon: Calendar, label: 'Leave management & balances' },
  { icon: Users, label: 'Employee directory & profiles' },
  { icon: BarChart3, label: 'Reports & data export' },
  { icon: ClipboardCheck, label: 'Performance reviews' },
  { icon: Globe, label: 'PWA — works on any device' },
  { icon: Shield, label: 'Open source — audit the code' },
  { icon: Zap, label: 'No user or employee limits' },
];

const PricingSection: React.FC<PricingSectionProps> = ({ onRegisterClick }) => {
  return (
    <section id="pricing" className="py-20 md:py-28 bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold text-primary uppercase tracking-wide">Free & Open Source</span>
          <h2 className="text-3xl sm:text-4xl font-semibold text-slate-900 dark:text-white mt-3 mb-4">
            Completely Free. No Catch.
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            OpenHRApp is free and open-source software. Every feature is available to every organization — no paywalls, no user limits, no credit card required.
          </p>
        </div>

        {/* Main Card */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="bg-primary rounded-3xl p-8 md:p-12 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3" aria-hidden="true" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3" aria-hidden="true" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full mb-6">
                <Heart size={14} className="text-rose-300" />
                <span className="text-xs font-bold text-white/90">Community-Powered</span>
              </div>

              <div className="mb-6">
                <span className="text-5xl md:text-6xl font-bold">$0</span>
                <span className="text-xl text-white/70 font-medium"> — forever</span>
              </div>

              <p className="text-white/80 text-lg mb-8 max-w-md mx-auto">
                All features included. No hidden fees. No premium tiers. Just free, open-source HR software for everyone.
              </p>

              <button
                onClick={onRegisterClick}
                className="px-8 py-4 bg-white text-primary font-bold text-sm rounded-2xl hover:bg-slate-50 transition-colors shadow-lg inline-flex items-center gap-2"
              >
                Get Started Free <Zap size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-12">
          {features.map((f) => (
            <div key={f.label} className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 rounded-xl p-4">
              <f.icon size={18} className="text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{f.label}</span>
            </div>
          ))}
        </div>

        {/* Donation Card */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 rounded-2xl p-8 md:p-10 text-center">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Coffee size={22} className="text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Support the Project
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto mb-4">
              OpenHRApp is independently maintained and funded by the community. If you'd like to remove ads from your organization, you can make a small donation to support development — any amount helps keep the project alive.
            </p>
            <a
              href="https://buymeacoffee.com/openhrapp"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FFDD00] text-slate-900 rounded-xl font-bold text-sm hover:opacity-90 transition-all"
            >
              <Coffee size={14} /> Buy Me a Coffee
            </a>
          </div>
        </div>

      </div>
    </section>
  );
};

export default PricingSection;
