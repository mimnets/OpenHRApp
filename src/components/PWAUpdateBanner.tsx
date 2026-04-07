import React from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useServiceWorker } from '../hooks/useServiceWorker';

export const PWAUpdateBanner: React.FC = () => {
  const { needRefresh, offlineReady, updateServiceWorker, close } = useServiceWorker();

  if (!needRefresh && !offlineReady) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-[100] animate-in slide-in-from-bottom-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-4 flex items-center gap-4">
        <div className="p-2.5 bg-primary/10 rounded-xl flex-shrink-0">
          <RefreshCw size={20} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-800 tracking-tight">
            {needRefresh ? 'App Update Available' : 'Ready for Offline Use'}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {needRefresh
              ? 'A new version is ready. Update to get the latest features.'
              : 'App has been cached and works offline.'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {needRefresh && (
            <button
              onClick={() => updateServiceWorker()}
              className="px-3 py-1.5 bg-primary text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-primary-hover transition-colors"
            >
              Update
            </button>
          )}
          <button
            onClick={close}
            className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
