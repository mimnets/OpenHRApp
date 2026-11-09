import type { Employee } from '../types';

export interface ProfileUpdate {
  id: string;
  updates: { team_id?: string | null; line_manager_id?: string | null };
}

/** The manager a leave request should go to. Nobody can approve their own leave, so self counts as none. */
export function reportingManagerId(employeeId: string | undefined, managerId: string | null | undefined): string | null {
  return managerId && managerId !== employeeId ? managerId : null;
}

/** "Reports to" after picking a team in the employee form: the team's lead, unless the employee is that lead. */
export function reportsToForTeam(employeeId: string | null, currentManagerId: string, leaderId: string | undefined): string {
  return leaderId && leaderId === employeeId ? currentManagerId : leaderId || '';
}

/**
 * Profile changes needed when a team is saved or deleted (deleted = no lead, no members).
 * Members follow the team's lead, but a "Reports to" chosen by hand is kept: the lead keeps
 * their own boss, and anyone reporting to a person other than the lead stays that way.
 */
export function teamProfileUpdates(
  teamId: string,
  previousLeaderId: string | null | undefined,
  newLeaderId: string | null,
  selectedMembers: Set<string>,
  employees: Employee[],
): ProfileUpdate[] {
  const result: ProfileUpdate[] = [];
  const members = employees.filter((e) => e.teamId === teamId);
  const memberIds = new Set(members.map((e) => e.id));

  for (const id of selectedMembers) {
    if (memberIds.has(id)) continue;
    const employee = employees.find((e) => e.id === id);
    const updates: ProfileUpdate['updates'] = { team_id: teamId };
    if (id !== newLeaderId) updates.line_manager_id = newLeaderId;
    else if (employee?.lineManagerId === id) updates.line_manager_id = null;
    result.push({ id, updates });
  }

  for (const member of members) {
    const manager = member.lineManagerId || null;
    const isSelf = manager === member.id;

    if (!selectedMembers.has(member.id)) {
      const followedTeam = isSelf || (!!manager && (manager === previousLeaderId || manager === newLeaderId));
      result.push({ id: member.id, updates: followedTeam ? { team_id: null, line_manager_id: null } : { team_id: null } });
    } else if (member.id === newLeaderId) {
      if (isSelf) result.push({ id: member.id, updates: { line_manager_id: null } });
    } else if ((isSelf || !manager || manager === previousLeaderId) && manager !== newLeaderId) {
      result.push({ id: member.id, updates: { line_manager_id: newLeaderId } });
    }
  }
  return result;
}
