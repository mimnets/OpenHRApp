
import React from 'react';
import { CameraOff, Loader2, Flashlight, SwitchCamera, CheckCircle2 } from 'lucide-react';

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  error: string | null;
  facingMode: 'user' | 'environment';
  isMobile: boolean;
  isTorchOn: boolean;
  toggleTorch: () => void;
  toggleCamera: () => void;
  showSuccess: boolean;
  children?: React.ReactNode; // For overlays like LocationDisplay
}

export const CameraFeed: React.FC<Props> = ({ 
  videoRef, stream, error, facingMode, isMobile, 
  isTorchOn, toggleTorch, toggleCamera, showSuccess, children 
}) => {
  return (
    <div className="relative w-full max-w-[280px] aspect-[3/4] rounded-[2.5rem] overflow-hidden bg-slate-900 shadow-2xl ring-8 ring-white">
      {stream ? (
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} 
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-white/40">
          {error ? (
            <>
              <CameraOff size={40} className="text-rose-500 mb-3" />
              <p className="font-black uppercase text-[9px] tracking-widest">{error}</p>
            </>
          ) : (
            <Loader2 size={40} className="text-indigo-500 animate-spin mb-3" />
          )}
        </div>
      )}
      
      {/* Static Overlays */}
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center pt-6">
         <div className="px-4 py-1.5 bg-emerald-500 rounded-full text-[8px] font-black text-white uppercase tracking-widest shadow-xl flex items-center gap-1.5 ring-2 ring-emerald-500/20 animate-pulse">
            <div className="w-1 h-1 rounded-full bg-white"></div>Face Ready
         </div>
         {children}
      </div>

      {/* Mobile Controls */}
      {isMobile && (
        <>
          <button onClick={toggleTorch} className={`absolute top-4 left-4 w-9 h-9 backdrop-blur-md rounded-xl flex items-center justify-center pointer-events-auto ${isTorchOn ? 'bg-amber-400 text-white' : 'bg-black/30 text-white'}`}>
            <Flashlight size={16} />
          </button>
          <button onClick={toggleCamera} className="absolute top-4 right-4 w-9 h-9 bg-black/30 backdrop-blur-md rounded-xl flex items-center justify-center text-white active:scale-90 pointer-events-auto">
            <SwitchCamera size={16} />
          </button>
        </>
      )}

      {/* Success Overlay */}
      {showSuccess && (
        <div className="absolute inset-0 bg-emerald-600/95 flex flex-col items-center justify-center z-[1002] animate-in zoom-in">
          <div className="p-4 bg-white rounded-full shadow-2xl mb-4">
            <CheckCircle2 size={48} className="text-emerald-500 animate-bounce" />
          </div>
          <h3 className="text-xl font-black text-white uppercase tracking-widest">Verified</h3>
        </div>
      )}
    </div>
  );
};
