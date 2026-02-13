import React from 'react';
import { Quote, Building2, Users, Activity } from 'lucide-react';

const stats = [
  { icon: Building2, value: '50+', label: 'Organizations' },
  { icon: Users, value: '1,000+', label: 'Employees Managed' },
  { icon: Activity, value: '99.9%', label: 'Uptime' },
];

const TestimonialsSection: React.FC = () => {
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold text-primary uppercase tracking-widest">Testimonials</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-3 mb-4">
            Trusted by Growing Teams
          </h2>
        </div>

        {/* Testimonial Card */}
        <div className="max-w-2xl mx-auto mb-16">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-8 md:p-10 relative">
            <Quote size={32} className="text-primary/20 absolute top-6 left-6" />
            <p className="text-slate-700 text-lg leading-relaxed mb-6 relative z-10">
              "OpenHRApp transformed how we manage our team. Attendance tracking went from spreadsheets to a one-click selfie check-in. Our HR department saves hours every week."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-primary font-bold text-sm">RK</span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Rajesh Kumar</p>
                <p className="text-xs text-slate-500">HR Manager, TechCorp Solutions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <stat.icon size={20} className="text-primary mx-auto mb-3" />
              <p className="text-2xl font-black text-slate-900">{stat.value}</p>
              <p className="text-xs font-semibold text-slate-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
