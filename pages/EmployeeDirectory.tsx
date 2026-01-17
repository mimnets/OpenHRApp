import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  UserPlus, 
  Upload, 
  X, 
  Camera, 
  Edit, 
  Trash2,
  Save,
  ShieldCheck,
  Mail,
  RefreshCw,
  AlertCircle,
  Eye,
  EyeOff,
  Hash
} from 'lucide-react';
import { hrService } from '../services/hrService';
import { Employee } from '../types';

const EmployeeDirectory: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  const [depts, setDepts] = useState<string[]>([]);
  const [desigs, setDesigs] = useState<string[]>([]);

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const data = await hrService.getEmployees();
      setEmployees(data);
    } catch (err) {
      console.error("Error fetching employees:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      await fetchEmployees();
      const [departmentsList, designationsList] = await Promise.all([
        hrService.getDepartments(),
        hrService.getDesignations()
      ]);
      setDepts(departmentsList);
      setDesigs(designationsList);
    };
    loadInitialData();

    const unsubscribe = hrService.subscribe(() => {
      fetchEmployees();
    });
    return () => { unsubscribe(); };
  }, []);
  
  const initialNewEmpState = {
    name: '',
    email: '',
    employeeId: '', 
    username: '',
    password: '',
    nid: '',
    role: 'EMPLOYEE' as any,
    department: '',
    designation: '',
    avatar: '',
    joiningDate: new Date().toISOString().split('T')[0],
    mobile: '',
    emergencyContact: '',
    salary: 0,
    status: 'ACTIVE' as any,
    employmentType: 'PERMANENT' as any,
    location: 'Dhaka',
    workType: 'OFFICE' as any,
    lineManagerId: ''
  };

  const [formState, setFormState] = useState(initialNewEmpState);

  const filtered = employees.filter(emp => 
    (emp.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.employeeId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormState({ ...formState, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormError(null);
    setFormState({
      ...initialNewEmpState,
      department: depts[0] || 'Unassigned',
      designation: desigs[0] || 'New Employee'
    });
    setShowModal(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setFormError(null);
    
    setFormState({
      name: emp.name || '',
      email: emp.email || '',
      employeeId: emp.employeeId || '', 
      username: emp.username || '',
      password: '',
      nid: emp.nid || '',
      role: (emp.role || 'EMPLOYEE') as any,
      department: emp.department || '',
      designation: emp.designation || '',
      avatar: emp.avatar || '',
      joiningDate: emp.joiningDate || new Date().toISOString().split('T')[0],
      mobile: emp.mobile || '',
      emergencyContact: emp.emergencyContact || '',
      salary: emp.salary || 0,
      status: emp.status || 'ACTIVE',
      employmentType: emp.employmentType || 'PERMANENT',
      location: emp.location || '',
      workType: emp.workType || 'OFFICE',
      lineManagerId: emp.lineManagerId || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this user account? This cannot be undone.')) {
      try {
        await hrService.deleteEmployee(id);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    
    try {
      if (editingId) {
        await hrService.updateProfile(editingId, formState as any);
      } else {
        await hrService.addEmployee(formState as any);
      }
      setShowModal(false);
    } catch (err: any) {
      setFormError(err.message || 'Operation failed. Check server logs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Organization Directory</h1>
          <p className="text-sm text-slate-500 font-medium tracking-tight">
            Managing {employees.length} personnel accounts.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl transition-all"
          >
            <UserPlus size={16} /> Provision New User
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, ID, or department..."
            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button onClick={fetchEmployees} className="p-4 bg-slate-50 text-slate-500 rounded-2xl border border-slate-200 hover:bg-white transition-all">
          <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map((emp) => (
          <div key={emp.id} className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-slate-100 transition-all group relative h-full flex flex-col">
            {/* Header: Avatar, Name & Quick Actions */}
            <div className="flex items-start gap-4">
              <div className="relative flex-shrink-0">
                <img src={emp.avatar || `https://ui-avatars.com/api/?name=${emp.name}`} className="w-14 h-14 md:w-16 md:h-16 rounded-2xl object-cover bg-slate-100 shadow-sm" />
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-lg border-2 border-white flex items-center justify-center ${emp.role === 'ADMIN' ? 'bg-rose-500' : emp.role === 'HR' ? 'bg-indigo-500' : 'bg-emerald-500'}`}>
                  <ShieldCheck size={10} className="text-white" />
                </div>
              </div>
              
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="font-black text-slate-900 text-sm md:text-base leading-tight break-words" title={emp.name}>
                      {emp.name}
                    </h3>
                    <p className="text-[9px] md:text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">
                      {emp.designation || 'Staff'}
                    </p>
                  </div>
                  <div className="flex gap-0.5 flex-shrink-0 bg-slate-50/80 p-1 rounded-lg">
                    <button onClick={() => handleOpenEdit(emp)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"><Edit size={14} /></button>
                    <button onClick={() => handleDelete(emp.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Details Grid */}
            <div className="mt-6 grid grid-cols-2 gap-3 flex-1">
              <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest mb-1">Employee ID</p>
                <p className="text-[10px] font-black text-slate-700 font-mono truncate">{emp.employeeId || 'N/A'}</p>
              </div>
              <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest mb-1">Department</p>
                <p className="text-[9px] font-black text-slate-700 uppercase truncate">{emp.department || 'N/A'}</p>
              </div>
            </div>

            {/* Email & Role Badge */}
            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-slate-400 min-w-0 flex-1">
                <Mail size={10} className="flex-shrink-0" />
                <span className="text-[9px] font-bold truncate">{emp.email}</span>
              </div>
              <span className={`flex-shrink-0 px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${emp.role === 'ADMIN' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'}`}>
                {emp.role}
              </span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && !isLoading && (
          <div className="col-span-full py-20 text-center space-y-4">
             <AlertCircle size={48} className="mx-auto text-slate-200" />
             <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No matching personnel found.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-slate-900 p-8 flex justify-between items-center text-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-2xl"><UserPlus size={24}/></div>
                <h3 className="text-xl font-black uppercase tracking-tight">{editingId ? 'Modify Account' : 'Provision Account'}</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="hover:bg-white/10 p-2 rounded-xl"><X size={28} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-8 max-h-[80vh] overflow-y-auto no-scrollbar">
              {formError && (
                <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-4 text-rose-700 animate-in shake">
                  <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                  <p className="text-xs font-bold leading-relaxed">{formError}</p>
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-10 items-center pb-10 border-b border-slate-100">
                <div 
                  className="w-40 h-40 rounded-[2.5rem] bg-slate-50 border-4 border-slate-100 shadow-inner flex items-center justify-center relative overflow-hidden cursor-pointer group flex-shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {formState.avatar ? <img src={formState.avatar} className="w-full h-full object-cover" /> : <Camera size={40} className="text-slate-300" />}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Upload className="text-white" size={24} />
                  </div>
                  <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />
                </div>
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Full Name</label>
                    <input type="text" required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-50" value={formState.name} onChange={e => setFormState({...formState, name: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1"><Hash size={10} /> Official Employee ID</label>
                    <input type="text" placeholder="e.g. EMP-2024-001" required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-50 border-indigo-100" value={formState.employeeId} onChange={e => setFormState({...formState, employeeId: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Access Level</label>
                    <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-50" value={formState.role} onChange={e => setFormState({...formState, role: e.target.value as any})}>
                      <option value="EMPLOYEE">Employee</option>
                      <option value="MANAGER">Manager</option>
                      <option value="HR">HR Specialist</option>
                      <option value="ADMIN">Administrator</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Work Email (Login Identity)</label>
                  <input type="email" required disabled={!!editingId} className="w-full px-5 py-4 bg-slate-100 border border-slate-200 rounded-2xl font-bold text-sm outline-none disabled:opacity-50" value={formState.email} onChange={e => setFormState({...formState, email: e.target.value})} />
                </div>
                {!editingId && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Initial Password</label>
                    <div className="relative">
                       <input type={showPassword ? "text" : "password"} required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-50" value={formState.password} onChange={e => setFormState({...formState, password: e.target.value})} />
                       <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                       </button>
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Department</label>
                  <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-50" value={formState.department} onChange={e => setFormState({...formState, department: e.target.value})}>
                    {depts.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Designation</label>
                  <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-50" value={formState.designation} onChange={e => setFormState({...formState, designation: e.target.value})}>
                    {desigs.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-50 flex flex-col sm:flex-row gap-4">
                <button type="button" disabled={isSubmitting} onClick={() => setShowModal(false)} className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-[2rem] font-black uppercase text-[11px] tracking-widest">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-2xl flex items-center justify-center gap-3">
                   {isSubmitting ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                   {editingId ? 'Update Profile' : 'Provision User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDirectory;