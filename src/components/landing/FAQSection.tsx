import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    category: 'General',
    items: [
      {
        q: 'What is OpenHRApp?',
        a: 'OpenHRApp is a modern, open-source HR management platform that helps organizations manage attendance, leave, and employee records in one place. It works as a Progressive Web App (PWA) on any device.',
      },
      {
        q: 'Is OpenHRApp really free?',
        a: 'Yes! OpenHRApp offers a free ad-supported plan for small teams. We also offer premium plans with additional features like advanced analytics, priority support, and no ads.',
      },
    ],
  },
  {
    category: 'Account & Setup',
    items: [
      {
        q: 'How do I register my organization?',
        a: 'Click "Get Started Free", fill in your organization name, admin email, and password. You\'ll receive a verification email to activate your account. Setup takes less than 5 minutes.',
      },
      {
        q: 'Can I manage multiple departments?',
        a: 'Absolutely. You can create unlimited departments and designations, assign employees, and track attendance and leave per department.',
      },
    ],
  },
  {
    category: 'Attendance',
    items: [
      {
        q: 'How does selfie-based attendance work?',
        a: 'Employees check in by taking a selfie through the app. The system captures the photo along with GPS coordinates and timestamp, ensuring authentic and verifiable attendance records.',
      },
      {
        q: 'What attendance modes are available?',
        a: 'OpenHRApp supports Office mode (standard check-in/out) and Factory mode (shift-based tracking). Admins can configure which modes are available for their organization.',
      },
    ],
  },
  {
    category: 'Leave Management',
    items: [
      {
        q: 'How do employees apply for leave?',
        a: 'Employees select their leave type, dates, and add an optional reason through the app. Managers receive a notification and can approve or reject with one click.',
      },
      {
        q: 'Can I configure custom leave types?',
        a: 'Yes. Admins can create custom leave types with configurable annual allowances, carry-over rules, and approval workflows.',
      },
    ],
  },
  {
    category: 'PWA & Mobile',
    items: [
      {
        q: 'Do I need to download the app from an app store?',
        a: 'No! OpenHRApp is a Progressive Web App (PWA). Just visit the URL in your browser and install it to your home screen — no app store needed.',
      },
      {
        q: 'Does it work offline?',
        a: 'The app caches essential UI resources for fast loading. However, real-time features like attendance check-in require an internet connection.',
      },
    ],
  },
  {
    category: 'Pricing',
    items: [
      {
        q: 'What happens after my 14-day trial?',
        a: 'After your trial ends, you can choose to continue with our free ad-supported plan or upgrade to a premium plan for additional features and ad-free experience.',
      },
      {
        q: 'Can I upgrade or downgrade anytime?',
        a: 'Yes. You can change your plan at any time from the Settings page. Upgrades take effect immediately, and downgrades apply at the next billing cycle.',
      },
    ],
  },
];

const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  const toggle = (key: string) => {
    setOpenIndex(openIndex === key ? null : key);
  };

  return (
    <section id="faq" className="py-20 md:py-28 bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-xs font-bold text-primary uppercase tracking-widest">FAQ</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-3 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-500 text-lg">
            Everything you need to know about OpenHRApp.
          </p>
        </div>

        {/* FAQ Groups */}
        <div className="space-y-8">
          {faqs.map((group) => (
            <div key={group.category}>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">
                {group.category}
              </h3>
              <div className="space-y-2">
                {group.items.map((item, idx) => {
                  const key = `${group.category}-${idx}`;
                  const isOpen = openIndex === key;
                  return (
                    <div
                      key={key}
                      className="bg-white border border-slate-100 rounded-xl overflow-hidden"
                    >
                      <button
                        onClick={() => toggle(key)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-sm font-semibold text-slate-800 pr-4">{item.q}</span>
                        <ChevronDown
                          size={16}
                          className={`flex-shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-4 animate-in fade-in duration-200">
                          <p className="text-sm text-slate-500 leading-relaxed">{item.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
