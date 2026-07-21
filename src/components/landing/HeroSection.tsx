import React, { useState, useEffect } from 'react';
import { ArrowRight, Clock, CreditCard, Zap, LogIn, Download, RotateCcw, Share, MoreVertical, X, Play } from 'lucide-react';
import DemoLoginModal from './DemoLoginModal';

interface HeroSectionProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onLoginSuccess?: (user: any) => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onLoginClick, onRegisterClick }) => {
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);

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

  const handleInstallClick = async () => {
    const promptEvent = (window as any).deferredPWAPrompt;
    if (promptEvent) {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        (window as any).deferredPWAPrompt = null;
        setCanPrompt(false);
      }
    } else {
      setShowInstallGuide(true);
    }
  };

  const handleDemoClick = () => {
    setShowDemoModal(true);
  };

  return (
    <section className="relative pt-28 md:pt-36 pb-16 md:pb-24 overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 right-[-20%] w-[60%] h-[60%] bg-primary/5 blur-[120px] rounded-full -z-10"></div>
      <div className="absolute bottom-0 left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[100px] rounded-full -z-10"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Mobile: CTA Buttons */}
          <div className="sm:hidden mb-8 flex flex-col gap-3">
            <button
              onClick={onLoginClick}
              className="w-full py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2"
            >
              <LogIn size={18} /> Login to Your Account
            </button>
            <button
              onClick={handleDemoClick}
              className="w-full py-3.5 border-2 border-primary/30 text-primary rounded-2xl font-bold text-sm hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
            >
              <Play size={18} />
              Try Live Demo →
            </button>
            <button
              onClick={onRegisterClick}
              className="w-full py-3.5 bg-primary text-white rounded-2xl font-bold text-sm hover:bg-primary-hover transition-all shadow-sm flex items-center justify-center gap-2"
            >
              Get Started Free <ArrowRight size={18} />
            </button>
          </div>

          {/* Mobile demo disclaimer */}
          <p className="sm:hidden text-xs text-slate-400 text-center mb-4">
            Demo resets daily. No data saved.
          </p>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/10 rounded-full mb-6">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-bold text-primary">Free & Open-Source HR Platform</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-slate-900 tracking-tight leading-[1.1] mb-6">
            Modern HR Management{' '}
            <span className="text-primary">Made Simple</span>
          </h1>

          {/* Subtext */}
          <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            OpenHRApp is a free, open-source HR management platform trusted by growing teams worldwide. Track attendance with selfie-based check-ins, manage leave requests with one click, and keep employee records organized — all from one intuitive dashboard. No downloads, no credit card — get started in minutes.
          </p>

          {/* Desktop: CTA Buttons */}
          <div className="hidden sm:flex items-center justify-center gap-4 mb-12">
            <button
              onClick={onLoginClick}
              className="px-8 py-4 bg-slate-900 text-white font-bold text-sm rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2"
            >
              <LogIn size={18} /> Login to Your Account
            </button>
            <button
              onClick={handleDemoClick}
              className="px-8 py-4 border-2 border-primary/30 text-primary font-bold text-sm rounded-2xl hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
            >
              <Play size={18} />
              Try Live Demo →
            </button>
            <button
              onClick={onRegisterClick}
              className="px-8 py-4 bg-primary text-white font-bold text-sm rounded-2xl hover:bg-primary-hover transition-all shadow-sm flex items-center justify-center gap-2"
            >
              Get Started Free <ArrowRight size={18} />
            </button>
          </div>

          {/* Desktop demo disclaimer */}
          <p className="hidden sm:block text-xs text-slate-400 mb-12">
            Demo resets daily. No data saved.
          </p>

          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 mb-16">
            <div className="flex items-center gap-2 text-slate-400">
              <Clock size={16} className="text-emerald-500" />
              <span className="text-xs font-semibold">Free forever</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <CreditCard size={16} className="text-emerald-500" />
              <span className="text-xs font-semibold">No credit card required</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Zap size={16} className="text-emerald-500" />
              <span className="text-xs font-semibold">Setup in 5 minutes</span>
            </div>
          </div>

          {/* Video Intro */}
          <div className="relative max-w-4xl mx-auto mb-16">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-6">See OpenHRApp in Action</h2>
            <div className="rounded-2xl overflow-hidden shadow-xl shadow-slate-900/10 border border-slate-200/60">
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  className="absolute top-0 left-0 w-full h-full"
                  src="https://www.youtube.com/embed/Wb-4mt90IFU"
                  title="OpenHRApp Introduction"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          </div>

        </div>
      </div>
      {/* Install Guide Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl animate-in slide-in-from-bottom-10 border border-slate-100">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Download size={16} className="text-primary" /> Install Guide
              </h3>
              <button onClick={() => setShowInstallGuide(false)} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-900 transition-colors">
                <X size={16} />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 font-medium">Install OpenHRApp on your iPhone or iPad:</p>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-blue-500"><Share size={16} /></div>
                  <p className="text-xs font-bold text-slate-700">1. Tap the <span className="text-blue-600">Share</span> button in Safari</p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-900 font-bold text-sm">+</div>
                  <p className="text-xs font-bold text-slate-700">2. Select <span className="text-slate-900">Add to Home Screen</span></p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-blue-600 font-bold text-[10px]">Add</div>
                  <p className="text-xs font-bold text-slate-700">3. Tap <span className="text-blue-600">Add</span> to confirm</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 font-medium">Install OpenHRApp from your browser:</p>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-600"><MoreVertical size={16} /></div>
                  <p className="text-xs font-bold text-slate-700">1. Tap the <span className="text-slate-900">Menu</span> button (&#8942; or &#8943;)</p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-primary"><Download size={16} /></div>
                  <p className="text-xs font-bold text-slate-700">2. Select <span className="text-slate-900">Install App</span> or <span className="text-slate-900">Add to Home Screen</span></p>
                </div>

              </div>
            )}

            <button
              onClick={() => setShowInstallGuide(false)}
              className="w-full mt-5 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover transition-colors"
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
