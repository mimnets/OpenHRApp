import React, { useState, useEffect } from 'react';
import { Menu, X, Sun, Moon, Search } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useSearch } from '../../context/SearchContext';
import { navigateTo } from '../../utils/seo';
import { dlShell, dlBrand, dlNav } from '../shared/daylightShell';

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
    { label: 'Features', href: '/features', type: 'page' as const },
    { label: 'Pricing', href: '/pricing', type: 'page' as const },
    { label: 'How It Works', href: '#how-it-works', type: 'hash' as const },
    { label: 'FAQ', href: '#faq', type: 'hash' as const },
    { label: 'Contact', href: '/contact', type: 'page' as const },
    { label: 'Blog', href: '/blog', type: 'page' as const },
    { label: 'Guides', href: '/how-to-use', type: 'page' as const },
  ];

  return (
    <nav className={`${dlShell.navFloating} ${isScrolled ? dlShell.navFloatingScrolled : dlShell.navFloatingAtTop}`}>
      <div className={dlShell.inner}>
        <div className={dlShell.row}>
          {/* Logo */}
          <div className={dlBrand.trigger} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className={dlBrand.frame}>
              <img src="/img/logo.webp" className="w-full h-full object-contain" alt="OpenHRApp" width="48" height="48" />
            </div>
            <span className={dlBrand.word}>
              <span className={dlBrand.wordInk}>Open</span>
              <span className={dlBrand.wordAccent}>HR</span>
              <span className={dlBrand.wordInk}>App</span>
            </span>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-5 lg:gap-7">
            {navLinks.map(link => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => {
                  if (link.type === 'page') {
                    e.preventDefault();
                    navigateTo(link.href);
                  } else {
                    e.preventDefault();
                    scrollTo(link.href.slice(1));
                  }
                }}
                className={dlNav.link}
              >
                {link.label}
              </a>
            ))}
            <button
              onClick={() => setSearchOpen(true)}
              className={dlNav.searchTrigger}
              aria-label="Search (Ctrl+K)"
            >
              <Search size={14} />
              <span>Search…</span>
              <kbd className={dlNav.searchKbd}>Ctrl+K</kbd>
            </button>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleDarkMode}
              className={dlNav.iconButton}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={onLoginClick}
              className={dlNav.buttonQuiet}
            >
              Login
            </button>
            <button
              onClick={onRegisterClick}
              className={dlNav.buttonPrimary}
            >
              Get Started Free
            </button>
          </div>

          {/* Mobile Actions */}
          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={() => setSearchOpen(true)}
              className={dlNav.iconButtonCompact}
              aria-label="Search"
            >
              <Search size={20} />
            </button>
            <button
              onClick={toggleDarkMode}
              className={dlNav.iconButtonCompact}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className={dlNav.iconButtonCompact}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className={`${dlNav.mobilePanel} animate-in slide-in-from-top-2 duration-200`}>
          <div className={dlNav.mobilePanelInner}>
            {navLinks.map(link => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  setMobileOpen(false);
                  if (link.type === 'page') {
                    navigateTo(link.href);
                  } else {
                    scrollTo(link.href.slice(1));
                  }
                }}
                className={dlNav.mobileLink}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
