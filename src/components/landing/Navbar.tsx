import React, { useState, useEffect } from 'react';
import { Menu, X, Sun, Moon, Search } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useSearch } from '../../context/SearchContext';
import { navigateTo } from '../../utils/seo';

interface NavbarProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onLoginSuccess?: (user: any) => void;
}

const Navbar: React.FC<NavbarProps> = ({ onLoginClick, onRegisterClick }) => {
  const { darkMode, setDarkModePreference } = useTheme();
  const { setSearchOpen } = useSearch();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggleDarkMode = () => {
    setDarkModePreference(darkMode ? 'light' : 'dark');
  };

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
    { label: 'Features', id: 'features-link' },
    { label: 'Roadmap', id: 'how-it-works' },
    { label: 'FAQ', id: 'faq' },
    { label: 'Contact', id: 'contact' },
    { label: 'Blog', id: 'blog-link' },
    { label: 'Guides', id: 'tutorials-link' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1.5 border border-primary/20 shadow-sm overflow-hidden">
              <img src="/img/logo.webp" className="w-full h-full object-contain" alt="OpenHRApp" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              <span className="text-primary">Open</span>
              <span className="text-[#f59e0b]">HR</span>
              <span className="text-[#10b981]">App</span>
            </span>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-5 lg:gap-7">
            {navLinks.map(link => (
              <button
                key={link.id}
                onClick={() => {
                  if (link.id === 'blog-link') {
                    navigateTo('/blog');
                  } else if (link.id === 'tutorials-link') {
                    navigateTo('/how-to-use');
                  } else if (link.id === 'features-link') {
                    navigateTo('/features');
                  } else {
                    scrollTo(link.id);
                  }
                }}
                className="text-sm font-semibold text-slate-600 hover:text-primary transition-colors"
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
            >
              <Search size={14} />
              <span>Search...</span>
              <kbd className="text-[10px] font-medium text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">Ctrl+K</kbd>
            </button>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleDarkMode}
              className="p-2.5 rounded-xl text-slate-500 hover:text-primary hover:bg-slate-100 transition-all"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={onLoginClick}
              className="px-5 py-2.5 text-sm font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200"
            >
              Login
            </button>
            <button
              onClick={onRegisterClick}
              className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-hover transition-colors shadow-sm"
            >
              Get Started Free
            </button>
          </div>

          {/* Mobile Actions */}
          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 text-slate-500 hover:text-primary transition-colors"
              title="Search"
            >
              <Search size={20} />
            </button>
            <button
              onClick={toggleDarkMode}
              className="p-2 text-slate-500 hover:text-primary transition-colors"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 text-slate-600 hover:text-primary transition-colors"
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
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
                    navigateTo('/blog');
                  } else if (link.id === 'tutorials-link') {
                    setMobileOpen(false);
                    navigateTo('/how-to-use');
                  } else {
                    scrollTo(link.id);
                  }
                }}
                className="block w-full text-left px-4 py-3 text-sm font-semibold text-slate-600 hover:text-primary hover:bg-slate-50 rounded-xl transition-colors"
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
