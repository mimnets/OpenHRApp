
import React from 'react';
import { Globe, Moon } from 'lucide-react';
import { AppConfig } from '../../types';

interface Props {
  config: AppConfig;
  onSave: (config: AppConfig) => Promise<void>;
}

export const OrgSystem: React.FC<Props> = ({ config, onSave }) => {
  
  const handleChange = (key: keyof AppConfig, value: any) => {
    onSave({ ...config, [key]: value });
  };

  return (
    <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8 animate-in slide-in-from-bottom-8 duration-500">
       <h3 className="text-xl font-black text-slate-900 flex items-center gap-3"><Globe size={24} className="text-blue-500" /> System Identity</h3>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Organization Name</label>
             <input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-50 transition-all outline-none" value={config.companyName} onChange={e => handleChange('companyName', e.target.value)} />
          </div>
          <div className="space-y-1">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Timezone</label>
             <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all" value={config.timezone} onChange={e => handleChange('timezone', e.target.value)}>
                <option value="Asia/Dhaka">Asia/Dhaka (GMT+6)</option>
                <option value="UTC">UTC</option>
                <option value="Asia/Kolkata">Asia/Kolkata</option>
             </select>
          </div>
          <div className="space-y-1">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Currency</label>
             <input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-50 transition-all outline-none" value={config.currency} onChange={e => handleChange('currency', e.target.value)} />
          </div>
       </div>
       
       <div className="pt-8 border-t border-slate-50">
           <div className="grid grid-cols-1 gap-6">
             <div className="space-y-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                 <h4 className="font-black text-slate-900 text-sm flex items-center gap-2"><Moon size={16} className="text-indigo-500"/> Auto-Absent Automation</h4>
                 <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500">Enable Feature</span>
                    <input type="checkbox" className="w-5 h-5 accent-indigo-600 rounded-lg" checked={config.autoAbsentEnabled || false} onChange={e => handleChange('autoAbsentEnabled', e.target.checked)} />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cutoff Time (End of Day)</label>
                    <input type="time" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none" value={config.autoAbsentTime || '23:55'} onChange={e => handleChange('autoAbsentTime', e.target.value)} />
                    <p className="text-[9px] text-slate-400 mt-1">If no punch found by this time, mark as ABSENT.</p>
                 </div>
             </div>
           </div>
       </div>
    </div>
  );
};
