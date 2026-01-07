
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
  CheckCircle2,
  AlertCircle,
  Calendar,
  Users,
  Settings,
  Workflow,
  ArrowRight,
  UserCheck,
  Clock,
  Timer
} from 'lucide-react';
import { hrService } from '../services/hrService';
import { Holiday, AppConfig, LeaveWorkflow, Employee } from '../types';

type OrgTab = 'STRUCTURE' | 'PLACEMENT' | 'TERMS' | 'WORKFLOW' | 'HOLIDAYS';

const Organization: React.FC = () => {
  const [activeTab, setActiveTab] = useState<OrgTab>('STRUCTURE');
  
  // Data State
  const [departments, setDepartments] = useState<string[]>([]);
  const [designations, setDesignations] = useState<string[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [config, setConfig] = useState<AppConfig>(hrService.getConfig());
  const [workflows, setWorkflows] = useState<LeaveWorkflow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Modal State for Add/Edit
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'DEPT' | 'DESIG'>('DEPT');
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [modalValue, setModalValue] = useState('');

  useEffect(() => {
    setDepartments(hrService.getDepartments());
    setDesignations(hrService.getDesignations());
    setHolidays(hrService.getHolidays());
    setWorkflows(hrService.getWorkflows());
    setEmployees(hrService.getEmployees());
  }, []);

  // Shared Handlers
  const handleSaveConfig = () => {
    hrService.setConfig(config);
    alert('Organizational policies and terms updated successfully.');
  };

  const handleUpdateLineManager = (empId: string, managerId: string) => {
    hrService.updateProfile(empId, { lineManagerId: managerId });
    setEmployees(hrService.getEmployees());
  };

  const openModal = (type: 'DEPT' | 'DESIG', index: number | null = null) => {
    setModalType(type);
    setEditIndex(index);
    setModalValue(index !== null ? (type === 'DEPT' ? departments[index] : designations[index]) : '');
    setShowModal(true);
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalValue.trim()) return;

    if (modalType === 'DEPT') {
      const next = [...departments];
      if (editIndex !== null) {
        next[editIndex] = modalValue.trim();
      } else {
        next.push(modalValue.trim());
      }
      setDepartments(next);
      hrService.setDepartments(next);
    } else {
      const next = [...designations];
      if (editIndex !== null) {
        next[editIndex] = modalValue.trim();
      } else {
        next.push(modalValue.trim());
      }
      setDesignations(next);
      hrService.setDesignations(next);
    }

    setShowModal(false);
  };

  const deleteItem = (type: 'DEPT' | 'DESIG', index: number) => {
    if (!confirm(`Are you sure you want to delete this ${type === 'DEPT' ? 'Department' : 'Designation'}?`)) return;
    
    if (type === 'DEPT') {
      const updated = departments.filter((_, idx) => idx !== index);
      setDepartments(updated);
      hrService.setDepartments(updated);
    } else {
      const updated = designations.filter((_, idx) => idx !== index);
      setDesignations(updated);
      hrService.setDesignations(updated);
    }
  };

  const renderStructure = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Departments Section */}
      <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 bg-[#0f172a] text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Network size={20} className="text-slate-400" />
            <h3 className="text-sm font-black uppercase tracking-wider">Departments</h3>
          </div>
          <button 
            onClick={() => openModal('DEPT')} 
            className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all flex items-center justify-center"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="p-6 space-y-2">
          {departments.map((dept, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:bg-white hover:shadow-md transition-all">
              <span className="font-bold text-slate-800">{dept}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => openModal('DEPT', i)}
                  className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  <Edit3 size={16} />
                </button>
                <button 
                  onClick={() => deleteItem('DEPT', i)} 
                  className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Designations Section */}
      <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 bg-[#1e293b] text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Briefcase size={20} className="text-slate-400" />
            <h3 className="text-sm font-black uppercase tracking-wider">Designations</h3>
          </div>
          <button 
            onClick={() => openModal('DESIG')}
            className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all flex items-center justify-center"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="p-6 space-y-2">
          {designations.map((des, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:bg-white hover:shadow-md transition-all">
              <span className="font-bold text-slate-800">{des}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => openModal('DESIG', i)}
                  className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  <Edit3 size={16} />
                </button>
                <button 
                  onClick={() => deleteItem('DESIG', i)} 
                  className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  const renderPlacement = () => (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-8">
      <div>
        <h3 className="text-xl font-black text-slate-900 mb-2">Reporting & Placements</h3>
        <p className="text-sm text-slate-500">Configure Line Managers and departmental placements for employees</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-100">
              <th className="pb-4">Employee</th>
              <th className="pb-4">Department</th>
              <th className="pb-4">Line Manager</th>
              <th className="pb-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {employees.map((emp) => (
              <tr key={emp.id}>
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <img src={emp.avatar} className="w-8 h-8 rounded-lg" />
                    <div>
                      <p className="text-sm font-bold text-slate-900 leading-none">{emp.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{emp.designation}</p>
                    </div>
                  </div>
                </td>
                <td className="py-4">
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold uppercase">{emp.department}</span>
                </td>
                <td className="py-4">
                  <select 
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold"
                    value={emp.lineManagerId || ''}
                    onChange={(e) => handleUpdateLineManager(emp.id, e.target.value)}
                  >
                    <option value="">No Manager</option>
                    {employees.filter(m => m.id !== emp.id).map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </td>
                <td className="py-4 text-right">
                  <button className="text-indigo-600 font-black text-[10px] uppercase hover:underline">View History</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTerms = () => (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-12">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-black text-slate-900">Employment Terms & Compliance</h3>
          <p className="text-sm text-slate-500">Configure global shift rules, grace periods, and workweek</p>
        </div>
        <button 
          onClick={handleSaveConfig}
          className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest"
        >
          <Save size={16} /> Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-8">
          <div className="space-y-6">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Calendar size={14} className="text-indigo-600" /> Standard Working Days
            </h4>
            <div className="flex flex-wrap gap-2">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                const isActive = config.workingDays.includes(day);
                return (
                  <button 
                    key={day}
                    onClick={() => {
                      const next = isActive 
                        ? config.workingDays.filter(d => d !== day)
                        : [...config.workingDays, day];
                      setConfig({...config, workingDays: next});
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                      isActive ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 border-slate-100'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Clock size={14} className="text-indigo-600" /> Fixed Shift Hours
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1">Office Starts At</label>
                <input 
                  type="time" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" 
                  value={config.officeStartTime} 
                  onChange={e => setConfig({...config, officeStartTime: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1">Office Ends At</label>
                <input 
                  type="time" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" 
                  value={config.officeEndTime} 
                  onChange={e => setConfig({...config, officeEndTime: e.target.value})}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-6">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Timer size={14} className="text-indigo-600" /> Attendance Policy Rules
            </h4>
            <div className="space-y-6">
              <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-black text-amber-900 uppercase">Late Entry Grace Period</p>
                  <span className="text-xs font-black text-amber-600 px-3 py-1 bg-white rounded-lg">{config.lateGracePeriod} Mins</span>
                </div>
                <input 
                  type="range" min="0" max="60" step="5" 
                  className="w-full accent-amber-500"
                  value={config.lateGracePeriod}
                  onChange={e => setConfig({...config, lateGracePeriod: parseInt(e.target.value)})}
                />
                <p className="text-[9px] text-amber-700 font-medium">Any punch after {config.officeStartTime} + {config.lateGracePeriod}m will be marked as LATE.</p>
              </div>

              <div className="p-6 bg-rose-50 rounded-2xl border border-rose-100 space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-black text-rose-900 uppercase">Early Exit Grace Period</p>
                  <span className="text-xs font-black text-rose-600 px-3 py-1 bg-white rounded-lg">{config.earlyOutGracePeriod} Mins</span>
                </div>
                <input 
                  type="range" min="0" max="60" step="5" 
                  className="w-full accent-rose-500"
                  value={config.earlyOutGracePeriod}
                  onChange={e => setConfig({...config, earlyOutGracePeriod: parseInt(e.target.value)})}
                />
                <p className="text-[9px] text-rose-700 font-medium">Punches before {config.officeEndTime} - {config.earlyOutGracePeriod}m flagged as EARLY EXIT.</p>
              </div>
            </div>
          </div>
          
          <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-4">
             <AlertCircle className="text-indigo-600 shrink-0 mt-1" size={20} />
             <div>
               <p className="text-xs font-black text-indigo-900 uppercase">Flexible Staff Exclusion</p>
               <p className="text-[10px] text-indigo-700 leading-relaxed mt-1">Staff marked as "FIELD" or "FACTORY" work type are automatically excluded from Late/Early Out calculations.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderWorkflow = () => (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-8">
      <div>
        <h3 className="text-xl font-black text-slate-900 mb-2">Leave Approval Workflows</h3>
        <p className="text-sm text-slate-500">Define routing for leave requests on a per-department basis</p>
      </div>

      <div className="space-y-4">
        {workflows.map((wf, i) => (
          <div key={i} className="flex items-center justify-between p-6 bg-slate-50 border border-slate-100 rounded-3xl hover:bg-white hover:shadow-md transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                <Workflow size={24} />
              </div>
              <div>
                <h4 className="font-black text-slate-900 uppercase tracking-tight">{wf.department}</h4>
                <p className="text-xs text-slate-500 font-medium">Standard Leave Routing Policy</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <label className="text-[9px] font-black text-slate-400 uppercase mb-1">Approver Type</label>
                <select 
                  className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold outline-none"
                  value={wf.approverRole}
                  onChange={(e) => {
                    const next = [...workflows];
                    next[i].approverRole = e.target.value as any;
                    setWorkflows(next);
                    hrService.setWorkflows(next);
                  }}
                >
                  <option value="LINE_MANAGER">Line Manager</option>
                  <option value="HR">HR Department</option>
                  <option value="ADMIN">Company Administrator</option>
                </select>
              </div>
              <ArrowRight className="text-slate-300" />
              <div className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest">
                Final Decision
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderHolidays = () => (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-black text-slate-900">Organization Holiday List</h3>
          <p className="text-sm text-slate-500">Government, Religious and Special Company holidays</p>
        </div>
        <button 
          onClick={() => setShowModal(false)} // Placeholder for actual holiday add
          className="flex items-center gap-2 px-6 py-2 bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest"
        >
          <Plus size={16} /> Add Holiday
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {holidays.map((h) => (
          <div key={h.id} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl relative group overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => {
                const next = holidays.filter(item => item.id !== h.id);
                setHolidays(next);
                hrService.setHolidays(next);
              }} className="p-2 text-rose-300 hover:text-rose-600"><Trash2 size={16} /></button>
            </div>
            <p className="text-[10px] font-black text-rose-600 uppercase mb-1 tracking-widest">{h.type}</p>
            <h4 className="font-bold text-slate-900 mb-4">{h.name}</h4>
            <div className="flex items-center gap-2 text-slate-500">
              <Calendar size={14} />
              <span className="text-xs font-black tracking-tight">{new Date(h.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Organization & Setup</h1>
          <p className="text-slate-500 font-medium">Core structural and policy configurations</p>
        </div>
      </header>

      <div className="flex overflow-x-auto no-scrollbar gap-2 p-1.5 bg-white border border-slate-100 rounded-2xl shadow-sm">
        {(['STRUCTURE', 'PLACEMENT', 'TERMS', 'WORKFLOW', 'HOLIDAYS'] as OrgTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in zoom-in-95 duration-300">
        {activeTab === 'STRUCTURE' && renderStructure()}
        {activeTab === 'PLACEMENT' && renderPlacement()}
        {activeTab === 'TERMS' && renderTerms()}
        {activeTab === 'WORKFLOW' && renderWorkflow()}
        {activeTab === 'HOLIDAYS' && renderHolidays()}
      </div>

      <div className="p-8 bg-slate-900 rounded-3xl text-white shadow-xl flex items-center gap-8">
        <div className="p-4 bg-indigo-600 rounded-2xl shadow-lg">
          <Settings size={32} />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-black mb-1">Global Configuration Center</h3>
          <p className="text-sm text-slate-400">All changes made in these modules are audited and synchronized with individual employee portals instantly.</p>
        </div>
        <div className="hidden md:flex flex-col items-end gap-1">
          <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-emerald-400 px-3 py-1 bg-emerald-400/10 rounded-full border border-emerald-400/20">
            <UserCheck size={12} /> Sync Active
          </span>
          <p className="text-[8px] text-slate-500 font-bold uppercase">v2.4.1 Compliant</p>
        </div>
      </div>

      {/* Unified Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  {modalType === 'DEPT' ? <Network size={20} /> : <Briefcase size={20} />}
                </div>
                <h3 className="text-lg font-black uppercase tracking-tight">
                  {editIndex !== null ? 'Edit' : 'New'} {modalType === 'DEPT' ? 'Department' : 'Designation'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="hover:bg-white/10 p-2 rounded-xl">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleModalSubmit} className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                  {modalType === 'DEPT' ? 'Department Name' : 'Designation Title'}
                </label>
                <input 
                  type="text" 
                  autoFocus
                  required 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-4 focus:ring-indigo-100 transition-all" 
                  value={modalValue} 
                  onChange={e => setModalValue(e.target.value)}
                  placeholder={`e.g. ${modalType === 'DEPT' ? 'Logistics' : 'Senior Specialist'}`}
                />
              </div>

              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={16} /> {editIndex !== null ? 'Update' : 'Create'}
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
