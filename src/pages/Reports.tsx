
import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, Calendar, Clock, RefreshCw, User as UserIcon, Search, FileSpreadsheet, MapPin, 
  Activity, AlertCircle, HelpCircle, CheckCircle2, CheckCircle, Settings2, Mail, CheckSquare, Square, Layout
} from 'lucide-react';
import { hrService } from '../services/hrService';
import { emailService } from '../services/emailService';
import { User, Employee, Attendance, LeaveRequest, AppConfig, Holiday } from '../types';
import { consolidateAttendance } from '../utils/attendanceUtils';

interface ReportsProps {
  user: User;
}

const Reports: React.FC<ReportsProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'GENERATOR' | 'CONFIG'>('GENERATOR');
  const [reportType, setReportType] = useState('ATTENDANCE');
  
  // Data States
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [dbDepartments, setDbDepartments] = useState<string[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  
  // Log State
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [isHookMissing, setIsHookMissing] = useState(false);
  
  // Filter States
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [employeeFilter, setEmployeeFilter] = useState('All Employees');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Recipient State
  const [customRecipients, setCustomRecipients] = useState('');

  // UI States
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [enabledColumns, setEnabledColumns] = useState<Record<string, boolean>>({
    'Employee_ID': true, 'Name': true, 'Date': true, 'Status_Type': true,
    'Check_In': true, 'Check_Out': true, 'Location': true, 'Latitude': true, 'Longitude': true, 'Remarks': true
  });

  const columnOptions = [
    { key: 'Employee_ID', label: 'Employee ID', icon: UserIcon },
    { key: 'Name', label: 'Full Name', icon: Layout },
    { key: 'Date', label: 'Entry Date', icon: Calendar },
    { key: 'Status_Type', label: 'Status', icon: CheckCircle2 },
    { key: 'Check_In', label: 'Clock In', icon: Clock },
    { key: 'Check_Out', label: 'Clock Out', icon: Clock },
    { key: 'Location', label: 'GPS Address', icon: MapPin },
    { key: 'Latitude', label: 'Latitude', icon: Search },
    { key: 'Longitude', label: 'Longitude', icon: Search },
    { key: 'Remarks', label: 'Notes', icon: FileText },
  ];

  const fetchLogs = async () => {
    try {
      const logs = await hrService.getReportQueueLog();
      setEmailLogs(logs);
      const now = new Date();
      const recentPending = logs.some(l => {
        const created = new Date(l.created);
        const diffSeconds = (now.getTime() - created.getTime()) / 1000;
        return l.status === 'PENDING' && diffSeconds > 10;
      });
      setIsHookMissing(recentPending);
    } catch(e) { console.warn("Failed to fetch logs"); }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [emps, atts, lvs, depts, config, hols] = await Promise.all([
          hrService.getEmployees(), 
          hrService.getAttendance(), 
          hrService.getLeaves(),
          hrService.getDepartments(),
          hrService.getConfig(),
          hrService.getHolidays()
        ]);
        setEmployees(emps); 
        setAttendance(atts); 
        setLeaves(lvs);
        setDbDepartments(depts);
        setAppConfig(config);
        setHolidays(hols);
        setSelectedDepts(depts);
        setCustomRecipients(config.defaultReportRecipient || user.email || '');
        await fetchLogs();
      } catch (err) {
        console.error("Report data load failed", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [user.id]);

  const toggleDept = (dept: string) => {
    setSelectedDepts(prev => 
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  };

  const reportData = useMemo(() => {
    let combinedData: any[] = [];
    const isAttendanceReport = reportType === 'ATTENDANCE' || reportType === 'ABSENT' || reportType === 'LATE';

    // 1. Filter Records
    const filteredAttendance = attendance.filter(item => {
      if (item.date < startDate || item.date > endDate) return false;
      const emp = employees.find(e => e.id === item.employeeId);
      if (!emp) return false;
      if (selectedDepts.length > 0 && !selectedDepts.includes(emp.department)) return false;
      if (employeeFilter !== 'All Employees' && item.employeeId !== employeeFilter) return false;
      return true;
    });

    const filteredLeaves = leaves.filter(item => {
      if (item.startDate < startDate || item.startDate > endDate) return false;
      const emp = employees.find(e => e.id === item.employeeId);
      if (!emp) return false;
      if (selectedDepts.length > 0 && !selectedDepts.includes(emp.department)) return false;
      if (employeeFilter !== 'All Employees' && item.employeeId !== employeeFilter) return false;
      return true;
    });

    if (isAttendanceReport) {
      // Consolidate Attendance (Utilize Shared Logic)
      // This ensures Min(CheckIn) and Max(CheckOut) are used
      combinedData = consolidateAttendance(filteredAttendance);

      // Gap Analysis
      if (appConfig) {
        const workingDays = appConfig.workingDays || [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        const targetEmployees = employees.filter(e => {
          if (e.status !== 'ACTIVE') return false; 
          if (selectedDepts.length > 0 && !selectedDepts.includes(e.department)) return false;
          if (employeeFilter !== 'All Employees' && e.id !== employeeFilter) return false;
          return true;
        });

        // Use a set for quick lookup
        const presentSet = new Set(combinedData.map(d => `${d.employeeId}_${d.date}`));

        for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
          const dateStr = dt.toISOString().split('T')[0];
          const dayName = dt.toLocaleDateString('en-US', { weekday: 'long' });
          const isHoliday = holidays.some(h => h.date === dateStr);
          
          if (!workingDays.includes(dayName) || isHoliday) continue;

          targetEmployees.forEach(emp => {
            if (emp.joiningDate && emp.joiningDate > dateStr) return;
            const isPresent = presentSet.has(`${emp.id}_${dateStr}`);
            const isOnLeave = filteredLeaves.some(l => 
              l.employeeId === emp.id && l.status === 'APPROVED' && 
              dateStr >= l.startDate.split(' ')[0] && dateStr <= l.endDate.split(' ')[0]
            );

            if (!isPresent && !isOnLeave) {
              combinedData.push({
                id: `absent-${emp.id}-${dateStr}`,
                employeeId: emp.id,
                employeeName: emp.name,
                date: dateStr,
                status: 'ABSENT',
                checkIn: '-',
                checkOut: '-',
                location: { address: 'Not Detected' },
                remarks: 'System Generated: No punch-in detected.'
              });
            }
          });
        }
      }
    } else {
      combinedData = filteredLeaves;
    }

    if (reportType === 'LATE') combinedData = combinedData.filter(a => a.status === 'LATE');
    if (reportType === 'ABSENT') combinedData = combinedData.filter(a => a.status === 'ABSENT');

    return combinedData.sort((a, b) => {
        const dateA = a.date || a.startDate;
        const dateB = b.date || b.startDate;
        return dateB.localeCompare(dateA);
    });
  }, [reportType, startDate, endDate, selectedDepts, employeeFilter, attendance, employees, leaves, appConfig, holidays]);

  const downloadCSV = () => {
    if (reportData.length === 0) { alert("No data to export."); return; }
    setIsGenerating(true);
    setTimeout(() => {
      const cleanData = reportData.map((row: any) => {
        const fullRow: any = {
          Employee_ID: row.employeeId || row.id || 'N/A',
          Name: row.employeeName || row.name || 'N/A',
          Date: row.date || row.startDate || 'N/A',
          Status_Type: row.status || row.type || 'N/A',
          Check_In: row.checkIn || 'N/A',
          Check_Out: row.checkOut || 'N/A',
          Location: row.location?.address || 'N/A',
          Latitude: row.location?.lat || 'N/A',
          Longitude: row.location?.lng || 'N/A',
          Remarks: row.remarks || row.reason || ''
        };
        const filteredRow: any = {};
        Object.keys(enabledColumns).forEach(col => { if (enabledColumns[col]) filteredRow[col] = fullRow[col]; });
        return filteredRow;
      });
      const headers = Object.keys(cleanData[0]).join(",");
      const rows = cleanData.map(obj => Object.values(obj).map(val => `"${String(val).replace(/"/g, '""')}"`).join(","));
      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers + "\n" + rows.join("\n");
      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csvContent));
      link.setAttribute("download", `OpenHR_${reportType}_Export.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsGenerating(false);
    }, 500);
  };

  const handleEmailSummary = async () => {
    if (reportData.length === 0) { alert("There is no data in the current report to email."); return; }
    setIsEmailing(true);
    try {
      const rawTarget = customRecipients;
      if (!rawTarget) throw new Error("Please enter at least one recipient email address.");
      const targets = rawTarget.split(',').map(t => t.trim()).filter(t => t.includes('@'));
      if (targets.length === 0) throw new Error("No valid email addresses found.");

      const BATCH_SIZE = 350;
      const chunks = [];
      for (let i = 0; i < reportData.length; i += BATCH_SIZE) { chunks.push(reportData.slice(i, i + BATCH_SIZE)); }

      let totalEmails = 0;
      for (const target of targets) {
        for (let i = 0; i < chunks.length; i++) {
           const chunk = chunks[i];
           const suffix = chunks.length > 1 ? ` [Part ${i+1}/${chunks.length}]` : '';
           await emailService.sendDailyAttendanceSummary(target, chunk as Attendance[], suffix);
           totalEmails++;
        }
      }
      alert(`Report summary queued for ${targets.length} recipient(s).`);
      setTimeout(fetchLogs, 1000);
    } catch (err: any) { alert(err.message || "Email relay failed."); } 
    finally { setIsEmailing(false); }
  };

  if (isLoading) return <div className="flex flex-col items-center justify-center h-64 text-slate-400"><RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-4" /><p className="text-xs font-black uppercase tracking-widest text-slate-400">Initializing Reporting Engine...</p></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Audit & Reports</h1>
          <p className="text-slate-500 font-medium text-sm">Consolidated data extraction (First-In / Last-Out)</p>
        </div>
        <div className="flex p-1 bg-white border border-slate-100 rounded-3xl shadow-sm">
          <button onClick={() => setActiveTab('GENERATOR')} className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'GENERATOR' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Generator</button>
          <button onClick={() => setActiveTab('CONFIG')} className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'CONFIG' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Columns</button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2">
          {activeTab === 'GENERATOR' ? (
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-8 md:p-12 space-y-12 animate-in slide-in-from-left-4 duration-500">
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">1. Target Departments ({selectedDepts.length}/{dbDepartments.length})</p>
                  <div className="flex gap-4">
                    <button onClick={() => setSelectedDepts(dbDepartments)} className="text-[9px] font-black uppercase text-indigo-600 hover:underline">Select All</button>
                    <button onClick={() => setSelectedDepts([])} className="text-[9px] font-black uppercase text-rose-500 hover:underline">Clear All</button>
                  </div>
                </div>
                 <div className="max-h-60 overflow-y-auto no-scrollbar grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-1 border border-slate-50 rounded-3xl py-4 bg-slate-50/30">
                    {dbDepartments.map(dept => {
                      const isSelected = selectedDepts.includes(dept);
                      return (
                        <button key={dept} onClick={() => toggleDept(dept)} className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left ${isSelected ? 'bg-white border-indigo-200 shadow-sm' : 'bg-transparent border-transparent opacity-60'}`}>
                          <div className={`p-1 rounded-md ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>{isSelected ? <CheckSquare size={14} /> : <Square size={14} />}</div>
                          <span className={`text-[11px] font-bold truncate ${isSelected ? 'text-indigo-900' : 'text-slate-500'}`}>{dept}</span>
                        </button>
                      );
                    })}
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4">
                <div className="space-y-6">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">2. Report Type</p>
                  <div className="space-y-3">
                    {['ATTENDANCE', 'ABSENT', 'LATE', 'LEAVE'].map((id) => (
                      <button key={id} onClick={() => setReportType(id)} className={`w-full flex items-center gap-4 p-5 rounded-[2rem] border transition-all ${reportType === id ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
                        <div className={`p-2.5 rounded-xl ${reportType === id ? 'bg-white/10' : 'bg-indigo-500 text-white'}`}><FileText size={20} /></div>
                        <span className="font-black text-xs uppercase tracking-tight">{id} Report</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">3. Refining Parameters</p>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <div className="flex-1 space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">From</label><input type="date" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold outline-none" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
                        <div className="flex-1 space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">To</label><input type="date" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
                      </div>
                      <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Employee Scoping</label><select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs outline-none" value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)}><option value="All Employees">All Individual Employees</option>{employees.filter(e => { if (selectedDepts.length === 0) return true; return selectedDepts.includes(e.department || ''); }).map(e => <option key={e.id} value={e.id}>{e.name} ({e.employeeId})</option>)}</select></div>
                      <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Recipient(s)</label><input type="text" placeholder="email1@example.com, email2@example.com" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs outline-none" value={customRecipients} onChange={e => setCustomRecipients(e.target.value)}/></div>
                    </div>
                  </div>
                  <div className="pt-4"><button onClick={handleEmailSummary} disabled={isEmailing || reportData.length === 0} className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-50 hover:text-indigo-600 transition-all shadow-sm disabled:opacity-50">{isEmailing ? <RefreshCw className="animate-spin" size={16}/> : <Mail size={16}/>} Email Scoped Summary</button></div>
                </div>
              </div>

              <div className="pt-10 border-t border-slate-50"><button onClick={downloadCSV} disabled={isGenerating || reportData.length === 0} className="w-full flex items-center justify-center gap-3 py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50">{isGenerating ? <RefreshCw className="animate-spin" size={18} /> : <FileSpreadsheet size={18} />} Generate CSV Export</button></div>
            </div>
          ) : (
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-8 md:p-12 animate-in slide-in-from-right-4 duration-500">
              <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-3"><Settings2 className="text-indigo-500" /> Export Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{columnOptions.map((col) => (<button key={col.key} onClick={() => setEnabledColumns(p => ({...p, [col.key]: !p[col.key]}))} className={`flex items-center justify-between p-5 rounded-3xl border transition-all ${enabledColumns[col.key] ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}><div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${enabledColumns[col.key] ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-400'}`}><col.icon size={16} /></div><span className="text-[10px] font-black uppercase tracking-tight">{col.label}</span></div>{enabledColumns[col.key] && <CheckCircle size={18} className="text-indigo-600" />}</button>))}</div>
            </div>
          )}
        </div>

        <div className="bg-[#0f172a] rounded-[3rem] p-8 text-white shadow-2xl space-y-8 flex flex-col sticky top-24 h-fit animate-in zoom-in duration-700">
           <div className="flex-1 space-y-8">
             <div className="flex items-center justify-between"><h3 className="text-xl font-black flex items-center gap-3"><Search className="text-indigo-400" /> Live Preview</h3><div className="p-2 bg-white/10 rounded-xl cursor-pointer hover:bg-white/20 transition-all" onClick={fetchLogs} title="Refresh Email Status"><RefreshCw size={16} /></div></div>
             <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 text-center space-y-6"><div><p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Records to Export</p><p className="text-6xl font-black text-white">{reportData.length}</p></div><div className="h-px bg-white/10 w-1/2 mx-auto"></div><div className="space-y-1"><p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Departments Scoped</p><div className="flex flex-wrap justify-center gap-1.5 px-2">{selectedDepts.length === dbDepartments.length ? (<span className="text-[9px] font-bold text-white bg-white/10 px-2 py-0.5 rounded-full">Entire Organization</span>) : selectedDepts.length === 0 ? (<span className="text-[9px] font-bold text-rose-400">No Selection</span>) : (selectedDepts.slice(0, 3).map(d => (<span key={d} className="text-[8px] font-black text-white bg-white/10 px-2 py-0.5 rounded-full uppercase truncate max-w-[80px]">{d}</span>)))}{selectedDepts.length > 3 && (<span className="text-[8px] font-black text-white bg-indigo-500/20 px-2 py-0.5 rounded-full uppercase">+{selectedDepts.length - 3} More</span>)}</div></div></div>
             <div className="space-y-4"><div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500"><Activity size={14} className="text-indigo-400" /> Recent Email Activity</div><div className="bg-slate-900 border border-white/10 rounded-3xl p-2 max-h-48 overflow-y-auto no-scrollbar space-y-1">{emailLogs.length === 0 ? (<p className="text-center text-[9px] font-black text-slate-600 uppercase py-4">No recent activity</p>) : (emailLogs.map(log => (<div key={log.id} className="p-3 bg-white/5 rounded-2xl flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-[9px] font-bold text-white truncate">{log.recipient_email}</p><p className="text-[8px] font-medium text-slate-500 truncate">{log.subject}</p></div><div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${log.status === 'SENT' ? 'bg-emerald-500/20 text-emerald-400' : log.status === 'FAILED' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>{log.status}</div></div>)))}</div>{emailLogs.some(l => l.status === 'FAILED') && (<div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex gap-2"><AlertCircle size={14} className="text-rose-400 flex-shrink-0" /><p className="text-[9px] font-medium text-rose-300 leading-tight">Some emails failed. Verify SMTP settings in Admin Panel &gt; Settings &gt; Mail.</p></div>)}{isHookMissing && (<div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-2"><HelpCircle size={14} className="text-amber-400 flex-shrink-0" /><div className="space-y-1"><p className="text-[9px] font-bold text-amber-300 leading-tight uppercase">Backend Hook Not Detected</p><p className="text-[8px] font-medium text-amber-400/80 leading-tight">Emails are stuck in PENDING. Ensure <code>main.pb.js</code> is in your PocketBase <code>pb_hooks</code> folder.</p></div></div>)}</div>
           </div>
           <div className="p-6 bg-indigo-500/10 rounded-[2rem] border border-indigo-500/20"><p className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.3em] mb-2">Technical Info</p><div className="space-y-1 text-[10px] font-bold text-slate-300 uppercase"><p>Format: UTF-8 CSV</p><p>Mode: First & Last Punch</p><p>Columns: {Object.values(enabledColumns).filter(Boolean).length} Active</p></div></div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
