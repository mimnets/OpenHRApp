import React from 'react';
import { ArrowRight } from 'lucide-react';

interface CTASectionProps {
  onRegisterClick: () => void;
}

const CTASection: React.FC<CTASectionProps> = ({ onRegisterClick }) => {
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative bg-primary rounded-3xl overflow-hidden px-6 py-16 sm:px-12 sm:py-20 text-center">
          {/* Background decorations */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>

          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
              Ready to Transform Your HR?
            </h2>
            <p className="text-lg text-white/80 max-w-xl mx-auto mb-8">
              Start your 14-day free trial today. No credit card required. Set up in minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={onRegisterClick}
                className="w-full sm:w-auto px-8 py-4 bg-white text-primary font-bold text-sm rounded-2xl hover:bg-slate-50 transition-colors shadow-lg flex items-center justify-center gap-2"
              >
                Get Started Free <ArrowRight size={18} />
              </button>
            </div>
            <p className="text-sm text-white/60 mt-4">
              Or continue with our free ad-supported plan
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
