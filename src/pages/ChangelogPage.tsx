import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import BlogNavbar from '../components/blog/BlogNavbar';
import BlogFooter from '../components/blog/BlogFooter';
import { updatePageMeta, setJsonLd } from '../utils/seo';
import { changelog, ChangelogEntryType } from '../data/changelog';

const typeConfig: Record<ChangelogEntryType, { label: string; bg: string; text: string }> = {
  feature: { label: 'Feature', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  fix: { label: 'Fix', bg: 'bg-red-100', text: 'text-red-700' },
  improvement: { label: 'Improvement', bg: 'bg-blue-100', text: 'text-blue-700' },
  security: { label: 'Security', bg: 'bg-amber-100', text: 'text-amber-700' },
  breaking: { label: 'Breaking', bg: 'bg-purple-100', text: 'text-purple-700' },
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

interface ChangelogPageProps {
  onBack: () => void;
}

const ChangelogPage: React.FC<ChangelogPageProps> = ({ onBack }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
    updatePageMeta(
      'Changelog — What\'s New in OpenHR | OpenHRApp',
      'See all the latest updates, new features, bug fixes, and improvements to OpenHRApp. Track our development progress and stay up to date.',
      'https://openhrapp.com/changelog'
    );
    setJsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'OpenHRApp Changelog',
      description: 'Complete history of updates, features, and fixes for OpenHRApp.',
      url: 'https://openhrapp.com/changelog',
      isPartOf: { '@type': 'WebSite', name: 'OpenHRApp', url: 'https://openhrapp.com' },
    });
    return () => setJsonLd(null);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <BlogNavbar onBack={onBack} />

      {/* Hero */}
      <section className="pt-28 pb-12 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary mb-6 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Home
          </button>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
            Changelog
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl">
            All the updates, new features, and fixes shipped in OpenHRApp. We release improvements regularly to make HR management easier for your team.
          </p>
        </div>
      </section>

      {/* Timeline */}
      <section className="pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 sm:left-6 top-0 bottom-0 w-px bg-slate-200" />

            <div className="space-y-10">
              {changelog.map((release, idx) => (
                <div key={idx} className="relative pl-12 sm:pl-16">
                  {/* Dot on timeline */}
                  <div className="absolute left-2.5 sm:left-4.5 top-1.5 w-3 h-3 rounded-full bg-primary border-2 border-white ring-2 ring-primary/20" />

                  {/* Date & Title header */}
                  <div className="mb-3">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <time className="text-sm font-semibold text-slate-400">{formatDate(release.date)}</time>
                      {release.version && (
                        <span className="text-xs font-mono font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          v{release.version}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">{release.title}</h2>
                  </div>

                  {/* Entries */}
                  <ul className="space-y-2">
                    {release.entries.map((entry, eidx) => {
                      const cfg = typeConfig[entry.type];
                      return (
                        <li key={eidx} className="flex items-start gap-2.5">
                          <span className={`inline-flex items-center shrink-0 mt-0.5 px-2 py-0.5 rounded text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                            {cfg.label}
                          </span>
                          <span className="text-sm text-slate-700 leading-relaxed">{entry.description}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <BlogFooter />
    </div>
  );
};

export default ChangelogPage;
