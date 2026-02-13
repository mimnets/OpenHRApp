import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onLoginClick, onRegisterClick }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileOpen(false);
  };

  const navLinks = [
    { label: 'Features', id: 'features' },
    { label: 'How It Works', id: 'how-it-works' },
    { label: 'FAQ', id: 'faq' },
    { label: 'Contact', id: 'contact' },
    { label: 'Blog', id: 'blog-link' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center p-1.5">
              <img src="./img/logo.png" className="w-full h-full object-contain" alt="OpenHRApp" />
            </div>
            <span className="text-lg font-black tracking-tight">
              <span className="text-primary">Open</span>
              <span className="text-[#f59e0b]">HR</span>
              <span className="text-[#10b981]">App</span>
            </span>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(link => (
              <button
                key={link.id}
                onClick={() => {
                  if (link.id === 'blog-link') {
                    window.location.hash = '/blog';
                  } else {
                    scrollTo(link.id);
                  }
                }}
                className="text-sm font-semibold text-slate-600 hover:text-primary transition-colors"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={onLoginClick}
              className="px-5 py-2.5 text-sm font-bold text-slate-700 hover:text-primary transition-colors"
            >
              Login
            </button>
            <button
              onClick={onRegisterClick}
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
        <div className="md:hidden bg-white border-t border-slate-100 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-4 space-y-1">
            {navLinks.map(link => (
              <button
                key={link.id}
                onClick={() => {
                  if (link.id === 'blog-link') {
                    setMobileOpen(false);
                    window.location.hash = '/blog';
                  } else {
                    scrollTo(link.id);
                  }
                }}
                className="block w-full text-left px-4 py-3 text-sm font-semibold text-slate-600 hover:text-primary hover:bg-slate-50 rounded-xl transition-colors"
              >
                {link.label}
              </button>
            ))}
            <div className="pt-3 mt-3 border-t border-slate-100 space-y-2">
              <button
                onClick={() => { setMobileOpen(false); onLoginClick(); }}
                className="block w-full px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl text-center"
              >
                Login
              </button>
              <button
                onClick={() => { setMobileOpen(false); onRegisterClick(); }}
                className="block w-full px-4 py-3 bg-primary text-white text-sm font-bold rounded-xl text-center hover:bg-primary-hover transition-colors"
              >
                Get Started Free
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
