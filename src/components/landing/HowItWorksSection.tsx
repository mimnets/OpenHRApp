import React from 'react';
import { Building2, UserPlus, Rocket } from 'lucide-react';

const steps = [
  {
    icon: Building2,
    step: '01',
    title: 'Register Organization',
    description: 'Create your organization account in seconds. Just your name, email, and company details.',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: UserPlus,
    step: '02',
    title: 'Add Your Employees',
    description: 'Invite team members and set up departments, designations, and leave policies.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    icon: Rocket,
    step: '03',
    title: 'Start Managing',
    description: 'Track attendance, manage leave requests, and generate reports — all from day one.',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
];

const HowItWorksSection: React.FC = () => {
  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold text-primary uppercase tracking-widest">How It Works</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-3 mb-4">
            Get Started in 3 Steps
          </h2>
          <p className="text-slate-500 text-lg">
            From sign-up to fully operational — in just a few minutes.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((s, idx) => (
            <div key={s.step} className="relative text-center">
              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px bg-slate-200"></div>
              )}

              <div className={`w-20 h-20 ${s.bg} rounded-2xl flex items-center justify-center mx-auto mb-5 relative`}>
                <s.icon size={28} className={s.color} />
                <span className="absolute -top-2 -right-2 w-7 h-7 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center text-[10px] font-black text-slate-500">
                  {s.step}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">{s.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
