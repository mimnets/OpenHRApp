
import React from 'react';
import { ShieldCheck, ArrowRight, User, UserCheck, Building } from 'lucide-react';
import { LeaveWorkflow } from '../../types';

interface Props {
  departments: string[];
  workflows: LeaveWorkflow[];
  onUpdateRole: (dept: string, role: LeaveWorkflow['approverRole']) => void;
}

export const OrgWorkflow: React.FC<Props> = ({ departments, workflows, onUpdateRole }) => {
  
  const renderVisualFlow = (role: string) => {
    if (role === 'LINE_MANAGER') {
      return (
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 mt-2 bg-slate-100/50 p-2 rounded-lg w-fit">
           <div className="flex items-center gap-1"><User size={12}/> Staff</div>
           <ArrowRight size={12} className="text-slate-300"/>
           <div className="flex items-center gap-1 text-primary"><UserCheck size={12}/> Manager</div>
           <ArrowRight size={12} className="text-slate-300"/>
           <div className="flex items-center gap-1 text-emerald-600"><ShieldCheck size={12}/> HR</div>
        </div>
      );
    }
    if (role === 'HR') {
      return (
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 mt-2 bg-slate-100/50 p-2 rounded-lg w-fit">
           <div className="flex items-center gap-1"><User size={12}/> Staff</div>
           <ArrowRight size={12} className="text-slate-300"/>
           <div className="flex items-center gap-1 text-slate-300 line-through decoration-rose-400"><UserCheck size={12}/> Manager</div>
           <ArrowRight size={12} className="text-slate-300"/>
           <div className="flex items-center gap-1 text-emerald-600"><ShieldCheck size={12}/> HR Direct</div>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 mt-2 bg-slate-100/50 p-2 rounded-lg w-fit">
           <div className="flex items-center gap-1"><User size={12}/> Staff</div>
           <ArrowRight size={12} className="text-slate-300"/>
           <div className="flex items-center gap-1 text-rose-600"><Building size={12}/> Admin Only</div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in zoom-in duration-500">
      <div className="p-8 bg-primary text-white">
         <h3 className="text-lg font-black uppercase tracking-wider flex items-center gap-3"><ShieldCheck size={20}/> Approval Matrix</h3>
         <p className="text-white/80 text-xs mt-1 font-medium">Configure exception rules. By default, leaves go to Line Managers first.</p>
      </div>
      <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
         {departments.map(dept => {
            const wf = workflows.find(w => w.department === dept);
            const role = wf?.approverRole || 'LINE_MANAGER';
            return (
              <div key={dept} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-white hover:shadow-lg transition-all group">
                 <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-sm font-black text-slate-800">{dept} Department</span>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Approval Route</p>
                    </div>
                    <select 
                      className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-tight outline-none focus:ring-2 focus:ring-primary-light shadow-sm cursor-pointer hover:border-primary transition-colors"
                      value={role}
                      onChange={(e) => onUpdateRole(dept, e.target.value as any)}
                    >
                        <option value="LINE_MANAGER">Standard (Manager First)</option>
                        <option value="HR">Skip Manager (HR Only)</option>
                        <option value="ADMIN">Strict (Admin Only)</option>
                    </select>
                 </div>
                 {renderVisualFlow(role)}
              </div>
            );
         })}
         {departments.length === 0 && <p className="col-span-full text-center text-slate-400 py-10 font-bold uppercase text-xs">No departments found. Go to Structure tab to add departments.</p>}
      </div>
    </div>
  );
};
