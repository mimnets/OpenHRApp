
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
  Check
} from 'lucide-react';
import { hrService } from '../services/hrService';
import { updatePocketBaseConfig, getPocketBaseConfig } from '../services/pocketbase';
import { Holiday, AppConfig, LeaveWorkflow, Employee, Team } from '../types';
import { DEFAULT_CONFIG } from '../constants.tsx';

type OrgTab = 'STRUCTURE' | 'TEAMS' | 'PLACEMENT' | 'TERMS' | 'WORKFLOW' | 'HOLIDAYS' | 'SYSTEM';

const Organization: React.FC = () => {
  const [activeTab, setActiveTab] = useState<OrgTab>('STRUCTURE');
  const [departments, setDepartments] = useState<string[]>([]);
  const [designations, setDesignations] = useState<string[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [workflows, setWorkflows] = useState<LeaveWorkflow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [savingManagerId, setSavingManagerId] = useState<string | null>(null);
  
  const [pbConfig, setPbConfig] = useState(getPocketBaseConfig());
  const [testingBackend, setTestingBackend] = useState(false);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'DEPT' | 'DESIG' | 'HOLIDAY' | 'TEAM'>('DEPT');
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [modalValue, setModalValue] = useState('');
  const [holidayForm, setHolidayForm] = useState<Partial<Holiday>>({ name: '', date: '', type: 'FESTIVAL', isGovernment: true });
  const [teamForm, setTeamForm] = useState<Partial<Team>>({ name: '', leaderId: '', department: '' });
  
  // Team Assignment State
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const [teamSearchTerm, setTeamSearchTerm] = useState('');

  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [depts, desigs, hols, wfs, emps, appConfig, teamsList] = await Promise.allSettled([
        hrService.getDepartments(),
        hrService.getDesignations(),
        hrService.getHolidays(),
        hrService.getWorkflows(),
        hrService.getEmployees(),
        hrService.getConfig(),
        hrService.getTeams()
      ]);

      if (depts.status === 'fulfilled') setDepartments(depts.value);
      if (desigs.status === 'fulfilled') setDesignations(desigs.value);
      if (hols.status === 'fulfilled') setHolidays(hols.value);
      if (wfs.status === 'fulfilled') setWorkflows(wfs.value || []);
      if (emps.status === 'fulfilled') setEmployees(emps.value);
      if (appConfig.status === 'fulfilled') setConfig(appConfig.value);
      if (teamsList.status === 'fulfilled') setTeams(teamsList.value);

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
      alert('Failed to save configuration.');
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

  const openModal = (type: 'DEPT' | 'DESIG' | 'HOLIDAY' | 'TEAM', index: number | null = null) => {
    setModalType(type);
    setEditIndex(index);
    setTeamSearchTerm('');
    if (type === 'HOLIDAY') {
      setHolidayForm(index !== null ? holidays[index] : { name: '', date: '', type: 'FESTIVAL', isGovernment: true });
    } else if (type === 'TEAM') {
      const team = index !== null ? teams[index] : { name: '', leaderId: '', department: '' };
      setTeamForm(team);
      // Pre-select members of the team based on teamId
      const targetTeamId = index !== null ? teams[index].id : '';
      const existingMembers = employees.filter(e => e.teamId === targetTeamId).map(e => e.id);
      setSelectedEmployeeIds(new Set(existingMembers));
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
          // SYNC USERS: Identify additions and removals based on ID comparison
          // Use filter and map to get string[]
          const originalMembers: string[] = employees.filter(e => e.teamId === teamId).map(e => e.id);
          // FIX: Use spread operator instead of Array.from to ensure better TypeScript inference for string[]
          const toAdd: string[] = [...selectedEmployeeIds].filter((id: string) => !originalMembers.includes(id));
          const toRemove: string[] = originalMembers.filter((id: string) => !selectedEmployeeIds.has(id));

          // Use explicit field names (team_id) to ensure PocketBase capturing
          await Promise.all([
            ...toAdd.map((id: string) => hrService.updateProfile(id, { team_id: teamId })),
            ...toRemove.map((id: string) => hrService.updateProfile(id, { team_id: null }))
          ]);
        }

        // Final Refresh
        const [updatedTeams, updatedEmps] = await Promise.all([hrService.getTeams(), hrService.getEmployees()]);
        setTeams(updatedTeams);
        setEmployees(updatedEmps);
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
        {(['STRUCTURE', 'TEAMS', 'PLACEMENT', 'TERMS', 'WORKFLOW', 'HOLIDAYS', 'SYSTEM'] as OrgTab[]).map(tab => (
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
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className={`bg-white rounded-[2.5rem] w-full shadow-2xl overflow-hidden animate-in zoom-in ${modalType === 'TEAM' ? 'max-w-2xl' : 'max-w-md'}`}>
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
               <h3 className="text-sm font-black uppercase tracking-widest">
                {modalType === 'HOLIDAY' ? 'Holiday Profile' : (modalType === 'TEAM' ? 'Team Configuration' : 'Manage ' + modalType)}
               </h3>
               <button onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleModalSubmit} className="p-6 md:p-8 space-y-6 max-h-[85vh] overflow-y-auto no-scrollbar">
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

                   {/* Bulk Assignment Section */}
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
