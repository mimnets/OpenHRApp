
import { useState, useEffect, useCallback } from 'react';
import { hrService } from '../../services/hrService';
import { Attendance, AppConfig, Shift } from '../../types';

export const useAttendance = (user: any, onFinish?: () => void) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeRecord, setActiveRecord] = useState<Attendance | undefined>(undefined);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [employeeShift, setEmployeeShift] = useState<Shift | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  // Clock Timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [active, config] = await Promise.all([
        hrService.getActiveAttendance(user.id),
        hrService.getConfig()
      ]);

      if (active && active.date !== today) {
        setActiveRecord(undefined);
      } else {
        setActiveRecord(active);
      }
      setAppConfig(config);

      // Resolve employee's effective shift
      const shift = await hrService.resolveShiftForEmployee(user.id, user.shiftId);
      setEmployeeShift(shift);
    } catch (e) {
      console.error('Data sync failed', e);
    }
  }, [user.id, user.shiftId]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await refreshData();
      setIsLoading(false);
    };
    init();
  }, [refreshData]);

  const submitPunch = async (
    dutyType: 'OFFICE' | 'FACTORY',
    remarks: string,
    location: { lat: number; lng: number; address: string },
    selfieData: string
  ) => {
    setStatus('loading');
    try {
      const punchTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      const today = new Date().toISOString().split('T')[0];

      if (activeRecord && !activeRecord.checkOut) {
        // Clock Out
        await hrService.updateAttendance(activeRecord.id, { checkOut: punchTime, remarks });
      } else {
        // Clock In
        let punchStatus: Attendance['status'] = 'PRESENT';
        
        // Late Calculation Logic (Strict Mode Enforced)
        // Priority: employee shift > global appConfig
        const shiftStart = employeeShift?.startTime || appConfig?.officeStartTime;
        const shiftGrace = employeeShift?.lateGracePeriod ?? appConfig?.lateGracePeriod ?? 0;

        if (dutyType === 'OFFICE' && shiftStart) {
          const [pH, pM] = punchTime.split(':').map(Number);
          const [sH, sM] = shiftStart.split(':').map(Number);

          const punchMins = pH * 60 + pM;
          const startMins = sH * 60 + sM + shiftGrace;

          if (punchMins > startMins) {
            punchStatus = 'LATE';
          }
        }
        
        await hrService.saveAttendance({
          id: '', 
          employeeId: user.id, 
          employeeName: user.name, 
          date: today,
          checkIn: punchTime, 
          status: punchStatus, 
          location, 
          selfie: selfieData, 
          remarks: dutyType === 'FACTORY' ? `[FACTORY] ${remarks}` : remarks,
          dutyType: dutyType
        });
      }
      
      setStatus('success');
      await refreshData();
      
      // Auto-close after success
      setTimeout(() => {
        if (onFinish) onFinish();
      }, 1500);

    } catch (err) {
      console.error(err);
      setStatus('idle');
      alert("Failed to submit attendance. Please try again.");
    }
  };

  return {
    currentTime,
    activeRecord,
    isLoading,
    status,
    submitPunch
  };
};
