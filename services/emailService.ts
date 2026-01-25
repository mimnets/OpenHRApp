import { reportsEmailService } from './reportsEmailService';
import { Attendance } from '../types';

export const emailService = {
  /**
   * Standardized endpoint for attendance summaries.
   * Delegates to reportsEmailService for specialized formatting.
   */
  async sendDailyAttendanceSummary(recipientEmail: string, attendance: Attendance[]) {
    return reportsEmailService.sendAttendanceAudit(recipientEmail, attendance);
  }
};