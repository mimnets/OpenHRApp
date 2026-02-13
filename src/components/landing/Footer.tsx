import React from 'react';

const Footer: React.FC = () => {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const columns = [
    {
      title: 'Product',
      links: [
        { label: 'Features', action: () => scrollTo('features') },
        { label: 'How It Works', action: () => scrollTo('how-it-works') },
        { label: 'FAQ', action: () => scrollTo('faq') },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Documentation', action: () => window.open('https://github.com/openhrapp', '_blank') },
        { label: 'GitHub', action: () => window.open('https://github.com/mimnets/openhrapp', '_blank') },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', action: () => scrollTo('features') },
        { label: 'Contact', action: () => scrollTo('contact') },
      ],
    },
  ];

  return (
    <footer className="bg-slate-900 text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center p-1.5">
                <img src="./img/logo.png" className="w-full h-full object-contain" alt="OpenHRApp" />
              </div>
              <span className="text-base font-black tracking-tight">
                <span className="text-primary">Open</span>
                <span className="text-[#f59e0b]">HR</span>
                <span className="text-[#10b981]">App</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Modern HR management for growing teams. Open-source and free to get started.
            </p>
          </div>

          {/* Link Columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={link.action}
                      className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} OpenHRApp. All rights reserved.
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="text-xs text-slate-500 hover:text-white transition-colors"
          >
            Back to top
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
