
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  Mail, 
  FileText, 
  Calendar, 
  Filter, 
  CheckCircle2,
  Clock,
  TrendingUp,
  Zap,
  RefreshCw,
  User as UserIcon,
  Search,
  Eye,
  FileSpreadsheet,
  Printer,
  UserMinus,
  Settings2,
  ListChecks,
  CheckCircle,
  Layout,
  ArrowRight,
  Save
} from 'lucide-react';
import { emailService } from '../services/emailService';
import { hrService } from '../services/hrService';
import { DEPARTMENTS } from '../constants.tsx';
import { User, Employee } from '../types';

interface ReportsProps {
  user: User;
}

type ReportTab = 'GENERATOR' | 'CONFIG';

const Reports: React.FC<ReportsProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('GENERATOR');
  const [reportType, setReportType] = useState('ATTENDANCE');
  
  // Load initial recipient from config, fallback to user email
  const currentConfig = hrService.getConfig();
  const [recipientEmail, setRecipientEmail] = useState(currentConfig.defaultReportRecipient || user.email);
  const [isSavingDefault, setIsSavingDefault] = useState(false);

  const [departmentFilter, setDepartmentFilter] = useState('Entire Organization');
  const [employeeFilter, setEmployeeFilter] = useState('All Employees');
  
  const employees = useMemo(() => hrService.getEmployees(), []);

  // Excel Format Configuration
  const [enabledColumns, setEnabledColumns] = useState<Record<string, boolean>>({
    'Employee_ID': true,
    'Name': true,
    'Date': true,
    'Status_Type': true,
    'Check_In': true,
    'Check_Out': true,
    'Location': true,
    'Remarks': true,
    'End_Date': false
  });

  const columnOptions = [
    { key: 'Employee_ID', label: 'Employee ID', icon: UserIcon },
    { key: 'Name', label: 'Full Name', icon: Layout },
    { key: 'Date', label: 'Entry Date', icon: Calendar },
    { key: 'End_Date', label: 'End Date', icon: Calendar },
    { key: 'Status_Type', label: 'Attendance Status', icon: CheckCircle2 },
    { key: 'Check_In', label: 'Clock In Time', icon: Clock },
    { key: 'Check_Out', label: 'Clock Out Time', icon: Clock },
    { key: 'Location', label: 'GPS Location', icon: Search },
    { key: 'Remarks', label: 'Remarks/Notes', icon: FileText },
  ];

  // Date Range State
  const today = new Date().toISOString().split('T')[0];
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(lastWeek);
  const [endDate, setEndDate] = useState(today);
  
  const [isGenerating, setIsGenerating] = useState(false);

  // Filter Data for Preview & Export
  const reportData = useMemo(() => {
    const allEmployees = hrService.getEmployees();
    const allAttendance = hrService.getAttendance();
    const allLeaves = hrService.getLeaves();

    let filtered = [];

    if (reportType === 'ATTENDANCE' || reportType === 'LATE' || reportType === 'ABSENT') {
      filtered = allAttendance.filter(a => {
        const isWithinDate = a.date >= startDate && a.date <= endDate;
        const emp = allEmployees.find(e => e.id === a.employeeId);
        const isMatchingDept = departmentFilter === 'Entire Organization' || emp?.department === departmentFilter;
        const isMatchingEmp = employeeFilter === 'All Employees' || a.employeeId === employeeFilter;
        return isWithinDate && isMatchingDept && isMatchingEmp;
      });

      if (reportType === 'LATE') filtered = filtered.filter(a => a.status === 'LATE');
      if (reportType === 'ABSENT') filtered = filtered.filter(a => a.status === 'ABSENT');
    }

    if (reportType === 'LEAVE') {
      filtered = allLeaves.filter(l => {
        const isWithinDate = l.startDate >= startDate && l.startDate <= endDate;
        const emp = allEmployees.find(e => e.id === l.employeeId);
        const isMatchingDept = departmentFilter === 'Entire Organization' || emp?.department === departmentFilter;
        const isMatchingEmp = employeeFilter === 'All Employees' || l.employeeId === employeeFilter;
        return isWithinDate && isMatchingDept && isMatchingEmp;
      });
    }

    if (reportType === 'PAYROLL') {
      filtered = allEmployees.filter(e => {
        const isMatchingDept = departmentFilter === 'Entire Organization' || e.department === departmentFilter;
        const isMatchingEmp = employeeFilter === 'All Employees' || e.id === employeeFilter;
        return isMatchingDept && isMatchingEmp;
      });
    }

    return filtered;
  }, [reportType, startDate, endDate, departmentFilter, employeeFilter]);

  const handleSaveEmailAsDefault = () => {
    setIsSavingDefault(true);
    const config = hrService.getConfig();
    hrService.setConfig({
      ...config,
      defaultReportRecipient: recipientEmail
    });
    setTimeout(() => {
      setIsSavingDefault(false);
      alert("Configuration saved. This email will now be used as the default for all future sessions.");
    }, 500);
  };

  const downloadCSV = () => {
    if (reportData.length === 0) {
      alert("No data found for the selected criteria.");
      return;
    }

    // Map data and filter by enabled columns
    const cleanData = reportData.map((row: any) => {
      const fullRow: any = {
        Employee_ID: row.employeeId || row.id || 'N/A',
        Name: row.employeeName || row.name || 'N/A',
        Date: row.date || row.startDate || 'N/A',
        End_Date: row.endDate || 'N/A',
        Status_Type: row.status || row.type || 'N/A',
        Check_In: row.checkIn || 'N/A',
        Check_Out: row.checkOut || 'N/A',
        Location: row.location?.address || 'N/A',
        Remarks: row.remarks || row.reason || ''
      };

      const filteredRow: any = {};
      Object.keys(enabledColumns).forEach(col => {
        if (enabledColumns[col]) {
          filteredRow[col] = fullRow[col];
        }
      });
      return filteredRow;
    });

    const headers = Object.keys(cleanData[0]).join(",");
    const rows = cleanData.map(obj => 
      Object.values(obj).map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")
    );
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers + "\n" + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `OpenHR_${reportType}_${startDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAction = async (action: 'DOWNLOAD' | 'EMAIL') => {
    setIsGenerating(true);
    const reportName = reportOptions.find(o => o.id === reportType)?.label || 'Report';
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (action === 'DOWNLOAD') {
      setIsGenerating(false);
      downloadCSV();
    } else {
      const filters = { startDate, endDate, department: departmentFilter, employeeId: employeeFilter };
      const success = await emailService.sendReport(recipientEmail, reportName, filters);
      setIsGenerating(false);
      if (success) alert(`Success! ${reportName} has been emailed to ${recipientEmail}.`);
      else alert(`Relay Error. Check connection.`);
    }
  };

  const toggleColumn = (key: string) => {
    setEnabledColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const reportOptions = [
    { id: 'ATTENDANCE', label: 'Attendance Log', icon: FileText, color: 'bg-emerald-500' },
    { id: 'ABSENT', label: 'Total Absence', icon: UserMinus, color: 'bg-rose-500' },
    { id: 'LATE', label: 'Late Trends', icon: Clock, color: 'bg-amber-500' },
    { id: 'LEAVE', label: 'Leave Audit', icon: Calendar, color: 'bg-indigo-500' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">System Reports</h1>
          <p className="text-slate-500 font-medium">Generate custom Excel exports with granular column controls</p>
        </div>
        <div className="flex p-1 bg-white border border-slate-100 rounded-3xl shadow-sm">
          <button 
            onClick={() => setActiveTab('GENERATOR')}
            className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'GENERATOR' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Generator
          </button>
          <button 
            onClick={() => setActiveTab('CONFIG')}
            className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'CONFIG' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Format Config
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2">
          {activeTab === 'GENERATOR' ? (
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-8 md:p-12 animate-in slide-in-from-left-4">
              <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-3">
                <Filter className="text-indigo-500" /> Selection Criteria
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">1. Report Category</p>
                  <div className="space-y-3">
                    {reportOptions.map((opt) => (
                      <button 
                        key={opt.id}
                        onClick={() => setReportType(opt.id)}
                        className={`w-full flex items-center gap-4 p-5 rounded-3xl border transition-all ${reportType === opt.id ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'}`}
                      >
                        <div className={`p-2.5 rounded-xl ${reportType === opt.id ? 'bg-white/10' : opt.color + ' text-white'}`}>
                          <opt.icon size={20} />
                        </div>
                        <span className="font-bold text-sm">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">2. Target Individual</p>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <select 
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-3xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                        value={employeeFilter}
                        onChange={e => setEmployeeFilter(e.target.value)}
                      >
                        <option value="All Employees">All Employees</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.id} - {emp.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">3. Recipient Email (Email Dispatch Only)</p>
                      <button 
                        onClick={handleSaveEmailAsDefault}
                        disabled={isSavingDefault}
                        className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                      >
                        {isSavingDefault ? <RefreshCw className="animate-spin" size={10} /> : <Save size={10} />}
                        Save as Default
                      </button>
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="email" 
                        placeholder="Recipient Email"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-3xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                        value={recipientEmail}
                        onChange={e => setRecipientEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">4. Department Filter</label>
                    <div className="relative">
                      <Layout className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <select 
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-3xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                        value={departmentFilter}
                        onChange={e => setDepartmentFilter(e.target.value)}
                      >
                        <option>Entire Organization</option>
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">5. Reporting Period</label>
                    <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-3xl">
                       <div className="flex-1 relative">
                          <input type="date" className="w-full pl-4 pr-2 py-3 bg-white border-none rounded-2xl text-[10px] font-bold outline-none" value={startDate} onChange={e => setStartDate(e.target.value)} />
                       </div>
                       <ArrowRight className="text-slate-300 shrink-0" size={14} />
                       <div className="flex-1 relative">
                          <input type="date" className="w-full pl-4 pr-2 py-3 bg-white border-none rounded-2xl text-[10px] font-bold outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} />
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-10 border-t border-slate-50 mt-10">
                <button 
                  onClick={() => handleAction('DOWNLOAD')}
                  disabled={isGenerating || reportData.length === 0}
                  className="flex-1 flex items-center justify-center gap-3 py-5 bg-white border-2 border-slate-100 rounded-3xl font-black text-[11px] uppercase tracking-[0.2em] text-slate-700 hover:bg-slate-50 hover:border-slate-200 transition-all disabled:opacity-50"
                >
                  {isGenerating ? <RefreshCw className="animate-spin" size={18} /> : <FileSpreadsheet size={18} />}
                  Excel Export
                </button>
                <button 
                  onClick={() => handleAction('EMAIL')}
                  disabled={isGenerating || reportData.length === 0}
                  className="flex-1 flex items-center justify-center gap-3 py-5 bg-indigo-600 text-white rounded-3xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  {isGenerating ? <RefreshCw className="animate-spin" size={18} /> : <Mail size={18} />}
                  Email to {recipientEmail.split('@')[0]}...
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-8 md:p-12 animate-in slide-in-from-right-4">
              <h3 className="text-lg font-black text-slate-900 mb-2 flex items-center gap-3">
                <Settings2 className="text-indigo-500" /> Excel Format Settings
              </h3>
              <p className="text-sm text-slate-500 mb-10">Configure which columns appear in your downloadable Excel/CSV reports.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {columnOptions.map((col) => (
                  <button 
                    key={col.key}
                    onClick={() => toggleColumn(col.key)}
                    className={`flex items-center justify-between p-5 rounded-3xl border transition-all ${enabledColumns[col.key] ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}
                  >
                    <div className="flex items-center gap-3 text-left">
                       <div className={`p-2 rounded-lg ${enabledColumns[col.key] ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                          <col.icon size={16} />
                       </div>
                       <span className={`text-xs font-black uppercase tracking-tight ${enabledColumns[col.key] ? 'text-indigo-900' : 'text-slate-500'}`}>{col.label}</span>
                    </div>
                    {enabledColumns[col.key] && <CheckCircle className="text-indigo-600" size={18} />}
                  </button>
                ))}
              </div>

              <div className="mt-12 p-6 bg-slate-900 rounded-3xl text-white flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <ListChecks size={24} className="text-indigo-400" />
                    <div>
                       <p className="text-sm font-black uppercase">Active Columns</p>
                       <p className="text-[10px] text-slate-400 font-medium">Your current format contains {Object.values(enabledColumns).filter(v => v).length} data points.</p>
                    </div>
                 </div>
                 <button onClick={() => setActiveTab('GENERATOR')} className="px-6 py-3 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Back to Generator</button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-[#0f172a] rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform"><BarChart3 size={120}/></div>
            <h3 className="text-xl font-black mb-6 flex items-center gap-3">
              <Search className="text-indigo-400" /> Export Preview
            </h3>
            <div className="space-y-6 relative z-10">
               <div className="flex flex-col gap-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Target</p>
                  <p className="text-sm font-black text-indigo-300 font-mono truncate">{employeeFilter}</p>
               </div>
               <div className="flex flex-col gap-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Selected Department</p>
                  <p className="text-sm font-black text-white">{departmentFilter}</p>
               </div>
               <div className="flex flex-col gap-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dispatch To</p>
                  <p className="text-sm font-black text-emerald-400 font-mono truncate">{recipientEmail}</p>
               </div>
            </div>
            
            <div className="mt-10 pt-8 border-t border-white/5 space-y-4">
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Output Format</p>
               <button 
                 onClick={downloadCSV}
                 className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
               >
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[10px] font-black uppercase flex items-center gap-2"><FileSpreadsheet size={16} /> DOWNLOAD EXCEL</span>
               </button>
            </div>
          </div>

          <div className="p-8 bg-indigo-50 rounded-[3rem] border border-indigo-100 flex flex-col gap-4">
             <div className="flex items-center gap-3">
                <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-600"><Settings2 size={24} /></div>
                <h4 className="font-black text-indigo-900 uppercase text-xs tracking-tight">Format Overrides</h4>
             </div>
             <p className="text-[11px] text-indigo-700 font-medium leading-relaxed">
               You can modify the Excel structure in the **Format Config** tab. Settings are applied instantly to both local downloads and email attachments.
             </p>
          </div>
        </div>
      </div>

      {/* Live Data Preview Section */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-8 md:p-12 overflow-hidden print:hidden">
        <div className="flex items-center justify-between mb-8">
           <h3 className="text-2xl font-black text-slate-900 flex items-center gap-4">
              <div className="p-3 bg-slate-100 text-slate-900 rounded-2xl"><Eye size={24} /></div>
              Report Preview
           </h3>
           <div className="flex items-center gap-4">
              <span className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
                 {reportData.length} Records
              </span>
              <button onClick={() => window.print()} className="p-3 bg-slate-900 text-white rounded-xl hover:bg-black transition-all">
                 <Printer size={18} />
              </button>
           </div>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          {reportData.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-slate-100">
                  <th className="pb-6 px-4">Subject ID</th>
                  <th className="pb-6 px-4">Name</th>
                  <th className="pb-6 px-4">Date</th>
                  <th className="pb-6 px-4">Status</th>
                  <th className="pb-6 px-4 text-right">Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {reportData.map((row: any, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-6 px-4 font-black text-xs text-slate-400 font-mono">
                      {row.employeeId || row.id}
                    </td>
                    <td className="py-6 px-4">
                      <p className="text-sm font-black text-slate-900">{row.employeeName || row.name || 'N/A'}</p>
                    </td>
                    <td className="py-6 px-4">
                      <p className="text-xs font-bold text-slate-500">{row.date || row.startDate || 'N/A'}</p>
                    </td>
                    <td className="py-6 px-4">
                      <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg ${
                        ['PRESENT', 'APPROVED', 'ACTIVE'].includes(row.status) ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {row.status || row.type || 'N/A'}
                      </span>
                    </td>
                    <td className="py-6 px-4 text-right font-black text-xs text-slate-900">
                      {row.checkIn ? `${row.checkIn} - ${row.checkOut || 'Active'}` : (row.totalDays ? `${row.totalDays} Days` : 'N/A')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-32 text-center">
               <Search size={64} className="mx-auto text-slate-100 mb-6" />
               <h4 className="text-xl font-black text-slate-900 uppercase">No preview available</h4>
               <p className="text-sm text-slate-500 font-medium">Verify your selection criteria or date range.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
