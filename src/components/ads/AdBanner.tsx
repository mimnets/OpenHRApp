import React, { useState, useEffect } from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { apiClient } from '../../services/api.client';

export type AdSlot = 'sidebar' | 'dashboard' | 'reports' | 'footer';
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
  sidebar: { width: 300, height: 250 },   // Medium Rectangle (IAB standard)
  dashboard: { width: 728, height: 90 },  // Leaderboard (IAB standard)
  reports: { width: 300, height: 250 },   // Medium Rectangle
  footer: { width: 728, height: 90 }      // Leaderboard
};


export const AdBanner: React.FC<AdBannerProps> = ({ slot, className = '' }) => {
  const { subscription } = useSubscription();
  const [adConfig, setAdConfig] = useState<AdConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Only show ads for AD_SUPPORTED organizations
  const shouldShowAds = subscription?.showAds === true;

  useEffect(() => {
    const loadAdConfig = async () => {
      console.log('[AdBanner] Loading config for slot:', slot, 'shouldShowAds:', shouldShowAds, 'subscription:', subscription);

      if (!shouldShowAds) {
        console.log('[AdBanner] Skipping - ads not enabled for this organization');
        setIsLoading(false);
        return;
      }

      try {
        // Use the dedicated ad-config endpoint which bypasses org-based filtering
        const response = await apiClient.pb?.send(`/api/openhr/ad-config/${slot}`, {
          method: 'GET'
        });

        console.log('[AdBanner] API response for slot', slot, ':', response);

        if (response && response.enabled) {
          setAdConfig(response as AdConfig);
        } else {
          console.log('[AdBanner] Ad not enabled or no config:', response?.reason || 'enabled=false');
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

  // Don't render if not ad-supported or ad is disabled
  if (!shouldShowAds || isLoading) return null;
  if (!adConfig?.enabled) return null;

  const size = SLOT_SIZES[slot];

  // Render based on ad type
  const renderAd = () => {
    switch (adConfig.adType) {
      case 'adsense':
        if (!adConfig.adsenseClient || !adConfig.adsenseSlot) return null;
        return (
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: size.width, height: size.height }}
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
            dangerouslySetInnerHTML={{ __html: adConfig.customHtml }}
            style={{ width: size.width, height: size.height }}
          />
        );

      case 'image':
        if (!adConfig.imageUrl) return null;
        const imgContent = (
          <img
            src={adConfig.imageUrl}
            alt={adConfig.altText || 'Advertisement'}
            style={{ width: size.width, height: size.height, objectFit: 'cover' }}
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

  // Make leaderboard ads (728x90) responsive on smaller screens
  const isLeaderboard = slot === 'dashboard' || slot === 'footer';

  return (
    <div
      className={`ad-banner ad-slot-${slot} ${className} relative ${isLeaderboard ? 'max-w-full overflow-hidden' : ''}`}
      style={{
        width: size.width,
        maxWidth: isLeaderboard ? '100%' : size.width,
        minHeight: size.height,
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
      className="border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary-light/20 transition-all"
      style={{ width: size.width, height: size.height }}
    >
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ad Slot</span>
      <span className="text-[10px] text-slate-400">{slot} ({size.width}x{size.height})</span>
    </div>
  );
};
