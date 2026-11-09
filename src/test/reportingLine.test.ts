import { describe, it, expect } from 'vitest';
import { reportingManagerId, reportsToForTeam, teamProfileUpdates } from '../utils/reportingLine';
import type { Employee } from '../types';

const E = (id: string, o: Partial<Employee> = {}) => ({ id, ...o }) as Employee;
const updateFor = (updates: ReturnType<typeof teamProfileUpdates>, id: string) => updates.find((u) => u.id === id)?.updates;

describe('reportingManagerId', () => {
  it('returns the assigned manager', () => {
    expect(reportingManagerId('mgr', 'boss')).toBe('boss');
  });
  it('treats self or no manager as none, so the request goes to HR', () => {
    expect(reportingManagerId('mgr', 'mgr')).toBeNull();
    expect(reportingManagerId('mgr', null)).toBeNull();
  });
});

describe('reportsToForTeam', () => {
  it("uses the team's lead", () => {
    expect(reportsToForTeam('emp', 'old', 'lead')).toBe('lead');
  });
  it('keeps the current boss when the employee leads that team', () => {
    expect(reportsToForTeam('lead', 'boss', 'lead')).toBe('boss');
  });
  it('clears the boss when the team has no lead', () => {
    expect(reportsToForTeam('emp', 'old', undefined)).toBe('');
  });
});

describe('teamProfileUpdates', () => {
  it('gives new members the lead as manager', () => {
    const updates = teamProfileUpdates('t1', null, 'lead', new Set(['emp']), [E('emp'), E('lead')]);
    expect(updateFor(updates, 'emp')).toEqual({ team_id: 't1', line_manager_id: 'lead' });
  });

  it('never makes the lead their own manager and keeps their boss', () => {
    const updates = teamProfileUpdates('t1', null, 'lead', new Set(['lead']), [E('lead', { lineManagerId: 'boss' })]);
    expect(updateFor(updates, 'lead')).toEqual({ team_id: 't1' });
  });

  it('keeps the boss of a lead who is already a member', () => {
    const employees = [E('lead', { teamId: 't1', lineManagerId: 'boss' })];
    expect(teamProfileUpdates('t1', 'lead', 'lead', new Set(['lead']), employees)).toEqual([]);
  });

  it('repairs a lead who was set as their own manager', () => {
    const employees = [E('lead', { teamId: 't1', lineManagerId: 'lead' })];
    expect(updateFor(teamProfileUpdates('t1', 'lead', 'lead', new Set(['lead']), employees), 'lead')).toEqual({ line_manager_id: null });
  });

  it('moves members to the new lead when the lead changes', () => {
    const employees = [E('emp', { teamId: 't1', lineManagerId: 'oldLead' }), E('newLead')];
    const updates = teamProfileUpdates('t1', 'oldLead', 'newLead', new Set(['emp']), employees);
    expect(updateFor(updates, 'emp')).toEqual({ line_manager_id: 'newLead' });
  });

  it('keeps a member who reports to someone other than the lead', () => {
    const employees = [E('emp', { teamId: 't1', lineManagerId: 'other' })];
    expect(teamProfileUpdates('t1', 'lead', 'lead', new Set(['emp']), employees)).toEqual([]);
  });

  it('clears the manager of a removed member who reported to the lead', () => {
    const employees = [E('emp', { teamId: 't1', lineManagerId: 'lead' })];
    expect(updateFor(teamProfileUpdates('t1', 'lead', 'lead', new Set(), employees), 'emp')).toEqual({ team_id: null, line_manager_id: null });
  });

  it('keeps the boss of a lead who is removed from the member list', () => {
    const employees = [E('lead', { teamId: 't1', lineManagerId: 'boss' })];
    expect(updateFor(teamProfileUpdates('t1', 'lead', 'lead', new Set(), employees), 'lead')).toEqual({ team_id: null });
  });

  it('on team delete, clears only managers that came from the team', () => {
    const employees = [
      E('emp', { teamId: 't1', lineManagerId: 'lead' }),
      E('lead', { teamId: 't1', lineManagerId: 'boss' }),
      E('outsider', { teamId: 't2', lineManagerId: 'lead' }),
    ];
    const updates = teamProfileUpdates('t1', 'lead', null, new Set(), employees);
    expect(updateFor(updates, 'emp')).toEqual({ team_id: null, line_manager_id: null });
    expect(updateFor(updates, 'lead')).toEqual({ team_id: null });
    expect(updateFor(updates, 'outsider')).toBeUndefined();
  });
});
