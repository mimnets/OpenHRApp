
import { supabase, isSupabaseConfigured } from './supabase';
import { apiClient } from './api.client';
import { Shift, ShiftOverride } from '../types';

let cachedShifts: Shift[] | null = null;
let cachedOverrides: ShiftOverride[] | null = null;

// Supabase uses snake_case; PB used camelCase for shift fields.
const mapShift = (r: any): Shift => ({
  id: r.id,
  name: r.name,
  startTime: r.start_time,
  endTime: r.end_time,
  lateGracePeriod: r.late_grace_period,
  earlyOutGracePeriod: r.early_out_grace_period,
  earliestCheckIn: r.earliest_check_in,
  autoSessionCloseTime: r.auto_session_close_time,
  workingDays: r.working_days,
  isDefault: r.is_default,
});

export const shiftService = {
  clearCache() {
    cachedShifts = null;
    cachedOverrides = null;
  },

  async getShifts(): Promise<Shift[]> {
    if (cachedShifts) return cachedShifts;
    if (!isSupabaseConfigured()) {
      console.warn('[ShiftService] Supabase not configured');
      return [];
    }
    const orgId = apiClient.getOrganizationId();
    if (!orgId) {
      console.warn('[ShiftService] No organization ID available');
      return [];
    }
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('organization_id', orgId)
        .order('created', { ascending: false })
        .limit(200);
      if (error) throw error;
      cachedShifts = (data ?? []).map(mapShift);
      return cachedShifts;
    } catch (e: any) {
      console.error('[ShiftService] Failed to fetch shifts:', e?.message || e);
      return [];
    }
  },

  async createShift(shift: Partial<Shift>): Promise<Shift> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
    const orgId = apiClient.getOrganizationId();
    if (!orgId) throw new Error('No organization ID available');

    if (shift.isDefault) await this.clearOtherDefaults();

    const payload = {
      name: shift.name,
      start_time: shift.startTime,
      end_time: shift.endTime,
      late_grace_period: shift.lateGracePeriod ?? 15,
      early_out_grace_period: shift.earlyOutGracePeriod ?? 15,
      earliest_check_in: shift.earliestCheckIn ?? '06:00',
      auto_session_close_time: shift.autoSessionCloseTime ?? '23:59',
      working_days: shift.workingDays ?? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Sunday'],
      is_default: shift.isDefault ?? false,
      organization_id: orgId,
    };

    const { data, error } = await supabase.from('shifts').insert(payload).select().single();
    if (error) throw error;
    this.clearCache();
    apiClient.notify();
    return mapShift(data);
  },

  async updateShift(id: string, shift: Partial<Shift>): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

    const payload: any = {};
    if (shift.name !== undefined)                payload.name = shift.name;
    if (shift.startTime !== undefined)           payload.start_time = shift.startTime;
    if (shift.endTime !== undefined)             payload.end_time = shift.endTime;
    if (shift.lateGracePeriod !== undefined)     payload.late_grace_period = shift.lateGracePeriod;
    if (shift.earlyOutGracePeriod !== undefined) payload.early_out_grace_period = shift.earlyOutGracePeriod;
    if (shift.earliestCheckIn !== undefined)     payload.earliest_check_in = shift.earliestCheckIn;
    if (shift.autoSessionCloseTime !== undefined) payload.auto_session_close_time = shift.autoSessionCloseTime;
    if (shift.workingDays !== undefined)         payload.working_days = shift.workingDays;
    if (shift.isDefault !== undefined)           payload.is_default = shift.isDefault;

    if (payload.is_default) await this.clearOtherDefaults(id);

    const { error } = await supabase.from('shifts').update(payload).eq('id', id);
    if (error) throw error;
    this.clearCache();
    apiClient.notify();
  },

  async deleteShift(id: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
    const { error } = await supabase.from('shifts').delete().eq('id', id);
    if (error) throw error;
    this.clearCache();
    apiClient.notify();
    await this.ensureDefaultShift();
  },

  async clearOtherDefaults(exceptId?: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const orgId = apiClient.getOrganizationId();
    if (!orgId) return;
    try {
      let query = supabase
        .from('shifts')
        .update({ is_default: false })
        .eq('organization_id', orgId)
        .eq('is_default', true);
      if (exceptId) query = query.neq('id', exceptId);
      const { error } = await query;
      if (error) throw error;
    } catch (e: any) {
      console.error('[ShiftService] Failed to clear other defaults:', e?.message || e);
    }
  },

  async ensureDefaultShift(): Promise<void> {
    if (!isSupabaseConfigured()) return;
    try {
      const shifts = await this.getShifts();
      if (shifts.length === 0) return;
      if (shifts.some(s => s.isDefault)) return;
      const { error } = await supabase
        .from('shifts')
        .update({ is_default: true })
        .eq('id', shifts[0].id);
      if (error) throw error;
      this.clearCache();
    } catch (e: any) {
      console.error('[ShiftService] Failed to ensure default shift:', e?.message || e);
    }
  },

  // In-memory only — no DB backing needed
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

    // 1. Overrides
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

    // 3. Default
    return shifts.find(s => s.isDefault) || null;
  },
};
