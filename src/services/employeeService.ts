import { hrService } from './hrService';
import { Attendance, LeaveRequest } from '../types';

export const employeeService = {
  async getMyAttendance(userId: string): Promise<Attendance[]> {
    // Push the employee filter down to the server (indexed lookup) instead
    // of fetching everything and filtering client-side.
    return hrService.getAttendance({ employeeId: userId });
  },

  async applyForLeave(data: Partial<LeaveRequest>, user: any) {
    const employees = await hrService.getEmployees();
    const me = employees.find(e => e.id === user.id);
    
    return hrService.saveLeaveRequest({
      ...data,
      employeeId: user.id,
      employeeName: user.name,
      lineManagerId: me?.lineManagerId,
      status: 'PENDING_MANAGER',
      appliedDate: new Date().toISOString()
    });
  }
};