import type { Employee, LeaveRequest, Team } from '../types';

/**
 * Splits leave requests into what a manager must act on and their team's
 * history. "Team" matches the dashboard: direct reports plus members of teams
 * the manager leads. Only the request's assigned line manager may act on it;
 * everything else from the team stays visible, read-only, whatever its status,
 * so decisions can be reviewed later.
 */
export function teamLeaveRequests(
  requests: LeaveRequest[], managerId: string, employees: Employee[], teams: Team[],
): { pending: LeaveRequest[]; history: LeaveRequest[] } {
  const ledTeams = new Set(teams.filter((t) => t.leaderId === managerId).map((t) => t.id));
  const members = new Set(employees
    .filter((e) => e.id !== managerId && (e.lineManagerId === managerId || (!!e.teamId && ledTeams.has(e.teamId))))
    .map((e) => e.id));

  const mine = requests.filter((r) => r.employeeId !== managerId && (r.lineManagerId === managerId || members.has(r.employeeId)));
  const actionable = (r: LeaveRequest) => r.status === 'PENDING_MANAGER' && r.lineManagerId === managerId;
  const newestFirst = (a: LeaveRequest, b: LeaveRequest) => (b.appliedDate ?? '').localeCompare(a.appliedDate ?? '');
  return {
    pending: mine.filter(actionable).sort(newestFirst),
    history: mine.filter((r) => !actionable(r)).sort(newestFirst),
  };
}
