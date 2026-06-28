
import { Attendance, Employee, Shift, AppConfig, Holiday, LeaveRequest, EmployeeAttendanceSummary } from '../types';

/**
 * Consolidates multiple attendance records into a single daily record per employee.
 * Logic: 
 * - Check In = Earliest Punch
 * - Check Out = Latest Punch
 * - Status = Worst Case (e.g., if one record is LATE, the day is LATE) or Priority based.
 */
export const consolidateAttendance = (logs: Attendance[]): Attendance[] => {
  const groupedMap = new Map<string, Attendance>();

  logs.forEach(log => {
    const key = `${log.employeeId}_${log.date}`;
    
    if (!groupedMap.has(key)) {
      groupedMap.set(key, { ...log });
    } else {
      const existing = groupedMap.get(key)!;
      
      // 1. First Check-In Logic (Earliest time wins)
      if (log.checkIn && log.checkIn !== '-' && (!existing.checkIn || existing.checkIn === '-' || log.checkIn < existing.checkIn)) {
        existing.checkIn = log.checkIn;
      }

      // 2. Last Check-Out Logic (Latest time wins)
      if (log.checkOut && log.checkOut !== '-' && (!existing.checkOut || existing.checkOut === '-' || log.checkOut > existing.checkOut)) {
        existing.checkOut = log.checkOut;
      }

      // 3. Append Remarks
      if (log.remarks && !existing.remarks?.includes(log.remarks)) {
        existing.remarks = existing.remarks ? `${existing.remarks} | ${log.remarks}` : log.remarks;
      }
      
      // 4. Update ID to latest to ensure operations work on a valid record (optional choice)
      existing.id = log.id; 
    }
  });

  return Array.from(groupedMap.values());
};

/**
 * Calculates if a user is Late based on Shift Start and Grace Period.
 */
export const calculatePunctuality = (
  checkInTime: string, 
  shiftStart: string, 
  gracePeriodMinutes: number
): 'PRESENT' | 'LATE' => {
  if (!checkInTime || !shiftStart) return 'PRESENT';

  const [cH, cM] = checkInTime.split(':').map(Number);
  const [sH, sM] = shiftStart.split(':').map(Number);

  const checkInMinutes = cH * 60 + cM;
  const shiftStartMinutes = sH * 60 + sM;
  
  if (checkInMinutes > (shiftStartMinutes + gracePeriodMinutes)) {
    return 'LATE';
  }
  return 'PRESENT';
};

/**
 * Calculates effective duration in hours between two time strings
 */
export const calculateDuration = (start: string, end: string): string => {
  if (!start || !end || start === '-' || end === '-') return '0.0';
  
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  
  const diffMins = (eH * 60 + eM) - (sH * 60 + sM);
  if (diffMins < 0) return '0.0'; // Error case
  
  return (diffMins / 60).toFixed(1);
};

/**
 * Resolves a period preset to ISO date strings.
 * Presets: 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_YEAR' | 'LAST_MONTH' | 'LAST_YEAR'
 * Returns { startDate, endDate } as YYYY-MM-DD strings.
 * Week starts on Monday.
 */
export const getDateRangeFromPreset = (
  preset: string,
  today: Date = new Date()
): { startDate: string; endDate: string } => {
  const toISO = (d: Date) => d.toISOString().split('T')[0];
  const y = today.getFullYear();
  const m = today.getMonth(); // 0-indexed
  const d = today.getDate();
  const dayOfWeek = today.getDay(); // 0=Sun

  switch (preset) {
    case 'THIS_WEEK': {
      // Monday of current week
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(y, m, d + mondayOffset);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { startDate: toISO(monday), endDate: toISO(sunday) };
    }
    case 'THIS_MONTH': {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      return { startDate: toISO(start), endDate: toISO(end) };
    }
    case 'THIS_YEAR': {
      const start = new Date(y, 0, 1);
      const end = new Date(y, 11, 31);
      return { startDate: toISO(start), endDate: toISO(end) };
    }
    case 'LAST_MONTH': {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      return { startDate: toISO(start), endDate: toISO(end) };
    }
    case 'LAST_YEAR': {
      const start = new Date(y - 1, 0, 1);
      const end = new Date(y - 1, 11, 31);
      return { startDate: toISO(start), endDate: toISO(end) };
    }
    default:
      // Fallback: current month
      return getDateRangeFromPreset('THIS_MONTH', today);
  }
};

/**
 * Normalizes shift working days from 3-letter abbreviations (DB default) to full names.
 * DB stores working_days as array['MON','TUE','WED','THU','FRI'] by default.
 * toLocaleDateString('en-US', { weekday: 'long' }) returns 'Monday', 'Tuesday', etc.
 */
const DAY_NAME_MAP: Record<string, string> = {
  MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday',
  FRI: 'Friday', SAT: 'Saturday', SUN: 'Sunday',
};

const normalizeWorkingDays = (days: string[]): string[] =>
  days.map(d => DAY_NAME_MAP[d.toUpperCase()] || d);

/**
 * Counts working days for a specific employee in the given period.
 * Respects employee's assigned shift → override → default shift → global config.
 * Excludes holidays.
 */
export const getWorkingDaysInPeriod = (
  emp: Employee,
  startDate: string,
  endDate: string,
  shifts: Shift[],
  shiftOverrides: Array<{ employeeId: string; shiftId: string; startDate: string; endDate: string }>,
  appConfig: AppConfig,
  holidays: Holiday[]
): number => {
  const globalWorkingDays = normalizeWorkingDays(appConfig.workingDays || []);
  const defaultShift = shifts.find(s => s.isDefault);

  // Build a map of dateStr → normalized workingDays for quick lookup
  const resolveWorkingDays = (dateStr: string): string[] => {
    // Check overrides first
    const override = shiftOverrides.find(
      o => o.employeeId === emp.id && dateStr >= o.startDate && dateStr <= o.endDate
    );
    if (override) {
      const oShift = shifts.find(s => s.id === override.shiftId);
      if (oShift) return normalizeWorkingDays(oShift.workingDays);
    }
    // Employee assignment
    if (emp.shiftId) {
      const aShift = shifts.find(s => s.id === emp.shiftId);
      if (aShift) return normalizeWorkingDays(aShift.workingDays);
    }
    // Default shift
    if (defaultShift) return normalizeWorkingDays(defaultShift.workingDays);
    // Global fallback
    return globalWorkingDays;
  };

  const holidaySet = new Set(holidays.map(h => h.date));
  let count = 0;
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
    const dateStr = dt.toISOString().split('T')[0];
    const dayName = dt.toLocaleDateString('en-US', { weekday: 'long' });

    if (holidaySet.has(dateStr)) continue;

    const workingDays = resolveWorkingDays(dateStr);
    if (workingDays.includes(dayName)) {
      count++;
    }
  }

  return count;
};

/**
 * Calculates per-employee attendance summaries for the given period.
 * Returns an array of EmployeeAttendanceSummary sorted by employee name.
 */
export const calculateEmployeeSummaries = (params: {
  employees: Employee[];
  consolidatedAttendance: Attendance[];
  approvedLeaves: LeaveRequest[];
  shifts: Shift[];
  shiftOverrides: Array<{ employeeId: string; shiftId: string; startDate: string; endDate: string }>;
  appConfig: AppConfig;
  holidays: Holiday[];
  startDate: string;
  endDate: string;
  selectedDepts: string[];
  employeeFilter: string;
}): EmployeeAttendanceSummary[] => {
  const {
    employees, consolidatedAttendance, approvedLeaves, shifts,
    shiftOverrides, appConfig, holidays, startDate, endDate,
    selectedDepts, employeeFilter,
  } = params;

  // Filter target employees
  const targetEmployees = employees.filter(e => {
    if (e.status !== 'ACTIVE') return false;
    if (selectedDepts.length > 0 && !selectedDepts.includes(e.department || '')) return false;
    if (employeeFilter !== 'All Employees' && e.id !== employeeFilter) return false;
    return true;
  });

  // Build lookup: employeeId → Set<dateStr> for each status
  const presentMap = new Map<string, Set<string>>();
  const lateMap = new Map<string, Set<string>>();
  const absentMap = new Map<string, Set<string>>();
  const halfDayMap = new Map<string, Set<string>>();
  // Track all dates that have ANY attendance record per employee (for gap analysis)
  const recordedDateMap = new Map<string, Set<string>>();

  for (const rec of consolidatedAttendance) {
    if (rec.date < startDate || rec.date > endDate) continue;

    // Track that this employee has a record for this date
    const dateSet = recordedDateMap.get(rec.employeeId) || new Set();
    dateSet.add(rec.date);
    recordedDateMap.set(rec.employeeId, dateSet);

    if (rec.status === 'PRESENT') {
      const set = presentMap.get(rec.employeeId) || new Set();
      set.add(rec.date);
      presentMap.set(rec.employeeId, set);
    } else if (rec.status === 'LATE') {
      const set = lateMap.get(rec.employeeId) || new Set();
      set.add(rec.date);
      lateMap.set(rec.employeeId, set);
    } else if (rec.status === 'ABSENT') {
      const set = absentMap.get(rec.employeeId) || new Set();
      set.add(rec.date);
      absentMap.set(rec.employeeId, set);
    } else if (rec.status === 'HALF_DAY') {
      const set = halfDayMap.get(rec.employeeId) || new Set();
      set.add(rec.date);
      halfDayMap.set(rec.employeeId, set);
    }
  }

  // Build holiday set
  const holidaySet = new Set(holidays.map(h => h.date));

  // Build leave-affected date set per employee (working days covered by approved leave)
  const leaveDateMap = new Map<string, Set<string>>();

  for (const lv of approvedLeaves) {
    if (lv.status !== 'APPROVED') continue;
    const emp = employees.find(e => e.id === lv.employeeId);
    if (!emp || emp.status !== 'ACTIVE') continue;
    if (selectedDepts.length > 0 && !selectedDepts.includes(emp.department || '')) continue;
    if (employeeFilter !== 'All Employees' && emp.id !== employeeFilter) continue;

    const lStart = new Date(Math.max(
      new Date(lv.startDate.split(' ')[0]).getTime(),
      new Date(startDate).getTime()
    ));
    const lEnd = new Date(Math.min(
      new Date(lv.endDate.split(' ')[0]).getTime(),
      new Date(endDate).getTime()
    ));

    for (let dt = new Date(lStart); dt <= lEnd; dt.setDate(dt.getDate() + 1)) {
      const dateStr = dt.toISOString().split('T')[0];
      const dayName = dt.toLocaleDateString('en-US', { weekday: 'long' });
      if (holidaySet.has(dateStr)) continue;

      // Check if this date is a working day for this employee
      const override = shiftOverrides.find(
        o => o.employeeId === emp.id && dateStr >= o.startDate && dateStr <= o.endDate
      );
      let empWorkingDays: string[];
      if (override) {
        const oShift = shifts.find(s => s.id === override.shiftId);
        empWorkingDays = oShift ? normalizeWorkingDays(oShift.workingDays) : [];
      } else if (emp.shiftId) {
        const aShift = shifts.find(s => s.id === emp.shiftId);
        empWorkingDays = aShift ? normalizeWorkingDays(aShift.workingDays) : [];
      } else {
        const defShift = shifts.find(s => s.isDefault);
        empWorkingDays = defShift ? normalizeWorkingDays(defShift.workingDays) : normalizeWorkingDays(appConfig.workingDays || []);
      }

      if (empWorkingDays.includes(dayName)) {
        const set = leaveDateMap.get(emp.id) || new Set();
        set.add(dateStr);
        leaveDateMap.set(emp.id, set);
      }
    }
  }

  // Compute summary per employee
  const summaries: EmployeeAttendanceSummary[] = targetEmployees.map(emp => {
    const totalWorkingDays = getWorkingDaysInPeriod(
      emp, startDate, endDate, shifts, shiftOverrides, appConfig, holidays
    );

    // Build set of this employee's leave dates
    const empLeaveDates = leaveDateMap.get(emp.id) || new Set();
    const leaveDays = empLeaveDates.size;

    // Gap analysis: for each working day with no attendance record AND not on leave → absent
    const empRecordedDates = recordedDateMap.get(emp.id) || new Set();
    let gapAbsentDays = 0;

    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      const dateStr = dt.toISOString().split('T')[0];
      const dayName = dt.toLocaleDateString('en-US', { weekday: 'long' });

      if (holidaySet.has(dateStr)) continue;
      if (emp.joiningDate && emp.joiningDate > dateStr) continue;

      // Resolve working days for this employee on this date
      const override = shiftOverrides.find(
        o => o.employeeId === emp.id && dateStr >= o.startDate && dateStr <= o.endDate
      );
      let empWorkingDays: string[];
      if (override) {
        const oShift = shifts.find(s => s.id === override.shiftId);
        empWorkingDays = oShift ? normalizeWorkingDays(oShift.workingDays) : [];
      } else if (emp.shiftId) {
        const aShift = shifts.find(s => s.id === emp.shiftId);
        empWorkingDays = aShift ? normalizeWorkingDays(aShift.workingDays) : [];
      } else {
        const defShift = shifts.find(s => s.isDefault);
        empWorkingDays = defShift ? normalizeWorkingDays(defShift.workingDays) : normalizeWorkingDays(appConfig.workingDays || []);
      }

      if (!empWorkingDays.includes(dayName)) continue;

      // If no attendance record AND not on leave → gap absent
      if (!empRecordedDates.has(dateStr) && !empLeaveDates.has(dateStr)) {
        gapAbsentDays++;
      }
    }

    const presentDays = presentMap.get(emp.id)?.size ?? 0;
    const lateDays = lateMap.get(emp.id)?.size ?? 0;
    const recordedAbsentDays = absentMap.get(emp.id)?.size ?? 0;
    const halfDays = halfDayMap.get(emp.id)?.size ?? 0;
    // Absent = explicitly marked absent + gap analysis (working days with no punch)
    const absentDays = recordedAbsentDays + gapAbsentDays;

    const effectiveWorkingDays = Math.max(1, totalWorkingDays - leaveDays);
    const attendancePercentage = Math.round(
      ((presentDays + lateDays) / effectiveWorkingDays) * 100
    );

    return {
      employeeId: emp.id,
      employeeName: emp.name,
      department: emp.department || '',
      designation: emp.designation || '',
      totalWorkingDays,
      presentDays,
      absentDays,
      lateDays,
      leaveDays,
      halfDays,
      attendancePercentage: Math.min(100, attendancePercentage),
    };
  });

  // Sort by department then name
  return summaries.sort((a, b) => {
    const deptCompare = a.department.localeCompare(b.department);
    if (deptCompare !== 0) return deptCompare;
    return a.employeeName.localeCompare(b.employeeName);
  });
};
