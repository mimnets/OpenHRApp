import { describe, it, expect } from 'vitest';
import { canActOnLeave, canCreateLeaveFor, leaveDecisionLabel } from '../utils/leaveApprovers';
import type { Employee, LeaveRequest } from '../types';

const E = (id: string, role: string, o: Partial<Employee> = {}) => ({ id, role, status: 'ACTIVE', ...o }) as Employee;
const L = (employeeId: string, status: LeaveRequest['status'], lineManagerId?: string) =>
  ({ employeeId, status, lineManagerId }) as LeaveRequest;

const ME = 'me';
const withColleague = [E(ME, 'HR'), E('other', 'ADMIN')];
const soleApprover = [E(ME, 'ADMIN'), E('emp', 'EMPLOYEE')];

describe('leaveDecisionLabel', () => {
  const decidedAt = '2026-11-09T10:00:00Z';
  const date = new Date(decidedAt).toLocaleDateString();

  it('shows nothing while pending', () => {
    expect(leaveDecisionLabel(L('emp', 'PENDING_HR'))).toBeNull();
    expect(leaveDecisionLabel(L('emp', 'PENDING_MANAGER'))).toBeNull();
  });
  it('names the person and date', () => {
    const leave = { ...L('emp', 'APPROVED'), decidedBy: 'hr', decidedByName: 'Asha', decidedAt };
    expect(leaveDecisionLabel(leave)).toBe(`Decided by Asha on ${date}`);
  });
  it('marks a decision on their own request', () => {
    const leave = { ...L('hr', 'REJECTED'), decidedBy: 'hr', decidedByName: 'Asha', decidedAt };
    expect(leaveDecisionLabel(leave)).toBe(`Decided by Asha (own request) on ${date}`);
  });
  it('says so when older requests have no record', () => {
    expect(leaveDecisionLabel(L('emp', 'APPROVED'))).toBe('Decided by: not recorded');
  });
});

describe('canActOnLeave', () => {
  it("allows acting on another employee's leave", () => {
    expect(canActOnLeave(L('emp', 'PENDING_HR'), ME, withColleague)).toBe(true);
  });
  it('blocks own leave when another HR or Admin can decide it', () => {
    for (const status of ['PENDING_MANAGER', 'PENDING_HR', 'APPROVED', 'REJECTED'] as const) {
      expect(canActOnLeave(L(ME, status), ME, withColleague)).toBe(false);
    }
  });
  it('allows a sole approver to decide their own leave', () => {
    expect(canActOnLeave(L(ME, 'PENDING_HR'), ME, soleApprover)).toBe(true);
  });
  it('does not let a sole approver skip a boss who has yet to review', () => {
    expect(canActOnLeave(L(ME, 'PENDING_MANAGER', 'boss'), ME, soleApprover)).toBe(false);
  });
  it('lets a sole approver clear a request assigned to themselves', () => {
    expect(canActOnLeave(L(ME, 'PENDING_MANAGER', ME), ME, soleApprover)).toBe(true);
  });
  it('does not count an inactive colleague as another approver', () => {
    const employees = [E(ME, 'HR'), E('other', 'ADMIN', { status: 'INACTIVE' })];
    expect(canActOnLeave(L(ME, 'PENDING_HR'), ME, employees)).toBe(true);
  });
  it('does not count a colleague with another role as an approver', () => {
    const employees = [E(ME, 'HR'), E('other', 'MANAGER')];
    expect(canActOnLeave(L(ME, 'PENDING_HR'), ME, employees)).toBe(true);
  });
});

describe('canCreateLeaveFor', () => {
  it('allows creating leave for another employee', () => {
    expect(canCreateLeaveFor('emp', ME, withColleague)).toBe(true);
  });
  it('blocks creating own leave when another approver exists', () => {
    expect(canCreateLeaveFor(ME, ME, withColleague)).toBe(false);
  });
  it('allows it for a sole approver with no boss', () => {
    expect(canCreateLeaveFor(ME, ME, soleApprover)).toBe(true);
  });
  it('blocks it for a sole approver who has a boss', () => {
    expect(canCreateLeaveFor(ME, ME, [E(ME, 'ADMIN', { lineManagerId: 'boss' }), E('boss', 'EMPLOYEE')])).toBe(false);
  });
});
