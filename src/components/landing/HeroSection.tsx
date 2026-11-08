import React, { useState, useEffect } from 'react';
import { ArrowRight, Clock, CreditCard, Zap, LogIn, Download, Share, MoreVertical, X, Play } from 'lucide-react';
import DemoLoginModal from './DemoLoginModal';
import ShiftArc from './ShiftArc';

interface HeroSectionProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onLoginSuccess?: (user: any) => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onLoginClick, onRegisterClick }) => {
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [_canPrompt, setCanPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [_isInstalled, setIsInstalled] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [playVideo, setPlayVideo] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);
    setIsInstalled(
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
    if ((window as any).deferredPWAPrompt) setCanPrompt(true);
    const handler = () => setCanPrompt(true);
    window.addEventListener('pwa-install-available', handler);
    return () => window.removeEventListener('pwa-install-available', handler);
  }, []);

  // (install handler removed — PWA prompt is managed by the browser)

  const handleDemoClick = () => {
    setShowDemoModal(true);
  };

  return (
    <section className="relative pt-28 md:pt-36 pb-16 md:pb-24 overflow-hidden bg-dl-ground">
      {/* Background gradients */}
      <div className="absolute top-0 right-[-20%] w-[60%] h-[60%] bg-dl-teal/5 blur-[120px] rounded-full -z-10"></div>
      <div className="absolute bottom-0 left-[-10%] w-[40%] h-[40%] bg-dl-ink/5 blur-[100px] rounded-full -z-10"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Mobile: CTA Buttons */}
          <div className="sm:hidden mb-8 flex flex-col gap-3">
            <button
              onClick={onLoginClick}
              className="w-full py-3.5 bg-dl-ink text-dl-surface rounded-dl-md font-bold text-dl-sm hover:opacity-90 transition-all shadow-dl-2 flex items-center justify-center gap-2"
            >
              <LogIn size={18} /> Login to Your Account
            </button>
            <button
              onClick={handleDemoClick}
              className="dl-cta-ring w-full py-3.5 text-dl-teal rounded-dl-md font-bold text-dl-sm transition-all flex items-center justify-center gap-2"
            >
              <span className="dl-cta-dots" aria-hidden="true">
                <i className="dl-cta-dot dl-cta-dot--red" />
                <i className="dl-cta-dot dl-cta-dot--green" />
              </span>
              <Play size={18} />
              Try Live Demo →
            </button>
            <button
              onClick={onRegisterClick}
              className="dl-cta-pulse w-full py-3.5 bg-dl-teal text-dl-surface rounded-dl-md font-bold text-dl-sm hover:bg-dl-teal-deep transition-all shadow-dl-1 flex items-center justify-center gap-2"
            >
              Get Started Free <ArrowRight size={18} />
            </button>
          </div>

          {/* Mobile demo disclaimer */}
          <p className="sm:hidden text-dl-xs text-dl-muted text-center mb-4">
            Demo resets daily. No data saved.
          </p>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-dl-teal/5 border border-dl-teal/15 rounded-full mb-6">
            <div className="w-2 h-2 bg-dl-teal rounded-full"></div>
            <span className="text-dl-xs font-bold text-dl-teal uppercase tracking-dl-label">Free & Open-Source HR Platform</span>
          </div>

          {/* Headline */}
          <h1 className="font-dl-display text-4xl sm:text-5xl lg:text-6xl font-semibold text-dl-ink tracking-dl-display leading-[1.1] mb-6">
            Modern HR Management{' '}
            <span className="text-dl-teal">Made Simple</span>
          </h1>

          {/* Subtext */}
          <p className="text-dl-lg sm:text-dl-xl text-dl-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            OpenHRApp is a free, open-source HR management platform trusted by growing teams worldwide. Track attendance with selfie-based check-ins, manage leave requests with one click, and keep employee records organized — all from one intuitive dashboard. No downloads, no credit card — get started in minutes.
          </p>

          {/* Desktop: CTA Buttons */}
          <div className="hidden sm:flex items-center justify-center gap-4 mb-12">
            <button
              onClick={onLoginClick}
              className="px-8 py-4 bg-dl-ink text-dl-surface font-bold text-dl-sm rounded-dl-md hover:opacity-90 transition-all shadow-dl-2 flex items-center justify-center gap-2"
            >
              <LogIn size={18} /> Login to Your Account
            </button>
            <button
              onClick={handleDemoClick}
              className="dl-cta-ring px-8 py-4 text-dl-teal font-bold text-dl-sm rounded-dl-md transition-all flex items-center justify-center gap-2"
            >
              <span className="dl-cta-dots" aria-hidden="true">
                <i className="dl-cta-dot dl-cta-dot--red" />
                <i className="dl-cta-dot dl-cta-dot--green" />
              </span>
              <Play size={18} />
              Try Live Demo →
            </button>
            <button
              onClick={onRegisterClick}
              className="dl-cta-pulse px-8 py-4 bg-dl-teal text-dl-surface font-bold text-dl-sm rounded-dl-md hover:bg-dl-teal-deep transition-all shadow-dl-1 flex items-center justify-center gap-2"
            >
              Get Started Free <ArrowRight size={18} />
            </button>
          </div>

          {/* Desktop demo disclaimer */}
          <p className="hidden sm:block text-dl-xs text-dl-muted mb-12">
            Demo resets daily. No data saved.
          </p>

          {/* The shift arc — Daylight's motif, and the only page it appears on (AC-DL2). */}
          <div className="mb-10">
            <ShiftArc />
            <p className="mt-5 text-dl-sm text-dl-muted max-w-xl mx-auto leading-relaxed">
              That arc is a working day: a check-in at dawn, a check-out at dusk, and the hours
              in between that payroll and compliance both depend on. Recording it accurately is
              the whole job — everything else OpenHRApp does is built on getting those two
              timestamps right.
            </p>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 mb-16">
            <div className="flex items-center gap-2 text-dl-muted">
              <Clock size={16} className="text-dl-teal" />
              <span className="text-dl-xs font-semibold">Free forever</span>
            </div>
            <div className="flex items-center gap-2 text-dl-muted">
              <CreditCard size={16} className="text-dl-teal" />
              <span className="text-dl-xs font-semibold">No credit card required</span>
            </div>
            <div className="flex items-center gap-2 text-dl-muted">
              <Zap size={16} className="text-dl-teal" />
              <span className="text-dl-xs font-semibold">Setup in 5 minutes</span>
            </div>
          </div>

          {/* Video Intro */}
          <div className="relative max-w-4xl mx-auto mb-16">
            <h2 className="font-dl-display text-dl-xl sm:text-dl-2xl font-semibold text-dl-ink tracking-dl-head mb-6">See OpenHRApp in Action</h2>
            <div className="rounded-dl-lg overflow-hidden shadow-dl-2 border border-dl-hair">
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                {/* The YouTube player is heavy on phones, so it loads only when asked for. */}
                {playVideo ? (
                  <iframe
                    className="absolute top-0 left-0 w-full h-full"
                    src="https://www.youtube.com/embed/Wb-4mt90IFU?autoplay=1"
                    title="OpenHRApp Introduction"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  ></iframe>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPlayVideo(true)}
                    aria-label="Play the OpenHRApp introduction video"
                    className="absolute inset-0 w-full h-full group"
                  >
                    <img
                      src="https://i.ytimg.com/vi/Wb-4mt90IFU/hqdefault.jpg"
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="w-16 h-16 rounded-full bg-dl-ink/80 text-white flex items-center justify-center group-hover:bg-dl-ink transition-colors">
                        <Play size={28} fill="currentColor" />
                      </span>
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
      {/* Install Guide Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-[60] bg-dl-ink/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-dl-surface w-full max-w-sm rounded-dl-lg p-6 shadow-dl-2 animate-in slide-in-from-bottom-10 border border-dl-hair">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-dl-display text-dl-sm font-semibold text-dl-ink flex items-center gap-2">
                <Download size={16} className="text-dl-teal" /> Install Guide
              </h3>
              <button onClick={() => setShowInstallGuide(false)} className="p-2 bg-dl-surface-2 rounded-full text-dl-muted hover:bg-dl-hair-soft hover:text-dl-ink transition-colors">
                <X size={16} />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3">
                <p className="text-dl-xs text-dl-muted font-medium">Install OpenHRApp on your iPhone or iPad:</p>
                <div className="flex items-center gap-3 p-3 bg-dl-surface-2 rounded-dl-md">
                  <div className="w-8 h-8 rounded-dl-sm bg-dl-surface shadow-dl-1 flex items-center justify-center text-dl-teal"><Share size={16} /></div>
                  <p className="text-dl-xs font-semibold text-dl-ink">1. Tap the <span className="text-dl-teal">Share</span> button in Safari</p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-dl-surface-2 rounded-dl-md">
                  <div className="w-8 h-8 rounded-dl-sm bg-dl-surface shadow-dl-1 flex items-center justify-center text-dl-ink font-bold text-dl-sm">+</div>
                  <p className="text-dl-xs font-semibold text-dl-ink">2. Select <span className="text-dl-ink">Add to Home Screen</span></p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-dl-surface-2 rounded-dl-md">
                  <div className="w-8 h-8 rounded-dl-sm bg-dl-surface shadow-dl-1 flex items-center justify-center text-dl-teal font-bold text-[10px]">Add</div>
                  <p className="text-dl-xs font-semibold text-dl-ink">3. Tap <span className="text-dl-teal">Add</span> to confirm</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-dl-xs text-dl-muted font-medium">Install OpenHRApp from your browser:</p>
                <div className="flex items-center gap-3 p-3 bg-dl-surface-2 rounded-dl-md">
                  <div className="w-8 h-8 rounded-dl-sm bg-dl-surface shadow-dl-1 flex items-center justify-center text-dl-muted"><MoreVertical size={16} /></div>
                  <p className="text-dl-xs font-semibold text-dl-ink">1. Tap the <span className="text-dl-ink">Menu</span> button (&#8942; or &#8943;)</p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-dl-surface-2 rounded-dl-md">
                  <div className="w-8 h-8 rounded-dl-sm bg-dl-surface shadow-dl-1 flex items-center justify-center text-dl-teal"><Download size={16} /></div>
                  <p className="text-dl-xs font-semibold text-dl-ink">2. Select <span className="text-dl-ink">Install App</span> or <span className="text-dl-ink">Add to Home Screen</span></p>
                </div>

              </div>
            )}

            <button
              onClick={() => setShowInstallGuide(false)}
              className="w-full mt-5 py-3 bg-dl-teal text-dl-surface rounded-dl-md font-bold text-dl-sm hover:bg-dl-teal-deep transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Demo Accounts Modal */}
      <DemoLoginModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        onOpenLoginPage={onLoginClick}
      />
    </section>
  );
};

export default HeroSection;
