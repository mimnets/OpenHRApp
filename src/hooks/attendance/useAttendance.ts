
import { useState, useEffect, useCallback } from 'react';
import { hrService } from '../../services/hrService';
import { Attendance, AppConfig, Shift } from '../../types';
import { useToast } from '../../context/ToastContext';

export const useAttendance = (user: any, onFinish?: () => void) => {
  const { showToast } = useToast();
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
      // Drain any selfie uploads that were queued after a previous failure
      // (see RC#4 in Others/SCALING_IMPLEMENTATION_LOG.md). Fire-and-forget —
      // this runs in the background and doesn't block the UI.
      hrService.retryPendingSelfies?.().catch(() => { /* handled inside */ });

      // Drain the core check-in sync queue (offline/5xx check-ins that
      // never created a record). See Others/CHECKIN_SYNC_QUEUE_RECORD.md.
      // Fire-and-forget — failures are reclassified + rescheduled inside.
      hrService.drainCheckInQueue?.().catch(() => { /* handled inside */ });

      const today = new Date().toISOString().split('T')[0];
      const [reconciled, config] = await Promise.all([
        hrService.getActiveAttendanceWithReconciliation(user.id),
        hrService.getConfig()
      ]);

      const { active, closedPast } = reconciled;

      if (active && active.date !== today) {
        setActiveRecord(undefined);
      } else {
        setActiveRecord(active);
      }
      setAppConfig(config);

      // If the workday session manager just closed any past-date sessions
      // as a client-side fallback, surface a one-time, human-readable toast.
      if (closedPast.length > 0) {
        const dates = closedPast.map(s => s.date).join(', ');
        showToast(
          `We auto-closed your forgotten check-out from ${dates}. Please remember to check out at end of day.`,
          'info'
        );
      }

      // Resolve employee's effective shift
      const shift = await hrService.resolveShiftForEmployee(user.id, user.shiftId);
      setEmployeeShift(shift);
    } catch (e) {
      console.error('Data sync failed', e);
    }
  }, [user.id, user.shiftId, showToast]);

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
      showToast("Failed to submit attendance. Please try again.", "error");
    }
  };

  return {
    currentTime,
    activeRecord,
    appConfig,
    isLoading,
    status,
    submitPunch
  };
};
