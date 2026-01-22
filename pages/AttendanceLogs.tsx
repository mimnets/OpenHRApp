import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  History, 
  Search, 
  RefreshCw,
  ChevronRight,
  ExternalLink,
  Loader2,
  Camera,
  X,
  SortAsc,
  SortDesc,
  Filter,
  Users,
  Building,
  Trash2,
  Save,
  AlertCircle
} from 'lucide-react';
import { hrService } from '../services/hrService';
import { Attendance, Employee } from '../types';

interface AttendanceLogsProps {
  user: any;
  viewMode?: 'MY' | 'AUDIT';
}

const LogSkeleton = () => (
  <div className="bg-white p-6 rounded-[2.5rem] border border-slate-50 shadow-sm animate-pulse flex flex-col sm:flex-row sm:items-center justify-between gap-6">
    <div className="flex items-center gap-5">
      <div className="w-16 h-16 rounded-[1.25rem] bg-slate-100 flex-shrink-0"></div>
      <div className="space-y-2">
        <div className="h-4 bg-slate-100 rounded w-24"></div>
        <div className="h-3 bg-slate-50 rounded w-32"></div>
      </div>
    </div>
    <div className="h-8 bg-slate-50 rounded-full w-20 hidden sm:block"></div>
  </div>
);

const AttendanceLogs: React.FC<AttendanceLogsProps> = ({ user, viewMode = 'MY' }) => {
  const isAdmin = user.role === 'ADMIN' || user.role === 'HR';
  const isAuditMode = viewMode === 'AUDIT' && isAdmin;
  
  const [logs, setLogs] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  
  const [selectedLog, setSelectedLog] = useState<Attendance | null>(null);
  const [editState, setEditState] = useState<Partial<Attendance>>({});

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const allAttendance = await hrService.getAttendance();
      if (isAuditMode) {
        setLogs(allAttendance);
        const [emps, depts] = await Promise.all([
          hrService.getEmployees(),
          hrService.getDepartments()
        ]);
        setEmployees(emps);
        setDepartments(depts);
      } else {
        setLogs(allAttendance.filter(a => a.employeeId === user.id));
      }
    } catch (err) {
      console.error("Failed to fetch logs", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [user.id, isAuditMode]);

  const handleOpenDetail = (log: Attendance) => {
    setSelectedLog(log);
    setEditState({
      status: log.status,
      checkIn: log.checkIn,
      checkOut: log.checkOut,
      remarks: log.remarks,
      date: log.date
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this attendance record?")) return;
    setIsProcessing(true);
    try {
      await hrService.deleteAttendance(id);
      setSelectedLog(null);
      await fetchInitialData();
    } catch (err) {
      alert("Failed to delete record.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedLog) return;
    setIsProcessing(true);
    try {
      await hrService.updateAttendance(selectedLog.id, editState);
      setSelectedLog(null);
      await fetchInitialData();
    } catch (err) {
      alert("Failed to update record.");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredAndSortedLogs = useMemo(() => {
    let result = [...logs];
    if (searchTerm) {
      result = result.filter(log => 
        (log.date || '').includes(searchTerm) || 
        (log.status || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (isAuditMode) {
      if (employeeFilter !== 'ALL') {
        result = result.filter(log => log.employeeId === employeeFilter);
      }
      if (deptFilter !== 'ALL') {
        result = result.filter(log => {
          const emp = employees.find(e => e.id === log.employeeId);
          return emp?.department === deptFilter;
        });
      }
    }

    const groupedMap = new Map<string, Attendance>();
    result.forEach(log => {
      const key = `${log.employeeId}_${log.date}`;
      if (!groupedMap.has(key)) {
        groupedMap.set(key, { ...log });
      } else {
        const existing = groupedMap.get(key)!;
        if (log.checkIn && (!existing.checkIn || log.checkIn < existing.checkIn)) {
          existing.checkIn = log.checkIn;
        }
        if (log.checkOut && (!existing.checkOut || log.checkOut > existing.checkOut)) {
          existing.checkOut = log.checkOut;
        }
        if (log.remarks && !existing.remarks?.includes(log.remarks)) {
          existing.remarks = existing.remarks ? `${existing.remarks} | ${log.remarks}` : log.remarks;
        }
      }
    });

    const consolidated = Array.from(groupedMap.values());

    return consolidated.sort((a, b) => {
      const dateCompare = (a.date || '').localeCompare(b.date || '');
      if (dateCompare !== 0) {
        return sortOrder === 'desc' ? -dateCompare : dateCompare;
      }
      const timeA = a.checkIn || "";
      const timeB = b.checkIn || "";
      return sortOrder === 'desc' ? -timeA.localeCompare(timeB) : timeA.localeCompare(timeB);
    });
  }, [logs, searchTerm, employeeFilter, deptFilter, sortOrder, isAuditMode, employees]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {isAuditMode ? 'Attendance Audit' : 'My Attendance History'}
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            {isAuditMode ? `Consolidated org-wide activity (Earliest-In / Latest-Out)` : 'Your consolidated workday records'}
          </p>
        </div>
        <button 
          onClick={fetchInitialData}
          className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-400 hover:text-indigo-600 transition-all"
        >
          <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </header>

      {/* Filter Bar */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-50 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-[2]">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              type="text" 
              placeholder="Search by date (YYYY-MM-DD)..."
              className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-50/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {isAuditMode && (
            <>
              <div className="relative flex-1">
                <Users className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <select 
                  className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-sm font-bold outline-none appearance-none"
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                >
                  <option value="ALL">All Employees</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div className="relative flex-1">
                <Building className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <select 
                  className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-sm font-bold outline-none appearance-none"
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                >
                  <option value="ALL">All Departments</option>
                  {departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <button 
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] flex items-center justify-center gap-3 text-slate-500 hover:text-indigo-600 hover:bg-white transition-all whitespace-nowrap"
          >
            {sortOrder === 'desc' ? <SortDesc size={20} /> : <SortAsc size={20} />}
            <span className="text-[10px] font-black uppercase tracking-widest">{sortOrder === 'desc' ? 'Latest' : 'Oldest'}</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <>
            <LogSkeleton />
            <LogSkeleton />
            <LogSkeleton />
          </>
        ) : filteredAndSortedLogs.map((log) => {
          const emp = employees.find(e => e.id === log.employeeId);
          return (
            <div 
              key={log.id} 
              onClick={() => handleOpenDetail(log)}
              className="bg-white p-6 rounded-[2.5rem] border border-slate-50 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-6"
            >
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-[1.25rem] overflow-hidden bg-slate-50 border border-slate-100 flex-shrink-0">
                  {log.selfie ? (
                    <img 
                      src={log.selfie} 
                      loading="lazy"
                      className="w-full h-full object-cover scale-x-[-1]" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-200">
                      <Camera size={24} />
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-slate-900">
                      {new Date(log.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </h4>
                    <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                      log.status === 'LATE' ? 'bg-amber-50 text-amber-600' : 
                      log.status === 'ABSENT' ? 'bg-rose-50 text-rose-600' : 
                      'bg-emerald-50 text-emerald-600'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {isAuditMode && (
                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-tight">
                        {log.employeeName || emp?.name || 'Unknown User'} 
                        <span className="mx-2 text-slate-300">•</span>
                        {emp?.department || 'Staff'}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-indigo-500" />
                        <span className="text-[10px] font-black uppercase tracking-tight">{log.checkIn || '--:--'} — {log.checkOut || 'Active'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                        <MapPin size={12} className="text-rose-500" />
                        <span className="text-[10px] font-black uppercase tracking-tight truncate">{log.location?.address || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <ChevronRight className="text-slate-200 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all hidden sm:block" size={24} />
            </div>
          );
        })}

        {!isLoading && filteredAndSortedLogs.length === 0 && (
          <div className="py-20 text-center space-y-4">
             <History size={48} className="mx-auto text-slate-100" />
             <p className="text-slate-400 font-black uppercase text-xs tracking-widest">No matching logs found.</p>
          </div>
        )}
      </div>

      {/* Log Detail & Admin Edit Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-slate-900 p-8 flex justify-between items-center text-white">
              <div className="space-y-1">
                <h3 className="text-xl font-black uppercase tracking-tight">
                  {isAuditMode ? 'Modify Audit Record' : 'Log Details'}
                </h3>
                {isAuditMode && <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Manual Correction Mode</p>}
              </div>
              <button onClick={() => setSelectedLog(null)} className="hover:bg-white/10 p-2 rounded-xl transition-all"><X size={28} /></button>
            </div>
            
            <div className="p-8 md:p-10 space-y-8 max-h-[80vh] overflow-y-auto no-scrollbar">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="w-48 h-60 rounded-[2.5rem] overflow-hidden border-4 border-slate-100 shadow-xl bg-slate-50 flex-shrink-0 relative group">
                  {selectedLog.selfie ? (
                    <img src={selectedLog.selfie} className="w-full h-full object-cover scale-x-[-1]" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-200 bg-slate-100"><Camera size={48} /></div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                     <Camera className="text-white" />
                  </div>
                </div>

                <div className="flex-1 w-full space-y-6">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Employee Profile</p>
                    <p className="font-black text-slate-900 text-xl leading-none">
                      {selectedLog.employeeName || employees.find(e => e.id === selectedLog.employeeId)?.name}
                    </p>
                    <p className="text-[10px] font-bold text-slate-500">
                      Employee ID: {selectedLog.employeeId === user.id ? user.employeeId : (employees.find(e => e.id === selectedLog.employeeId)?.employeeId || selectedLog.employeeId)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Log Date</label>
                      <input 
                        type="date" 
                        readOnly={!isAuditMode}
                        className={`w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black ${!isAuditMode && 'opacity-70 cursor-not-allowed'}`}
                        value={editState.date}
                        onChange={e => setEditState({...editState, date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Status</label>
                      {isAuditMode ? (
                        <select 
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black"
                          value={editState.status}
                          onChange={e => setEditState({...editState, status: e.target.value as any})}
                        >
                          <option value="PRESENT">Present</option>
                          <option value="LATE">Late</option>
                          <option value="ABSENT">Absent</option>
                          <option value="EARLY_OUT">Early Out</option>
                          <option value="LEAVE">Leave</option>
                        </select>
                      ) : (
                        <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black text-indigo-600 uppercase">
                          {selectedLog.status}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Workday Earliest In</label>
                    <input 
                      type="time" 
                      readOnly={!isAuditMode}
                      className={`w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm ${!isAuditMode && 'opacity-70 cursor-not-allowed'}`}
                      value={editState.checkIn}
                      onChange={e => setEditState({...editState, checkIn: e.target.value})}
                    />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Workday Latest Out</label>
                    <input 
                      type="time" 
                      readOnly={!isAuditMode}
                      className={`w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm ${!isAuditMode && 'opacity-70 cursor-not-allowed'}`}
                      value={editState.checkOut}
                      onChange={e => setEditState({...editState, checkOut: e.target.value})}
                    />
                 </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                  <MapPin size={12} className="text-rose-500" /> GPS Validation (Initial)
                </label>
                <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                   <div className="flex-1 pr-4">
                      <p className="text-xs font-bold text-slate-700">{selectedLog.location?.address}</p>
                      <p className="text-[9px] font-mono text-slate-400 mt-1">{selectedLog.location?.lat.toFixed(6)}, {selectedLog.location?.lng.toFixed(6)}</p>
                   </div>
                   <a 
                    href={`https://www.google.com/maps?q=${selectedLog.location?.lat},${selectedLog.location?.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 bg-white text-indigo-600 rounded-xl shadow-sm border border-indigo-50 hover:bg-indigo-600 hover:text-white transition-all"
                  >
                    <ExternalLink size={18} />
                  </a>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Workday Activity Audit Trail</label>
                <textarea 
                  readOnly={!isAuditMode}
                  placeholder="Notes for this workday..."
                  className={`w-full p-5 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium min-h-[100px] outline-none ${!isAuditMode && 'opacity-70 cursor-not-allowed italic text-slate-500'}`}
                  value={editState.remarks}
                  onChange={e => setEditState({...editState, remarks: e.target.value})}
                />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-50">
                {isAuditMode ? (
                  <>
                    <button 
                      onClick={() => handleDelete(selectedLog.id)}
                      disabled={isProcessing}
                      className="flex-1 py-5 bg-rose-50 text-rose-600 rounded-[2rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-rose-100 transition-all"
                    >
                      <Trash2 size={16} /> Delete Record
                    </button>
                    <button 
                      onClick={handleUpdate}
                      disabled={isProcessing}
                      className="flex-[1.5] py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-xl hover:bg-indigo-700 transition-all"
                    >
                      {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />} 
                      Save Corrections
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setSelectedLog(null)}
                    className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl"
                  >
                    Close Log View
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceLogs;