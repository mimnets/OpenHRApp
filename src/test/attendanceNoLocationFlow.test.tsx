import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Attendance from '../pages/Attendance';

const submitPunch = vi.fn();
const detectLocation = vi.fn();
let geo: { location: any; isLocating: boolean; error: string | null; failure: string | null; diagnostics?: string | null };
let attendance: { activeRecord: any; appConfig: any };

vi.mock('../hooks/attendance/useAttendance', () => ({
  useAttendance: () => ({
    currentTime: new Date(),
    isLoading: false,
    status: 'idle',
    submitPunch,
    ...attendance,
  }),
}));
vi.mock('../hooks/attendance/useGeoLocation', () => ({
  useGeoLocation: () => ({ ...geo, detectLocation }),
}));
vi.mock('../hooks/attendance/useCamera', () => ({
  useCamera: () => ({
    videoRef: { current: null },
    stream: {},
    error: null,
    facingMode: 'user',
    isTorchOn: false,
    startCamera: vi.fn(),
    stopCamera: vi.fn(),
    toggleCamera: vi.fn(),
    toggleTorch: vi.fn(),
    takeSelfie: () => 'selfie-data',
    takePhoto: vi.fn(),
    loading: false,
  }),
}));
vi.mock('../context/SubscriptionContext', () => ({
  useSubscription: () => ({ canPerformAction: () => true, subscription: { status: 'ACTIVE' } }),
}));
vi.mock('../context/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../components/ads/AdBanner', () => ({ AdFrame: () => null }));
vi.mock('../components/attendance/AttendanceHeader', () => ({ AttendanceHeader: () => null }));
vi.mock('../components/attendance/CameraFeed', () => ({
  CameraFeed: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const punchButton = (name: RegExp) => screen.getByRole('button', { name }) as HTMLButtonElement;
const SKIP_LABEL = /check in without location/i;

describe('Attendance screen without a location', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    geo = { location: null, isLocating: false, error: 'Location timed out.', failure: 'timeout' };
    attendance = { activeRecord: undefined, appConfig: {} };
  });
  afterEach(cleanup);

  it('enables check-in automatically when detection fails, without a reason', async () => {
    render(<Attendance user={{ id: 'E1' }} />);
    expect(screen.queryByRole('button', { name: SKIP_LABEL })).toBeNull();
    expect(screen.getByText(/hr will see this flag/i)).toBeTruthy();

    const checkIn = punchButton(/^check in$/i);
    expect(checkIn.disabled).toBe(false);

    fireEvent.click(checkIn);
    await waitFor(() => expect(submitPunch).toHaveBeenCalledWith(
      'OFFICE',
      '[NO LOCATION: timeout]',
      { lat: 0, lng: 0, address: 'Not captured' },
      'selfie-data'
    ));
  });

  it('saves the diagnostics with the check-in', async () => {
    geo.diagnostics = '[DIAG: permission=granted]';
    render(<Attendance user={{ id: 'E1' }} />);

    fireEvent.click(punchButton(/^check in$/i));
    await waitFor(() => expect(submitPunch).toHaveBeenCalledWith(
      'OFFICE',
      '[NO LOCATION: timeout] [DIAG: permission=granted]',
      { lat: 0, lng: 0, address: 'Not captured' },
      'selfie-data'
    ));
  });

  it('keeps the factory input mandatory when detection fails', async () => {
    render(<Attendance user={{ id: 'E1' }} autoStart="FACTORY" />);
    const checkIn = punchButton(/^check in$/i);
    expect(checkIn.disabled).toBe(true);

    fireEvent.change(screen.getByPlaceholderText(/factory name & details/i), {
      target: { value: 'Plant 2' },
    });
    expect(checkIn.disabled).toBe(false);

    fireEvent.click(checkIn);
    await waitFor(() => expect(submitPunch).toHaveBeenCalledWith(
      'FACTORY',
      '[NO LOCATION: timeout] Plant 2',
      { lat: 0, lng: 0, address: 'Not captured' },
      'selfie-data'
    ));
  });

  it('needs a choice and a reason when permission is blocked', async () => {
    geo = { location: null, isLocating: false, error: 'Location blocked.', failure: 'denied' };
    render(<Attendance user={{ id: 'E1' }} />);
    const checkIn = punchButton(/^check in$/i);
    expect(checkIn.disabled).toBe(true);

    fireEvent.click(punchButton(SKIP_LABEL));
    const input = screen.getByPlaceholderText(/why is your location not available/i) as HTMLInputElement;
    expect(input.value).toBe('Location not detected');
    expect(submitPunch).not.toHaveBeenCalled();
    expect(checkIn.disabled).toBe(false);

    fireEvent.change(input, { target: { value: '  ' } });
    expect(checkIn.disabled).toBe(true);

    fireEvent.change(input, { target: { value: 'Location not detected' } });
    fireEvent.click(checkIn);
    await waitFor(() => expect(submitPunch).toHaveBeenCalledTimes(1));
    expect(submitPunch).toHaveBeenCalledWith(
      'OFFICE',
      '[NO LOCATION: denied] Location not detected',
      { lat: 0, lng: 0, address: 'Not captured' },
      'selfie-data'
    );
  });

  it('keeps remarks already entered and removes the added text on cancel', () => {
    geo = { location: null, isLocating: false, error: 'Location blocked.', failure: 'denied' };
    render(<Attendance user={{ id: 'E1' }} />);
    const input = screen.getByPlaceholderText(/optional remarks/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Client visit' } });

    fireEvent.click(punchButton(SKIP_LABEL));
    expect(input.value).toBe('Location not detected - Client visit');

    fireEvent.click(punchButton(/^cancel$/i));
    expect(input.value).toBe('Client visit');
    expect(punchButton(/^check in$/i).disabled).toBe(true);
  });

  it('removes the added text when a retry finds the location', () => {
    geo = { location: null, isLocating: false, error: 'Location blocked.', failure: 'denied' };
    const { rerender } = render(<Attendance user={{ id: 'E1' }} />);
    fireEvent.click(punchButton(SKIP_LABEL));

    geo = { location: { lat: 23.8, lng: 90.4, address: 'Head Office' }, isLocating: false, error: null, failure: null };
    rerender(<Attendance user={{ id: 'E1' }} />);

    expect((screen.getByPlaceholderText(/optional remarks/i) as HTMLInputElement).value).toBe('');
    expect(screen.queryByText(/hr will see this flag/i)).toBeNull();
  });

  it('does not offer the option while location is still being detected', () => {
    geo = { location: null, isLocating: true, error: null, failure: null };
    render(<Attendance user={{ id: 'E1' }} />);
    expect(screen.queryByRole('button', { name: SKIP_LABEL })).toBeNull();
  });

  it('does not offer the option when location works', () => {
    geo = { location: { lat: 23.8, lng: 90.4, address: 'Head Office' }, isLocating: false, error: null, failure: null };
    render(<Attendance user={{ id: 'E1' }} />);
    expect(screen.queryByRole('button', { name: SKIP_LABEL })).toBeNull();
    expect(punchButton(/^check in$/i).disabled).toBe(false);
  });

  it('does not offer the option when the organization turned it off', () => {
    attendance.appConfig = { allowCheckInWithoutLocation: false };
    render(<Attendance user={{ id: 'E1' }} />);
    expect(screen.queryByRole('button', { name: SKIP_LABEL })).toBeNull();
    expect(screen.queryByText(/hr will see this flag/i)).toBeNull();
    expect(punchButton(/^check in$/i).disabled).toBe(true);
  });

  it('lets check-out continue without a location or a detection attempt', async () => {
    attendance.activeRecord = { id: 'A1', employeeId: 'E1', date: '2026-11-09', status: 'PRESENT' };
    render(<Attendance user={{ id: 'E1' }} />);
    expect(detectLocation).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: SKIP_LABEL })).toBeNull();

    const checkOut = punchButton(/^check out$/i);
    expect(checkOut.disabled).toBe(false);
    fireEvent.click(checkOut);
    await waitFor(() => expect(submitPunch).toHaveBeenCalledWith('OFFICE', '', null, 'selfie-data'));
  });

  it('requires the factory input to check in when permission is blocked', async () => {
    geo = { location: null, isLocating: false, error: 'Location blocked.', failure: 'denied' };
    render(<Attendance user={{ id: 'E1' }} autoStart="FACTORY" />);
    const checkIn = punchButton(/^check in$/i);

    fireEvent.click(punchButton(SKIP_LABEL));
    expect(checkIn.disabled).toBe(true);

    const input = screen.getByPlaceholderText(/factory name & why no location/i) as HTMLInputElement;
    expect(input.value).toBe('Location not detected - ');

    fireEvent.change(input, { target: { value: 'Location not detected' } });
    expect(checkIn.disabled).toBe(true);

    fireEvent.change(input, { target: { value: '   ' } });
    expect(checkIn.disabled).toBe(true);

    fireEvent.change(input, { target: { value: 'Plant 2, GPS not working' } });
    expect(checkIn.disabled).toBe(false);

    fireEvent.click(checkIn);
    await waitFor(() => expect(submitPunch).toHaveBeenCalledWith(
      'FACTORY',
      '[NO LOCATION: denied] Plant 2, GPS not working',
      { lat: 0, lng: 0, address: 'Not captured' },
      'selfie-data'
    ));
  });

  it('requires the factory input to check out without a location', async () => {
    attendance.activeRecord = { id: 'A1', employeeId: 'E1', date: '2026-11-09', status: 'PRESENT', dutyType: 'FACTORY' };
    render(<Attendance user={{ id: 'E1' }} />);
    const checkOut = punchButton(/^check out$/i);
    expect(checkOut.disabled).toBe(true);

    fireEvent.change(screen.getByPlaceholderText(/factory name & details/i), {
      target: { value: 'Finished at Plant 2' },
    });
    expect(checkOut.disabled).toBe(false);

    fireEvent.click(checkOut);
    await waitFor(() => expect(submitPunch).toHaveBeenCalledWith('FACTORY', 'Finished at Plant 2', null, 'selfie-data'));
  });
});
