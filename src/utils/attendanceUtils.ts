
import { Attendance } from '../types';

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
