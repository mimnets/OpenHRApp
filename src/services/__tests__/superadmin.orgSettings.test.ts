import { describe, it, expect, vi, beforeEach } from 'vitest';

// Phase 3F: per-organization settings must always carry the explicitly chosen organization_id.
const h = vi.hoisted(() => {
  const calls: Array<[string, ...unknown[]]> = [];
  const chain: any = {
    select: (...a: unknown[]) => { calls.push(['select', ...a]); return chain; },
    eq: (...a: unknown[]) => { calls.push(['eq', ...a]); return chain; },
    in: (...a: unknown[]) => {
      calls.push(['in', ...a]);
      return Promise.resolve({ data: [{ key: 'ad_config_leave-success', value: { enabled: true } }], error: null });
    },
    upsert: (...a: unknown[]) => { calls.push(['upsert', ...a]); return Promise.resolve({ error: null }); },
  };
  return { calls, from: vi.fn((..._a: unknown[]) => chain) };
});

vi.mock('../supabase', () => ({
  supabase: { from: h.from },
  isSupabaseConfigured: () => true,
  getSupabaseStorageUrl: () => '',
}));

import { superAdminService } from '../superadmin.service';

beforeEach(() => { h.calls.length = 0; h.from.mockClear(); });

describe('superAdminService per-organization settings', () => {
  it('reads only the requested keys for the given organization_id', async () => {
    const result = await superAdminService.getOrgSettings('org-b', ['ad_config_leave-success']);
    expect(h.from).toHaveBeenCalledWith('settings');
    expect(h.calls).toContainEqual(['eq', 'organization_id', 'org-b']);
    expect(h.calls).toContainEqual(['in', 'key', ['ad_config_leave-success']]);
    expect(result).toEqual({ 'ad_config_leave-success': { enabled: true } });
  });

  it('upserts with the explicit organization_id on the (organization_id, key) constraint', async () => {
    await superAdminService.setOrgSetting('org-b', 'ad_config_leave-success', { enabled: false });
    expect(h.calls).toContainEqual([
      'upsert',
      { key: 'ad_config_leave-success', value: { enabled: false }, organization_id: 'org-b' },
      { onConflict: 'organization_id,key' },
    ]);
  });

  it('refuses reads and writes without an organization_id', async () => {
    await expect(superAdminService.getOrgSettings('', ['k'])).rejects.toThrow();
    await expect(superAdminService.setOrgSetting('', 'k', {})).rejects.toThrow();
    expect(h.from).not.toHaveBeenCalled();
  });
});
