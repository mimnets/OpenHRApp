import React, { useState, useEffect } from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { supabase } from '../../services/supabase';
import { apiClient } from '../../services/api.client';
import { sanitizeHtml } from '../../utils/sanitize';

export type AdSlot = 'sidebar' | 'dashboard' | 'reports' | 'footer' | 'landing-hero' | 'landing-mid' | 'blog-header' | 'blog-feed' | 'blog-post-top' | 'blog-post-content' | 'attendance-success' | 'leave-success' | 'dashboard-below-cards';
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

interface AdBannerProps {
  slot: AdSlot;
  className?: string;
}

// Standard IAB ad sizes
const SLOT_SIZES: Record<AdSlot, { width: number; height: number }> = {
  sidebar: { width: 300, height: 250 },          // Medium Rectangle (IAB standard)
  dashboard: { width: 728, height: 90 },         // Leaderboard (IAB standard)
  reports: { width: 300, height: 250 },          // Medium Rectangle
  footer: { width: 728, height: 90 },            // Leaderboard
  'landing-hero': { width: 728, height: 90 },    // Leaderboard below hero
  'landing-mid': { width: 728, height: 90 },     // Leaderboard mid-page
  'blog-header': { width: 728, height: 90 },     // Leaderboard on blog listing
  'blog-feed': { width: 728, height: 90 },       // Leaderboard in blog feed
  'blog-post-top': { width: 728, height: 90 },   // Leaderboard on blog post
  'blog-post-content': { width: 300, height: 250 }, // Medium Rectangle in post
  // Phase 2A: PWA authenticated page slots
  'attendance-success': { width: 320, height: 100 }, // Large Mobile Banner (mobile-first)
  'leave-success': { width: 320, height: 100 },      // Large Mobile Banner (mobile-first)
  'dashboard-below-cards': { width: 320, height: 100 } // Large Mobile Banner (mobile-first)
};

/**
 * AdSense policy gate — plan item 27 / AC1.10, root cause F6.
 *
 * `public/robots.txt` Disallows /dashboard, /reports, /settings and friends, so Google cannot
 * crawl the pages these slots render on. Serving AdSense on pages the crawler is blocked from
 * is a publisher-policy exposure in its own right, separate from the content problem that
 * caused the original rejection.
 *
 * These slots stay dark until the re-application is approved. To restore them afterwards set
 * VITE_ENABLE_AUTHENTICATED_ADS=true — one switch, one place. Do not delete this gate and
 * scatter the decision back through the component tree.
 */
export const AUTHENTICATED_AD_SLOTS: readonly AdSlot[] = ['dashboard', 'reports', 'sidebar', 'footer'];

export const isSlotSuppressedPendingApproval = (slot: AdSlot): boolean =>
  import.meta.env.VITE_ENABLE_AUTHENTICATED_ADS !== 'true' &&
  AUTHENTICATED_AD_SLOTS.includes(slot);

/**
 * Phase 2D: Compile-time activation lock for PWA authenticated page ad slots.
 *
 * These three slots (attendance-success, leave-success, dashboard-below-cards) are defined
 * in the codebase and placed in the UI, but must NOT load or execute any provider ads until
 * this constant is explicitly set to true by a developer in source code. This is a fail-closed
 * safety gate that cannot be overridden by Supabase configuration, Super Admin UI, or
 * environment variables. It requires a source code change and redeployment to activate.
 *
 * Even if Super Admin enables these slots in the database, they will remain inert until this
 * lock is flipped. This prevents accidental activation during deployment or configuration.
 */
export const PWA_ADS_ACTIVATED = false;

export const PWA_AD_SLOTS: readonly AdSlot[] = [
  'attendance-success',
  'leave-success',
  'dashboard-below-cards'
];

export const isPwaAdSlot = (slot: AdSlot): boolean => PWA_AD_SLOTS.includes(slot);


export const AdBanner: React.FC<AdBannerProps> = ({ slot, className = '' }) => {
  const { subscription } = useSubscription();
  const [adConfig, setAdConfig] = useState<AdConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Phase 2D: Compile-time activation lock for PWA slots.
  // Even if all other conditions are met, PWA slots remain inert until PWA_ADS_ACTIVATED is true.
  // This is a fail-closed safety gate that requires source code change to activate.
  if (isPwaAdSlot(slot) && !PWA_ADS_ACTIVATED) {
    return null;
  }

  // Only show ads for AD_SUPPORTED organizations — and never on a robots.txt-Disallowed
  // authenticated route while AdSense approval is pending (item 27 / AC1.10 / F6).
  // Folding the gate into shouldShowAds suppresses the network fetch as well as the render.
  const shouldShowAds = subscription?.showAds === true && !isSlotSuppressedPendingApproval(slot);

  useEffect(() => {
    const loadAdConfig = async () => {
      console.log('[AdBanner] Loading config for slot:', slot, 'shouldShowAds:', shouldShowAds, 'subscription:', subscription);

      if (!shouldShowAds) {
        console.log('[AdBanner] Skipping - ads not enabled for this organization');
        setIsLoading(false);
        return;
      }

      try {
        const orgId = apiClient.getOrganizationId();
        const { data: setting } = await supabase
          .from('settings')
          .select('value')
          .eq('key', `ad_config_${slot}`)
          .eq('organization_id', orgId)
          .maybeSingle();

        if (setting?.value) {
          const config = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
          if (config.enabled) {
            setAdConfig(config as AdConfig);
          }
        }
      } catch (e) {
        console.log('[AdBanner] Failed to load ad config:', e);
        // Ad config not found, that's fine
      } finally {
        setIsLoading(false);
      }
    };

    loadAdConfig();
  }, [slot, shouldShowAds, subscription]);

  // Don't render if not ad-supported
  if (!shouldShowAds) return null;

  const size = SLOT_SIZES[slot];
  const aspectRatio = size.width / size.height;

  if (isLoading) {
    return (
      <div
        className={`${className} animate-pulse rounded-lg bg-slate-100`}
        style={{
          width: '100%',
          maxWidth: size.width,
          aspectRatio: `${aspectRatio}`,
        }}
      />
    );
  }

  if (!adConfig?.enabled) return null;

  // Render based on ad type
  const renderAd = () => {
    switch (adConfig.adType) {
      case 'adsense':
        if (!adConfig.adsenseClient || !adConfig.adsenseSlot) return null;
        return (
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '100%', height: '100%' }}
            data-ad-client={adConfig.adsenseClient}
            data-ad-slot={adConfig.adsenseSlot}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        );

      case 'custom':
        if (!adConfig.customHtml) return null;
        return (
          <div
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(adConfig.customHtml) }}
            style={{ width: '100%', height: '100%', overflow: 'hidden' }}
          />
        );

      case 'image':
        if (!adConfig.imageUrl) return null;
        const imgContent = (
          <img
            src={adConfig.imageUrl}
            alt={adConfig.altText || 'Advertisement'}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            className="rounded-lg"
          />
        );
        if (adConfig.linkUrl) {
          // Ensure URL has protocol to prevent relative navigation
          let finalUrl = adConfig.linkUrl;
          if (finalUrl && !finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
            finalUrl = 'https://' + finalUrl;
          }
          return (
            <a
              href={finalUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="block w-full h-full"
              onClick={(e) => {
                e.stopPropagation();
                window.open(finalUrl, '_blank', 'noopener,noreferrer');
                e.preventDefault();
              }}
            >
              {imgContent}
            </a>
          );
        }
        return imgContent;

      default:
        return null;
    }
  };

  const adContent = renderAd();
  if (!adContent) return null;

  return (
    <div
      className={`ad-banner ad-slot-${slot} ${className} relative overflow-hidden`}
      style={{
        width: '100%',
        maxWidth: size.width,
        aspectRatio: `${aspectRatio}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {adContent}
      <span className="text-[9px] text-slate-400 absolute bottom-1 right-2">Ad</span>
    </div>
  );
};

// Placeholder component for showing where ads will appear (for admins)
export const AdPlaceholder: React.FC<{ slot: AdSlot; onClick?: () => void }> = ({ slot, onClick }) => {
  const size = SLOT_SIZES[slot];

  return (
    <div
      onClick={onClick}
      className="border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary-light/20 transition-all max-w-full"
      style={{ width: size.width, height: size.height }}
    >
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ad Slot</span>
      <span className="text-[10px] text-slate-400">{slot} ({size.width}x{size.height})</span>
    </div>
  );
};
