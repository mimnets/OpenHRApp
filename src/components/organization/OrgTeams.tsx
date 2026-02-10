
import React from 'react';
import { Users, Plus, Edit3, Trash2, UserCheck } from 'lucide-react';
import { Team, Employee } from '../../types';

interface Props {
  teams: Team[];
  employees: Employee[];
  onAdd: () => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
}

export const OrgTeams: React.FC<Props> = ({ teams, employees, onAdd, onEdit, onDelete }) => {
  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden animate-in zoom-in duration-500">
       <div className="p-5 md:p-6 bg-primary text-white flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3"><Users size={20} /><h3 className="text-xs md:text-sm font-black uppercase tracking-wider">Management Teams</h3></div>
          <button onClick={onAdd} className="w-full sm:w-auto px-6 py-2 bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"><Plus size={14}/> Create Team</button>
       </div>
       <div className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {teams.map((team, i) => {
             const memberCount = employees.filter(e => e.teamId === team.id).length;
             return (
             <div key={team.id} className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] group relative hover:bg-white transition-all">
                <div className="flex justify-between items-start mb-4">
                   <div className="px-3 py-1 bg-primary-light text-primary rounded-full text-[8px] font-black uppercase tracking-widest">
                      {team.department || 'General'}
                   </div>
                   <div className="flex gap-1 opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity">
                      <button onClick={() => onEdit(i)} className="p-2 text-slate-400 hover:text-primary"><Edit3 size={14} /></button>
                      <button onClick={() => onDelete(i)} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 size={14} /></button>
                   </div>
                </div>
                <h4 className="font-black text-slate-900 text-lg mb-1">{team.name}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                  <UserCheck size={12} className="text-primary" />
                  Lead: {employees.find(e => e.id === team.leaderId)?.name || 'No Lead Assigned'}
                </p>
                <div className="flex items-center gap-2 text-[9px] font-black text-slate-300 uppercase tracking-widest">
                   <Users size={12} />
                   {memberCount} Assigned Members
                </div>
             </div>
          )})}
          {teams.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4">
              <p className="text-slate-400 font-black uppercase text-xs tracking-widest">No teams configured yet.</p>
            </div>
          )}
       </div>
    </div>
  );
};
