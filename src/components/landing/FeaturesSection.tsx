import React from 'react';
import { MapPin, Calendar, Users, BarChart3, ClipboardCheck, ArrowRight } from 'lucide-react';
import { navigateTo } from '../../utils/seo';

const features = [
  {
    icon: MapPin,
    title: 'Attendance Management',
    slug: 'attendance-tracking',
    description: 'Selfie-based check-in with GPS tracking. Real-time attendance logs with office and factory modes.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    icon: Calendar,
    title: 'Leave Management',
    slug: 'leave-management',
    description: 'Apply, approve, and track leave balances. Configurable leave types with automatic calculations.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    icon: Users,
    title: 'Employee Directory',
    slug: 'employee-directory',
    description: 'Complete employee profiles with department and designation management. Search and filter with ease.',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    slug: 'reports-analytics',
    description: 'Comprehensive attendance and leave reports. Export data and gain actionable insights for your team.',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    icon: ClipboardCheck,
    title: 'Performance Reviews',
    slug: 'performance-reviews',
    description: 'Run structured review cycles with self-assessments, manager evaluations, and HR finalization. Customizable competencies and rating scales.',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
  },
];

const FeaturesSection: React.FC = () => {
  return (
    <section id="features" className="py-20 md:py-28 bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold text-primary uppercase tracking-wide">Features</span>
          <h2 className="text-3xl sm:text-4xl font-semibold text-slate-900 mt-3 mb-4">
            Everything You Need
          </h2>
          <p className="text-slate-500 text-lg">
            One platform to manage your entire HR workflow — from attendance to performance reviews.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <button
              key={feature.title}
              onClick={() => navigateTo(`/features/${feature.slug}`)}
              className="group p-6 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 rounded-2xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-100 dark:hover:shadow-black/30 hover:border-slate-200 dark:hover:border-slate-600 transition-all duration-300 text-left cursor-pointer"
            >
              <div className={`w-12 h-12 ${feature.bg} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                <feature.icon size={22} className={feature.color} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-3">{feature.description}</p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Learn more <ArrowRight size={14} />
              </span>
            </button>
          ))}
        </div>

        {/* View All Features */}
        <div className="text-center mt-10">
          <button
            onClick={() => navigateTo('/features')}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-primary border border-primary/20 rounded-xl hover:bg-primary/5 transition-colors"
          >
            View All Features <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
