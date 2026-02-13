import React from 'react';
import { MapPin, Calendar, Users, BarChart3 } from 'lucide-react';

const features = [
  {
    icon: MapPin,
    title: 'Attendance Management',
    description: 'Selfie-based check-in with GPS tracking. Real-time attendance logs with office and factory modes.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    icon: Calendar,
    title: 'Leave Management',
    description: 'Apply, approve, and track leave balances. Configurable leave types with automatic calculations.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    icon: Users,
    title: 'Employee Directory',
    description: 'Complete employee profiles with department and designation management. Search and filter with ease.',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    description: 'Comprehensive attendance and leave reports. Export data and gain actionable insights for your team.',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
];

const FeaturesSection: React.FC = () => {
  return (
    <section id="features" className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold text-primary uppercase tracking-widest">Features</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-3 mb-4">
            Everything You Need
          </h2>
          <p className="text-slate-500 text-lg">
            One platform to manage your entire HR workflow — from attendance to analytics.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group p-6 bg-slate-50/50 border border-slate-100 rounded-2xl hover:bg-white hover:shadow-lg hover:shadow-slate-100 hover:border-slate-200 transition-all duration-300"
            >
              <div className={`w-12 h-12 ${feature.bg} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                <feature.icon size={22} className={feature.color} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
