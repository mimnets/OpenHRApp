
import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface Props {
  currentTime: Date;
  onBack: () => void;
}

export const AttendanceHeader: React.FC<Props> = ({ currentTime, onBack }) => {
  return (
    <div className="px-6 pt-10 pb-2 flex flex-col items-center relative">
      <button 
        onClick={onBack} 
        className="absolute left-6 top-8 w-10 h-10 flex items-center justify-center bg-white shadow-lg text-slate-400 rounded-xl active:scale-90 border border-slate-100"
      >
        <ArrowLeft size={20} />
      </button>
      <div className="text-center">
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
           {currentTime.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase()}
         </p>
         <p className="text-4xl font-black text-[#0f172a] tabular-nums tracking-tighter">
           {currentTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
         </p>
      </div>
    </div>
  );
};
