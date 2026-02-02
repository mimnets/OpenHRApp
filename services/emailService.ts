import { reportsEmailService } from './reportsEmailService';
import { Attendance } from '../types';

export const emailService = {
  /**
   * Standardized endpoint for attendance summaries.
   * Delegates to reportsEmailService for specialized formatting.
   * @param subjectSuffix Optional suffix for batched emails (e.g. " [Part 1/3]")
   */
  async sendDailyAttendanceSummary(recipientEmail: string, attendance: Attendance[], subjectSuffix: string = '') {
    return reportsEmailService.sendAttendanceAudit(recipientEmail, attendance, subjectSuffix);
  }
};