import React, { useState, useEffect } from 'react';
import {
  Youtube, Facebook, Instagram, Linkedin, Twitter, Github, Share2
} from 'lucide-react';
import { socialLinksService } from '../../services/sociallinks.service';
import { SocialLink } from '../../types';
import { navigateTo } from '../../utils/seo';
import { CONSENT_PREFERENCES_EVENT } from '../../utils/adConsent';
import { dlBrand, dlFooter } from '../shared/daylightShell';

/** Reopens the consent panel rendered by CookieConsent; no new state or router entry. */
const openConsentPreferences = (e: React.MouseEvent) => {
  e.preventDefault();
  window.dispatchEvent(new Event(CONSENT_PREFERENCES_EVENT));
};

const PLATFORM_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  youtube: Youtube,
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  x: Twitter,
  tiktok: Share2,
  github: Github,
};

const Footer: React.FC = () => {
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

  useEffect(() => {
    socialLinksService.getActiveLinks().then(setSocialLinks);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const columns = [
    {
      title: 'Product',
      links: [
        { label: 'Features', href: '/features', onClick: (e: React.MouseEvent) => { e.preventDefault(); navigateTo('/features'); } },
        { label: 'How It Works', href: '#how-it-works', onClick: (e: React.MouseEvent) => { e.preventDefault(); scrollTo('how-it-works'); } },
        { label: 'FAQ', href: '#faq', onClick: (e: React.MouseEvent) => { e.preventDefault(); scrollTo('faq'); } },
        { label: 'Blog', href: '/blog', onClick: (e: React.MouseEvent) => { e.preventDefault(); navigateTo('/blog'); } },
        { label: 'Changelog', href: '/changelog', onClick: (e: React.MouseEvent) => { e.preventDefault(); navigateTo('/changelog'); } },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Guides', href: '/how-to-use', onClick: (e: React.MouseEvent) => { e.preventDefault(); navigateTo('/how-to-use'); } },
        { label: 'GitHub', href: 'https://github.com/mimnets/openhrapp', onClick: () => {} },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', href: '/about', onClick: (e: React.MouseEvent) => { e.preventDefault(); navigateTo('/about'); } },
        { label: 'Contact', href: '/contact', onClick: (e: React.MouseEvent) => { e.preventDefault(); navigateTo('/contact'); } },
        { label: 'Privacy Policy', href: '/privacy', onClick: (e: React.MouseEvent) => { e.preventDefault(); navigateTo('/privacy'); } },
        { label: 'Terms of Service', href: '/terms', onClick: (e: React.MouseEvent) => { e.preventDefault(); navigateTo('/terms'); } },
        { label: 'Cookie & Ad Preferences', href: '#consent', onClick: openConsentPreferences },
      ],
    },
  ];

  return (
    <footer className={dlFooter.root}>
      <div className={dlFooter.inner}>
        <div className={dlFooter.grid}>
          {/* Brand Column */}
          <div className={dlFooter.brandCol}>
            <div className="flex items-center gap-2 mb-4">
              <div className={dlBrand.frameSmall}>
                <img src="/img/logo.webp" className="w-full h-full object-contain" alt="OpenHRApp" width="44" height="44" />
              </div>
              <span className={dlBrand.word}>
                <span className={dlBrand.wordOnSlab}>Open</span>
                <span className={dlBrand.wordAccentOnSlab}>HR</span>
                <span className={dlBrand.wordOnSlab}>App</span>
              </span>
            </div>
            <p className={dlFooter.blurb}>
              Modern HR management for growing teams. Open-source and free to get started.
            </p>
          </div>

          {/* Link Columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className={dlFooter.columnHead}>{col.title}</h4>
              <ul className={dlFooter.list}>
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      onClick={link.onClick}
                      className={dlFooter.link}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className={dlFooter.bottomBar}>
          <p className={dlFooter.fine}>
            &copy; {new Date().getFullYear()} OpenHRApp. All rights reserved.
          </p>

          {/* Social Links */}
          {socialLinks.length > 0 && (
            <div className="flex items-center gap-3">
              {socialLinks.map(link => {
                const Icon = PLATFORM_ICONS[link.platform] || Share2;
                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={dlFooter.social}
                    title={link.platform}
                  >
                    <Icon size={18} />
                  </a>
                );
              })}
            </div>
          )}

          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className={dlFooter.fineAction}
          >
            Back to top
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
