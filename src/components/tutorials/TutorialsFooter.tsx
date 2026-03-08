import React, { useState, useEffect } from 'react';
import {
  Youtube, Facebook, Instagram, Linkedin, Twitter, Github, Share2
} from 'lucide-react';
import { socialLinksService } from '../../services/sociallinks.service';
import { SocialLink } from '../../types';
import { navigateTo } from '../../utils/seo';

const PLATFORM_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  youtube: Youtube,
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  x: Twitter,
  tiktok: Share2,
  github: Github,
};

const TutorialsFooter: React.FC = () => {
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
        { label: 'Blog', action: goToBlog },
        { label: 'Changelog', action: () => { navigateTo('/changelog'); } },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Guides', action: goToTutorials },
        { label: 'GitHub', action: () => window.open('https://github.com/mimnets/openhrapp', '_blank') },
        { label: 'Download App', action: () => { navigateTo('/download'); } },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', action: goHome },
        { label: 'Contact', action: goHome },
        { label: 'Privacy Policy', action: () => { navigateTo('/privacy'); } },
        { label: 'Terms of Service', action: () => { navigateTo('/terms'); } },
      ],
    },
  ];

  return (
    <footer className="bg-slate-900 text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4 cursor-pointer" onClick={goHome}>
              <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-sm overflow-hidden">
                <img src="/img/logo.webp" className="w-full h-full object-contain" alt="OpenHRApp" />
              </div>
              <span className="text-base font-semibold tracking-tight">
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
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide mb-4">{col.title}</h4>
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
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
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
            className="text-xs text-slate-500 hover:text-white transition-colors"
          >
            Back to top
          </button>
        </div>
      </div>
    </footer>
  );
};

export default TutorialsFooter;
