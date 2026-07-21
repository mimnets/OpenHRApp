import React from 'react';
import { Banknote, TrendingUp, Smartphone, Shield, ExternalLink } from 'lucide-react';

const roadmapItems = [
  {
    icon: Banknote,
    title: 'Payroll Engine',
    description: 'Basic salary calculation with export to common payroll formats. Streamline your payroll processing directly within OpenHR.',
    color: 'text-green-600',
    bg: 'bg-green-50',
    darkBg: 'dark:bg-green-900/20',
  },
  {
    icon: TrendingUp,
    title: 'Advanced Analytics',
    description: 'Deeper HR metrics dashboards with customizable reports, trend analysis, and data-driven workforce insights.',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    darkBg: 'dark:bg-purple-900/20',
  },
  {
    icon: Smartphone,
    title: 'Mobile App',
    description: 'Native Android & iOS apps for a richer mobile experience with push notifications and offline support — beyond the current PWA.',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    darkBg: 'dark:bg-orange-900/20',
  },
  {
    icon: Shield,
    title: 'SSO / SAML',
    description: 'Single sign-on for enterprise — integrate with your existing identity provider for seamless and secure authentication.',
    color: 'text-red-600',
    bg: 'bg-red-50',
    darkBg: 'dark:bg-red-900/20',
  },
];

const RoadmapSection: React.FC = () => {
  return (
    <section id="roadmap" className="py-20 md:py-28 bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold text-primary uppercase tracking-wide">Roadmap</span>
          <h2 className="text-3xl sm:text-4xl font-semibold text-slate-900 dark:text-white mt-3 mb-4">
            Coming Soon
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            We're always working on new features to make OpenHR even better. Here's what's on the horizon — vote for the ones you care about most.
          </p>
        </div>

        {/* Roadmap Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {roadmapItems.map((item) => (
            <div
              key={item.title}
              className="relative group p-6 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 rounded-2xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-100 dark:hover:shadow-black/30 hover:border-slate-200 dark:hover:border-slate-600 transition-all duration-300 text-left"
            >
              {/* Coming Soon badge */}
              <span className="absolute top-3 right-3 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 rounded-full border border-amber-200 dark:border-amber-800 select-none">
                Coming Soon
              </span>

              <div className={`w-12 h-12 ${item.bg} ${item.darkBg} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                <item.icon size={22} className={item.color} aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 pr-20">{item.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>

        {/* Request a Feature CTA */}
        <div className="text-center mt-10">
          <a
            href="https://github.com/mimnets/openhrapp/issues/new?labels=feature-request&template=feature_request.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-primary border border-primary/20 rounded-xl hover:bg-primary/5 transition-colors"
          >
            Request a Feature <ExternalLink size={14} />
          </a>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
            Vote on existing ideas or suggest new ones on GitHub
          </p>
        </div>
      </div>
    </section>
  );
};

export default RoadmapSection;
