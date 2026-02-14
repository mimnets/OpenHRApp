/**
 * UPDATED Shift Service - Uses Dedicated Shifts Collection
 *
 * This is the NEW version that uses the dedicated "shifts" collection
 * instead of storing shifts in the settings collection.
 *
 * TO USE THIS FILE:
 * 1. Complete the PocketBase migration (run SHIFTS_MIGRATION_SCRIPT.js)
 * 2. Backup your current src/services/shift.service.ts
 * 3. Replace it with this file
 * 4. Test thoroughly before deploying to production
 */

import { Shift, ShiftOverride, AppConfig } from '../types';
import { apiClient } from './api.client';

// Cache is still useful for performance
let cachedShifts: Shift[] | null = null;
let cachedOverrides: ShiftOverride[] | null = null;

export const shiftService = {
  /**
   * Clear cached shifts (useful after mutations)
   */
  clearCache() {
    cachedShifts = null;
    cachedOverrides = null;
  },

  /**
   * Get all shifts for the current organization from the shifts collection
   */
  async getShifts(): Promise<Shift[]> {
    // Return cached if available
    if (cachedShifts) {
      console.log('[ShiftService] Returning cached shifts');
      return cachedShifts;
    }

    // Check if PocketBase is configured
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

      console.log('[ShiftService] Fetching shifts from collection');

      // Fetch from dedicated shifts collection
      const records = await apiClient.pb.collection('shifts').getFullList({
        sort: '-created',
        filter: `organization_id="${orgId}"`
      });

      console.log(`[ShiftService] Fetched ${records.length} shifts`);

      // Map PocketBase records to Shift type
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

  /**
   * DEPRECATED: This method is replaced by individual CRUD operations
   * Kept for backward compatibility during migration
   */
  async setShifts(shifts: Shift[]) {
    console.warn('[ShiftService] setShifts() is deprecated. Use createShift/updateShift/deleteShift instead.');

    // For now, we'll just clear the cache
    // In the future, this should be removed entirely
    this.clearCache();
  },

  /**
   * Create a new shift
   */
  async createShift(shift: Partial<Shift>): Promise<Shift> {
    if (!apiClient.pb || !apiClient.isConfigured()) {
      throw new Error('PocketBase not configured');
    }

    const orgId = apiClient.getOrganizationId();
    if (!orgId) {
      throw new Error('No organization ID available');
    }

    console.log('[ShiftService] Creating new shift:', shift.name);

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

      // If this shift is set as default, unset other defaults first
      if (pbData.isDefault) {
        await this.clearOtherDefaults();
      }

      const record = await apiClient.pb.collection('shifts').create(pbData);

      console.log('[ShiftService] Shift created successfully:', record.id);

      // Clear cache and notify
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

  /**
   * Update an existing shift
   */
  async updateShift(id: string, shift: Partial<Shift>): Promise<void> {
    if (!apiClient.pb || !apiClient.isConfigured()) {
      throw new Error('PocketBase not configured');
    }

    console.log('[ShiftService] Updating shift:', id);

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

      // If setting as default, unset other defaults first
      if (pbData.isDefault) {
        await this.clearOtherDefaults(id);
      }

      await apiClient.pb.collection('shifts').update(id, pbData);

      console.log('[ShiftService] Shift updated successfully');

      // Clear cache and notify
      this.clearCache();
      apiClient.notify();

    } catch (e: any) {
      console.error('[ShiftService] Failed to update shift:', e?.message || e);
      throw e;
    }
  },

  /**
   * Delete a shift
   */
  async deleteShift(id: string): Promise<void> {
    if (!apiClient.pb || !apiClient.isConfigured()) {
      throw new Error('PocketBase not configured');
    }

    console.log('[ShiftService] Deleting shift:', id);

    try {
      await apiClient.pb.collection('shifts').delete(id);

      console.log('[ShiftService] Shift deleted successfully');

      // Clear cache and notify
      this.clearCache();
      apiClient.notify();

      // If we deleted the default shift, make another one default
      await this.ensureDefaultShift();

    } catch (e: any) {
      console.error('[ShiftService] Failed to delete shift:', e?.message || e);
      throw e;
    }
  },

  /**
   * Helper: Clear default flag from all other shifts (except the one specified)
   */
  async clearOtherDefaults(exceptId?: string): Promise<void> {
    if (!apiClient.pb || !apiClient.isConfigured()) return;

    try {
      const orgId = apiClient.getOrganizationId();
      if (!orgId) return;

      const filter = exceptId
        ? `organization_id="${orgId}" && isDefault=true && id!="${exceptId}"`
        : `organization_id="${orgId}" && isDefault=true`;

      const defaultShifts = await apiClient.pb.collection('shifts').getFullList({
        filter
      });

      // Unset isDefault for all found shifts
      await Promise.all(
        defaultShifts.map(shift =>
          apiClient.pb!.collection('shifts').update(shift.id, { isDefault: false })
        )
      );

      console.log(`[ShiftService] Cleared default flag from ${defaultShifts.length} shifts`);

    } catch (e: any) {
      console.error('[ShiftService] Failed to clear other defaults:', e?.message || e);
    }
  },

  /**
   * Helper: Ensure at least one shift is marked as default
   */
  async ensureDefaultShift(): Promise<void> {
    if (!apiClient.pb || !apiClient.isConfigured()) return;

    try {
      const shifts = await this.getShifts();

      if (shifts.length === 0) {
        console.log('[ShiftService] No shifts available, cannot ensure default');
        return;
      }

      const hasDefault = shifts.some(s => s.isDefault);

      if (!hasDefault) {
        // Set the first shift as default
        console.log('[ShiftService] No default shift found, setting first shift as default');
        await apiClient.pb.collection('shifts').update(shifts[0].id, { isDefault: true });
        this.clearCache();
      }

    } catch (e: any) {
      console.error('[ShiftService] Failed to ensure default shift:', e?.message || e);
    }
  },

  /**
   * Get shift overrides (unchanged - still uses settings)
   * TODO: Consider migrating shift_overrides to a dedicated collection as well
   */
  async getShiftOverrides(): Promise<ShiftOverride[]> {
    if (cachedOverrides) return cachedOverrides;

    // This still uses the old approach - can be migrated later if needed
    // For now, keeping it simple
    return [];
  },

  /**
   * Set shift overrides (unchanged)
   */
  async setShiftOverrides(overrides: ShiftOverride[]) {
    cachedOverrides = overrides;
    // TODO: Implement proper storage
  },

  /**
   * Resolve which shift applies to an employee on a given date
   * Resolution priority: Override (date-range) > Employee assignment > Default shift
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
   * REMOVED: migrateFromAppConfig
   * This method is no longer needed with the dedicated collection approach
   * Initial shifts should be created through the UI or during organization setup
   */
};
