import React, { useState, useEffect } from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { supabase } from '../../services/supabase';

/** Public blog slots, rendered by PublicAdBanner. In-app ads go only through DashboardAdFrame. */
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
 * Dashboard ad frame configuration, stored by Super Admin as the platform setting
 * 'ad_frame_config' and read back through the public get_ad_frame_settings() RPC (migration 0042).
 * The standalone page in ads-frame/ reads the same RPC to pick which provider to show.
 */
export interface AdFrameConfig {
  enabled: boolean;
  adsterra: { enabled: boolean; key: string; weight: number };
  aads: { enabled: boolean; unit: string; weight: number };
  zoho: { enabled: boolean; img: string; href: string; weight: number };
}

export const DEFAULT_AD_FRAME_CONFIG: AdFrameConfig = {
  enabled: false,
  adsterra: { enabled: false, key: '', weight: 2 },
  aads: { enabled: false, unit: '', weight: 1 },
  zoho: { enabled: false, img: '', href: '', weight: 1 },
};

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

/** Only the master switch matters to the app; the ad page itself decides which provider to show. */
export const fetchAdFrameEnabled = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('get_ad_frame_settings');
    return !error && (data as Partial<AdFrameConfig> | null)?.enabled === true;
  } catch {
    return false;
  }
};

const FRAME_WIDTH = 320;
const FRAME_HEIGHT = 100;

/**
 * The one in-app ad placement (employee dashboard). Shown to every organization whose
 * subscription says showAds (everyone except paid ACTIVE organizations), when the Super Admin
 * master switch is on and VITE_AD_FRAME_URL points at the ad subdomain.
 */
export const DashboardAdFrame: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { subscription } = useSubscription();
  const src = resolveAdFrameSrc();
  const eligible = subscription?.showAds === true && src !== null;
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!eligible) return;
    let live = true;
    fetchAdFrameEnabled().then((on) => { if (live) setEnabled(on); });
    return () => { live = false; };
  }, [eligible]);

  if (!eligible || !enabled || !src) return null;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ width: '100%', maxWidth: FRAME_WIDTH, aspectRatio: `${FRAME_WIDTH / FRAME_HEIGHT}` }}
    >
      <SandboxedAdFrame src={src} width={FRAME_WIDTH} height={FRAME_HEIGHT} />
    </div>
  );
};
