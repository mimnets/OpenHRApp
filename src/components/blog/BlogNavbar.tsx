import React, { useState } from 'react';
import { Menu, X, Home, BookOpen } from 'lucide-react';

interface BlogNavbarProps {
  onBack: () => void;
}

const BlogNavbar: React.FC<BlogNavbarProps> = ({ onBack }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const goToBlog = () => {
    window.location.hash = '/blog';
    setMobileOpen(false);
  };

  const goHome = () => {
    setMobileOpen(false);
    // Use pushState for clean URL without trailing #
    window.history.pushState(null, '', window.location.pathname);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    onBack();
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={goHome}>
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center p-1.5">
                <img src="./img/logo.webp" className="w-full h-full object-contain" alt="OpenHRApp" />
              </div>
              <span className="text-lg font-black tracking-tight">
                <span className="text-primary">Open</span>
                <span className="text-[#f59e0b]">HR</span>
                <span className="text-[#10b981]">App</span>
              </span>
            </div>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-8">
              <button
                onClick={goHome}
                className="text-sm font-semibold text-slate-600 hover:text-primary transition-colors"
              >
                Home
              </button>
              <button
                onClick={goToBlog}
                className="text-sm font-semibold text-primary transition-colors"
              >
                Blog
              </button>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={goHome}
                className="px-5 py-2.5 text-sm font-bold text-slate-700 hover:text-primary transition-colors"
              >
                Login
              </button>
              <button
                onClick={goHome}
                className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-hover transition-colors shadow-lg shadow-primary-light"
              >
                Get Started Free
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-primary transition-colors"
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 shadow-lg">
            <div className="px-4 py-4 space-y-1">
              <button
                onClick={goHome}
                className="flex items-center gap-2 w-full text-left px-4 py-3 text-sm font-semibold text-slate-600 hover:text-primary hover:bg-slate-50 rounded-xl transition-colors"
              >
                <Home size={16} /> Home
              </button>
              <button
                onClick={goToBlog}
                className="flex items-center gap-2 w-full text-left px-4 py-3 text-sm font-semibold text-primary bg-primary/5 rounded-xl transition-colors"
              >
                <BookOpen size={16} /> Blog
              </button>
              <div className="pt-3 mt-3 border-t border-slate-100 space-y-2">
                <button
                  onClick={goHome}
                  className="block w-full px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl text-center"
                >
                  Login
                </button>
                <button
                  onClick={goHome}
                  className="block w-full px-4 py-3 bg-primary text-white text-sm font-bold rounded-xl text-center hover:bg-primary-hover transition-colors"
                >
                  Get Started Free
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
      {/* Spacer to push content below the fixed navbar */}
      <div className="h-16 md:h-20" />
    </>
  );
};

export default BlogNavbar;
