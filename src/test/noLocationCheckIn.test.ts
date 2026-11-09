import { describe, expect, it } from 'vitest';
import {
  NO_LOCATION_ADDRESS,
  addNoLocationRemark,
  buildNoLocationRemarks,
  stripNoLocationRemark,
  consolidateAttendance,
  isNoLocationRecord,
  mergeCheckOutRemarks,
} from '../utils/attendanceUtils';
import { Attendance } from '../types';

describe('check-in without location', () => {
  it('tags the remark with the failure type and keeps the reason', () => {
    expect(buildNoLocationRemarks('timeout', '  GPS not working ')).toBe('[NO LOCATION: timeout] GPS not working');
  });

  it('saves only the tag when there is no reason', () => {
    expect(buildNoLocationRemarks('unavailable', '  ')).toBe('[NO LOCATION: unavailable]');
  });

  it('flags only records saved without a location', () => {
    expect(isNoLocationRecord({ location: { lat: 0, lng: 0, address: NO_LOCATION_ADDRESS } })).toBe(true);
    expect(isNoLocationRecord({ location: { lat: 23.81, lng: 90.41, address: 'Head Office' } })).toBe(false);
    expect(isNoLocationRecord({ location: { lat: 0, lng: 0, address: 'N/A' } })).toBe(false);
    expect(isNoLocationRecord({})).toBe(false);
  });

  it('keeps the flag when a day has more than one record', () => {
    const record = (id: string, address: string): Attendance => ({
      id,
      employeeId: 'E1',
      date: '2026-11-09',
      status: 'PRESENT',
      location: { lat: 0, lng: 0, address },
    });
    const [day] = consolidateAttendance([record('a', NO_LOCATION_ADDRESS), record('b', 'Head Office')]);
    expect(isNoLocationRecord(day)).toBe(true);
  });
});

describe('auto-written no-location remark', () => {
  it('writes the remark and keeps what the employee entered', () => {
    expect(addNoLocationRemark('', false)).toBe('Location not detected');
    expect(addNoLocationRemark('', true)).toBe('Location not detected - ');
    expect(addNoLocationRemark(' Plant 2 ', true)).toBe('Location not detected - Plant 2');
  });

  it('does not add the remark twice', () => {
    expect(addNoLocationRemark('Location not detected', false)).toBe('Location not detected');
    expect(addNoLocationRemark('Location not detected - Plant 2', true)).toBe('Location not detected - Plant 2');
  });

  it('returns only what the employee entered', () => {
    expect(stripNoLocationRemark('Location not detected')).toBe('');
    expect(stripNoLocationRemark('Location not detected - ')).toBe('');
    expect(stripNoLocationRemark('Location not detected - Plant 2')).toBe('Plant 2');
    expect(stripNoLocationRemark('Plant 2')).toBe('Plant 2');
    expect(stripNoLocationRemark('Location not detected at Plant 2')).toBe('Location not detected at Plant 2');
  });
});

describe('check-out remarks', () => {
  it('keeps the check-in remarks when check-out has no remark', () => {
    expect(mergeCheckOutRemarks('[NO LOCATION: denied] GPS not working', '  ')).toBe('[NO LOCATION: denied] GPS not working');
    expect(mergeCheckOutRemarks('[FACTORY] Plant 2', '')).toBe('[FACTORY] Plant 2');
  });

  it('adds a check-out remark after the check-in remarks', () => {
    expect(mergeCheckOutRemarks('[FACTORY] Plant 2', ' Left early ')).toBe('[FACTORY] Plant 2 | Left early');
  });

  it('uses the check-out remark when check-in had none', () => {
    expect(mergeCheckOutRemarks('', 'Left early')).toBe('Left early');
    expect(mergeCheckOutRemarks(undefined, '')).toBe('');
  });
});
