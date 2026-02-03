
import React from 'react';
import { Calendar, Plus, Clock, Trash2 } from 'lucide-react';
import { Holiday } from '../../types';

interface Props {
  holidays: Holiday[];
  onAdd: () => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
}

export const OrgHolidays: React.FC<Props> = ({ holidays, onAdd, onEdit, onDelete }) => {
  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in zoom-in duration-500">
       <div className="p-6 bg-primary text-white flex justify-between items-center">
          <div className="flex items-center gap-3"><Calendar size={20} /><h3 className="text-sm font-black uppercase tracking-wider">Holiday Calendar</h3></div>
          <button onClick={onAdd} className="p-2 bg-white/10 rounded-lg hover:bg-white/20"><Plus size={18} /></button>
       </div>
       <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {holidays.sort((a,b) => a.date.localeCompare(b.date)).map((h, i) => (
             <div key={h.id || i} className="p-5 bg-slate-50 border border-slate-100 rounded-[2rem] flex justify-between items-start group hover:bg-white transition-all">
                <div>
                   <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">{h.date}</p>
                   <h4 className="font-bold text-slate-900">{h.name}</h4>
                   <span className="text-[9px] font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded-md mt-2 inline-block">{h.type}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => onEdit(i)} className="p-1.5 text-slate-400 hover:text-primary"><Clock size={14}/></button>
                   <button onClick={() => onDelete(i)} className="p-1.5 text-slate-400 hover:text-rose-500"><Trash2 size={14}/></button>
                </div>
             </div>
          ))}
          {holidays.length === 0 && <p className="col-span-full text-center text-slate-400 py-10 font-bold uppercase text-xs">No holidays configured.</p>}
       </div>
    </div>
  );
};
