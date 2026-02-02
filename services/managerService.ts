import { hrService } from './hrService';
import { Attendance, LeaveRequest, Employee } from '../types';

export const managerService = {
  async getTeamMembers(managerId: string, teamId?: string): Promise<Employee[]> {
    const all = await hrService.getEmployees();
    return all.filter(e => e.id !== managerId && (e.lineManagerId === managerId || (teamId && e.teamId === teamId)));
  },

  async getTeamLeaves(managerId: string, teamId?: string): Promise<LeaveRequest[]> {
    const team = await this.getTeamMembers(managerId, teamId);
    const teamIds = team.map(e => e.id);
    const allLeaves = await hrService.getLeaves();
    return allLeaves.filter(l => teamIds.includes(l.employeeId));
  }
};