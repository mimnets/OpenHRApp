import React, { useState, useEffect } from 'react';
import { 
  Network, 
  Briefcase, 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  Save, 
  Building2,
  Calendar,
  Settings,
  Workflow,
  ArrowRight,
  Clock,
  Timer,
  ShieldCheck,
  CheckCircle2,
  UserCheck,
  Palmtree,
  Activity,
  UserCircle,
  RefreshCw,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { hrService } from '../services/hrService';
import { Holiday, AppConfig, LeaveWorkflow, Employee } from '../types';
import { DEFAULT_CONFIG } from '../constants.tsx';

type OrgTab = 'STRUCTURE' | 'PLACEMENT' | 'TERMS' | 'WORKFLOW' | 'HOLIDAYS';

const Organization: React.FC = () => {
  const [activeTab, setActiveTab] = useState<OrgTab>('STRUCTURE');
  const [departments, setDepartments] = useState<string[]>([]);
  const [designations, setDesignations] = useState<string[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [workflows, setWorkflows] = useState<LeaveWorkflow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savingManagerId, setSavingManagerId] = useState<string | null>(null);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'DEPT' | 'DESIG' | 'HOLIDAY'>('DEPT');
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [modalValue, setModalValue] = useState('');
  const [holidayForm, setHolidayForm] = useState<Partial<Holiday>>({ name: '', date: '', type: 'FESTIVAL', isGovernment: true });

  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [depts, desigs, hols, wfs, emps, appConfig] = await Promise.allSettled([
        hrService.getDepartments(),
        hrService.getDesignations(),
        hrService.getHolidays(),
        hrService.getWorkflows(),
        hrService.getEmployees(),
        hrService.getConfig()
      ]);

      if (depts.status === 'fulfilled') setDepartments(depts.value);
      if (desigs.status === 'fulfilled') setDesignations(desigs.value);
      if (hols.status === 'fulfilled') setHolidays(hols.value);
      if (wfs.status === 'fulfilled') setWorkflows(wfs.value || []);
      if (emps.status === 'fulfilled') setEmployees(emps.value);
      if (appConfig.status === 'fulfilled') setConfig(appConfig.value);

    } catch (err) {
      console.error("Critical loading error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await hrService.setConfig(config);
      alert('Organizational policies updated.');
    } catch (err) {
      alert('Failed to save configuration. Ensure "settings" collection exists.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveWorkflows = async () => {
    setIsSaving(true);
    try {
      const finalWorkflows = departments.map(dept => {
        const existing = workflows.find(w => w.department === dept);
        return existing || { department: dept, approverRole: 'LINE_MANAGER' as const };
      });
      await hrService.setWorkflows(finalWorkflows);
      setWorkflows(finalWorkflows);
      alert('Leave workflows updated successfully.');
    } catch (err) {
      alert('Failed to save workflows.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateWorkflowRole = (dept: string, role: string) => {
    setWorkflows(prev => {
      const existing = prev.find(w => w.department === dept);
      if (existing) {
        return prev.map(w => w.department === dept ? { ...w, approverRole: role as any } : w);
      } else {
        return [...prev, { department: dept, approverRole: role as any }];
      }
    });
  };

  const handleUpdateLineManager = async (empId: string, managerId: string) => {
    const originalEmps = [...employees];
    setEmployees(prev => prev.map(e => e.id === empId ? { ...e, lineManagerId: managerId || undefined } : e));
    
    setSavingManagerId(empId);
    try {
      await hrService.updateProfile(empId, { lineManagerId: managerId });
      const updatedEmps = await hrService.getEmployees();
      setEmployees(updatedEmps);
    } catch (err: any) {
      setEmployees(originalEmps);
      alert(`Hierarchy Update Failed. Ensure you have ADMIN role in PocketBase.`);
    } finally {
      setSavingManagerId(null);
    }
  };

  const openModal = (type: 'DEPT' | 'DESIG' | 'HOLIDAY', index: number | null = null) => {
    setModalType(type);
    setEditIndex(index);
    if (type === 'HOLIDAY') {
      setHolidayForm(index !== null ? holidays[index] : { name: '', date: '', type: 'FESTIVAL', isGovernment: true });
    } else {
      setModalValue(index !== null ? (type === 'DEPT' ? departments[index] : designations[index]) : '');
    }
    setShowModal(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalType === 'HOLIDAY') {
        const next = [...holidays];
        if (editIndex !== null) next[editIndex] = { ...holidayForm, id: next[editIndex].id } as Holiday;
        else next.push({ ...holidayForm, id: 'h-' + Date.now() } as Holiday);
        setHolidays(next);
        await hrService.setHolidays(next);
      } else if (modalType === 'DEPT') {
        const next = [...departments];
        if (editIndex !== null) next[editIndex] = modalValue.trim();
        else next.push(modalValue.trim());
        setDepartments(next);
        await hrService.setDepartments(next);
      } else {
        const next = [...designations];
        if (editIndex !== null) next[editIndex] = modalValue.trim();
        else next.push(modalValue.trim());
        setDesignations(next);
        await hrService.setDesignations(next);
      }
      setShowModal(false);
    } catch (err) {
      alert('Operation failed. Check "settings" collection.');
    }
  };

  const deleteItem = async (type: 'DEPT' | 'DESIG' | 'HOLIDAY', index: number) => {
    if (!confirm(`Confirm deletion?`)) return;
    try {
      if (type === 'DEPT') {
        const next = departments.filter((_, idx) => idx !== index);
        setDepartments(next); await hrService.setDepartments(next);
      } else if (type === 'DESIG') {
        const next = designations.filter((_, idx) => idx !== index);
        setDesignations(next); await hrService.setDesignations(next);
      } else {
        const next = holidays.filter((_, idx) => idx !== index);
        setHolidays(next); await hrService.setHolidays(next);
      }
    } catch (err) {
      alert('Delete failed.');
    }
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
      <p className="text-xs font-black uppercase tracking-widest">Initialising Organization Data...</p>
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 overflow-x-hidden">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Organization & Setup</h1>
          <p className="text-sm text-slate-500 font-medium">Core structural and policy configurations</p>
        </div>
      </header>

      <div className="flex overflow-x-auto no-scrollbar gap-2 p-1.5 bg-white border border-slate-100 rounded-2xl shadow-sm">
        {(['STRUCTURE', 'PLACEMENT', 'TERMS', 'WORKFLOW', 'HOLIDAYS'] as OrgTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 md:px-6 py-2 md:py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in duration-300 w-full">
        {activeTab === 'STRUCTURE' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 md:p-6 bg-[#0f172a] text-white flex justify-between items-center">
                <div className="flex items-center gap-3"><Network size={20} /><h3 className="text-xs md:text-sm font-black uppercase tracking-wider">Departments</h3></div>
                <button onClick={() => openModal('DEPT')} className="p-2 bg-white/10 rounded-lg transition-colors hover:bg-white/20"><Plus size={18} /></button>
              </div>
              <div className="p-4 md:p-6 space-y-2 flex-1 overflow-y-auto">
                {departments.map((dept, i) => (
                  <div key={i} className="flex items-center justify-between p-3 md:p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:bg-white transition-all">
                    <span className="font-bold text-slate-800 break-words max-w-[70%]">{dept}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity">
                      <button onClick={() => openModal('DEPT', i)} className="p-2 text-slate-400 hover:text-indigo-600"><Edit3 size={16} /></button>
                      <button onClick={() => deleteItem('DEPT', i)} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
                {departments.length === 0 && (
                  <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    No Departments Configured
                  </div>
                )}
              </div>
            </section>
            
            <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 md:p-6 bg-[#1e293b] text-white flex justify-between items-center">
                <div className="flex items-center gap-3"><Briefcase size={20} /><h3 className="text-xs md:text-sm font-black uppercase tracking-wider">Designations</h3></div>
                <button onClick={() => openModal('DESIG')} className="p-2 bg-white/10 rounded-lg transition-colors hover:bg-white/20"><Plus size={18} /></button>
              </div>
              <div className="p-4 md:p-6 space-y-2 flex-1 overflow-y-auto">
                {designations.map((des, i) => (
                  <div key={i} className="flex items-center justify-between p-3 md:p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:bg-white transition-all">
                    <span className="font-bold text-slate-800 break-words max-w-[70%]">{des}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity">
                      <button onClick={() => openModal('DESIG', i)} className="p-2 text-slate-400 hover:text-indigo-600"><Edit3 size={16} /></button>
                      <button onClick={() => deleteItem('DESIG', i)} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
                {designations.length === 0 && (
                  <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    No Designations Configured
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'HOLIDAYS' && (
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden animate-in zoom-in duration-500">
             <div className="p-5 md:p-6 bg-emerald-900 text-white flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3"><Palmtree size={20} /><h3 className="text-xs md:text-sm font-black uppercase tracking-wider">Holiday Calendar</h3></div>
                <button onClick={() => openModal('HOLIDAY')} className="w-full sm:w-auto px-6 py-2 bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"><Plus size={14}/> Add Holiday</button>
             </div>
             <div className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {holidays.sort((a,b) => a.date.localeCompare(b.date)).map((hol, i) => (
                   <div key={hol.id} className="p-5 md:p-6 bg-slate-50 border border-slate-100 rounded-[2rem] group relative hover:bg-white transition-all">
                      <div className="flex justify-between items-start mb-3">
                         <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${hol.type === 'ISLAMIC' ? 'bg-emerald-100 text-emerald-700' : hol.type === 'NATIONAL' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'}`}>
                            {hol.type}
                         </div>
                         <div className="flex gap-1 opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity">
                            <button onClick={() => openModal('HOLIDAY', i)} className="p-2 text-slate-400 hover:text-indigo-600"><Edit3 size={14} /></button>
                            <button onClick={() => deleteItem('HOLIDAY', i)} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 size={14} /></button>
                         </div>
                      </div>
                      <h4 className="font-black text-slate-900 text-sm mb-1 break-words">{hol.name}</h4>
                      <div className="flex items-center gap-2 text-slate-400">
                         <Calendar size={12} />
                         <span className="text-[10px] font-black uppercase tracking-widest">{new Date(hol.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric'})}</span>
                      </div>
                      {hol.isGovernment && <div className="mt-4 flex items-center gap-1.5 text-emerald-600 text-[8px] font-black uppercase tracking-widest"><ShieldCheck size={10} /> Public Holiday</div>}
                   </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'WORKFLOW' && (
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 md:p-8 space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
               <div><h3 className="text-xl font-black text-slate-900">Approval Matrix</h3><p className="text-sm text-slate-500">Define first-level approvers</p></div>
               <button onClick={handleSaveWorkflows} disabled={isSaving || departments.length === 0} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl disabled:opacity-50">
                  {isSaving ? <RefreshCw className="animate-spin" size={14}/> : <Save size={14}/>} Save Changes
               </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
               {departments.map((dept) => {
                 const currentWf = workflows.find(w => w.department === dept);
                 const currentRole = currentWf?.approverRole || 'LINE_MANAGER';
                 
                 return (
                  <div key={dept} className="p-5 md:p-6 bg-slate-50 border border-slate-100 rounded-[2rem]">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-white rounded-xl shadow-sm text-indigo-600"><Workflow size={18}/></div>
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Department</span>
                     </div>
                     <h4 className="text-sm font-black text-slate-900 mb-6 break-words">{dept}</h4>
                     <div className="space-y-3">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Approver Role</p>
                        <select 
                           className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-black outline-none focus:ring-4 focus:ring-indigo-50"
                           value={currentRole}
                           onChange={e => updateWorkflowRole(dept, e.target.value)}
                        >
                           <option value="LINE_MANAGER">Line Manager</option>
                           <option value="HR">HR Dept (Centralized)</option>
                           <option value="ADMIN">Executive Office</option>
                        </select>
                     </div>
                  </div>
                 );
               })}
            </div>
          </div>
        )}

        {activeTab === 'TERMS' && (
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 md:p-8 space-y-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div><h3 className="text-xl font-black text-slate-900">Compliance & Hours</h3><p className="text-sm text-slate-500">Configure shifts and workweek</p></div>
              <button onClick={handleSaveConfig} disabled={isSaving} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl disabled:opacity-50">
                {isSaving ? <RefreshCw className="animate-spin" size={14}/> : <Save size={14}/>} Save Policy
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
              <div className="space-y-6">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Clock size={14} className="text-indigo-600" /> Fixed Shift Hours</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase px-1">Office Start</label><input type="time" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs" value={config.officeStartTime} onChange={e => setConfig({...config, officeStartTime: e.target.value})} /></div>
                  <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase px-1">Office End</label><input type="time" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs" value={config.officeEndTime} onChange={e => setConfig({...config, officeEndTime: e.target.value})} /></div>
                </div>
              </div>
              <div className="space-y-6">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Timer size={14} className="text-indigo-600" /> Late Entry Grace</h4>
                <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 space-y-4">
                  <div className="flex justify-between items-center"><p className="text-[10px] font-black text-amber-900 uppercase">Buffer Minutes</p><span className="text-xs font-black text-amber-600 px-3 py-1 bg-white rounded-lg">{config.lateGracePeriod}m</span></div>
                  <input type="range" min="0" max="60" step="5" className="w-full accent-amber-500" value={config.lateGracePeriod} onChange={e => setConfig({...config, lateGracePeriod: parseInt(e.target.value)})} />
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'PLACEMENT' && (
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-4 md:p-8 animate-in slide-in-from-bottom-4 duration-500 w-full overflow-hidden">
            <h3 className="text-lg md:text-xl font-black text-slate-900 mb-6 flex items-center gap-3"><UserCircle className="text-indigo-600"/> Reporting Lines</h3>
            
            {/* Fully Responsive Table Wrapper */}
            <div className="w-full overflow-x-auto no-scrollbar rounded-xl border border-slate-50">
              <table className="w-full text-left text-sm min-w-[500px]">
                <thead><tr className="text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-100"><th className="pb-4 px-4">Staff Member</th><th className="pb-4 px-4">Line Manager</th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {employees.length === 0 ? (
                    <tr><td colSpan={2} className="py-10 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">No staff records found.</td></tr>
                  ) : (
                    employees.map(emp => (
                      <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex-shrink-0 flex items-center justify-center font-black text-indigo-600 text-[10px] uppercase overflow-hidden">
                               {emp.avatar ? <img src={emp.avatar} className="w-full h-full object-cover" /> : emp.name[0]}
                            </div>
                            <div className="min-w-0">
                               <p className="font-bold text-slate-700 leading-none truncate">{emp.name}</p>
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 truncate">{emp.department}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3 relative max-w-xs">
                            <select 
                              disabled={savingManagerId === emp.id}
                              className={`w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] md:text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-50 transition-all ${savingManagerId === emp.id ? 'opacity-50' : ''}`} 
                              value={emp.lineManagerId || ''} 
                              onChange={(e) => handleUpdateLineManager(emp.id, e.target.value)}
                            >
                              <option value="">No Manager Assigned</option>
                              {employees.filter(m => m.id !== emp.id).map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </select>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in">
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
               <h3 className="text-sm font-black uppercase tracking-widest">{modalType === 'HOLIDAY' ? 'Holiday Profile' : 'Manage ' + modalType}</h3>
               <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-white/10 transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleModalSubmit} className="p-6 md:p-8 space-y-6">
              {modalType === 'HOLIDAY' ? (
                <div className="space-y-4">
                   <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase px-1">Title</label><input required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" value={holidayForm.name} onChange={e => setHolidayForm({...holidayForm, name: e.target.value})} /></div>
                   <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase px-1">Date</label><input type="date" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" value={holidayForm.date} onChange={e => setHolidayForm({...holidayForm, date: e.target.value})} /></div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase px-1">Category</label>
                      <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" value={holidayForm.type} onChange={e => setHolidayForm({...holidayForm, type: e.target.value as any})}>
                         <option value="FESTIVAL">Festival</option>
                         <option value="ISLAMIC">Islamic</option>
                         <option value="NATIONAL">National Day</option>
                      </select>
                   </div>
                </div>
              ) : (
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase px-1">Entry Name</label><input autoFocus required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" value={modalValue} onChange={e => setModalValue(e.target.value)} /></div>
              )}
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-colors hover:bg-slate-200">Cancel</button><button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg transition-colors hover:bg-indigo-700"><Save size={16} /> Confirm</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Organization;