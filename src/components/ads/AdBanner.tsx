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

/** Adsterra banner sizes a key can have (Adsterra → Websites → unit). Keep in sync with migration 0045. */
export const ADSTERRA_SIZES = ['300x250', '320x50', '468x60', '728x90', '320x100'] as const;
export type AdsterraSize = typeof ADSTERRA_SIZES[number];

/**
 * Ad frame configuration, stored by Super Admin as the platform setting 'ad_frame_config' and
 * read back through the public get_ad_frame_settings() RPC (migrations 0042-0044).
 * The standalone page in ads-frame/ reads the same RPC to pick which provider to show.
 */
export interface AdFrameConfig {
  enabled: boolean;
  /** Two banner units with their real sizes; the ad page shows the largest that fits the space. */
  adsterra: { enabled: boolean; key: string; keySize: AdsterraSize; keyWide: string; keyWideSize: AdsterraSize; weight: number };
  aads: { enabled: boolean; unit: string; weight: number };
  /** img: 300x250 banner. imgWide: 728x90 banner. */
  zoho: { enabled: boolean; img: string; imgWide: string; href: string; weight: number };
  placements: Partial<Record<AdPlacement, boolean>>;
}

export const DEFAULT_AD_FRAME_CONFIG: AdFrameConfig = {
  enabled: false,
  adsterra: { enabled: false, key: '', keySize: '300x250', keyWide: '', keyWideSize: '728x90', weight: 2 },
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

/*
 * Sizing protocol. Ad networks serve fixed sizes and the app cannot see inside the cross-origin
 * frame, so it never guesses: it tells the ad page the widest ad that fits (?maxw=), the ad page
 * picks a creative and posts back the exact size it rendered ({type:'openhr-ad-size', w, h}),
 * and only then is the box shown, sized to match. No reserved blank space, and an ad wider than
 * its space (e.g. the side menu) is scaled down instead of cut off.
 */
const WIDTH_STEPS = [728, 468, 320, 300] as const;

/** Round the available width down to a standard ad width, so small resizes don't reload the ad. */
export const maxAdWidth = (containerWidth: number): number =>
  WIDTH_STEPS.find(w => containerWidth >= w) ?? Math.max(1, Math.floor(containerWidth));

export const adFrameSrcForWidth = (src: string, maxw: number): string => {
  const u = new URL(src);
  u.searchParams.set('maxw', String(maxw));
  return u.href;
};

export type AdSize2D = { w: number; h: number };

/** Accept only a well-formed size report; anything else on the message channel is ignored. */
export const readAdSizeMessage = (data: unknown): AdSize2D | null => {
  const d = data as { type?: unknown; w?: unknown; h?: unknown } | null;
  if (!d || d.type !== 'openhr-ad-size') return null;
  const ok = (n: unknown): n is number => Number.isInteger(n) && (n as number) > 0 && (n as number) <= 1000;
  return ok(d.w) && ok(d.h) ? { w: d.w, h: d.h } : null;
};

/**
 * The ad banner for one placement. In-app placements show only when the organization's
 * subscription says showAds (everyone except paid ACTIVE organizations and the demo); public
 * placements also show to anonymous visitors. Both need the Super Admin master switch, the
 * placement's own switch, and VITE_AD_FRAME_URL pointing at the ad subdomain.
 */
export const AdFrame: React.FC<{ placement: AdPlacement; className?: string }> = ({ placement, className = '' }) => {
  const { subscription } = useSubscription();
  const isPublic = AD_PLACEMENTS.find(p => p.id === placement)?.public ?? false;
  const audience = isPublic ? subscription?.showAds !== false : subscription?.showAds === true;
  const src = resolveAdFrameSrc();
  const eligible = audience && src !== null;
  const [on, setOn] = useState(false);
  const [width, setWidth] = useState<number | null>(null);
  const [ad, setAd] = useState<AdSize2D | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const frameHost = useRef<HTMLDivElement>(null);

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

  const maxw = width === null ? null : maxAdWidth(width);

  useEffect(() => {
    if (!visible || maxw === null) return;
    setAd(null); // a new maxw loads a new ad; stay collapsed until it reports its size
    const origin = new URL(src!).origin;
    const onMessage = (e: MessageEvent) => {
      // Only our own frame, from the ad origin, can size this box.
      const frame = frameHost.current?.querySelector('iframe');
      if (e.origin !== origin || !frame || e.source !== frame.contentWindow) return;
      const size = readAdSizeMessage(e.data);
      if (size) setAd(size);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [visible, maxw, src]);

  if (!visible) return null;

  // Before the report the frame loads at maxw x 250 inside a zero-height box: invisible, no gap.
  const frameW = ad?.w ?? maxw ?? 300;
  const frameH = ad?.h ?? 250;
  const scale = ad && width ? Math.min(1, width / ad.w) : 1;

  return (
    <div ref={box} className={`w-full flex justify-center ${ad ? className : ''}`}>
      <div className="overflow-hidden" style={ad ? { width: ad.w * scale, height: ad.h * scale } : { width: 0, height: 0 }}>
        <div
          ref={frameHost}
          className="relative"
          style={{ width: frameW, height: frameH, transform: `scale(${scale})`, transformOrigin: 'top left' }}
        >
          {maxw !== null && (
            // key: a new width loads a fresh ad that fits instead of resizing the old one
            <SandboxedAdFrame key={maxw} src={adFrameSrcForWidth(src!, maxw)} width={frameW} height={frameH} />
          )}
        </div>
      </div>
    </div>
  );
};
