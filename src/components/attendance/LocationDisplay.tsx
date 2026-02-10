
import React from 'react';
import { MapPin } from 'lucide-react';

interface Props {
  location: { lat: number; lng: number; address: string } | null;
  isLocating: boolean;
  onRetry: () => void;
}

export const LocationDisplay: React.FC<Props> = ({ location, isLocating, onRetry }) => {
  return (
    <div className="mt-3 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-xl flex items-center gap-1.5 pointer-events-auto cursor-pointer" onClick={onRetry}>
      <MapPin size={10} className={location ? "text-rose-400" : "text-white/40"} />
      <span className="text-[8px] font-black text-white uppercase tracking-wider">
        {isLocating ? 'Locating...' : (location ? location.address : 'GPS Waiting')}
      </span>
    </div>
  );
};
