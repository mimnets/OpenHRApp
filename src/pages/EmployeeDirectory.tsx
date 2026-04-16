
import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Hash,
  Building2,
  Users,
  Key,
  FileSpreadsheet,
  FileDown,
  Filter,
  CheckSquare,
  Square,
  ChevronDown
} from 'lucide-react';
import { hrService } from '../services/hrService';
import { apiClient } from '../services/api.client';
import { Employee, Team, User, Shift } from '../types';
import { useSubscription } from '../context/SubscriptionContext';
import HelpButton from '../components/onboarding/HelpButton';
import { useToast } from '../context/ToastContext';

const fetchImageAsDataUrl = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
};

const getScaledLogoDims = (dataUrl: string, maxSize: number): Promise<{ w: number; h: number }> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxSize / img.naturalWidth, maxSize / img.naturalHeight);
      resolve({ w: img.naturalWidth * ratio, h: img.naturalHeight * ratio });
    };
    img.onerror = () => resolve({ w: maxSize, h: maxSize });
    img.src = dataUrl;
  });

const DirectorySkeleton = () => (
  <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-slate-100 animate-pulse space-y-6">
    <div className="flex items-start gap-4">
      <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-slate-100"></div>
      <div className="flex-1 space-y-2">
        <div className="h-5 bg-slate-100 rounded w-3/4"></div>
        <div className="h-3 bg-slate-50 rounded w-1/2"></div>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div className="h-10 bg-slate-50 rounded-2xl"></div>
      <div className="h-10 bg-slate-50 rounded-2xl"></div>
    </div>
  </div>
);

interface EmployeeDirectoryProps {
  user: User;
}

const EmployeeDirectory: React.FC<EmployeeDirectoryProps> = ({ user }) => {
  const { showToast } = useToast();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'HR';
  const isManager = user?.role === 'MANAGER' || user?.role === 'TEAM_LEAD';

  // Subscription check
  const { canPerformAction } = useSubscription();
  const canWrite = canPerformAction('write');
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState<Employee | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  const [depts, setDepts] = useState<string[]>([]);
  const [desigs, setDesigs] = useState<string[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isGeneratingCSV, setIsGeneratingCSV] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [selectedExportDepts, setSelectedExportDepts] = useState<string[]>([]);
  const [showDeptFilter, setShowDeptFilter] = useState(false);
  const [orgInfo, setOrgInfo] = useState<{ name: string; address: string; logoDataUrl: string | null }>({ name: '', address: '', logoDataUrl: null });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const data = await hrService.getEmployees();
      const teamsList = await hrService.getTeams();
      setTeams(teamsList);
      
      let filteredData = data;
      
      if (!isAdmin) {
        if (isManager) {
          // STRICT MANAGER LOGIC: 
          // 1. Find teams where I am the Leader
          const myLedTeamIds = teamsList.filter(t => t.leaderId === user.id).map(t => t.id);
          
          // 2. Show employees who are in those teams OR report directly to me
          filteredData = data.filter(e => 
            (e.teamId && myLedTeamIds.includes(e.teamId)) || 
            (e.lineManagerId === user.id)
          );
        } else {
          // EMPLOYEE LOGIC: Only see teammates (Peers)
          filteredData = data.filter(e => user.teamId && e.teamId === user.teamId);
        }
      }
      setEmployees(filteredData);
    } catch (err) {
      console.error("Error fetching employees:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      await fetchEmployees();
      if (isAdmin) {
        const [departmentsList, designationsList, shiftsList] = await Promise.all([
          hrService.getDepartments(),
          hrService.getDesignations(),
          hrService.getShifts()
        ]);
        setDepts(departmentsList);
        setDesigs(designationsList);
        setShifts(shiftsList);

        try {
          const orgId = apiClient.getOrganizationId();
          if (orgId && apiClient.pb) {
            const org = await apiClient.pb.collection('organizations').getOne(orgId);
            let logoDataUrl: string | null = null;
            if (org.logo) {
              const logoUrl = apiClient.pb!.files.getURL(org, org.logo);
              logoDataUrl = await fetchImageAsDataUrl(logoUrl);
            }
            setOrgInfo({ name: org.name || '', address: org.address || '', logoDataUrl });
          }
        } catch (e) { console.warn("Failed to fetch org info for PDF header"); }
      }
    };
    loadInitialData();

    const unsubscribe = hrService.subscribe(() => {
      fetchEmployees();
    });
    return () => { unsubscribe(); };
  }, [isAdmin, isManager, user?.teamId, user?.id]);
  
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
    lineManagerId: '',
    teamId: '',
    shiftId: ''
  };

  const [formState, setFormState] = useState(initialNewEmpState);

  const filtered = useMemo(() => {
    return employees.filter(emp => 
      (emp.name || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (emp.employeeId || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (emp.department || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (emp.email || '').toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [employees, debouncedSearch]);

  const toggleExportDept = (dept: string) => {
    setSelectedExportDepts(prev => prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]);
  };

  const exportData = useMemo(() => {
    if (selectedExportDepts.length === 0) return filtered;
    return filtered.filter(emp => selectedExportDepts.includes(emp.department || 'Unassigned'));
  }, [filtered, selectedExportDepts]);

  const getExportFilename = (ext: string) => {
    if (selectedExportDepts.length === 0 || selectedExportDepts.length === depts.length) return `OpenHR_Employee_Directory.${ext}`;
    if (selectedExportDepts.length === 1) return `OpenHR_${selectedExportDepts[0].replace(/\s+/g, '_')}_Directory.${ext}`;
    return `OpenHR_${selectedExportDepts.length}_Departments_Directory.${ext}`;
  };

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
    if (!isAdmin) return;
    setEditingId(null);
    setFormError(null);
    const defaultShift = shifts.find(s => s.isDefault);

    console.log('[EmployeeDirectory] Opening add employee form');
    console.log('[EmployeeDirectory] Available shifts:', shifts.length);
    console.log('[EmployeeDirectory] Default shift found:', defaultShift?.name, 'ID:', defaultShift?.id);

    const newFormState = {
      ...initialNewEmpState,
      department: depts[0] || 'Unassigned',
      designation: desigs[0] || 'New Employee',
      shiftId: defaultShift?.id || ''
    };

    console.log('[EmployeeDirectory] Setting initial form state with shiftId:', newFormState.shiftId);
    setFormState(newFormState);
    setShowModal(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    if (!isAdmin) return;
    setEditingId(emp.id);
    setFormError(null);
    
    setFormState({
      name: emp.name || '',
      email: emp.email || '',
      employeeId: emp.employeeId || '', 
      username: emp.username || '',
      password: '', // Password intentionally empty on edit load
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
      lineManagerId: emp.lineManagerId || '',
      teamId: emp.teamId || '',
      shiftId: emp.shiftId || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (confirm('Delete this user account? This cannot be undone.')) {
      try {
        await hrService.deleteEmployee(id);
      } catch (err: any) {
        showToast(err.message, 'error');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setIsSubmitting(true);
    setFormError(null);

    console.log('[EmployeeDirectory] Submitting form with state:', {
      name: formState.name,
      teamId: formState.teamId,
      shiftId: formState.shiftId,
      isEdit: !!editingId
    });

    try {
      if (editingId) {
        console.log('[EmployeeDirectory] Updating employee:', editingId);
        await hrService.updateProfile(editingId, formState as any);
      } else {
        console.log('[EmployeeDirectory] Creating new employee');
        await hrService.addEmployee(formState as any);
      }
      setShowModal(false);
    } catch (err: any) {
      console.error('[EmployeeDirectory] Submit error:', err);
      setFormError(err.message || 'Operation failed. Check server logs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTeamName = (teamId?: string) => {
    if (!teamId) return 'No Team';
    return teams.find(t => t.id === teamId)?.name || 'Unknown Team';
  };

  const getShiftName = (shiftId?: string) => {
    if (!shiftId) return 'No Shift Assigned';
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return 'Unknown Shift';
    return `${shift.name} (${shift.startTime}-${shift.endTime})`;
  };

  const downloadCSV = () => {
    if (exportData.length === 0) return;
    setIsGeneratingCSV(true);
    try {
      const headers = ['Employee ID', 'Name', 'Email', 'Department', 'Designation', 'Role', 'Team', 'Status', 'Employment Type', 'Joining Date', 'Mobile', 'Location', 'Work Type'];
      const rows = exportData.map(emp => [
        emp.employeeId || '',
        emp.name || '',
        emp.email || '',
        emp.department || '',
        emp.designation || '',
        emp.role || '',
        getTeamName(emp.teamId),
        emp.status || '',
        emp.employmentType || '',
        emp.joiningDate || '',
        emp.mobile || '',
        emp.location || '',
        emp.workType || ''
      ]);

      const escapeCSV = (val: string) => {
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      };

      const csvContent = '\uFEFF' + [headers.map(escapeCSV).join(','), ...rows.map(row => row.map(escapeCSV).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getExportFilename('csv');
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV generation failed:', err);
    } finally {
      setIsGeneratingCSV(false);
    }
  };

  const downloadPDF = async () => {
    if (exportData.length === 0) return;
    setIsGeneratingPDF(true);
    try {
      const jsPDFModule = await import('jspdf');
      const autoTableModule = await import('jspdf-autotable');
      const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF;
      if (autoTableModule.applyPlugin) autoTableModule.applyPlugin(jsPDF);

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();

      // --- Header ---
      let cursorY = 15;
      const logoSize = 20;
      let textStartX = 14;

      if (orgInfo.logoDataUrl) {
        try {
          const logoDims = await getScaledLogoDims(orgInfo.logoDataUrl, logoSize);
          doc.addImage(orgInfo.logoDataUrl, 'PNG', 14, cursorY - 5, logoDims.w, logoDims.h);
          textStartX = 14 + logoDims.w + 6;
        } catch { /* skip logo on error */ }
      }

      if (orgInfo.name) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(orgInfo.name, textStartX, cursorY + 2);
      }
      if (orgInfo.address) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(orgInfo.address, textStartX, cursorY + 9);
      }

      cursorY += Math.max(logoSize, 14) + 6;

      // --- Title ---
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      const deptLabel = selectedExportDepts.length === 0 || selectedExportDepts.length === depts.length
        ? 'Employee Directory'
        : selectedExportDepts.length === 1
          ? `${selectedExportDepts[0]} Department`
          : `${selectedExportDepts.length} Departments`;
      doc.text(`${deptLabel} (${exportData.length} employees)`, 14, cursorY);
      cursorY += 8;

      // --- Summary Stats ---
      const activeCount = exportData.filter(e => e.status === 'ACTIVE').length;
      const inactiveCount = exportData.filter(e => e.status !== 'ACTIVE').length;
      const deptCounts: Record<string, number> = {};
      exportData.forEach(e => { const d = e.department || 'Unassigned'; deptCounts[d] = (deptCounts[d] || 0) + 1; });
      const deptSummary = Object.entries(deptCounts).map(([k, v]) => `${k}: ${v}`).join('    ');

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('Summary', 14, cursorY);
      cursorY += 5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Total: ${exportData.length}    Active: ${activeCount}    Inactive: ${inactiveCount}`, 14, cursorY);
      cursorY += 4;
      doc.text(deptSummary, 14, cursorY);
      cursorY += 8;

      // --- Table ---
      const tableHeaders = ['ID', 'Name', 'Email', 'Department', 'Designation', 'Role', 'Team', 'Status', 'Type', 'Joining Date', 'Mobile', 'Location', 'Work Type'];
      const tableRows = exportData.map(emp => [
        emp.employeeId || '', emp.name || '', emp.email || '', emp.department || '',
        emp.designation || '', emp.role || '', getTeamName(emp.teamId), emp.status || '',
        emp.employmentType || '', emp.joiningDate || '', emp.mobile || '', emp.location || '', emp.workType || ''
      ]);

      (doc as any).autoTable({
        startY: cursorY,
        head: [tableHeaders],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 7 },
        bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
        styles: { cellPadding: 2, overflow: 'linebreak' },
      });

      // --- Footer ---
      const totalPages = (doc as any).internal.getNumberOfPages();
      const now = new Date().toLocaleString();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(`Generated by OpenHR on ${now}`, 14, pageHeight - 8);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
      }

      doc.save(getExportFilename('pdf'));
    } catch (err: any) {
      console.error('PDF generation failed:', err);
      showToast('Failed to generate PDF: ' + (err?.message || err), 'error');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
              {isAdmin ? 'Organization Directory' : (isManager ? 'My Team & Reports' : 'My Teammates')}
            </h1>
            <HelpButton helpPointId="employees.directory" />
          </div>
          <p className="text-sm text-slate-500 font-medium tracking-tight">
            {isAdmin ? `Managing ${employees.length} personnel accounts.` : `Viewing ${employees.length} members within your scope.`}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeptFilter(!showDeptFilter)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-widest shadow-sm transition-all ${
                selectedExportDepts.length > 0 ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Filter size={14} />
              {selectedExportDepts.length > 0 ? `${selectedExportDepts.length} Dept${selectedExportDepts.length > 1 ? 's' : ''}` : 'Depts'}
              <ChevronDown size={12} className={`transition-transform ${showDeptFilter ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={downloadCSV}
              disabled={exportData.length === 0 || isGeneratingCSV}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-widest shadow-sm transition-all bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingCSV ? <RefreshCw size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />} CSV
            </button>
            <button
              onClick={downloadPDF}
              disabled={exportData.length === 0 || isGeneratingPDF}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-widest shadow-sm transition-all bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingPDF ? <RefreshCw size={14} className="animate-spin" /> : <FileDown size={14} />} PDF
            </button>
            <button
              onClick={handleOpenAdd}
              disabled={!canWrite}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-semibold uppercase tracking-widest shadow-xl transition-all ${
                canWrite
                  ? 'bg-primary text-white hover:bg-primary-hover'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              <UserPlus size={16} /> Provision New User
            </button>
          </div>
        )}
      </div>

      {isAdmin && showDeptFilter && depts.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-widest">
              Export Departments ({selectedExportDepts.length}/{depts.length})
            </p>
            <div className="flex gap-4">
              <button onClick={() => setSelectedExportDepts([...depts])} className="text-[9px] font-semibold uppercase text-indigo-600 hover:underline">Select All</button>
              <button onClick={() => setSelectedExportDepts([])} className="text-[9px] font-semibold uppercase text-rose-500 hover:underline">Clear All</button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-1">
            {depts.map(dept => {
              const isSelected = selectedExportDepts.includes(dept);
              const count = filtered.filter(e => e.department === dept).length;
              return (
                <button key={dept} onClick={() => toggleExportDept(dept)} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${isSelected ? 'bg-white border-primary/30 shadow-sm' : 'bg-slate-50/50 border-transparent opacity-60'}`}>
                  <div className={`p-1 rounded-md flex-shrink-0 ${isSelected ? 'bg-primary text-white' : 'bg-slate-200 text-slate-400'}`}>
                    {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                  </div>
                  <span className={`text-[11px] font-bold truncate ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>{dept}</span>
                  <span className={`text-[9px] ml-auto flex-shrink-0 ${isSelected ? 'text-primary font-bold' : 'text-slate-400'}`}>{count}</span>
                </button>
              );
            })}
          </div>
          {selectedExportDepts.length > 0 && (
            <p className="text-[10px] text-slate-400 mt-3 px-1">
              {exportData.length} employee{exportData.length !== 1 ? 's' : ''} will be exported
            </p>
          )}
        </div>
      )}

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, ID, or designation..."
            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-primary-light transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button onClick={fetchEmployees} className="p-4 bg-slate-50 text-slate-500 rounded-2xl border border-slate-200 hover:bg-white transition-all">
          <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          <>
            <DirectorySkeleton />
            <DirectorySkeleton />
            <DirectorySkeleton />
          </>
        ) : filtered.map((emp) => (
          <div key={emp.id} className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-slate-100 transition-all group relative h-full flex flex-col hover:shadow-md cursor-pointer" onClick={() => setShowViewModal(emp)}>
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
                    <h3 className="font-semibold text-slate-900 text-sm md:text-base leading-tight break-words" title={emp.name}>
                      {emp.name}
                    </h3>
                    <p className="text-[9px] md:text-[10px] font-semibold text-primary uppercase tracking-widest mt-1">
                      {emp.designation || 'Staff'}
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-0.5 flex-shrink-0 bg-slate-50/80 p-1 rounded-lg" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleOpenEdit(emp)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-white rounded-md transition-all"><Edit size={14} /></button>
                      <button onClick={() => handleDelete(emp.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Details Grid */}
            <div className="mt-6 grid grid-cols-2 gap-3 flex-1">
              <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                <p className="text-[8px] text-slate-400 uppercase font-semibold tracking-widest mb-1">Team</p>
                <p className="text-[9px] font-semibold text-slate-700 truncate">{getTeamName(emp.teamId)}</p>
              </div>
              <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                <p className="text-[8px] text-slate-400 uppercase font-semibold tracking-widest mb-1">Department</p>
                <p className="text-[9px] font-semibold text-slate-700 uppercase truncate">{emp.department || 'N/A'}</p>
              </div>
            </div>

            {/* Email & Role Badge */}
            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-slate-400 min-w-0 flex-1">
                <Mail size={10} className="flex-shrink-0" />
                <span className="text-[9px] font-bold truncate">{emp.email}</span>
              </div>
              <span className={`flex-shrink-0 px-2.5 py-1 rounded-md text-[8px] font-semibold uppercase tracking-widest ${emp.role === 'ADMIN' ? 'bg-rose-100 text-rose-700' : 'bg-primary-light text-primary'}`}>
                {emp.role}
              </span>
            </div>
          </div>
        ))}
        {!isLoading && filtered.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4">
             <AlertCircle size={48} className="mx-auto text-slate-200" />
             <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No matching personnel found.</p>
          </div>
        )}
      </div>

      {/* View Modal */}
      {showViewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-primary p-8 flex justify-between items-center text-white">
              <h3 className="text-xl font-semibold uppercase tracking-tight">Personnel Profile</h3>
              <button onClick={() => setShowViewModal(null)} className="hover:bg-white/10 p-2 rounded-xl transition-all"><X size={28} /></button>
            </div>
            <div className="p-10 space-y-10 max-h-[80vh] overflow-y-auto no-scrollbar">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative">
                  <img src={showViewModal.avatar || `https://ui-avatars.com/api/?name=${showViewModal.name}`} className="w-32 h-32 rounded-xl object-cover bg-slate-100 shadow-xl border-4 border-white" />
                  <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-xl border-2 border-white flex items-center justify-center ${showViewModal.role === 'ADMIN' ? 'bg-rose-500' : 'bg-primary shadow-lg'}`}>
                    <ShieldCheck size={16} className="text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-slate-900">{showViewModal.name}</h3>
                  <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em]">{showViewModal.designation}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-1">
                   <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Hash size={12} className="text-primary" /> Employee ID</p>
                   <p className="font-semibold text-slate-700">{showViewModal.employeeId}</p>
                </div>
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-1">
                   <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Building2 size={12} className="text-primary" /> Department</p>
                   <p className="font-semibold text-slate-700">{showViewModal.department}</p>
                </div>
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-1">
                   <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Mail size={12} className="text-primary" /> Work Email</p>
                   <p className="font-semibold text-slate-700 truncate">{showViewModal.email}</p>
                </div>
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-1">
                   <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Users size={12} className="text-primary" /> Team Name</p>
                   <p className="font-semibold text-slate-700">{getTeamName(showViewModal.teamId)}</p>
                </div>
                {shifts.length > 0 && (
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-1 md:col-span-2">
                     <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                       Assigned Shift
                     </p>
                     <p className="font-semibold text-slate-700">{getShiftName(showViewModal.shiftId)}</p>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setShowViewModal(null)}
                className="w-full py-5 bg-slate-900 text-white rounded-xl font-semibold uppercase text-[11px] tracking-widest shadow-xl"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Management Modal */}
      {showModal && isAdmin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-primary p-8 flex justify-between items-center text-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-2xl"><UserPlus size={24}/></div>
                <h3 className="text-xl font-semibold uppercase tracking-tight">{editingId ? 'Modify Account' : 'Provision Account'}</h3>
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
                  className="w-40 h-40 rounded-xl bg-slate-50 border-4 border-slate-100 shadow-inner flex items-center justify-center relative overflow-hidden cursor-pointer group flex-shrink-0"
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
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Full Name</label>
                    <input type="text" required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary-light" value={formState.name} onChange={e => setFormState({...formState,name:e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1"><Hash size={10} /> Official Employee ID</label>
                    <input type="text" placeholder="e.g. EMP-2024-001" required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary-light border-indigo-100" value={formState.employeeId} onChange={e => setFormState({...formState, employeeId: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Access Level</label>
                    <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary-light" value={formState.role} onChange={e => setFormState({...formState, role: e.target.value as any})}>
                      <option value="EMPLOYEE">Employee</option>
                      <option value="MANAGER">Manager</option>
                      <option value="TEAM_LEAD">Team Leader</option>
                      <option value="MANAGEMENT">Management</option>
                      <option value="HR">HR Specialist</option>
                      <option value="ADMIN">Administrator</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Work Email</label>
                  <input type="email" required disabled={!!editingId} className="w-full px-5 py-4 bg-slate-100 border border-slate-200 rounded-2xl font-bold text-sm outline-none disabled:opacity-50" value={formState.email} onChange={e => setFormState({...formState, email: e.target.value})} />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1">
                    <Key size={10} /> {editingId ? 'Reset Password' : 'Initial Password'}
                  </label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required={!editingId} // Required only on creation
                      placeholder={editingId ? "Leave blank to keep current" : "Set login password"}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary-light" 
                      value={formState.password} 
                      onChange={e => setFormState({...formState, password: e.target.value})} 
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Assigned Team</label>
                  <select
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary-light"
                    value={formState.teamId}
                    onChange={e => {
                      const selectedTeamId = e.target.value;
                      const selectedTeam = teams.find(t => t.id === selectedTeamId);
                      const leaderId = selectedTeam?.leaderId || '';
                      console.log('[EmployeeDirectory] Team changed to:', selectedTeamId, '| Auto-setting line manager:', leaderId);
                      setFormState({...formState, teamId: selectedTeamId, lineManagerId: leaderId});
                    }}
                  >
                    <option value="">No Team Assigned</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                {shifts.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Assigned Shift</label>
                    <select
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary-light"
                      value={formState.shiftId}
                      onChange={e => {
                        console.log('[EmployeeDirectory] Shift changed to:', e.target.value);
                        setFormState({...formState, shiftId: e.target.value});
                      }}
                    >
                      <option value="">No Shift Assigned</option>
                      {shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.startTime}-{s.endTime}){s.isDefault ? ' *' : ''}</option>)}
                    </select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Department</label>
                  <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary-light" value={formState.department} onChange={e => setFormState({...formState, department: e.target.value})}>
                    {depts.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Designation</label>
                  <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary-light" value={formState.designation} onChange={e => setFormState({...formState, designation: e.target.value})}>
                    {desigs.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-50 flex flex-col sm:flex-row gap-4">
                <button type="button" disabled={isSubmitting} onClick={() => setShowModal(false)} className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-xl font-semibold uppercase text-[11px] tracking-widest">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-5 bg-primary text-white rounded-xl font-semibold uppercase text-[11px] tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-primary-hover">
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
