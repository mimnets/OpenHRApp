import type { Employee, LeaveRequest } from '../types';

// On-screen copy of the rule in supabase/migrations/0053. The database enforces it; this only
// hides actions that it would refuse. Keep the two in step.

function hasOtherApprover(userId: string, employees: Employee[]): boolean {
  return employees.some((e) => e.id !== userId && (e.role === 'ADMIN' || e.role === 'HR') && e.status !== 'INACTIVE');
}

/** Who approved or rejected a request, for display. Null while it is still pending. */
export function leaveDecisionLabel(leave: LeaveRequest): string | null {
  if (leave.status !== 'APPROVED' && leave.status !== 'REJECTED') return null;
  if (!leave.decidedByName) return 'Decided by: not recorded';
  const own = leave.decidedBy === leave.employeeId ? ' (own request)' : '';
  const date = leave.decidedAt ? ` on ${new Date(leave.decidedAt).toLocaleDateString()}` : '';
  return `Decided by ${leave.decidedByName}${own}${date}`;
}

/** Whether this HR or Admin user may approve, reject, edit or delete a leave record. */
export function canActOnLeave(leave: LeaveRequest, userId: string, employees: Employee[]): boolean {
  if (leave.employeeId !== userId) return true;
  const waitingForBoss = leave.status === 'PENDING_MANAGER' && !!leave.lineManagerId && leave.lineManagerId !== userId;
  return !waitingForBoss && !hasOtherApprover(userId, employees);
}

/** Whether this HR or Admin user may create a leave record for an employee with any status. */
export function canCreateLeaveFor(employeeId: string, userId: string, employees: Employee[]): boolean {
  if (employeeId !== userId) return true;
  const managerId = employees.find((e) => e.id === userId)?.lineManagerId;
  const hasBoss = !!managerId && managerId !== userId;
  return !hasBoss && !hasOtherApprover(userId, employees);
}
