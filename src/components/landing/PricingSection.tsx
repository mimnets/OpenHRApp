import React from 'react';
import { navigateTo } from '../../utils/seo';
import { PRICING, yearlyPerMonth } from '../../data/pricing';
import { Heart, Coffee, Check, Shield, Zap, Users, Calendar, MapPin, BarChart3, ClipboardCheck, Globe } from 'lucide-react';

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
    <section id="pricing" className="py-20 md:py-28 bg-dl-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold text-dl-teal uppercase tracking-wide">Free & Open Source</span>
          <h2 className="text-3xl sm:text-4xl font-semibold text-dl-ink mt-3 mb-4">
            Every Feature Free. Ad-free if You Like.
          </h2>
          <p className="text-dl-muted text-lg">
            Every feature is available to every organization — no paywalls, no user limits, no credit card required. The optional ad-free plan just helps cover the servers.
          </p>
        </div>

        {/* Main Card */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="bg-dl-teal rounded-3xl p-8 md:p-12 text-center text-dl-surface relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-dl-surface/5 rounded-full -translate-y-1/3 translate-x-1/3" aria-hidden="true" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-dl-surface/5 rounded-full translate-y-1/3 -translate-x-1/3" aria-hidden="true" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-dl-surface/10 rounded-full mb-6">
                <Heart size={14} className="text-dl-surface/90" />
                <span className="text-xs font-bold text-dl-surface/90">Community-Powered</span>
              </div>

              <div className="mb-6">
                <span className="text-5xl md:text-6xl font-bold">$0</span>
                <span className="text-xl text-dl-surface/70 font-medium"> — forever, with ads</span>
              </div>

              <p className="text-dl-surface/80 text-lg mb-4 max-w-md mx-auto">
                All features included. No hidden fees, no per-employee pricing.
              </p>
              <p className="text-dl-surface/90 mb-8 max-w-md mx-auto inline-flex items-center gap-2">
                <Check size={18} aria-hidden="true" /> Prefer no ads? ${PRICING.yearly}/year ({yearlyPerMonth()}/month) or ${PRICING.monthly}/month per organization.
              </p>

              <button
                onClick={onRegisterClick}
                className="px-8 py-4 bg-dl-surface text-dl-teal font-bold text-sm rounded-dl-lg hover:bg-dl-ground transition-colors shadow-dl-2 inline-flex items-center gap-2"
              >
                Get Started Free <Zap size={16} />
              </button>
              <a href="/pricing" onClick={(e) => { e.preventDefault(); navigateTo('/pricing'); }}
                className="block mt-4 text-sm font-bold text-dl-surface/90 underline underline-offset-4 hover:text-dl-surface">
                See full pricing
              </a>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-12">
          {features.map((f) => (
            <div key={f.label} className="flex items-start gap-3 bg-dl-ground border border-dl-hair-soft rounded-dl-md p-4">
              <f.icon size={18} className="text-dl-teal flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span className="text-sm font-medium text-dl-ink">{f.label}</span>
            </div>
          ))}
        </div>

        {/* Donation Card */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-dl-ground border border-dl-hair-soft rounded-dl-lg p-8 md:p-10 text-center">
            <div className="w-12 h-12 bg-dl-teal/10 rounded-dl-md flex items-center justify-center mx-auto mb-4">
              <Coffee size={22} className="text-dl-teal" />
            </div>
            <h3 className="text-lg font-bold text-dl-ink mb-2">
              Support the Project
            </h3>
            <p className="text-dl-muted text-sm max-w-md mx-auto mb-4">
              OpenHRApp is independently maintained and funded by the community. If you'd like to support ongoing development, you can make a small donation — any amount helps keep the project alive.
            </p>
            <a
              href="https://buymeacoffee.com/openhrapp"
              target="_blank"
              rel="noopener noreferrer"
              /* #FFDD00 is Buy Me a Coffee's own yellow and does not invert, so the
                 label cannot use --dl-ink, which does: in dark mode that was
                 near-white on yellow, 1.1:1. --dl-ink-fixed stays dark in both. */
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FFDD00] text-dl-ink-fixed rounded-dl-md font-bold text-sm hover:opacity-90 transition-all"
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
