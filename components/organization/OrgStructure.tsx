
import React from 'react';
import { Network, Briefcase, Plus, Edit3, Trash2 } from 'lucide-react';

interface Props {
  departments: string[];
  designations: string[];
  onAdd: (type: 'DEPT' | 'DESIG') => void;
  onEdit: (type: 'DEPT' | 'DESIG', index: number) => void;
  onDelete: (type: 'DEPT' | 'DESIG', index: number) => void;
}

export const OrgStructure: React.FC<Props> = ({ departments, designations, onAdd, onEdit, onDelete }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
      <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 md:p-6 bg-primary text-white flex justify-between items-center">
          <div className="flex items-center gap-3"><Network size={20} /><h3 className="text-xs md:text-sm font-black uppercase tracking-wider">Departments</h3></div>
          <button onClick={() => onAdd('DEPT')} className="p-2 bg-white/10 rounded-lg transition-colors hover:bg-white/20"><Plus size={18} /></button>
        </div>
        <div className="p-4 md:p-6 space-y-2 flex-1 overflow-y-auto max-h-[500px] no-scrollbar">
          {departments.map((dept, i) => (
            <div key={i} className="flex items-center justify-between p-3 md:p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:bg-white transition-all">
              <span className="font-bold text-slate-800 break-words max-w-[70%]">{dept}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity">
                <button onClick={() => onEdit('DEPT', i)} className="p-2 text-slate-400 hover:text-primary"><Edit3 size={16} /></button>
                <button onClick={() => onDelete('DEPT', i)} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </section>
      
      <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 md:p-6 bg-primary text-white flex justify-between items-center">
          <div className="flex items-center gap-3"><Briefcase size={20} /><h3 className="text-xs md:text-sm font-black uppercase tracking-wider">Designations</h3></div>
          <button onClick={() => onAdd('DESIG')} className="p-2 bg-white/10 rounded-lg transition-colors hover:bg-white/20"><Plus size={18} /></button>
        </div>
        <div className="p-4 md:p-6 space-y-2 flex-1 overflow-y-auto max-h-[500px] no-scrollbar">
          {designations.map((des, i) => (
            <div key={i} className="flex items-center justify-between p-3 md:p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:bg-white transition-all">
              <span className="font-bold text-slate-800 break-words max-w-[70%]">{des}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity">
                <button onClick={() => onEdit('DESIG', i)} className="p-2 text-slate-400 hover:text-primary"><Edit3 size={16} /></button>
                <button onClick={() => onDelete('DESIG', i)} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
