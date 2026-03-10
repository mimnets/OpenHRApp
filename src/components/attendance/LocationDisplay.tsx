
import React, { useState } from 'react';
import { MapPin, RefreshCw, AlertTriangle, X, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  location: { lat: number; lng: number; address: string } | null;
  isLocating: boolean;
  error?: string | null;
  onRetry: () => void;
}

/** Step-by-step guides for enabling location on different platforms */
const LocationHelpGuide: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in duration-200" onClick={onClose}>
    <div
      className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
      onClick={e => e.stopPropagation()}
    >
      <div className="sticky top-0 bg-white rounded-t-3xl px-6 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800">How to Enable Location</h3>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
          <X size={14} className="text-slate-500" />
        </button>
      </div>

      <div className="px-6 py-4 space-y-5 text-xs text-slate-600 leading-relaxed">
        {/* Android Chrome / PWA */}
        <div>
          <p className="text-[10px] font-bold text-slate-800 uppercase tracking-wider mb-2">Android (Chrome / PWA)</p>
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Open <strong>Settings &gt; Location</strong> and turn it <strong>ON</strong></li>
            <li>Go to <strong>Settings &gt; Apps &gt; Chrome</strong> (or the app name)</li>
            <li>Tap <strong>Permissions &gt; Location &gt; Allow</strong></li>
            <li>If using PWA: also check <strong>Settings &gt; Apps &gt; Open HR &gt; Permissions &gt; Location</strong></li>
            <li>Return to the app and tap <strong>Retry</strong></li>
          </ol>
        </div>

        {/* iOS Safari / PWA */}
        <div>
          <p className="text-[10px] font-bold text-slate-800 uppercase tracking-wider mb-2">iPhone / iPad (Safari / PWA)</p>
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Open <strong>Settings &gt; Privacy &amp; Security &gt; Location Services</strong> and turn it <strong>ON</strong></li>
            <li>Scroll down and tap <strong>Safari Websites</strong> (or the PWA name)</li>
            <li>Select <strong>While Using the App</strong> or <strong>Always</strong></li>
            <li>Return to the app and tap <strong>Retry</strong></li>
          </ol>
        </div>

        {/* Desktop Chrome */}
        <div>
          <p className="text-[10px] font-bold text-slate-800 uppercase tracking-wider mb-2">Desktop Chrome</p>
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Click the <strong>lock/tune icon</strong> in the address bar</li>
            <li>Find <strong>Location</strong> and set it to <strong>Allow</strong></li>
            <li>Reload the page or tap <strong>Retry</strong></li>
          </ol>
        </div>

        <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-100">
          Tip: If location still doesn't work, try turning Wi-Fi ON — it helps with indoor positioning.
        </p>
      </div>
    </div>
  </div>
);

export const LocationDisplay: React.FC<Props> = ({ location, isLocating, error, onRetry }) => {
  const [showHelp, setShowHelp] = useState(false);
  const [showError, setShowError] = useState(true);

  // Successful state — compact pill on the camera overlay
  if (location && !error) {
    return (
      <div className="mt-3 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-xl flex items-center gap-1.5 pointer-events-auto cursor-pointer" onClick={onRetry}>
        <MapPin size={10} className="text-rose-400" />
        <span className="text-[8px] font-semibold text-white uppercase tracking-wider">
          {location.address}
        </span>
      </div>
    );
  }

  // Loading state
  if (isLocating) {
    return (
      <div className="mt-3 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-xl flex items-center gap-1.5">
        <RefreshCw size={10} className="text-blue-400 animate-spin" />
        <span className="text-[8px] font-semibold text-white uppercase tracking-wider">
          Detecting location...
        </span>
      </div>
    );
  }

  // Error or waiting state — show actionable error with retry + help
  return (
    <>
      <div className="mt-3 flex flex-col items-center gap-1.5 pointer-events-auto">
        {/* Error message (collapsible) */}
        {error && showError && (
          <div className="px-3 py-2 bg-red-500/90 backdrop-blur-md rounded-xl max-w-[240px]">
            <div className="flex items-start gap-1.5">
              <AlertTriangle size={10} className="text-white mt-0.5 shrink-0" />
              <span className="text-[7px] font-medium text-white leading-tight">
                {error}
              </span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onRetry}
            className="px-3 py-1.5 bg-blue-500/90 backdrop-blur-md rounded-xl flex items-center gap-1.5 active:scale-95 transition-transform"
          >
            <RefreshCw size={9} className="text-white" />
            <span className="text-[8px] font-semibold text-white uppercase tracking-wider">
              Retry Location
            </span>
          </button>

          <button
            onClick={() => setShowHelp(true)}
            className="px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-xl flex items-center gap-1"
          >
            <span className="text-[8px] font-semibold text-white/80 uppercase tracking-wider">
              Help
            </span>
          </button>

          {error && (
            <button
              onClick={() => setShowError(!showError)}
              className="w-6 h-6 bg-white/10 backdrop-blur-md rounded-lg flex items-center justify-center"
            >
              {showError ? <ChevronUp size={10} className="text-white/60" /> : <ChevronDown size={10} className="text-white/60" />}
            </button>
          )}
        </div>
      </div>

      {showHelp && <LocationHelpGuide onClose={() => setShowHelp(false)} />}
    </>
  );
};
