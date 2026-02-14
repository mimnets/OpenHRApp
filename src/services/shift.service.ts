
import { Shift, ShiftOverride, AppConfig } from '../types';
import { organizationService } from './organization.service';

let cachedShifts: Shift[] | null = null;
let cachedOverrides: ShiftOverride[] | null = null;
let migrationDone = false;

export const shiftService = {
  clearCache() {
    cachedShifts = null;
    cachedOverrides = null;
  },

  async getShifts(): Promise<Shift[]> {
    if (cachedShifts) return cachedShifts;
    const val = await organizationService.getSetting('shifts', []);
    cachedShifts = val;
    return val;
  },

  async setShifts(shifts: Shift[]) {
    await organizationService.setSetting('shifts', shifts);
    cachedShifts = shifts;
  },

  async getShiftOverrides(): Promise<ShiftOverride[]> {
    if (cachedOverrides) return cachedOverrides;
    const val = await organizationService.getSetting('shift_overrides', []);
    cachedOverrides = val;
    return val;
  },

  async setShiftOverrides(overrides: ShiftOverride[]) {
    await organizationService.setSetting('shift_overrides', overrides);
    cachedOverrides = overrides;
  },

  /**
   * Resolution priority: Override (date-range) > Employee assignment > Default shift > AppConfig fallback
   */
  async resolveShiftForEmployee(
    employeeId: string,
    employeeShiftId: string | undefined,
    date?: string
  ): Promise<Shift | null> {
    const shifts = await this.getShifts();
    if (shifts.length === 0) return null;

    const targetDate = date || new Date().toISOString().split('T')[0];

    // 1. Check overrides first
    const overrides = await this.getShiftOverrides();
    const activeOverride = overrides.find(
      o => o.employeeId === employeeId && targetDate >= o.startDate && targetDate <= o.endDate
    );
    if (activeOverride) {
      const overrideShift = shifts.find(s => s.id === activeOverride.shiftId);
      if (overrideShift) return overrideShift;
    }

    // 2. Employee assignment
    if (employeeShiftId) {
      const assignedShift = shifts.find(s => s.id === employeeShiftId);
      if (assignedShift) return assignedShift;
    }

    // 3. Default shift
    const defaultShift = shifts.find(s => s.isDefault);
    return defaultShift || null;
  },

  /**
   * Migrate existing AppConfig values to a "Default Shift" on first load (lazy, idempotent)
   */
  async migrateFromAppConfig(config: AppConfig): Promise<void> {
    if (migrationDone) return;
    migrationDone = true;

    const existing = await organizationService.getSetting('shifts', []);
    if (existing.length > 0) return; // Already has shifts, skip migration

    const defaultShift: Shift = {
      id: 'shift_' + Date.now(),
      name: 'Default Shift',
      startTime: config.officeStartTime || '09:00',
      endTime: config.officeEndTime || '18:00',
      lateGracePeriod: config.lateGracePeriod || 5,
      earlyOutGracePeriod: config.earlyOutGracePeriod || 15,
      earliestCheckIn: config.earliestCheckIn || '06:00',
      autoSessionCloseTime: config.autoSessionCloseTime || '23:59',
      workingDays: config.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Sunday'],
      isDefault: true
    };

    await this.setShifts([defaultShift]);
    console.log('[ShiftService] Migrated AppConfig to Default Shift');
  }
};
