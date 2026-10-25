import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';

/**
 * Phase 3D/3F: Super Admin controls for the three PWA slots.
 * PWA settings are read and written per explicitly selected organization (superAdminService),
 * while the ten legacy slots and Monetag keep using organizationService unchanged.
 */
const h = vi.hoisted(() => {
  const store = new Map<string, unknown>(); // `${orgId}|${key}` -> value
  return {
    store,
    getSetting: vi.fn(async (_key: string, def: unknown) => def),
    setSetting: vi.fn(async () => {}),
    getAllOrganizations: vi.fn(async () => [
      { id: 'org-a', name: 'Alpha Ltd', subscriptionStatus: 'AD_SUPPORTED' },
      { id: 'org-b', name: 'Beta Ltd', subscriptionStatus: 'AD_SUPPORTED' },
      { id: 'org-c', name: 'Gamma Ltd', subscriptionStatus: 'TRIAL' },
    ]),
    getOrgSettings: vi.fn(async (orgId: string, keys: string[]) =>
      Object.fromEntries(keys.filter(k => store.has(`${orgId}|${k}`)).map(k => [k, store.get(`${orgId}|${k}`)]))),
    setOrgSetting: vi.fn(async (orgId: string, key: string, value: unknown) => { store.set(`${orgId}|${key}`, value); }),
  };
});

vi.mock('../../../services/organization.service', () => ({
  organizationService: { getSetting: h.getSetting, setSetting: h.setSetting },
}));
vi.mock('../../../services/superadmin.service', () => ({
  superAdminService: {
    getAllOrganizations: h.getAllOrganizations,
    getOrgSettings: h.getOrgSettings,
    setOrgSetting: h.setOrgSetting,
  },
}));
vi.mock('../../../services/supabase', () => ({ supabase: {}, isSupabaseConfigured: () => false }));
vi.mock('../../../services/api.client', () => ({ apiClient: { getOrganizationId: () => 'org-1' } }));
vi.mock('../../../context/SubscriptionContext', () => ({ useSubscription: () => ({ subscription: null }) }));

import AdManagement from '../AdManagement';
import { PWA_SPONSORED_LINK } from '../../ads/AdBanner';

const PWA_KEYS = ['ad_config_attendance-success', 'ad_config_leave-success', 'ad_config_dashboard-below-cards'];
const LEGACY_KEYS = [
  'sidebar', 'dashboard', 'reports', 'footer', 'landing-hero',
  'landing-mid', 'blog-header', 'blog-feed', 'blog-post-top', 'blog-post-content',
].map(s => `ad_config_${s}`);
const IMAGE = '/img/sponsored-320x100.png';

// Slot toggles are queried inside their own card; the Monetag section also shows "Disabled".
const card = (name: string) => within(screen.getByText(name).closest('.rounded-2xl') as HTMLElement);
const orgSelect = () => screen.getByLabelText('Organization') as HTMLSelectElement;

const setup = async () => {
  const onMessage = vi.fn();
  render(<AdManagement onMessage={onMessage} />);
  await waitFor(() => expect(screen.getAllByText('Configure').length).toBe(10));
  await waitFor(() => expect(orgSelect().options.length).toBe(4));
  return onMessage;
};

const selectOrg = async (orgId: string) => {
  fireEvent.change(orgSelect(), { target: { value: orgId } });
  await waitFor(() => expect(screen.getByText('Dashboard Below Cards')).toBeTruthy());
};

const saveImage = async (slotName: string, url: string) => {
  fireEvent.click(card(slotName).getByText('Configure'));
  fireEvent.change(screen.getByPlaceholderText(IMAGE), { target: { value: url } });
  fireEvent.click(screen.getByText('Save Configuration'));
};

beforeEach(() => {
  h.store.clear();
  [h.getSetting, h.setSetting, h.getAllOrganizations, h.getOrgSettings, h.setOrgSetting].forEach(f => f.mockClear());
});

describe('Phase 3F: organization selection', () => {
  it('without a selection shows no PWA slots and neither reads nor writes PWA settings', async () => {
    await setup();
    expect(screen.queryByText('Dashboard Below Cards')).toBeNull();
    expect(screen.getByText('Select an AD_SUPPORTED organization to manage its in-app slots.')).toBeTruthy();
    expect(h.getOrgSettings).not.toHaveBeenCalled();
    expect(h.setOrgSetting).not.toHaveBeenCalled();
  });

  it('lists organizations with their status and disables non-AD_SUPPORTED ones', async () => {
    await setup();
    const options = Array.from(orgSelect().options);
    expect(options.map(o => o.textContent)).toEqual([
      'Select an organization…', 'Alpha Ltd — AD_SUPPORTED', 'Beta Ltd — AD_SUPPORTED', 'Gamma Ltd — TRIAL',
    ]);
    expect(options.find(o => o.value === 'org-c')!.disabled).toBe(true);
    expect(options.find(o => o.value === 'org-a')!.disabled).toBe(false);
  });

  it('reads PWA settings scoped to the selected organization_id and the three ad_config keys', async () => {
    await setup();
    await selectOrg('org-a');
    expect(h.getOrgSettings).toHaveBeenCalledWith('org-a', PWA_KEYS);
    for (const name of ['Attendance Success', 'Leave Success', 'Dashboard Below Cards']) {
      expect(card(name).getByText('Disabled')).toBeTruthy(); // missing rows default to OFF
    }
  });

  it('a non-AD_SUPPORTED organization is neither loaded nor writable', async () => {
    await setup();
    fireEvent.change(orgSelect(), { target: { value: 'org-c' } });
    await new Promise(r => setTimeout(r, 20));
    expect(h.getOrgSettings).not.toHaveBeenCalled();
    expect(screen.queryByText('Dashboard Below Cards')).toBeNull();
    expect(h.setOrgSetting).not.toHaveBeenCalled();
  });
});

describe('Phase 3F: per-organization writes', () => {
  it('saves with the explicit organization_id and keeps organizations separate', async () => {
    h.store.set('org-a|ad_config_leave-success', { enabled: true, adType: 'image', imageUrl: IMAGE });
    await setup();

    await selectOrg('org-b');
    expect(card('Leave Success').getByText('Disabled')).toBeTruthy(); // A's row is not reused for B
    await saveImage('Leave Success', IMAGE);
    await waitFor(() => expect(h.setOrgSetting).toHaveBeenCalledTimes(1));
    expect(h.setOrgSetting).toHaveBeenCalledWith('org-b', 'ad_config_leave-success', expect.objectContaining({
      enabled: false, adType: 'image', imageUrl: IMAGE, linkUrl: '', customHtml: '', adsenseClient: '',
    }));

    await selectOrg('org-a');
    await waitFor(() => expect(card('Leave Success').getByText('Enabled')).toBeTruthy());
    expect(h.store.get('org-a|ad_config_leave-success')).toEqual({ enabled: true, adType: 'image', imageUrl: IMAGE });
    expect(h.setSetting).not.toHaveBeenCalled(); // never the caller-org / platform path
  });

  it('enabling requires a valid image, then writes enabled:true for that organization only', async () => {
    const onMessage = await setup();
    await selectOrg('org-a');

    fireEvent.click(card('Attendance Success').getByText('Disabled'));
    expect(h.setOrgSetting).not.toHaveBeenCalled();
    expect(onMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));

    await saveImage('Attendance Success', IMAGE);
    await waitFor(() => expect(h.setOrgSetting).toHaveBeenCalledTimes(1));
    fireEvent.click(card('Attendance Success').getByText('Disabled'));
    await waitFor(() => expect(card('Attendance Success').getByText('Enabled')).toBeTruthy());
    expect(h.setOrgSetting).toHaveBeenLastCalledWith('org-a', 'ad_config_attendance-success', expect.objectContaining({ enabled: true }));
  });

  it('refuses to save an external image', async () => {
    const onMessage = await setup();
    await selectOrg('org-a');
    await saveImage('Dashboard Below Cards', 'https://cdn.example/ad.png');
    expect(h.setOrgSetting).not.toHaveBeenCalled();
    expect(onMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
  });

  it('editor offers Image only and explains the fixed destination', async () => {
    await setup();
    await selectOrg('org-a');
    fireEvent.click(card('Dashboard Below Cards').getByText('Configure'));
    expect(screen.queryByText('AdSense')).toBeNull();
    expect(screen.queryByText('Custom HTML')).toBeNull();
    expect(screen.queryByText('Link URL (optional)')).toBeNull();
    expect(screen.getByText(PWA_SPONSORED_LINK)).toBeTruthy();
    expect(screen.getByText('Alpha Ltd')).toBeTruthy();
  });
});

describe('Phase 3F: rapid switching and stale responses', () => {
  it('a slow response for a previous organization never replaces the current one', async () => {
    h.store.set('org-a|ad_config_dashboard-below-cards', { enabled: true, adType: 'image', imageUrl: IMAGE });
    let releaseA!: () => void;
    h.getOrgSettings.mockImplementationOnce(async (orgId: string, keys: string[]) => {
      await new Promise<void>(r => { releaseA = r; });
      return Object.fromEntries(keys.filter(k => h.store.has(`${orgId}|${k}`)).map(k => [k, h.store.get(`${orgId}|${k}`)]));
    });
    await setup();

    fireEvent.change(orgSelect(), { target: { value: 'org-a' } }); // slow
    expect(screen.getByText('Loading settings for this organization…')).toBeTruthy(); // no stale cards while loading
    await selectOrg('org-b'); // fast
    await act(async () => { releaseA(); });
    await new Promise(r => setTimeout(r, 20));

    expect(orgSelect().value).toBe('org-b');
    expect(card('Dashboard Below Cards').getByText('Disabled')).toBeTruthy(); // B's state, not A's
  });
});

describe('Phase 3F: legacy slots and Monetag unchanged', () => {
  it('the ten legacy slots load via organizationService; PWA keys never do', async () => {
    await setup();
    const keys = h.getSetting.mock.calls.map(c => c[0]);
    LEGACY_KEYS.forEach(k => expect(keys).toContain(k));
    PWA_KEYS.forEach(k => expect(keys).not.toContain(k));
  });

  it('a legacy slot editor still offers all three types and saves via organizationService', async () => {
    await setup();
    fireEvent.click(card('Landing Hero').getByText('Configure'));
    expect(screen.getByText('AdSense')).toBeTruthy();
    expect(screen.getByText('Custom HTML')).toBeTruthy();
    expect(screen.getByText('Link URL (optional)')).toBeTruthy();
    fireEvent.click(screen.getByText('Save Configuration'));
    await waitFor(() => expect(h.setSetting).toHaveBeenCalledWith('ad_config_landing-hero', expect.anything()));
    expect(h.setOrgSetting).not.toHaveBeenCalled();
  });

  it('Monetag platform settings keep their read path and all five page-target controls render', async () => {
    await setup();
    const keys = h.getSetting.mock.calls.map(c => c[0]);
    ['monetag_ipp_enabled', 'monetag_vignette_enabled', 'monetag_ipp_targeting', 'monetag_vignette_targeting']
      .forEach(k => expect(keys).toContain(k));
    for (const group of ['Guides listing', 'Guides articles', 'Blog listing', 'Blog articles', 'Public landing']) {
      expect(screen.getAllByText(group).length).toBeGreaterThan(0);
    }
    expect(h.getOrgSettings).not.toHaveBeenCalled();
  });
});
