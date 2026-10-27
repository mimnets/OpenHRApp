import React, { useState, useEffect } from 'react';
import {
  Youtube, Facebook, Instagram, Linkedin, Twitter, Github, Share2
} from 'lucide-react';
import { socialLinksService } from '../../services/sociallinks.service';
import { SocialLink } from '../../types';
import { navigateTo } from '../../utils/seo';
import { dlBrand, dlFooter } from '../shared/daylightShell';

const PLATFORM_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  youtube: Youtube,
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  x: Twitter,
  tiktok: Share2,
  github: Github,
};

const BlogFooter: React.FC = () => {
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

  useEffect(() => {
    socialLinksService.getActiveLinks().then(setSocialLinks);
  }, []);

  const goHome = () => {
    navigateTo('/');
  };

  const goToBlog = () => {
    navigateTo('/blog');
  };

  const goToTutorials = () => {
    navigateTo('/how-to-use');
  };

  const columns = [
    {
      title: 'Product',
      links: [
        { label: 'Home', action: goHome },
        { label: 'Features', action: () => { navigateTo('/features'); } },
        { label: 'Pricing', action: () => { navigateTo('/pricing'); } },
        { label: 'Blog', action: goToBlog },
        { label: 'Changelog', action: () => { navigateTo('/changelog'); } },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Guides', action: goToTutorials },
        { label: 'GitHub', action: () => window.open('https://github.com/mimnets/openhrapp', '_blank') },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', action: () => { navigateTo('/about'); } },
        { label: 'Contact', action: () => { navigateTo('/contact'); } },
        { label: 'Privacy Policy', action: () => { navigateTo('/privacy'); } },
        { label: 'Terms of Service', action: () => { navigateTo('/terms'); } },
        { label: 'Refund Policy', action: () => { navigateTo('/refund'); } },
      ],
    },
  ];

  return (
    <footer className={dlFooter.root}>
      <div className={dlFooter.inner}>
        <div className={dlFooter.grid}>
          {/* Brand Column */}
          <div className={dlFooter.brandCol}>
            <div className="flex items-center gap-2 mb-4 cursor-pointer" onClick={goHome}>
              <div className={dlBrand.frameSmall}>
                <img src="/img/logo.webp" className="w-full h-full object-contain" alt="OpenHRApp" />
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
                    <button
                      onClick={link.action}
                      className={dlFooter.link}
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

export default BlogFooter;
