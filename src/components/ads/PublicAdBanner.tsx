import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api.client';
import { AdConfig, AdSlot } from './AdBanner';

interface PublicAdBannerProps {
  slot: AdSlot;
  className?: string;
}

const SLOT_SIZES: Record<string, { width: number; height: number }> = {
  'landing-hero': { width: 728, height: 90 },
  'landing-mid': { width: 728, height: 90 },
  'blog-header': { width: 728, height: 90 },
  'blog-feed': { width: 728, height: 90 },
  'blog-post-top': { width: 728, height: 90 },
  'blog-post-content': { width: 300, height: 250 },
};

export const PublicAdBanner: React.FC<PublicAdBannerProps> = ({ slot, className = '' }) => {
  const [adConfig, setAdConfig] = useState<AdConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAdConfig = async () => {
      try {
        const response = await apiClient.pb?.send(`/api/openhr/public-ad-config/${slot}`, {
          method: 'GET'
        });

        if (response && response.enabled) {
          setAdConfig(response as AdConfig);
        }
      } catch (e) {
        // Ad config not found, silently fail
      } finally {
        setIsLoading(false);
      }
    };

    loadAdConfig();
  }, [slot]);

  const size = SLOT_SIZES[slot] || { width: 728, height: 90 };
  const aspectRatio = size.width / size.height;

  if (isLoading) {
    return (
      <div
        className={`${className} mx-auto animate-pulse rounded-lg bg-slate-100`}
        style={{
          width: '100%',
          maxWidth: size.width,
          aspectRatio: `${aspectRatio}`,
        }}
      />
    );
  }

  if (!adConfig?.enabled) return null;

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
            dangerouslySetInnerHTML={{ __html: adConfig.customHtml }}
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
      className={`ad-banner ad-slot-${slot} ${className} relative overflow-hidden mx-auto`}
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
