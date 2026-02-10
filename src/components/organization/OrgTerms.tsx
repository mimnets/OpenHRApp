
import React from 'react';
import { Clock, Timer, Settings2, Info } from 'lucide-react';
import { AppConfig } from '../../types';

interface OrgTermsProps {
  config: AppConfig;
  onSave: (newConfig: AppConfig) => Promise<void>;
}

export const OrgTerms: React.FC<OrgTermsProps> = ({ config, onSave }) => {
  
  const handleChange = (key: keyof AppConfig, value: any) => {
    onSave({ ...config, [key]: value });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500">
      {/* 1. Shift Policy Module */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 relative overflow-hidden group hover:shadow-md transition-all">
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
         
         <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Clock size={20} className="text-emerald-500"/> 
              Shift & Timings
            </h3>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest">
              Core Policy
            </span>
         </div>
         
         <div className="space-y-6">
            <div className="flex gap-4">
               <div className="space-y-1.5 flex-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Office Start</label>
                  <input 
                    type="time" 
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 focus:ring-4 focus:ring-emerald-50/50 outline-none transition-all" 
                    value={config.officeStartTime} 
                    onChange={e => handleChange('officeStartTime', e.target.value)} 
                  />
               </div>
               <div className="space-y-1.5 flex-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Office End</label>
                  <input 
                    type="time" 
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 focus:ring-4 focus:ring-emerald-50/50 outline-none transition-all" 
                    value={config.officeEndTime} 
                    onChange={e => handleChange('officeEndTime', e.target.value)} 
                  />
               </div>
            </div>
            
            <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100/50 space-y-4">
               <div className="flex items-center gap-2 mb-2">
                  <Settings2 size={14} className="text-slate-400"/>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tolerance Settings</span>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                     <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider px-1">Late Grace</label>
                     <div className="relative">
                        <input 
                          type="number" 
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-400 transition-all" 
                          value={config.lateGracePeriod} 
                          onChange={e => handleChange('lateGracePeriod', parseInt(e.target.value) || 0)} 
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">Min</span>
                     </div>
                  </div>
                  <div className="space-y-1">
                     <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider px-1">Early Out Grace</label>
                     <div className="relative">
                        <input 
                          type="number" 
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-400 transition-all" 
                          value={config.earlyOutGracePeriod} 
                          onChange={e => handleChange('earlyOutGracePeriod', parseInt(e.target.value) || 0)} 
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">Min</span>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* 2. Access Windows & Auto-Close Module */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 relative overflow-hidden group hover:shadow-md transition-all">
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-400 to-pink-500"></div>

         <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Timer size={20} className="text-rose-500"/> 
              Access Control
            </h3>
            <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[9px] font-black uppercase tracking-widest">
              Security
            </span>
         </div>
         
         <div className="grid grid-cols-1 gap-6">
            <div className="space-y-1.5">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Earliest Allowed Check-In</label>
               <input 
                 type="time" 
                 className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 focus:ring-4 focus:ring-rose-50/50 outline-none transition-all" 
                 value={config.earliestCheckIn || '06:00'} 
                 onChange={e => handleChange('earliestCheckIn', e.target.value)} 
               />
               <p className="text-[9px] text-slate-400 px-2 font-medium flex items-center gap-1">
                 <Info size={10} /> Employees cannot punch in before this time.
               </p>
            </div>

            <div className="space-y-1.5">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Mandatory Session Close (Auto-Out)</label>
               <input 
                 type="time" 
                 className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-indigo-900 focus:ring-4 focus:ring-indigo-50/50 outline-none transition-all" 
                 value={config.autoSessionCloseTime || '23:59'} 
                 onChange={e => handleChange('autoSessionCloseTime', e.target.value)} 
               />
               <p className="text-[9px] text-slate-400 px-2 font-medium flex items-center gap-1">
                 <Info size={10} /> Sessions still open at this time will be auto-closed.
               </p>
            </div>
         </div>
      </div>
    </div>
  );
};
