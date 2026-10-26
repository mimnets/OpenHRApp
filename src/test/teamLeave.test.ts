import { describe, it, expect } from 'vitest';
import { teamLeaveRequests } from '../utils/teamLeave';
import type { Employee, LeaveRequest, Team } from '../types';

const E = (id: string, o: Partial<Employee> = {}) => ({ id, ...o }) as Employee;
const L = (id: string, employeeId: string, status: LeaveRequest['status'], o: Partial<LeaveRequest> = {}) =>
  ({ id, employeeId, employeeName: employeeId, status, appliedDate: `2026-10-${id.padStart(2, '0')}`, type: 'ANNUAL', totalDays: 1, startDate: '', endDate: '', reason: '', ...o }) as LeaveRequest;

const ME = 'mgr';
const employees = [
  E('direct', { lineManagerId: ME }),
  E('teamMember', { teamId: 't1', lineManagerId: 'someoneElse' }),
  E('stranger', { teamId: 't2', lineManagerId: 'other' }),
  E(ME, { teamId: 't1' }),
];
const teams = [{ id: 't1', leaderId: ME }, { id: 't2', leaderId: 'other' }] as Team[];

describe('teamLeaveRequests', () => {
  it('keeps approved, rejected and forwarded requests visible as team history', () => {
    const reqs = [
      L('1', 'direct', 'PENDING_MANAGER', { lineManagerId: ME }),
      L('2', 'direct', 'PENDING_HR', { lineManagerId: ME, managerRemarks: 'ok' }),
      L('3', 'direct', 'APPROVED', { lineManagerId: ME }),
      L('4', 'direct', 'REJECTED', { lineManagerId: ME }),
    ];
    const { pending, history } = teamLeaveRequests(reqs, ME, employees, teams);
    expect(pending.map((r) => r.id)).toEqual(['1']);
    expect(history.map((r) => r.id)).toEqual(['4', '3', '2']); // newest first
  });

  it('includes members of teams the manager leads, but only the assigned line manager can act', () => {
    const reqs = [
      L('5', 'teamMember', 'PENDING_MANAGER', { lineManagerId: 'someoneElse' }),
      L('6', 'teamMember', 'PENDING_HR', { lineManagerId: null as unknown as string }),
    ];
    const { pending, history } = teamLeaveRequests(reqs, ME, employees, teams);
    expect(pending).toEqual([]);
    expect(history.map((r) => r.id)).toEqual(['6', '5']);
  });

  it('keeps a request routed to me even after the employee moved away', () => {
    const { history } = teamLeaveRequests([L('7', 'stranger', 'APPROVED', { lineManagerId: ME })], ME, employees, teams);
    expect(history.map((r) => r.id)).toEqual(['7']);
  });

  it("excludes other teams' requests and the manager's own leave", () => {
    const reqs = [L('8', 'stranger', 'APPROVED', { lineManagerId: 'other' }), L('9', ME, 'PENDING_MANAGER', { lineManagerId: ME })];
    const { pending, history } = teamLeaveRequests(reqs, ME, employees, teams);
    expect(pending).toEqual([]);
    expect(history).toEqual([]);
  });
});
