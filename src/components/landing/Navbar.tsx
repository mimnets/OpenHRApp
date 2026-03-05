import React, { useState, useEffect } from 'react';
import { Menu, X, Sun, Moon, Mail, Lock, Eye, EyeOff, LogIn, RefreshCw, AlertCircle, Building2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { hrService } from '../../services/hrService';

interface NavbarProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onLoginSuccess?: (user: any) => void;
}

const Navbar: React.FC<NavbarProps> = ({ onLoginClick, onRegisterClick, onLoginSuccess }) => {
  const { darkMode, setDarkModePreference } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileEmail, setMobileEmail] = useState('');
  const [mobilePassword, setMobilePassword] = useState('');
  const [mobileShowPw, setMobileShowPw] = useState(false);
  const [mobileError, setMobileError] = useState('');
  const [mobileLoading, setMobileLoading] = useState(false);

  const handleMobileLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobileEmail || !mobilePassword) return;
    setMobileLoading(true);
    setMobileError('');
    try {
      const result = await hrService.login(mobileEmail, mobilePassword);
      if (result.user) {
        setMobileOpen(false);
        onLoginSuccess?.(result.user);
      } else {
        setMobileError(result.error || 'Login failed.');
      }
    } catch (err: any) {
      setMobileError(err.message || 'Something went wrong.');
    } finally {
      setMobileLoading(false);
    }
  };

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
    { label: 'Features', id: 'features' },
    { label: 'How It Works', id: 'how-it-works' },
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
              <img src="./img/logo.webp" className="w-full h-full object-contain" alt="OpenHRApp" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
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
                  } else if (link.id === 'tutorials-link') {
                    window.location.hash = '/how-to-use';
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
                    window.location.hash = '/blog';
                  } else if (link.id === 'tutorials-link') {
                    setMobileOpen(false);
                    window.location.hash = '/how-to-use';
                  } else {
                    scrollTo(link.id);
                  }
                }}
                className="block w-full text-left px-4 py-3 text-sm font-semibold text-slate-600 hover:text-primary hover:bg-slate-50 rounded-xl transition-colors"
              >
                {link.label}
              </button>
            ))}
            <div className="pt-3 mt-3 border-t border-slate-100">
              <form onSubmit={handleMobileLogin} className="space-y-2.5" autoComplete="on">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    value={mobileEmail}
                    onChange={e => setMobileEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 placeholder:text-slate-400"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type={mobileShowPw ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    required
                    value={mobilePassword}
                    onChange={e => setMobilePassword(e.target.value)}
                    placeholder="Password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 placeholder:text-slate-400"
                  />
                  <button type="button" onClick={() => setMobileShowPw(!mobileShowPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5">
                    {mobileShowPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {mobileError && (
                  <div className="flex items-center gap-2 p-2 bg-rose-50 border border-rose-100 rounded-xl">
                    <AlertCircle size={13} className="text-rose-500 flex-shrink-0" />
                    <p className="text-[11px] font-semibold text-rose-600">{mobileError}</p>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={mobileLoading}
                  className="w-full py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {mobileLoading ? <RefreshCw size={15} className="animate-spin" /> : <><LogIn size={15} /> Login</>}
                </button>
                <button
                  type="button"
                  onClick={() => { setMobileOpen(false); onRegisterClick(); }}
                  className="w-full py-2.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl font-semibold text-xs hover:bg-white hover:border-slate-300 transition-all flex items-center justify-center gap-2"
                >
                  <Building2 size={14} /> Register New Organization
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
