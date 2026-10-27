import React, { useState, useEffect, useRef } from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { supabase } from '../../services/supabase';

/** Public blog slots, rendered by PublicAdBanner. All other ads go only through AdFrame. */
export type AdSlot = 'blog-header' | 'blog-feed' | 'blog-post-top' | 'blog-post-content';
export type AdSize = '300x250' | '728x90' | '320x100' | 'text';

export interface AdConfig {
  id: string;
  slot: AdSlot;
  enabled: boolean;
  adType: 'adsense' | 'custom' | 'image';
  // For AdSense
  adsenseClient?: string;
  adsenseSlot?: string;
  // For Custom HTML
  customHtml?: string;
  // For Image ad
  imageUrl?: string;
  linkUrl?: string;
  altText?: string;
}

/**
 * Where the ad frame may appear. `public` placements are on pages without login: anonymous
 * visitors see them, signed-in users follow their organization's showAds. Keep ids in sync with
 * migration 0044 (get_ad_frame_settings whitelists them).
 */
export const AD_PLACEMENTS = [
  { id: 'employee_dashboard', label: 'Employee dashboard', public: false },
  { id: 'team_dashboards', label: 'Manager & Admin dashboards', public: false },
  { id: 'announcements', label: 'Announcements page', public: false },
  { id: 'sidebar', label: 'Side menu (hidden on attendance & leave)', public: false },
  { id: 'notifications', label: 'Notifications page', public: false },
  { id: 'settings', label: 'Profile & Settings page', public: false },
  { id: 'guides', label: 'How-to guides (public)', public: true },
  { id: 'blog', label: 'Blog (public)', public: true },
  { id: 'landing', label: 'Landing page (public)', public: true },
] as const;

export type AdPlacement = typeof AD_PLACEMENTS[number]['id'];

/**
 * Ad frame configuration, stored by Super Admin as the platform setting 'ad_frame_config' and
 * read back through the public get_ad_frame_settings() RPC (migrations 0042-0044).
 * The standalone page in ads-frame/ reads the same RPC to pick which provider to show.
 */
export interface AdFrameConfig {
  enabled: boolean;
  /** key: 300x250 banner (phones, narrow spaces). keyWide: 728x90 banner (desktop). */
  adsterra: { enabled: boolean; key: string; keyWide: string; weight: number };
  aads: { enabled: boolean; unit: string; weight: number };
  /** img: 300x250 banner. imgWide: 728x90 banner. */
  zoho: { enabled: boolean; img: string; imgWide: string; href: string; weight: number };
  placements: Partial<Record<AdPlacement, boolean>>;
}

export const DEFAULT_AD_FRAME_CONFIG: AdFrameConfig = {
  enabled: false,
  adsterra: { enabled: false, key: '', keyWide: '', weight: 2 },
  aads: { enabled: false, unit: '', weight: 1 },
  zoho: { enabled: false, img: '', imgWide: '', href: '', weight: 1 },
  placements: {},
};

/** The employee dashboard was the original placement, so it stays on unless switched off; every other placement is opt-in. */
export const isPlacementOn = (placements: AdFrameConfig['placements'] | undefined, id: AdPlacement): boolean =>
  placements?.[id] ?? id === 'employee_dashboard';

/**
 * Ad networks' scripts run only inside this frame, served from a separate origin (ads-frame/,
 * deployed to its own subdomain). The browser's same-origin policy stops that code reading the
 * dashboard DOM or the app's localStorage session, and the sandbox has no allow-top-navigation,
 * so an ad cannot redirect the app tab. Unset VITE_AD_FRAME_URL and no frame is rendered.
 */
export const resolveAdFrameSrc = (
  url: string | undefined = import.meta.env.VITE_AD_FRAME_URL,
  origin: string = window.location.origin
): string | null => {
  if (!url) return null;
  try {
    const u = new URL(url);
    // allow-same-origin below is only safe because the frame can never be the app's own origin.
    return u.protocol === 'https:' && u.origin !== origin ? u.href : null;
  } catch {
    return null;
  }
};

export const SandboxedAdFrame: React.FC<{ src: string; width: number; height: number }> = ({ src, width, height }) => (
  <>
    <iframe
      src={src}
      title="Advertisement"
      width={width}
      height={height}
      sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      loading="lazy"
      style={{ border: 0, width: '100%', height: '100%' }}
    />
    <span className="absolute top-1 left-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 pointer-events-none">
      Ad
    </span>
  </>
);

type PlacementSwitches = { enabled: boolean; placements: AdFrameConfig['placements'] };
const OFF: PlacementSwitches = { enabled: false, placements: {} };

// One request per page load, shared by every frame on the page (e.g. side menu + dashboard).
let switchesRequest: Promise<PlacementSwitches> | null = null;

/** Only the master and placement switches matter to the app; the ad page itself picks the provider. */
export const fetchAdFrameSwitches = (): Promise<PlacementSwitches> => {
  if (!switchesRequest) {
    switchesRequest = Promise.resolve(supabase.rpc('get_ad_frame_settings'))
      .then(({ data, error }) => {
        if (error || !data) throw error ?? new Error('no settings');
        const cfg = data as Partial<AdFrameConfig>;
        return { enabled: cfg.enabled === true, placements: cfg.placements ?? {} };
      })
      .catch(() => { switchesRequest = null; return OFF; }); // retry on the next mount
  }
  return switchesRequest;
};

/** Test seam: forget the cached switches. */
export const __resetAdFrameSwitchesForTests = () => { switchesRequest = null; };

// Ad networks serve fixed sizes, so "responsive" means picking one: a 728x90 leaderboard where it
// fits (desktop), otherwise the 300x250 medium rectangle, scaled down below 300px (e.g. side menu).
// Both are standard Adsterra banner sizes; each needs its own key (see AdFrameConfig).
const SIZES = {
  wide: { width: 728, height: 90 },
  small: { width: 300, height: 250 },
} as const;
type FrameSize = keyof typeof SIZES;

export const pickFrameSize = (containerWidth: number): FrameSize =>
  containerWidth >= SIZES.wide.width ? 'wide' : 'small';

/** The ad page reads ?size= to choose the matching Adsterra key / Zoho image. */
export const adFrameSrcForSize = (src: string, size: FrameSize): string => {
  const u = new URL(src);
  u.searchParams.set('size', size);
  return u.href;
};

/**
 * The ad banner for one placement. In-app placements show only when the organization's
 * subscription says showAds (everyone except paid ACTIVE organizations and the demo); public
 * placements also show to anonymous visitors. Both need the Super Admin master switch, the
 * placement's own switch, and VITE_AD_FRAME_URL pointing at the ad subdomain.
 * It picks the 728x90 or 320x100 size from the space available (see pickFrameSize).
 */
export const AdFrame: React.FC<{ placement: AdPlacement; className?: string }> = ({ placement, className = '' }) => {
  const { subscription } = useSubscription();
  const isPublic = AD_PLACEMENTS.find(p => p.id === placement)?.public ?? false;
  const audience = isPublic ? subscription?.showAds !== false : subscription?.showAds === true;
  const src = resolveAdFrameSrc();
  const eligible = audience && src !== null;
  const [on, setOn] = useState(false);
  const [width, setWidth] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!eligible) return;
    let live = true;
    fetchAdFrameSwitches().then(s => { if (live) setOn(s.enabled && isPlacementOn(s.placements, placement)); });
    return () => { live = false; };
  }, [eligible, placement]);

  const visible = eligible && on && src !== null;

  useEffect(() => {
    const el = box.current;
    if (!visible || !el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [visible]);

  if (!visible) return null;

  // Until measured (or without ResizeObserver) assume the mobile size at full scale.
  const sizeName = width === null ? 'small' : pickFrameSize(width);
  const size = SIZES[sizeName];
  const scale = width === null ? 1 : Math.min(1, width / size.width);

  return (
    <div ref={box} className={`w-full flex justify-center ${className}`} style={{ height: size.height * scale }}>
      <div style={{ width: size.width * scale, height: size.height * scale }}>
        <div
          className="relative overflow-hidden"
          style={{ width: size.width, height: size.height, transform: `scale(${scale})`, transformOrigin: 'top left' }}
        >
          {/* key: a size change loads a fresh ad of the new size instead of resizing the old one */}
          <SandboxedAdFrame key={sizeName} src={adFrameSrcForSize(src!, sizeName)} width={size.width} height={size.height} />
        </div>
      </div>
    </div>
  );
};
