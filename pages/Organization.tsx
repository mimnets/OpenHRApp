
import React, { useState, useEffect, useMemo } from 'react';
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
  Loader2,
  Mail,
  Send,
  Database,
  Server,
  Users,
  Search,
  Check,
  Building,
  Globe,
  Bell,
  CalendarClock,
  ToggleLeft,
  ToggleRight,
  Sun,
  Shield,
  UserX
} from 'lucide-react';
import { hrService } from '../services/hrService';
import { updatePocketBaseConfig, getPocketBaseConfig } from '../services/pocketbase';
import { Holiday, AppConfig, LeaveWorkflow, Employee, Team, LeavePolicy } from '../types';
import { DEFAULT_CONFIG } from '../constants.tsx';

type OrgTab = 'STRUCTURE' | 'TEAMS' | 'PLACEMENT' | 'TERMS' | 'WORKFLOW' | 'HOLIDAYS' | 'LEAVES' | 'SYSTEM';

const Organization: React.FC = () => {
  const [activeTab, setActiveTab] = useState<OrgTab>('STRUCTURE');
  const [departments, setDepartments] = useState<string[]>([]);
  const [designations, setDesignations] = useState<string[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [workflows, setWorkflows] = useState<LeaveWorkflow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leavePolicy, setLeavePolicy] = useState<LeavePolicy>({ defaults: { ANNUAL: 15, CASUAL: 10, SICK: 14 }, overrides: {} });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savingManagerId, setSavingManagerId] = useState<string | null>(null);
  
  const [pbConfig, setPbConfig] = useState(getPocketBaseConfig());

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'DEPT' | 'DESIG' | 'HOLIDAY' | 'TEAM' | 'LEAVE_ALLOCATION'>('DEPT');
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [modalValue, setModalValue] = useState('');
  const [holidayForm, setHolidayForm] = useState<Partial<Holiday>>({ name: '', date: '', type: 'FESTIVAL', isGovernment: true });
  const [teamForm, setTeamForm] = useState<Partial<Team>>({ name: '', leaderId: '', department: '' });
  
  // Leave Allocation Form
  const [allocationForm, setAllocationForm] = useState({ employeeId: '', ANNUAL: 0, CASUAL: 0, SICK: 0 });

  // Team Assignment State
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const [teamSearchTerm, setTeamSearchTerm] = useState('');

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [depts, desigs, hols, wfs, emps, appConfig, teamsList, lPolicy] = await Promise.allSettled([
        hrService.getDepartments(),
        hrService.getDesignations(),
        hrService.getHolidays(),
        hrService.getWorkflows(),
        hrService.getEmployees(),
        hrService.getConfig(),
        hrService.getTeams(),
        hrService.getLeavePolicy()
      ]);

      if (depts.status === 'fulfilled') setDepartments(depts.value);
      if (desigs.status === 'fulfilled') setDesignations(desigs.value);
      if (hols.status === 'fulfilled') setHolidays(hols.value);
      if (wfs.status === 'fulfilled') setWorkflows(wfs.value || []);
      if (emps.status === 'fulfilled') setEmployees(emps.value);
      if (appConfig.status === 'fulfilled') {
        const cfg = appConfig.value;
        if (!Array.isArray(cfg.workingDays)) {
          cfg.workingDays = DEFAULT_CONFIG.workingDays;
        }
        setConfig(cfg);
      }
      if (teamsList.status === 'fulfilled') setTeams(teamsList.value);
      if (lPolicy.status === 'fulfilled') setLeavePolicy(lPolicy.value);

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
      alert('Organizational policies updated successfully.');
    } catch (err) {
      alert('Failed to save configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveLeaveDefaults = async () => {
     setIsSaving(true);
     try {
        await hrService.setLeavePolicy(leavePolicy);
        alert('Global leave policy updated.');
     } catch (err) {
        alert('Failed to update leave policy.');
     } finally {
        setIsSaving(false);
     }
  };

  const deleteLeaveOverride = async (empId: string) => {
     if(!confirm("Remove custom allocation for this employee? They will revert to global defaults.")) return;
     const newPolicy = { ...leavePolicy };
     delete newPolicy.overrides[empId];
     setLeavePolicy(newPolicy);
     await hrService.setLeavePolicy(newPolicy);
  };

  const toggleWorkingDay = (day: string) => {
    setConfig(prev => {
      const current = prev.workingDays || [];
      if (current.includes(day)) {
        return { ...prev, workingDays: current.filter(d => d !== day) };
      } else {
        return { ...prev, workingDays: [...current, day] };
      }
    });
  };

  const handleUpdateWorkflowRole = (dept: string, role: string) => {
    setWorkflows(prev => {
      const exists = prev.some(w => w.department === dept);
      if (exists) {
        return prev.map(w => w.department === dept ? { ...w, approverRole: role as any } : w);
      } else {
        return [...prev, { department: dept, approverRole: role as any }];
      }
    });
  };

  const handleSaveWorkflows = async () => {
    setIsSaving(true);
    try {
      await hrService.setWorkflows(workflows);
      alert('Leave workflows updated successfully.');
    } catch (err) {
      alert('Failed to save workflows.');
    } finally {
      setIsSaving(false);
    }
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
      alert(`Update Failed.`);
    } finally {
      setSavingManagerId(null);
    }
  };

  const openModal = (type: 'DEPT' | 'DESIG' | 'HOLIDAY' | 'TEAM' | 'LEAVE_ALLOCATION', index: number | null = null, extraData?: any) => {
    setModalType(type);
    setEditIndex(index);
    setTeamSearchTerm('');
    if (type === 'HOLIDAY') {
      setHolidayForm(index !== null ? holidays[index] : { name: '', date: '', type: 'FESTIVAL', isGovernment: true });
    } else if (type === 'TEAM') {
      const team = index !== null ? teams[index] : { name: '', leaderId: '', department: '' };
      setTeamForm(team);
      const targetTeamId = index !== null ? teams[index].id : '';
      const existingMembers = employees.filter(e => e.teamId === targetTeamId).map(e => e.id);
      setSelectedEmployeeIds(new Set(existingMembers));
    } else if (type === 'LEAVE_ALLOCATION') {
        // If editing existing override (passed via extraData as empId)
        if (extraData) {
           const existing = leavePolicy.overrides[extraData] || leavePolicy.defaults;
           setAllocationForm({ employeeId: extraData, ...existing });
        } else {
           setAllocationForm({ employeeId: '', ...leavePolicy.defaults });
        }
    } else {
      setModalValue(index !== null ? (type === 'DEPT' ? departments[index] : designations[index]) : '');
    }
    setShowModal(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (modalType === 'HOLIDAY') {
        const next = [...holidays];
        if (editIndex !== null) next[editIndex] = { ...holidayForm, id: next[editIndex].id } as Holiday;
        else next.push({ ...holidayForm, id: 'h-' + Date.now() } as Holiday);
        setHolidays(next);
        await hrService.setHolidays(next);
      } else if (modalType === 'TEAM') {
        let teamId: string = '';
        if (editIndex !== null) {
          teamId = teams[editIndex].id;
          await hrService.updateTeam(teamId, teamForm);
        } else {
          const newTeam: any = await hrService.createTeam(teamForm);
          teamId = newTeam?.id || '';
        }

        if (teamId) {
          const originalMembers: string[] = employees.filter(e => e.teamId === teamId).map(e => e.id);
          const toAdd: string[] = [...selectedEmployeeIds].filter((id: string) => !originalMembers.includes(id));
          const toRemove: string[] = originalMembers.filter((id: string) => !selectedEmployeeIds.has(id));

          await Promise.all([
            ...toAdd.map((id: string) => hrService.updateProfile(id, { team_id: teamId })),
            ...toRemove.map((id: string) => hrService.updateProfile(id, { team_id: null }))
          ]);
        }

        const [updatedTeams, updatedEmps] = await Promise.all([hrService.getTeams(), hrService.getEmployees()]);
        setTeams(updatedTeams);
        setEmployees(updatedEmps);
      } else if (modalType === 'LEAVE_ALLOCATION') {
          const newPolicy = { ...leavePolicy };
          newPolicy.overrides[allocationForm.employeeId] = {
             ANNUAL: Number(allocationForm.ANNUAL),
             CASUAL: Number(allocationForm.CASUAL),
             SICK: Number(allocationForm.SICK)
          };
          setLeavePolicy(newPolicy);
          await hrService.setLeavePolicy(newPolicy);
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
      console.error("Modal submission error:", err);
      alert('Operation failed. Check organizational structure permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteItem = async (type: 'DEPT' | 'DESIG' | 'HOLIDAY' | 'TEAM', index: number) => {
    if (!confirm(`Confirm deletion?`)) return;
    try {
      if (type === 'DEPT') {
        const next = departments.filter((_, idx) => idx !== index);
        setDepartments(next); await hrService.setDepartments(next);
      } else if (type === 'DESIG') {
        const next = designations.filter((_, idx) => idx !== index);
        setDesignations(next); await hrService.setDesignations(next);
      } else if (type === 'TEAM') {
        await hrService.deleteTeam(teams[index].id);
        const updatedTeams = await hrService.getTeams();
        setTeams(updatedTeams);
      } else {
        const next = holidays.filter((_, idx) => idx !== index);
        setHolidays(next); await hrService.setHolidays(next);
      }
    } catch (err) {
      alert('Delete failed.');
    }
  };

  const toggleEmployeeSelection = (id: string) => {
    const next = new Set(selectedEmployeeIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedEmployeeIds(next);
  };

  const filteredForTeam = useMemo(() => {
    if (!teamSearchTerm) return employees;
    const lower = teamSearchTerm.toLowerCase();
    return employees.filter(e => 
      e.name.toLowerCase().includes(lower) || 
      e.designation.toLowerCase().includes(lower) ||
      e.employeeId.toLowerCase().includes(lower)
    );
  }, [employees, teamSearchTerm]);

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
        {(['STRUCTURE', 'TEAMS', 'PLACEMENT', 'TERMS', 'WORKFLOW', 'LEAVES', 'HOLIDAYS', 'SYSTEM'] as OrgTab[]).map(tab => (
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
        {/* ... (Existing STRUCTURE, TEAMS, LEAVES, WORKFLOW tabs) ... */}
        {activeTab === 'STRUCTURE' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 md:p-6 bg-[#0f172a] text-white flex justify-between items-center">
                <div className="flex items-center gap-3"><Network size={20} /><h3 className="text-xs md:text-sm font-black uppercase tracking-wider">Departments</h3></div>
                <button onClick={() => openModal('DEPT')} className="p-2 bg-white/10 rounded-lg transition-colors hover:bg-white/20"><Plus size={18} /></button>
              </div>
              <div className="p-4 md:p-6 space-y-2 flex-1 overflow-y-auto max-h-[500px] no-scrollbar">
                {departments.map((dept, i) => (
                  <div key={i} className="flex items-center justify-between p-3 md:p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:bg-white transition-all">
                    <span className="font-bold text-slate-800 break-words max-w-[70%]">{dept}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity">
                      <button onClick={() => openModal('DEPT', i)} className="p-2 text-slate-400 hover:text-indigo-600"><Edit3 size={16} /></button>
                      <button onClick={() => deleteItem('DEPT', i)} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            
            <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 md:p-6 bg-[#1e293b] text-white flex justify-between items-center">
                <div className="flex items-center gap-3"><Briefcase size={20} /><h3 className="text-xs md:text-sm font-black uppercase tracking-wider">Designations</h3></div>
                <button onClick={() => openModal('DESIG')} className="p-2 bg-white/10 rounded-lg transition-colors hover:bg-white/20"><Plus size={18} /></button>
              </div>
              <div className="p-4 md:p-6 space-y-2 flex-1 overflow-y-auto max-h-[500px] no-scrollbar">
                {designations.map((des, i) => (
                  <div key={i} className="flex items-center justify-between p-3 md:p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:bg-white transition-all">
                    <span className="font-bold text-slate-800 break-words max-w-[70%]">{des}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity">
                      <button onClick={() => openModal('DESIG', i)} className="p-2 text-slate-400 hover:text-indigo-600"><Edit3 size={16} /></button>
                      <button onClick={() => deleteItem('DESIG', i)} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'TEAMS' && (
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden animate-in zoom-in duration-500">
             <div className="p-5 md:p-6 bg-indigo-900 text-white flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3"><Users size={20} /><h3 className="text-xs md:text-sm font-black uppercase tracking-wider">Management Teams</h3></div>
                <button onClick={() => openModal('TEAM')} className="w-full sm:w-auto px-6 py-2 bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"><Plus size={14}/> Create Team</button>
             </div>
             <div className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {teams.map((team, i) => {
                   const memberCount = employees.filter(e => e.teamId === team.id).length;
                   return (
                   <div key={team.id} className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] group relative hover:bg-white transition-all">
                      <div className="flex justify-between items-start mb-4">
                         <div className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[8px] font-black uppercase tracking-widest">
                            {team.department || 'General'}
                         </div>
                         <div className="flex gap-1 opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity">
                            <button onClick={() => openModal('TEAM', i)} className="p-2 text-slate-400 hover:text-indigo-600"><Edit3 size={14} /></button>
                            <button onClick={() => deleteItem('TEAM', i)} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 size={14} /></button>
                         </div>
                      </div>
                      <h4 className="font-black text-slate-900 text-lg mb-1">{team.name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                        <UserCheck size={12} className="text-indigo-500" />
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
        )}

        {activeTab === 'LEAVES' && (
           <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-in slide-in-from-bottom-8">
              {/* Global Defaults */}
              <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-8 bg-indigo-900 text-white flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-2xl"><Shield size={24}/></div>
                        <div>
                           <h3 className="text-xl font-black uppercase tracking-tight">Global Defaults</h3>
                           <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-1">Standard Quota for All Employees</p>
                        </div>
                     </div>
                  </div>
                  <div className="p-8 space-y-6 flex-1">
                     <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Annual</label>
                           <input type="number" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xl text-center outline-none focus:ring-4 focus:ring-indigo-50" value={leavePolicy.defaults.ANNUAL} onChange={e => setLeavePolicy({...leavePolicy, defaults: {...leavePolicy.defaults, ANNUAL: Number(e.target.value)}})} />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Casual</label>
                           <input type="number" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xl text-center outline-none focus:ring-4 focus:ring-indigo-50" value={leavePolicy.defaults.CASUAL} onChange={e => setLeavePolicy({...leavePolicy, defaults: {...leavePolicy.defaults, CASUAL: Number(e.target.value)}})} />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Sick</label>
                           <input type="number" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xl text-center outline-none focus:ring-4 focus:ring-indigo-50" value={leavePolicy.defaults.SICK} onChange={e => setLeavePolicy({...leavePolicy, defaults: {...leavePolicy.defaults, SICK: Number(e.target.value)}})} />
                        </div>
                     </div>
                     <button onClick={handleSaveLeaveDefaults} disabled={isSaving} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2">
                        {isSaving ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16} />} Update Defaults
                     </button>
                  </div>
              </div>

              {/* Overrides */}
              <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-8 bg-[#0f172a] text-white flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-2xl"><UserCheck size={24}/></div>
                        <div>
                           <h3 className="text-xl font-black uppercase tracking-tight">Individual Allocations</h3>
                           <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-1">Specific Employee Overrides</p>
                        </div>
                     </div>
                     <button onClick={() => openModal('LEAVE_ALLOCATION')} className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"><Plus size={20}/></button>
                  </div>
                  <div className="p-6 space-y-2 flex-1 overflow-y-auto max-h-[500px] no-scrollbar">
                     {Object.keys(leavePolicy.overrides).length === 0 ? (
                        <div className="text-center py-12">
                           <p className="text-slate-300 font-black uppercase text-xs tracking-widest">No individual allocations set.</p>
                        </div>
                     ) : Object.entries(leavePolicy.overrides).map(([empId, quota]: [string, any]) => {
                        const emp = employees.find(e => e.id === empId);
                        if (!emp) return null;
                        return (
                           <div key={empId} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-[2rem] group hover:bg-white transition-all">
                              <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center font-black text-indigo-600 text-xs">{emp.name[0]}</div>
                                 <div>
                                    <h4 className="font-black text-slate-900 text-sm">{emp.name}</h4>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">A: {quota.ANNUAL} • C: {quota.CASUAL} • S: {quota.SICK}</p>
                                 </div>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => openModal('LEAVE_ALLOCATION', null, empId)} className="p-2 text-slate-400 hover:text-indigo-600"><Edit3 size={16}/></button>
                                 <button onClick={() => deleteLeaveOverride(empId)} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 size={16}/></button>
                              </div>
                           </div>
                        );
                     })}
                  </div>
              </div>
           </div>
        )}

        {activeTab === 'TERMS' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-8">
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-8 bg-[#0f172a] text-white">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-2xl"><Settings size={24}/></div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Organization Terms</h3>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-1">Operational Policies & Thresholds</p>
                  </div>
                </div>
              </div>
              <div className="p-10 space-y-10">
                {/* Work Shift Control */}
                <div className="space-y-6">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <CalendarClock className="text-indigo-600" size={18} /> Work Shift Control
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Office Start Time</label>
                      <div className="relative">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input 
                          type="time" 
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-50"
                          value={config.officeStartTime}
                          onChange={e => setConfig({...config, officeStartTime: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Office End Time</label>
                      <div className="relative">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input 
                          type="time" 
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-50"
                          value={config.officeEndTime}
                          onChange={e => setConfig({...config, officeEndTime: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Working Days Selector */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Active Working Days</label>
                    <div className="flex flex-wrap gap-2">
                      {weekDays.map(day => {
                        const isActive = config.workingDays?.includes(day);
                        return (
                          <button
                            key={day}
                            onClick={() => toggleWorkingDay(day)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                              isActive 
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                              : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                            }`}
                          >
                            {day.substring(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="w-full h-px bg-slate-100"></div>

                {/* Late & Early Policies */}
                <div className="space-y-6">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <Timer className="text-rose-500" size={18} /> Compliance Thresholds
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Late Grace Period (Minutes)</label>
                      <input 
                        type="number" 
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-50"
                        value={config.lateGracePeriod}
                        onChange={e => setConfig({...config, lateGracePeriod: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Early Out Grace Period (Minutes)</label>
                      <input 
                        type="number" 
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-50"
                        value={config.earlyOutGracePeriod}
                        onChange={e => setConfig({...config, earlyOutGracePeriod: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                </div>

                <div className="w-full h-px bg-slate-100"></div>

                {/* Auto Absent & Overtime Policy */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                   {/* Overtime */}
                   <div className="space-y-6">
                      <div className="flex items-center justify-between">
                          <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                            <Sun className="text-amber-500" size={18} /> Overtime Policy
                          </h4>
                          <button 
                            onClick={() => setConfig({...config, overtimeEnabled: !config.overtimeEnabled})}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${config.overtimeEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                          >
                             {config.overtimeEnabled ? <ToggleRight size={20}/> : <ToggleLeft size={20}/>}
                             {config.overtimeEnabled ? 'Enabled' : 'Disabled'}
                          </button>
                       </div>
                       <p className="text-xs text-slate-500 font-medium leading-relaxed">
                          {config.overtimeEnabled 
                            ? "Early arrivals and late departures are flagged for payroll." 
                            : "Attendance duration is capped at standard office hours."
                          }
                       </p>
                   </div>
                   
                   {/* Auto Absent */}
                   <div className="space-y-6">
                      <div className="flex items-center justify-between">
                          <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                            <UserX className="text-rose-500" size={18} /> Auto-Absent
                          </h4>
                          <button 
                            onClick={() => setConfig({...config, autoAbsentEnabled: !config.autoAbsentEnabled})}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${config.autoAbsentEnabled ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}
                          >
                             {config.autoAbsentEnabled ? <ToggleRight size={20}/> : <ToggleLeft size={20}/>}
                             {config.autoAbsentEnabled ? 'Active' : 'Inactive'}
                          </button>
                       </div>
                       <div className="space-y-2">
                          <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            Automatically mark employees as ABSENT if no attendance is recorded by a specific time.
                          </p>
                          {config.autoAbsentEnabled && (
                            <div className="flex items-center gap-3 p-3 bg-rose-50 rounded-xl border border-rose-100">
                               <Clock size={16} className="text-rose-500" />
                               <span className="text-[10px] font-black text-rose-700 uppercase tracking-widest">Run At:</span>
                               <input 
                                  type="time" 
                                  className="bg-transparent font-bold text-sm outline-none text-rose-900 w-24"
                                  value={config.autoAbsentTime || "23:55"}
                                  onChange={e => setConfig({...config, autoAbsentTime: e.target.value})}
                               />
                            </div>
                          )}
                       </div>
                   </div>
                </div>

                <div className="pt-8 border-t border-slate-50 flex justify-end">
                  <button 
                    onClick={handleSaveConfig}
                    disabled={isSaving}
                    className="px-10 py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl flex items-center gap-3"
                  >
                    {isSaving ? <RefreshCw className="animate-spin" size={18}/> : <Save size={18}/>} Save System Policies
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'WORKFLOW' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-8">
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-8 bg-indigo-900 text-white">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-2xl"><Workflow size={24}/></div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Leave Workflows</h3>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-1">Approval Hierarchy Per Department</p>
                  </div>
                </div>
              </div>
              <div className="p-10">
                <div className="space-y-4">
                  <div className="grid grid-cols-12 px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                    <div className="col-span-5">Department</div>
                    <div className="col-span-7 text-right">Approval Entry Point</div>
                  </div>
                  {departments.map((dept, i) => {
                    const wf = workflows.find(w => w.department === dept);
                    const currentRole = wf?.approverRole || 'LINE_MANAGER';
                    
                    return (
                      <div key={i} className="grid grid-cols-12 items-center px-6 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] group hover:bg-white transition-all">
                        <div className="col-span-5 flex items-center gap-3">
                          <div className="p-2 bg-white rounded-lg text-indigo-600 shadow-sm"><Building2 size={16}/></div>
                          <span className="font-black text-slate-900 text-sm">{dept}</span>
                        </div>
                        <div className="col-span-7 flex justify-end items-center gap-6">
                          <div className="flex items-center gap-3 text-slate-400 group-hover:text-indigo-600 transition-colors">
                            <span className="text-[10px] font-black uppercase tracking-widest">Employee</span>
                            <ArrowRight size={14}/>
                          </div>
                          <select 
                            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none shadow-sm focus:ring-4 focus:ring-indigo-50"
                            value={currentRole}
                            onChange={(e) => handleUpdateWorkflowRole(dept, e.target.value)}
                          >
                            <option value="LINE_MANAGER">Line Manager</option>
                            <option value="HR">HR Dept (Direct)</option>
                            <option value="ADMIN">Administrator</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}
                  {departments.length === 0 && (
                    <div className="py-20 text-center space-y-4">
                       <AlertCircle size={48} className="mx-auto text-slate-100" />
                       <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Create departments first to configure workflows.</p>
                    </div>
                  )}
                </div>

                {departments.length > 0 && (
                  <div className="pt-10 border-t border-slate-50 flex justify-end">
                    <button 
                      onClick={handleSaveWorkflows}
                      disabled={isSaving}
                      className="px-10 py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl flex items-center gap-3"
                    >
                      {isSaving ? <RefreshCw className="animate-spin" size={18}/> : <Save size={18}/>} Deploy Workflows
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ... (Existing HOLIDAYS, PLACEMENT, SYSTEM tabs) ... */}
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
                   </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'PLACEMENT' && (
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-4 md:p-8 animate-in slide-in-from-bottom-4 duration-500 w-full overflow-hidden">
            <h3 className="text-lg md:text-xl font-black text-slate-900 mb-6 flex items-center gap-3"><UserCircle className="text-indigo-600"/> Reporting Lines</h3>
            <div className="w-full overflow-x-auto no-scrollbar rounded-xl border border-slate-50 max-h-[600px] overflow-y-auto">
              <table className="w-full text-left text-sm min-w-[500px]">
                <thead><tr className="text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-100 sticky top-0 bg-white z-10"><th className="pb-4 px-4">Staff Member</th><th className="pb-4 px-4">Line Manager</th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {employees.map(emp => (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex-shrink-0 flex items-center justify-center font-black text-indigo-600 text-[10px] uppercase overflow-hidden">
                             {emp.avatar ? <img src={emp.avatar} className="w-full h-full object-cover" /> : emp.name[0]}
                          </div>
                          <p className="font-bold text-slate-700 leading-none truncate">{emp.name}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <select disabled={savingManagerId === emp.id} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] md:text-xs font-bold outline-none" value={emp.lineManagerId || ''} onChange={(e) => handleUpdateLineManager(emp.id, e.target.value)}>
                          <option value="">No Manager Assigned</option>
                          {employees.filter(m => m.id !== emp.id).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'SYSTEM' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in zoom-in">
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10 space-y-10">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white shadow-2xl">
                  <Server size={40} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900">System Configuration</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em] mt-2">Core Settings & Identity</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Company Entity Name</label>
                    <div className="relative">
                      <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        type="text" 
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-50"
                        value={config.companyName}
                        onChange={e => setConfig({...config, companyName: e.target.value})}
                      />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Default Report Recipient Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        type="email" 
                        placeholder="hr@company.com"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-50"
                        value={config.defaultReportRecipient}
                        onChange={e => setConfig({...config, defaultReportRecipient: e.target.value})}
                      />
                    </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button 
                    onClick={handleSaveConfig}
                    disabled={isSaving}
                    className="px-10 py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl flex items-center gap-3"
                  >
                    {isSaving ? <RefreshCw className="animate-spin" size={18}/> : <Save size={18}/>} Update Details
                  </button>
                </div>
              </div>

              <div className="w-full h-px bg-slate-100"></div>

              <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-center space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Backend Source</p>
                    <p className="text-sm font-black text-slate-700">{pbConfig.url}</p>
                  </div>
                  <div className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-center space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SDK Version</p>
                    <p className="text-sm font-black text-slate-700">v0.25.0</p>
                  </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* ... (Existing Modal Code) ... */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className={`bg-white rounded-[2.5rem] w-full shadow-2xl overflow-hidden animate-in zoom-in ${modalType === 'TEAM' ? 'max-w-2xl' : 'max-w-md'}`}>
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
               <h3 className="text-sm font-black uppercase tracking-widest">
                {modalType === 'HOLIDAY' ? 'Holiday Profile' : (modalType === 'TEAM' ? 'Team Configuration' : (modalType === 'LEAVE_ALLOCATION' ? 'Leave Quota Assignment' : 'Manage ' + modalType))}
               </h3>
               <button onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleModalSubmit} className="p-6 md:p-8 space-y-6 max-h-[85vh] overflow-y-auto no-scrollbar">
              {modalType === 'LEAVE_ALLOCATION' && (
                 <div className="space-y-6">
                    {/* If we are editing an existing override, the employeeId is fixed, otherwise we select */}
                    {!allocationForm.employeeId || !Object.keys(leavePolicy.overrides).includes(allocationForm.employeeId) ? (
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase px-1">Select Employee</label>
                           <select required disabled={!!editIndex} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" value={allocationForm.employeeId} onChange={e => setAllocationForm({...allocationForm, employeeId: e.target.value})}>
                              <option value="">-- Choose Staff Member --</option>
                              {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employeeId})</option>)}
                           </select>
                        </div>
                    ) : (
                       <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase">Allocating For</p>
                          <p className="font-bold text-slate-900">{employees.find(e => e.id === allocationForm.employeeId)?.name}</p>
                       </div>
                    )}
                    
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase px-1">Annual</label>
                           <input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-center outline-none" value={allocationForm.ANNUAL} onChange={e => setAllocationForm({...allocationForm, ANNUAL: Number(e.target.value)})} />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase px-1">Casual</label>
                           <input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-center outline-none" value={allocationForm.CASUAL} onChange={e => setAllocationForm({...allocationForm, CASUAL: Number(e.target.value)})} />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase px-1">Sick</label>
                           <input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-center outline-none" value={allocationForm.SICK} onChange={e => setAllocationForm({...allocationForm, SICK: Number(e.target.value)})} />
                        </div>
                    </div>
                 </div>
              )}

              {modalType === 'HOLIDAY' && (
                <div className="space-y-4">
                   <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase px-1">Title</label><input required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" value={holidayForm.name} onChange={e => setHolidayForm({...holidayForm, name: e.target.value})} /></div>
                   <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase px-1">Date</label><input type="date" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" value={holidayForm.date} onChange={e => setHolidayForm({...holidayForm, date: e.target.value})} /></div>
                </div>
              )}
              
              {modalType === 'TEAM' && (
                <div className="space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase px-1">Team Name</label>
                        <input required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" value={teamForm.name} onChange={e => setTeamForm({...teamForm, name: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase px-1">Team Leader</label>
                        <select required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" value={teamForm.leaderId} onChange={e => setTeamForm({...teamForm, leaderId: e.target.value})}>
                          <option value="">Select a Leader</option>
                          {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.designation})</option>)}
                        </select>
                      </div>
                   </div>

                   <div className="space-y-4 pt-4 border-t border-slate-50">
                      <div className="flex items-center justify-between px-1">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assign Team Members</h4>
                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">
                           {selectedEmployeeIds.size} Selected
                        </span>
                      </div>
                      
                      <div className="relative mb-4">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input 
                          type="text" 
                          placeholder="Search staff to add..." 
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none"
                          value={teamSearchTerm}
                          onChange={e => setTeamSearchTerm(e.target.value)}
                        />
                      </div>

                      <div className="max-h-60 overflow-y-auto no-scrollbar border border-slate-50 rounded-2xl grid grid-cols-1 gap-2 p-1">
                        {filteredForTeam.map(emp => {
                          const isSelected = selectedEmployeeIds.has(emp.id);
                          return (
                            <div 
                              key={emp.id} 
                              onClick={() => toggleEmployeeSelection(emp.id)}
                              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                                isSelected ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-50 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center font-black text-indigo-600 text-[10px] overflow-hidden">
                                   {emp.avatar ? <img src={emp.avatar} className="w-full h-full object-cover" /> : emp.name[0]}
                                </div>
                                <div>
                                   <p className={`text-[11px] font-black leading-tight ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{emp.name}</p>
                                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{emp.designation}</p>
                                </div>
                              </div>
                              {isSelected && <Check size={14} className="text-indigo-600 mr-2" />}
                            </div>
                          );
                        })}
                      </div>
                   </div>
                </div>
              )}

              {(modalType === 'DEPT' || modalType === 'DESIG') && (
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase px-1">Entry Name</label><input autoFocus required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" value={modalValue} onChange={e => setModalValue(e.target.value)} /></div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-50">
                <button type="button" disabled={isSaving} onClick={() => setShowModal(false)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-colors hover:bg-slate-200">Cancel</button>
                <button type="submit" disabled={isSaving} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg transition-colors hover:bg-indigo-700">
                  {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <><Save size={16} /> Confirm Changes</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Organization;
