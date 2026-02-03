
import React, { useState } from 'react';
import { 
  Loader2, Save, X, RefreshCw, MapPin, Building2, Trash2, Plus, Clock
} from 'lucide-react';
import { useOrganization } from '../hooks/organization/useOrganization';
import { Holiday, Team, OfficeLocation, LeaveWorkflow } from '../types';

// Import sub-components
import { OrgStructure } from '../components/organization/OrgStructure';
import { OrgTeams } from '../components/organization/OrgTeams';
import { OrgTerms } from '../components/organization/OrgTerms';
import { OrgPlacement } from '../components/organization/OrgPlacement';
import { OrgWorkflow } from '../components/organization/OrgWorkflow';
import { OrgLeaves } from '../components/organization/OrgLeaves';
import { OrgHolidays } from '../components/organization/OrgHolidays';
import { OrgSystem } from '../components/organization/OrgSystem';

type OrgTab = 'STRUCTURE' | 'TEAMS' | 'PLACEMENT' | 'TERMS' | 'WORKFLOW' | 'LEAVES' | 'HOLIDAYS' | 'SYSTEM';

const Organization: React.FC = () => {
  const {
      departments, designations, holidays, teams, employees, leavePolicy, config, workflows,
      isLoading, isSaving,
      updateDepartments, updateDesignations, updateHolidays, saveTeam, deleteTeam, 
      updateLeavePolicy, saveConfig, updateWorkflows
  } = useOrganization();

  const [activeTab, setActiveTab] = useState<OrgTab>('STRUCTURE');

  // Modals Local State
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'DEPT' | 'DESIG' | 'HOLIDAY' | 'TEAM' | 'LOCATION' | 'OVERRIDE'>('DEPT');
  const [editIndex, setEditIndex] = useState<number | null>(null);
  
  // Forms Local State
  const [modalValue, setModalValue] = useState('');
  const [holidayForm, setHolidayForm] = useState<Partial<Holiday>>({ name: '', date: '', type: 'FESTIVAL', isGovernment: true });
  const [teamForm, setTeamForm] = useState<Partial<Team>>({ name: '', leaderId: '', department: '' });
  const [locationForm, setLocationForm] = useState<Partial<OfficeLocation>>({ name: '', lat: 0, lng: 0, radius: 500 });
  const [overrideForm, setOverrideForm] = useState({ employeeId: '', ANNUAL: leavePolicy.defaults.ANNUAL, CASUAL: leavePolicy.defaults.CASUAL, SICK: leavePolicy.defaults.SICK });
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());

  // --- Handlers ---

  const openModal = (type: typeof modalType, index: number | null = null) => {
    setModalType(type);
    setEditIndex(index);
    if (type === 'HOLIDAY') {
      setHolidayForm(index !== null ? holidays[index] : { name: '', date: '', type: 'FESTIVAL', isGovernment: true });
    } else if (type === 'TEAM') {
      const team = index !== null ? teams[index] : { name: '', leaderId: '', department: '' };
      setTeamForm(team);
      const targetTeamId = index !== null ? teams[index].id : '';
      const existingMembers = employees.filter(e => e.teamId === targetTeamId).map(e => e.id);
      setSelectedEmployeeIds(new Set(existingMembers));
    } else if (type === 'LOCATION') {
      const loc = (config.officeLocations && index !== null) ? config.officeLocations[index] : { name: '', lat: 23.8103, lng: 90.4125, radius: 500 };
      setLocationForm(loc);
    } else if (type === 'OVERRIDE') {
      // Index for override is just 0 or null, we use state
      setOverrideForm({ employeeId: '', ANNUAL: leavePolicy.defaults.ANNUAL, CASUAL: leavePolicy.defaults.CASUAL, SICK: leavePolicy.defaults.SICK });
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
        await updateHolidays(next);
      } else if (modalType === 'TEAM') {
        const teamId = editIndex !== null ? teams[editIndex].id : null;
        await saveTeam(teamId, teamForm, selectedEmployeeIds);
      } else if (modalType === 'DEPT') {
        const next = [...departments];
        if (editIndex !== null) next[editIndex] = modalValue.trim();
        else next.push(modalValue.trim());
        await updateDepartments(next);
      } else if (modalType === 'DESIG') {
        const next = [...designations];
        if (editIndex !== null) next[editIndex] = modalValue.trim();
        else next.push(modalValue.trim());
        await updateDesignations(next);
      } else if (modalType === 'LOCATION') {
        const next = [...(config.officeLocations || [])];
        if (editIndex !== null) next[editIndex] = locationForm as OfficeLocation;
        else next.push(locationForm as OfficeLocation);
        await saveConfig({ ...config, officeLocations: next });
      } else if (modalType === 'OVERRIDE') {
        if (!overrideForm.employeeId) return;
        const next = { ...leavePolicy };
        next.overrides[overrideForm.employeeId] = {
          ANNUAL: overrideForm.ANNUAL,
          CASUAL: overrideForm.CASUAL,
          SICK: overrideForm.SICK
        };
        await updateLeavePolicy(next);
      }
      setShowModal(false);
    } catch (err) { alert('Operation failed.'); }
  };

  const handleDelete = async (type: typeof modalType, index: number) => {
    if (!confirm(`Confirm deletion?`)) return;
    try {
      if (type === 'DEPT') {
        const next = departments.filter((_, idx) => idx !== index);
        await updateDepartments(next);
      } else if (type === 'DESIG') {
        const next = designations.filter((_, idx) => idx !== index);
        await updateDesignations(next);
      } else if (type === 'TEAM') {
        await deleteTeam(teams[index].id);
      } else if (type === 'HOLIDAY') {
        const next = holidays.filter((_, idx) => idx !== index);
        await updateHolidays(next);
      } else if (type === 'LOCATION') {
        const next = (config.officeLocations || []).filter((_, idx) => idx !== index);
        await saveConfig({ ...config, officeLocations: next });
      }
    } catch (err) { alert('Delete failed.'); }
  };

  const deleteOverride = async (empId: string) => {
    if (!confirm('Remove this custom policy?')) return;
    const next = { ...leavePolicy };
    delete next.overrides[empId];
    await updateLeavePolicy(next);
  };

  const updateWorkflowRole = async (dept: string, role: LeaveWorkflow['approverRole']) => {
    const next = [...workflows];
    const existingIdx = next.findIndex(w => w.department === dept);
    if (existingIdx >= 0) {
      next[existingIdx].approverRole = role;
    } else {
      next.push({ department: dept, approverRole: role });
    }
    await updateWorkflows(next);
  };

  if (isLoading) return <div className="flex flex-col items-center justify-center h-64 text-slate-400"><Loader2 className="w-8 h-8 text-primary animate-spin mb-4" /><p className="text-xs font-black uppercase tracking-widest">Initialising Organization Data...</p></div>;

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
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 md:px-6 py-2 md:py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>{tab.replace('_', ' ')}</button>
        ))}
      </div>

      <div className="animate-in fade-in duration-300 w-full pb-20">
        {activeTab === 'STRUCTURE' && (
          <OrgStructure 
            departments={departments} designations={designations}
            onAdd={openModal} onEdit={openModal} onDelete={handleDelete}
          />
        )}
        
        {activeTab === 'TEAMS' && (
          <OrgTeams 
            teams={teams} employees={employees}
            onAdd={() => openModal('TEAM')} onEdit={(i) => openModal('TEAM', i)} onDelete={(i) => handleDelete('TEAM', i)}
          />
        )}

        {activeTab === 'PLACEMENT' && (
           <OrgPlacement 
             locations={config.officeLocations || []}
             onAdd={() => openModal('LOCATION')}
             onEdit={(i) => openModal('LOCATION', i)}
             onDelete={(i) => handleDelete('LOCATION', i)}
           />
        )}

        {activeTab === 'TERMS' && (
           <OrgTerms config={config} onSave={saveConfig} />
        )}

        {activeTab === 'WORKFLOW' && (
           <OrgWorkflow 
             departments={departments} 
             workflows={workflows} 
             onUpdateRole={updateWorkflowRole} 
           />
        )}

        {activeTab === 'LEAVES' && (
           <OrgLeaves 
             policy={leavePolicy} 
             employees={employees} 
             onUpdatePolicy={updateLeavePolicy}
             onAddOverride={() => openModal('OVERRIDE')}
             onDeleteOverride={deleteOverride}
           />
        )}

        {activeTab === 'HOLIDAYS' && (
           <OrgHolidays 
             holidays={holidays}
             onAdd={() => openModal('HOLIDAY')}
             onEdit={(i) => openModal('HOLIDAY', i)}
             onDelete={(i) => handleDelete('HOLIDAY', i)}
           />
        )}

        {activeTab === 'SYSTEM' && (
           <OrgSystem config={config} onSave={saveConfig} />
        )}
      </div>

      {/* Shared Modal Logic */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className={`bg-white rounded-[2.5rem] w-full shadow-2xl overflow-hidden animate-in zoom-in ${modalType === 'TEAM' || modalType === 'LOCATION' || modalType === 'OVERRIDE' ? 'max-w-xl' : 'max-w-md'}`}>
            <div className="bg-primary p-6 flex justify-between items-center text-white">
               <h3 className="text-sm font-black uppercase tracking-widest">{modalType} Configuration</h3>
               <button onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleModalSubmit} className="p-6 md:p-8 space-y-6 max-h-[85vh] overflow-y-auto no-scrollbar">
              
              {(modalType === 'DEPT' || modalType === 'DESIG') && (
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase px-1">Entry Name</label><input autoFocus required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-4 focus:ring-primary-light transition-all" value={modalValue} onChange={e => setModalValue(e.target.value)} /></div>
              )}

              {modalType === 'HOLIDAY' && (
                 <div className="space-y-4">
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase px-1">Holiday Name</label><input required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-4 focus:ring-primary-light transition-all" value={holidayForm.name} onChange={e => setHolidayForm({...holidayForm, name: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase px-1">Date</label><input type="date" required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={holidayForm.date} onChange={e => setHolidayForm({...holidayForm, date: e.target.value})} /></div>
                       <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase px-1">Type</label><select className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={holidayForm.type} onChange={e => setHolidayForm({...holidayForm, type: e.target.value as any})}><option value="NATIONAL">National</option><option value="FESTIVAL">Festival</option><option value="ISLAMIC">Islamic</option></select></div>
                    </div>
                 </div>
              )}

              {modalType === 'LOCATION' && (
                 <div className="space-y-4">
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase px-1">Office Name</label><input required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={locationForm.name} onChange={e => setLocationForm({...locationForm, name: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase px-1">Latitude</label><input type="number" step="any" required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={locationForm.lat} onChange={e => setLocationForm({...locationForm, lat: parseFloat(e.target.value)})} /></div>
                       <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase px-1">Longitude</label><input type="number" step="any" required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={locationForm.lng} onChange={e => setLocationForm({...locationForm, lng: parseFloat(e.target.value)})} /></div>
                    </div>
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase px-1">Radius (Meters)</label><input type="number" required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={locationForm.radius} onChange={e => setLocationForm({...locationForm, radius: parseInt(e.target.value)})} /></div>
                    <a href="https://www.google.com/maps" target="_blank" rel="noreferrer" className="text-[10px] text-primary font-bold hover:underline flex items-center gap-1 justify-end"><MapPin size={10}/> Open Google Maps to find Lat/Lng</a>
                 </div>
              )}

              {modalType === 'OVERRIDE' && (
                 <div className="space-y-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase px-1">Select Employee</label>
                       <select required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" value={overrideForm.employeeId} onChange={e => setOverrideForm({...overrideForm, employeeId: e.target.value})}>
                          <option value="">-- Choose Staff --</option>
                          {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employeeId})</option>)}
                       </select>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                       <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase px-1">Annual</label><input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-center" value={overrideForm.ANNUAL} onChange={e => setOverrideForm({...overrideForm, ANNUAL: parseInt(e.target.value)})} /></div>
                       <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase px-1">Casual</label><input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-center" value={overrideForm.CASUAL} onChange={e => setOverrideForm({...overrideForm, CASUAL: parseInt(e.target.value)})} /></div>
                       <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase px-1">Sick</label><input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-center" value={overrideForm.SICK} onChange={e => setOverrideForm({...overrideForm, SICK: parseInt(e.target.value)})} /></div>
                    </div>
                 </div>
              )}

              {modalType === 'TEAM' && (
                 <div className="space-y-4">
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase px-1">Team Name</label><input required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-4 focus:ring-primary-light transition-all" value={teamForm.name} onChange={e => setTeamForm({...teamForm, name: e.target.value})} /></div>
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase px-1">Department</label><select className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={teamForm.department} onChange={e => setTeamForm({...teamForm, department: e.target.value})}>{departments.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase px-1">Team Lead</label><select className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={teamForm.leaderId} onChange={e => setTeamForm({...teamForm, leaderId: e.target.value})}><option value="">-- Assign Lead --</option>{employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase px-1">Members ({selectedEmployeeIds.size})</label><div className="h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 grid grid-cols-2 gap-2 bg-slate-50/50">{employees.map(e => (<div key={e.id} onClick={() => { const next = new Set(selectedEmployeeIds); if (next.has(e.id)) next.delete(e.id); else next.add(e.id); setSelectedEmployeeIds(next); }} className={`p-2 rounded-lg text-xs font-bold cursor-pointer border ${selectedEmployeeIds.has(e.id) ? 'bg-primary-light border-primary text-primary' : 'bg-white border-slate-100 text-slate-500'}`}>{e.name}</div>))}</div></div>
                 </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-50">
                <button type="button" disabled={isSaving} onClick={() => setShowModal(false)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-colors hover:bg-slate-200">Cancel</button>
                <button type="submit" disabled={isSaving} className="flex-1 py-4 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg transition-colors hover:bg-primary-hover">{isSaving ? <RefreshCw className="animate-spin" size={16} /> : <><Save size={16} /> Confirm</>}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Organization;
