import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const { getSetting, setSetting } = vi.hoisted(() => ({
  getSetting: vi.fn(async (_key: string, def: unknown) => def),
  setSetting: vi.fn(async () => {}),
}));

vi.mock('../../../services/organization.service', () => ({ organizationService: { getSetting, setSetting } }));
vi.mock('../../../services/supabase', () => ({ supabase: {}, isSupabaseConfigured: () => false }));
vi.mock('../../../services/api.client', () => ({ apiClient: { getOrganizationId: () => 'org-1' } }));
vi.mock('../../../context/SubscriptionContext', () => ({ useSubscription: () => ({ subscription: null }) }));

import AdManagement from '../AdManagement';
import { PWA_SPONSORED_LINK } from '../../ads/AdBanner';

const PWA_INDEX = { 'attendance-success': 10, 'leave-success': 11, 'dashboard-below-cards': 12 } as const;

// The Monetag section also shows "Disabled", so slot toggles are queried inside their own card.
const card = (name: string) => within(screen.getByText(name).closest('.rounded-2xl') as HTMLElement);

const setup = async () => {
  const onMessage = vi.fn();
  render(<AdManagement onMessage={onMessage} />);
  await waitFor(() => expect(screen.getAllByText('Configure').length).toBe(13));
  return onMessage;
};

beforeEach(() => {
  getSetting.mockClear();
  setSetting.mockClear();
});

describe('Phase 3D: Super Admin controls for PWA slots', () => {
  it('new configurations default to OFF', async () => {
    await setup();
    for (const name of ['Attendance Success', 'Leave Success', 'Dashboard Below Cards']) {
      expect(card(name).getByText('Disabled')).toBeTruthy();
    }
  });

  it.each(Object.entries(PWA_INDEX))('%s editor offers Image only, with the fixed destination explained', async (_slot, i) => {
    await setup();
    fireEvent.click(screen.getAllByText('Configure')[i]);
    expect(screen.queryByText('AdSense')).toBeNull();
    expect(screen.queryByText('Custom HTML')).toBeNull();
    expect(screen.queryByText('Link URL (optional)')).toBeNull();
    expect(screen.getByText(PWA_SPONSORED_LINK)).toBeTruthy();
  });

  it('a legacy slot editor still offers all three types', async () => {
    await setup();
    fireEvent.click(screen.getAllByText('Configure')[4]); // landing-hero
    expect(screen.getByText('AdSense')).toBeTruthy();
    expect(screen.getByText('Custom HTML')).toBeTruthy();
    expect(screen.getByText('Link URL (optional)')).toBeTruthy();
  });

  it('refuses to save an external image for a PWA slot', async () => {
    const onMessage = await setup();
    fireEvent.click(screen.getAllByText('Configure')[PWA_INDEX['dashboard-below-cards']]);
    fireEvent.change(screen.getByPlaceholderText('/img/sponsored-320x100.png'), { target: { value: 'https://cdn.example/ad.png' } });
    fireEvent.click(screen.getByText('Save Configuration'));
    expect(setSetting).not.toHaveBeenCalled();
    expect(onMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
  });

  it('saves a self-hosted image as image-only, still disabled, with no link', async () => {
    await setup();
    fireEvent.click(screen.getAllByText('Configure')[PWA_INDEX['leave-success']]);
    fireEvent.change(screen.getByPlaceholderText('/img/sponsored-320x100.png'), { target: { value: '/img/sponsored-320x100.png' } });
    fireEvent.click(screen.getByText('Save Configuration'));
    await waitFor(() => expect(setSetting).toHaveBeenCalledTimes(1));
    expect(setSetting).toHaveBeenCalledWith('ad_config_leave-success', expect.objectContaining({
      enabled: false, adType: 'image', imageUrl: '/img/sponsored-320x100.png', linkUrl: '', customHtml: '', adsenseClient: '',
    }));
  });

  it('refuses to enable a PWA slot that has no valid image', async () => {
    const onMessage = await setup();
    fireEvent.click(card('Attendance Success').getByText('Disabled'));
    expect(setSetting).not.toHaveBeenCalled();
    expect(onMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
  });
});
