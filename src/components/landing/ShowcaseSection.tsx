import React, { useState, useEffect } from 'react';
import { showcaseService } from '../../services/showcase.service';
import { ShowcaseOrganization } from '../../types';

const CAROUSEL_THRESHOLD = 10;

const ShowcaseSection: React.FC = () => {
  const [orgs, setOrgs] = useState<ShowcaseOrganization[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const data = await showcaseService.getActiveShowcase();
      setOrgs(data);
      setLoaded(true);
    };
    load();
  }, []);

  if (loaded && orgs.length === 0) return null;
  if (!loaded) return null;

  const useCarousel = orgs.length > CAROUSEL_THRESHOLD;

  return (
    <section className="py-16 md:py-24 bg-white overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-3">
            Trusted by organizations worldwide
          </p>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Teams that rely on OpenHR
          </h2>
        </div>

        {useCarousel ? (
          <CarouselView orgs={orgs} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8 items-center justify-items-center">
            {orgs.map(org => (
              <OrgCard key={org.id} org={org} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const CarouselView: React.FC<{ orgs: ShowcaseOrganization[] }> = ({ orgs }) => {
  // Duplicate items for seamless infinite loop
  const items = [...orgs, ...orgs];
  const duration = orgs.length * 4; // ~4s per item

  return (
    <div className="relative">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-16 md:w-24 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 md:w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

      <div className="overflow-hidden">
        <div
          className="flex gap-8 hover:[animation-play-state:paused]"
          style={{
            animation: `showcase-scroll ${duration}s linear infinite`,
            width: 'max-content'
          }}
        >
          {items.map((org, i) => (
            <div key={`${org.id}-${i}`} className="flex-shrink-0 w-36 md:w-44">
              <OrgCard org={org} />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes showcase-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

const OrgCard: React.FC<{ org: ShowcaseOrganization }> = ({ org }) => {
  const content = (
    <div className="group flex flex-col items-center gap-3 text-center">
      <LogoDisplay org={org} />
      <div>
        <p className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">
          {org.name}
        </p>
        {org.country && (
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
            {org.country}
          </p>
        )}
        {org.tagline && (
          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{org.tagline}</p>
        )}
      </div>
    </div>
  );

  if (org.websiteUrl) {
    return (
      <a href={org.websiteUrl} target="_blank" rel="noopener noreferrer" className="block">
        {content}
      </a>
    );
  }

  return content;
};

const LogoDisplay: React.FC<{ org: ShowcaseOrganization }> = ({ org }) => {
  const [imgError, setImgError] = useState(false);

  if (!org.logo || imgError) {
    return (
      <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-2xl font-black text-slate-300 group-hover:border-primary/30 group-hover:text-primary/50 transition-all">
        {org.name.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-slate-50 border border-slate-100 p-3 flex items-center justify-center group-hover:border-primary/30 group-hover:shadow-md transition-all">
      <img
        src={org.logo}
        alt={org.name}
        onError={() => setImgError(true)}
        className="max-w-full max-h-full object-contain grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
      />
    </div>
  );
};

export default ShowcaseSection;
