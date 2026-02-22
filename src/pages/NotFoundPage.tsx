
import React from 'react';
import { Home, ArrowLeft, SearchX } from 'lucide-react';

interface NotFoundPageProps {
  onGoHome: () => void;
}

const NotFoundPage: React.FC<NotFoundPageProps> = ({ onGoHome }) => {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md mx-auto">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 mb-6">
          <SearchX className="text-primary" size={40} />
        </div>

        <h1 className="text-7xl font-black text-slate-900 mb-2">404</h1>
        <h2 className="text-xl font-bold text-slate-700 mb-3">Page Not Found</h2>
        <p className="text-slate-500 mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onGoHome}
            className="w-full sm:w-auto px-6 py-3 bg-primary text-white font-bold text-sm rounded-2xl hover:bg-primary-hover transition-all shadow-lg shadow-primary-light flex items-center justify-center gap-2"
          >
            <Home size={18} /> Go to Home
          </button>
          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto px-6 py-3 bg-white text-slate-700 font-bold text-sm rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} /> Go Back
          </button>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200">
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center p-1.5">
              <img src="./img/logo.webp" className="w-full h-full object-contain" alt="OpenHRApp" />
            </div>
            <span className="text-sm font-black tracking-tight">
              <span className="text-primary">Open</span>
              <span className="text-[#f59e0b]">HR</span>
              <span className="text-[#10b981]">App</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
