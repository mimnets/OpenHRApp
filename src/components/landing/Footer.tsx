import React, { useState, useEffect } from 'react';
import {
  Youtube, Facebook, Instagram, Linkedin, Twitter, Github, Share2
} from 'lucide-react';
import { socialLinksService } from '../../services/sociallinks.service';
import { SocialLink } from '../../types';

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
        { label: 'Features', action: () => scrollTo('features') },
        { label: 'How It Works', action: () => scrollTo('how-it-works') },
        { label: 'FAQ', action: () => scrollTo('faq') },
        { label: 'Blog', action: () => { window.location.hash = '/blog'; } },
        { label: 'Download App', action: () => { window.history.pushState(null, '', '/download'); window.dispatchEvent(new PopStateEvent('popstate')); } },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Guides', action: () => { window.location.hash = '/how-to-use'; } },
        { label: 'GitHub', action: () => window.open('https://github.com/mimnets/openhrapp', '_blank') },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', action: () => scrollTo('features') },
        { label: 'Contact', action: () => scrollTo('contact') },
        { label: 'Privacy Policy', action: () => { window.history.pushState(null, '', '/privacy'); window.dispatchEvent(new PopStateEvent('popstate')); } },
        { label: 'Terms of Service', action: () => { window.history.pushState(null, '', '/terms'); window.dispatchEvent(new PopStateEvent('popstate')); } },
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
                <img src="./img/logo.webp" className="w-full h-full object-contain" alt="OpenHRApp" />
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

export default Footer;
