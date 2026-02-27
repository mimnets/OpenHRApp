import React, { useEffect } from 'react';
import { Download, Github, Smartphone, Monitor, Globe, Shield, Zap, Wifi } from 'lucide-react';
import BlogNavbar from '../components/blog/BlogNavbar';
import BlogFooter from '../components/blog/BlogFooter';

interface DownloadPageProps {
  onBack: () => void;
}

const DownloadPage: React.FC<DownloadPageProps> = ({ onBack }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleBack = () => {
    window.history.pushState(null, '', '/');
    onBack();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <BlogNavbar onBack={handleBack} />

      {/* Hero */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-5">
            <Smartphone className="text-primary" size={32} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 mb-3">
            Get Open HR App
          </h1>
          <p className="text-slate-500 text-base max-w-lg mx-auto">
            Download the Android app or install as a PWA on any device. Free, open-source HR management in your pocket.
          </p>
        </div>
      </div>

      {/* Download Cards */}
      <div className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-2 gap-6 mb-12">

            {/* Direct APK Download */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Download className="text-primary" size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Direct Download</h2>
                  <p className="text-xs text-slate-400">Android APK</p>
                </div>
              </div>
              <p className="text-sm text-slate-500 mb-6 flex-1">
                Download the latest APK directly from our servers. Fast, reliable, and always up to date.
              </p>
              <a
                href="/downloads/openhrapp.apk"
                download="openhrapp.apk"
                className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors"
              >
                <Download size={18} />
                Download APK
              </a>
            </div>

            {/* GitHub Release */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Github className="text-slate-700" size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">GitHub Release</h2>
                  <p className="text-xs text-slate-400">Open Source</p>
                </div>
              </div>
              <p className="text-sm text-slate-500 mb-6 flex-1">
                Download from GitHub releases. View source code, changelogs, and previous versions.
              </p>
              <a
                href="https://github.com/mimnets/OpenHRApp/releases/download/v1.0.1/openhrapp.apk"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors"
              >
                <Github size={18} />
                Download from GitHub
              </a>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mb-12">
            <h3 className="text-lg font-bold text-slate-900 text-center mb-8">Why download the app?</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Zap, label: 'Fast & Native', desc: 'Instant load times' },
                { icon: Wifi, label: 'Works Offline', desc: 'No internet needed' },
                { icon: Shield, label: 'Secure', desc: 'Data stays on device' },
                { icon: Smartphone, label: 'Home Screen', desc: 'One tap access' },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                  <Icon className="text-primary mx-auto mb-2" size={22} />
                  <p className="text-sm font-semibold text-slate-900">{label}</p>
                  <p className="text-xs text-slate-400">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Install Instructions */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 mb-12">
            <h3 className="text-lg font-bold text-slate-900 mb-6">How to Install</h3>
            <div className="space-y-4">
              {[
                { step: '1', title: 'Download the APK', desc: 'Tap one of the download buttons above to get the APK file.' },
                { step: '2', title: 'Allow installation', desc: 'If prompted, go to Settings and enable "Install from unknown sources" for your browser.' },
                { step: '3', title: 'Install & open', desc: 'Open the downloaded file and tap Install. The app will be ready on your home screen.' },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                    {step}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{title}</p>
                    <p className="text-sm text-slate-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PWA Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Globe className="text-blue-600" size={18} />
              <Monitor className="text-blue-600" size={18} />
            </div>
            <p className="text-sm font-semibold text-blue-900 mb-1">Using iOS or Desktop?</p>
            <p className="text-sm text-blue-700">
              Visit <a href="https://openhrapp.com" className="underline font-medium">openhrapp.com</a> in your browser and use "Add to Home Screen" to install as a Progressive Web App.
            </p>
          </div>
        </div>
      </div>

      <BlogFooter />
    </div>
  );
};

export default DownloadPage;
