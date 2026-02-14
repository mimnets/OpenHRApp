
import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock, MapPin, History, Search, RefreshCw, ChevronRight, ExternalLink,
  Camera, X, SortAsc, SortDesc, Users, Building, Trash2, Save,
  Calculator, UserX
} from 'lucide-react';
import { hrService } from '../services/hrService';
import { Attendance, Employee, AppConfig } from '../types';
import { consolidateAttendance, calculatePunctuality, calculateDuration } from '../utils/attendanceUtils';

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
  const isManager = user.role === 'MANAGER';
  const isAuditMode = viewMode === 'AUDIT' && (isAdmin || isManager);
  
  const [logs, setLogs] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  
  const [selectedLog, setSelectedLog] = useState<Attendance | null>(null);
  const [editState, setEditState] = useState<Partial<Attendance>>({});
  
  // Local Override State for Calculation (Not saved to DB, just for calculating status)
  const [tempShift, setTempShift] = useState({ start: '09:00', end: '18:00', grace: 0 });

  // Manual Absent State
  const [showAbsentModal, setShowAbsentModal] = useState(false);
  const [absentForm, setAbsentForm] = useState({ employeeId: '', date: new Date().toISOString().split('T')[0], remarks: 'Absent / No Show' });

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [allAttendance, fetchedEmployees, depts, appConfig] = await Promise.all([
        hrService.getAttendance(),
        hrService.getEmployees(),
        hrService.getDepartments(),
        hrService.getConfig()
      ]);

      setConfig(appConfig);

      if (isAuditMode) {
        if (isAdmin) {
          setEmployees(fetchedEmployees);
          setDepartments(depts);
          setLogs(allAttendance);
        } else if (isManager) {
          const managedEmployees = fetchedEmployees.filter(e => 
            (user.teamId && e.teamId === user.teamId) || 
            (e.lineManagerId === user.id)
          );
          const managedIds = managedEmployees.map(e => e.id);
          setEmployees(managedEmployees);
          const relevantDepts = Array.from(new Set(managedEmployees.map(e => e.department).filter(Boolean) as string[]));
          setDepartments(relevantDepts);
          setLogs(allAttendance.filter(a => managedIds.includes(a.employeeId)));
        }
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
  }, [user.id, viewMode, user.role]);

  // Helper to force HH:mm format (required for input type="time")
  const ensureTimeFormat = (timeStr: string | undefined) => {
    if (!timeStr || timeStr === '-' || timeStr.trim() === '') return '';
    try {
      const parts = timeStr.trim().split(':');
      if (parts.length < 2) return ''; 
      const h = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      return `${h}:${m}`;
    } catch (e) { return ''; }
  };

  const handleOpenDetail = async (log: Attendance) => {
    setSelectedLog(log);

    // Initialize Edit State with proper formatting
    setEditState({
      status: log.status,
      checkIn: ensureTimeFormat(log.checkIn),
      checkOut: ensureTimeFormat(log.checkOut),
      remarks: log.remarks,
      date: log.date
    });

    // Resolve per-employee shift for this log's employee
    const emp = employees.find(e => e.id === log.employeeId);
    const shift = await hrService.resolveShiftForEmployee(log.employeeId, emp?.shiftId, log.date);

    // Initialize Temp Shift: per-employee shift > global config
    setTempShift({
      start: ensureTimeFormat(shift?.startTime || config?.officeStartTime || '09:00'),
      end: ensureTimeFormat(shift?.endTime || config?.officeEndTime || '18:00'),
      grace: shift?.lateGracePeriod ?? config?.lateGracePeriod ?? 0
    });
  };

  const handleManualAbsent = async () => {
    if (!absentForm.employeeId) return;
    setIsProcessing(true);
    try {
      const emp = employees.find(e => e.id === absentForm.employeeId);
      await hrService.saveAttendance({
        id: '',
        employeeId: absentForm.employeeId,
        employeeName: emp?.name,
        date: absentForm.date,
        checkIn: '-',
        checkOut: '-',
        status: 'ABSENT',
        remarks: `[Manual Entry] ${absentForm.remarks}`,
        location: { lat: 0, lng: 0, address: 'N/A' },
        dutyType: 'OFFICE'
      });
      setShowAbsentModal(false);
      await fetchInitialData();
    } catch (e) { alert("Failed to save."); }
    finally { setIsProcessing(false); }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
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
    if (!isAdmin) return;
    if (!selectedLog) return;
    setIsProcessing(true);
    try {
      // Restore '-' if empty string to maintain convention
      const finalState = {
        ...editState,
        checkIn: editState.checkIn || '-',
        checkOut: editState.checkOut || '-'
      };
      await hrService.updateAttendance(selectedLog.id, finalState);
      setSelectedLog(null);
      await fetchInitialData();
    } catch (err) {
      alert("Failed to update record.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper to re-calc status based on times AND local shift overrides
  const autoCalculateStatus = () => {
    if (!editState.checkIn) return;
    // Use the temporary shift values for calculation
    const newStatus = calculatePunctuality(editState.checkIn, tempShift.start, tempShift.grace);
    setEditState(prev => ({ ...prev, status: newStatus }));
  };

  const filteredAndSortedLogs = useMemo(() => {
    let result = [...logs];
    
    if (searchTerm) {
      result = result.filter(log => 
        (log.date || '').includes(searchTerm) || 
        (log.status || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase())
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

    // Utilize the unified consolidation logic from utils
    const consolidated = consolidateAttendance(result);

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
            {isAuditMode ? (isAdmin ? 'Attendance Audit' : 'Team Attendance') : 'My Attendance History'}
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            {isAuditMode ? 'Consolidated organization tracking (First-In / Last-Out)' : 'Your consolidated workday records'}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && isAuditMode && (
            <button 
              onClick={() => setShowAbsentModal(true)}
              className="p-3 bg-rose-50 border border-rose-100 rounded-2xl shadow-sm text-rose-600 hover:bg-rose-100 transition-all flex items-center gap-2"
            >
              <UserX size={20} /> <span className="text-xs font-bold uppercase hidden md:inline">Mark Absent</span>
            </button>
          )}
          <button 
            onClick={fetchInitialData}
            className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-400 hover:text-primary transition-all"
          >
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-50 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-[2]">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              type="text" 
              placeholder="Search by name, date or status..."
              className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-sm font-bold outline-none focus:ring-4 focus:ring-primary-light"
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
                  <option value="ALL">{isAdmin ? 'All Organization' : 'All Managed Staff'}</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              {isAdmin && (
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
              )}
            </>
          )}

          <button 
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] flex items-center justify-center gap-3 text-slate-500 hover:text-primary hover:bg-white transition-all whitespace-nowrap"
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
              key={`${log.employeeId}-${log.date}`} 
              onClick={() => handleOpenDetail(log)}
              className="bg-white p-6 rounded-[2.5rem] border border-slate-50 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-6"
            >
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-[1.25rem] overflow-hidden bg-slate-50 border border-slate-100 flex-shrink-0">
                  {log.selfie ? (
                    <img src={log.selfie} loading="lazy" className="w-full h-full object-cover scale-x-[-1]" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-200"><Camera size={24} /></div>
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
                      <p className="text-[10px] font-black text-primary uppercase tracking-tight">
                        {log.employeeName || emp?.name || 'Unknown User'} 
                        <span className="text-slate-300 ml-1">({emp?.employeeId || 'N/A'})</span>
                        <span className="mx-2 text-slate-300">•</span>
                        {emp?.department || 'Staff'}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-primary" />
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
              <ChevronRight className="text-slate-200 group-hover:text-primary group-hover:translate-x-1 transition-all hidden sm:block" size={24} />
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
            <div className="bg-primary p-8 flex justify-between items-center text-white">
              <div className="space-y-1">
                <h3 className="text-xl font-black uppercase tracking-tight">
                  {isAuditMode ? (isAdmin ? 'Modify Audit Record' : 'Team Member Activity') : 'Log Details'}
                </h3>
                {isAuditMode && isAdmin && <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Manual Correction Mode</p>}
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
                </div>

                <div className="flex-1 w-full space-y-6">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Employee Profile</p>
                    <p className="font-black text-slate-900 text-xl leading-none">
                      {selectedLog.employeeName || (isAdmin || isManager ? employees.find(e => e.id === selectedLog.employeeId)?.name : user.name)}
                    </p>
                    <p className="text-[10px] font-bold text-slate-500">
                      ID: {selectedLog.employeeId === user.id ? user.employeeId : (employees.find(e => e.id === selectedLog.employeeId)?.employeeId || selectedLog.employeeId)}
                    </p>
                  </div>

                  {/* Enhanced Policy Context: Now Editable for Ad-Hoc Calculation */}
                  {isAdmin && (
                    <div className="p-4 bg-primary-light/20 border border-primary-light rounded-2xl space-y-3">
                       <div className="flex items-center justify-between">
                          <p className="text-[9px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                            <Calculator size={10} /> Calculation Parameters
                          </p>
                          <span className="text-[8px] font-bold text-primary-hover uppercase tracking-widest">Does not save to DB</span>
                       </div>
                       
                       <div className="flex gap-2">
                          <div className="flex-1 space-y-1">
                             <label className="text-[8px] font-black text-primary uppercase tracking-widest">Shift Start</label>
                             <input 
                               type="time" 
                               className="w-full px-2 py-1.5 bg-white border border-primary-light rounded-lg text-xs font-bold text-slate-900" 
                               value={tempShift.start} 
                               onChange={e => setTempShift({...tempShift, start: e.target.value})}
                             />
                          </div>
                          <div className="flex-1 space-y-1">
                             <label className="text-[8px] font-black text-primary uppercase tracking-widest">Shift End</label>
                             <input 
                               type="time" 
                               className="w-full px-2 py-1.5 bg-white border border-primary-light rounded-lg text-xs font-bold text-slate-900" 
                               value={tempShift.end} 
                               onChange={e => setTempShift({...tempShift, end: e.target.value})}
                             />
                          </div>
                          <div className="flex-1 space-y-1">
                             <label className="text-[8px] font-black text-primary uppercase tracking-widest">Grace (Min)</label>
                             <input 
                               type="number" 
                               className="w-full px-2 py-1.5 bg-white border border-primary-light rounded-lg text-xs font-bold text-slate-900" 
                               value={tempShift.grace} 
                               onChange={e => setTempShift({...tempShift, grace: parseInt(e.target.value) || 0})}
                             />
                          </div>
                       </div>

                       <div className="flex justify-between items-center pt-1">
                          <p className="text-[10px] font-medium text-primary">
                             Duration: {calculateDuration(editState.checkIn || '', editState.checkOut || '')} Hrs
                          </p>
                          <button onClick={autoCalculateStatus} className="text-[9px] font-black text-white bg-primary px-3 py-1 rounded-lg uppercase tracking-widest hover:bg-primary-hover transition-colors">
                             Recalculate Status
                          </button>
                       </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Log Date</label>
                      <input 
                        type="date" 
                        readOnly={!isAdmin}
                        className={`w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black ${!isAdmin && 'opacity-70 cursor-not-allowed'}`}
                        value={editState.date}
                        onChange={e => setEditState({...editState, date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Status</label>
                      {isAdmin ? (
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
                        <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black text-primary uppercase">
                          {selectedLog.status}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Actual Check-In</label>
                    <input 
                      type="time" 
                      step="1"
                      readOnly={!isAdmin}
                      className={`w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm ${!isAdmin ? 'opacity-70 cursor-not-allowed' : 'focus:ring-4 focus:ring-primary-light transition-all'}`}
                      value={editState.checkIn || ''} 
                      onChange={e => setEditState({...editState, checkIn: e.target.value})}
                    />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Actual Check-Out</label>
                    <input 
                      type="time" 
                      step="1"
                      readOnly={!isAdmin}
                      className={`w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm ${!isAdmin ? 'opacity-70 cursor-not-allowed' : 'focus:ring-4 focus:ring-primary-light transition-all'}`}
                      value={editState.checkOut || ''}
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
                   <a href={`https://www.google.com/maps?q=${selectedLog.location?.lat},${selectedLog.location?.lng}`} target="_blank" rel="noreferrer" className="p-3 bg-white text-primary rounded-xl shadow-sm border border-slate-50 hover:bg-primary hover:text-white transition-all"><ExternalLink size={18} /></a>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Workday Activity Audit Trail</label>
                <textarea 
                  readOnly={!isAdmin}
                  placeholder="Notes for this workday..."
                  className={`w-full p-5 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium min-h-[100px] outline-none ${!isAdmin && 'opacity-70 cursor-not-allowed italic text-slate-500'}`}
                  value={editState.remarks}
                  onChange={e => setEditState({...editState, remarks: e.target.value})}
                />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-50">
                {isAdmin ? (
                  <>
                    <button onClick={() => handleDelete(selectedLog.id)} disabled={isProcessing} className="flex-1 py-5 bg-rose-50 text-rose-600 rounded-[2rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-rose-100 transition-all"><Trash2 size={16} /> Delete Record</button>
                    <button onClick={handleUpdate} disabled={isProcessing} className="flex-[1.5] py-5 bg-primary text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-xl hover:bg-primary-hover transition-all">{isProcessing ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />} Save Corrections</button>
                  </>
                ) : (
                  <button onClick={() => setSelectedLog(null)} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl">Close Log View</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Absent Modal */}
      {showAbsentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in">
             <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
               <h3 className="text-sm font-black uppercase tracking-widest">Manual Absent Entry</h3>
               <button onClick={() => setShowAbsentModal(false)}><X size={20}/></button>
             </div>
             <div className="p-8 space-y-6">
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase">Employee</label>
                 <select className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold" value={absentForm.employeeId} onChange={e => setAbsentForm({...absentForm, employeeId: e.target.value})}>
                   <option value="">Select Employee</option>
                   {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                 </select>
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase">Date of Absence</label>
                 <input type="date" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold" value={absentForm.date} onChange={e => setAbsentForm({...absentForm, date: e.target.value})} />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase">Reason / Remarks</label>
                 <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold" value={absentForm.remarks} onChange={e => setAbsentForm({...absentForm, remarks: e.target.value})} />
               </div>
               <button onClick={handleManualAbsent} disabled={isProcessing} className="w-full py-4 bg-rose-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-rose-700 transition-all">Confirm Absent Record</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceLogs;
