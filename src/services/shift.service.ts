
import { Shift, ShiftOverride } from '../types';
import { apiClient } from './api.client';

let cachedShifts: Shift[] | null = null;
let cachedOverrides: ShiftOverride[] | null = null;

export const shiftService = {
  clearCache() {
    cachedShifts = null;
    cachedOverrides = null;
  },

  async getShifts(): Promise<Shift[]> {
    if (cachedShifts) {
      return cachedShifts;
    }

    if (!apiClient.pb || !apiClient.isConfigured()) {
      console.warn('[ShiftService] PocketBase not configured');
      return [];
    }

    try {
      const orgId = apiClient.getOrganizationId();
      if (!orgId) {
        console.warn('[ShiftService] No organization ID available');
        return [];
      }

      // Cap at 200 rows. No realistic org has >200 shifts; the explicit
      // limit replaces the unbounded `getFullList` as a safety net on the
      // check-in critical path (see Others/SCALING_PLAN.md).
      const result = await apiClient.pb.collection('shifts').getList(1, 200, {
        sort: '-created',
        filter: `organization_id="${orgId}"`
      });
      const records = result.items;

      const shifts = records.map(r => ({
        id: r.id,
        name: r.name,
        startTime: r.startTime,
        endTime: r.endTime,
        lateGracePeriod: r.lateGracePeriod,
        earlyOutGracePeriod: r.earlyOutGracePeriod,
        earliestCheckIn: r.earliestCheckIn,
        autoSessionCloseTime: r.autoSessionCloseTime,
        workingDays: r.workingDays,
        isDefault: r.isDefault
      }));

      cachedShifts = shifts;
      return shifts;

    } catch (e: any) {
      console.error('[ShiftService] Failed to fetch shifts:', e?.message || e);
      return [];
    }
  },

  async createShift(shift: Partial<Shift>): Promise<Shift> {
    if (!apiClient.pb || !apiClient.isConfigured()) {
      throw new Error('PocketBase not configured');
    }

    const orgId = apiClient.getOrganizationId();
    if (!orgId) {
      throw new Error('No organization ID available');
    }

    try {
      const pbData = {
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        lateGracePeriod: shift.lateGracePeriod || 15,
        earlyOutGracePeriod: shift.earlyOutGracePeriod || 15,
        earliestCheckIn: shift.earliestCheckIn || "06:00",
        autoSessionCloseTime: shift.autoSessionCloseTime || "23:59",
        workingDays: shift.workingDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Sunday"],
        isDefault: shift.isDefault || false,
        organization_id: orgId
      };

      if (pbData.isDefault) {
        await this.clearOtherDefaults();
      }

      const record = await apiClient.pb.collection('shifts').create(pbData);

      this.clearCache();
      apiClient.notify();

      return {
        id: record.id,
        name: record.name,
        startTime: record.startTime,
        endTime: record.endTime,
        lateGracePeriod: record.lateGracePeriod,
        earlyOutGracePeriod: record.earlyOutGracePeriod,
        earliestCheckIn: record.earliestCheckIn,
        autoSessionCloseTime: record.autoSessionCloseTime,
        workingDays: record.workingDays,
        isDefault: record.isDefault
      };

    } catch (e: any) {
      console.error('[ShiftService] Failed to create shift:', e?.message || e);
      throw e;
    }
  },

  async updateShift(id: string, shift: Partial<Shift>): Promise<void> {
    if (!apiClient.pb || !apiClient.isConfigured()) {
      throw new Error('PocketBase not configured');
    }

    try {
      const pbData: any = {};
      if (shift.name !== undefined) pbData.name = shift.name;
      if (shift.startTime !== undefined) pbData.startTime = shift.startTime;
      if (shift.endTime !== undefined) pbData.endTime = shift.endTime;
      if (shift.lateGracePeriod !== undefined) pbData.lateGracePeriod = shift.lateGracePeriod;
      if (shift.earlyOutGracePeriod !== undefined) pbData.earlyOutGracePeriod = shift.earlyOutGracePeriod;
      if (shift.earliestCheckIn !== undefined) pbData.earliestCheckIn = shift.earliestCheckIn;
      if (shift.autoSessionCloseTime !== undefined) pbData.autoSessionCloseTime = shift.autoSessionCloseTime;
      if (shift.workingDays !== undefined) pbData.workingDays = shift.workingDays;
      if (shift.isDefault !== undefined) pbData.isDefault = shift.isDefault;

      if (pbData.isDefault) {
        await this.clearOtherDefaults(id);
      }

      await apiClient.pb.collection('shifts').update(id, pbData);

      this.clearCache();
      apiClient.notify();

    } catch (e: any) {
      console.error('[ShiftService] Failed to update shift:', e?.message || e);
      throw e;
    }
  },

  async deleteShift(id: string): Promise<void> {
    if (!apiClient.pb || !apiClient.isConfigured()) {
      throw new Error('PocketBase not configured');
    }

    try {
      await apiClient.pb.collection('shifts').delete(id);

      this.clearCache();
      apiClient.notify();

      await this.ensureDefaultShift();

    } catch (e: any) {
      console.error('[ShiftService] Failed to delete shift:', e?.message || e);
      throw e;
    }
  },

  async clearOtherDefaults(exceptId?: string): Promise<void> {
    if (!apiClient.pb || !apiClient.isConfigured()) return;

    try {
      const orgId = apiClient.getOrganizationId();
      if (!orgId) return;

      const filter = exceptId
        ? `organization_id="${orgId}" && isDefault=true && id!="${exceptId}"`
        : `organization_id="${orgId}" && isDefault=true`;

      const result = await apiClient.pb.collection('shifts').getList(1, 200, {
        filter
      });
      const defaultShifts = result.items;

      await Promise.all(
        defaultShifts.map(shift =>
          apiClient.pb!.collection('shifts').update(shift.id, { isDefault: false })
        )
      );

    } catch (e: any) {
      console.error('[ShiftService] Failed to clear other defaults:', e?.message || e);
    }
  },

  async ensureDefaultShift(): Promise<void> {
    if (!apiClient.pb || !apiClient.isConfigured()) return;

    try {
      const shifts = await this.getShifts();

      if (shifts.length === 0) return;

      const hasDefault = shifts.some(s => s.isDefault);

      if (!hasDefault) {
        await apiClient.pb.collection('shifts').update(shifts[0].id, { isDefault: true });
        this.clearCache();
      }

    } catch (e: any) {
      console.error('[ShiftService] Failed to ensure default shift:', e?.message || e);
    }
  },

  async getShiftOverrides(): Promise<ShiftOverride[]> {
    if (cachedOverrides) return cachedOverrides;
    return [];
  },

  async setShiftOverrides(overrides: ShiftOverride[]) {
    cachedOverrides = overrides;
  },

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
  }
};
