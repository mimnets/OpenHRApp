
import React from 'react';
import { ShieldCheck, Plus, Trash2 } from 'lucide-react';
import { LeavePolicy, Employee } from '../../types';

interface Props {
  policy: LeavePolicy;
  employees: Employee[];
  onUpdatePolicy: (policy: LeavePolicy) => Promise<void>;
  onAddOverride: () => void;
  onDeleteOverride: (empId: string) => void;
}

export const OrgLeaves: React.FC<Props> = ({ policy, employees, onUpdatePolicy, onAddOverride, onDeleteOverride }) => {
  
  const handleDefaultChange = (key: keyof typeof policy.defaults, value: number) => {
    const next = { ...policy };
    next.defaults[key] = value;
    onUpdatePolicy(next);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500">
       <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
           <div className="p-8 bg-primary text-white flex items-center justify-between"><div className="flex items-center gap-4"><div className="p-3 bg-white/10 rounded-2xl"><ShieldCheck size={24}/></div><div><h3 className="text-xl font-black uppercase tracking-tight">Global Defaults</h3></div></div></div>
           <div className="p-8 space-y-6 flex-1">
              <div className="grid grid-cols-3 gap-4">
                 <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Annual</label><input type="number" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xl text-center outline-none focus:ring-4 focus:ring-primary-light" value={policy.defaults.ANNUAL} onChange={e => handleDefaultChange('ANNUAL', Number(e.target.value))} /></div>
                 <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Casual</label><input type="number" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xl text-center outline-none focus:ring-4 focus:ring-primary-light" value={policy.defaults.CASUAL} onChange={e => handleDefaultChange('CASUAL', Number(e.target.value))} /></div>
                 <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Sick</label><input type="number" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xl text-center outline-none focus:ring-4 focus:ring-primary-light" value={policy.defaults.SICK} onChange={e => handleDefaultChange('SICK', Number(e.target.value))} /></div>
              </div>
           </div>
       </div>

       <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
           <div className="p-8 bg-slate-800 text-white flex items-center justify-between">
              <h3 className="text-lg font-black uppercase tracking-wider">Employee Overrides</h3>
              <button onClick={onAddOverride} className="px-4 py-2 bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-white/20 transition-all"><Plus size={14}/> Add Custom Policy</button>
           </div>
           <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(policy.overrides).map(([empId, quota]) => {
                 const empName = employees.find(e => e.id === empId)?.name || 'Unknown User';
                 return (
                    <div key={empId} className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 flex justify-between items-center group hover:bg-white transition-all">
                       <div>
                          <p className="font-bold text-slate-900">{empName}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-1">A:{quota.ANNUAL} • C:{quota.CASUAL} • S:{quota.SICK}</p>
                       </div>
                       <button onClick={() => onDeleteOverride(empId)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                    </div>
                 );
              })}
              {Object.keys(policy.overrides).length === 0 && <p className="col-span-full text-center text-slate-400 py-6 text-xs font-bold uppercase tracking-widest">No individual overrides set.</p>}
           </div>
       </div>
    </div>
  );
};
