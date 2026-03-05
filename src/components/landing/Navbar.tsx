import React, { useState, useEffect } from 'react';
import { Menu, X, Sun, Moon, Download, Share, MoreVertical, Smartphone } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface NavbarProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onLoginSuccess?: (user: any) => void;
}

const Navbar: React.FC<NavbarProps> = ({ onLoginClick, onRegisterClick }) => {
  const { darkMode, setDarkModePreference } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);
    setIsAndroid(/Android|HarmonyOS/i.test(ua));
    setIsInstalled(
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
    if ((window as any).deferredPWAPrompt) setCanPrompt(true);
    const handler = () => setCanPrompt(true);
    window.addEventListener('pwa-install-available', handler);
    return () => window.removeEventListener('pwa-install-available', handler);
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = (window as any).deferredPWAPrompt;
    if (promptEvent) {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        (window as any).deferredPWAPrompt = null;
        setCanPrompt(false);
      }
    } else {
      setShowInstallGuide(true);
      setMobileOpen(false);
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
            {/* Install & Download */}
            {!isInstalled && (
              <div className="pt-3 mt-3 border-t border-slate-100 space-y-2">
                <button
                  onClick={handleInstallClick}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/10 rounded-xl text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
                >
                  <Download size={18} />
                  <div className="text-left">
                    <p className="text-sm font-bold">{canPrompt ? 'Install App' : 'Install Guide'}</p>
                    <p className="text-[10px] text-slate-500 font-medium">Add to your home screen</p>
                  </div>
                </button>

                {isAndroid && (
                  <a
                    href="https://cdn.openhrapp.com/openhrapp.apk"
                    download
                    onClick={() => setMobileOpen(false)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
                  >
                    <Smartphone size={18} />
                    <div className="text-left">
                      <p className="text-sm font-bold">Download APK</p>
                      <p className="text-[10px] text-slate-400 font-medium">Android app direct download</p>
                    </div>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Install Guide Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl animate-in slide-in-from-bottom-10 border border-slate-100">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Download size={16} className="text-primary" /> Install Guide
              </h3>
              <button onClick={() => setShowInstallGuide(false)} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-900 transition-colors">
                <X size={16} />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 font-medium">Install OpenHR on your iPhone or iPad:</p>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-blue-500"><Share size={16} /></div>
                  <p className="text-xs font-bold text-slate-700">1. Tap the <span className="text-blue-600">Share</span> button in Safari</p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-900 font-bold text-sm">+</div>
                  <p className="text-xs font-bold text-slate-700">2. Select <span className="text-slate-900">Add to Home Screen</span></p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-blue-600 font-bold text-[10px]">Add</div>
                  <p className="text-xs font-bold text-slate-700">3. Tap <span className="text-blue-600">Add</span> to confirm</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 font-medium">Install OpenHR from your browser:</p>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-600"><MoreVertical size={16} /></div>
                  <p className="text-xs font-bold text-slate-700">1. Tap the <span className="text-slate-900">Menu</span> button (&#8942; or &#8943;)</p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-primary"><Download size={16} /></div>
                  <p className="text-xs font-bold text-slate-700">2. Select <span className="text-slate-900">Install App</span> or <span className="text-slate-900">Add to Home Screen</span></p>
                </div>

                {isAndroid && (
                  <div className="pt-3 mt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-500 font-medium mb-3">Or download the Android app directly:</p>
                    <a
                      href="https://cdn.openhrapp.com/openhrapp.apk"
                      download
                      onClick={() => setShowInstallGuide(false)}
                      className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                    >
                      <Download size={14} /> Download APK
                    </a>
                    <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">Enable "Install from unknown sources" if prompted. The APK auto-updates.</p>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setShowInstallGuide(false)}
              className="w-full mt-5 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
