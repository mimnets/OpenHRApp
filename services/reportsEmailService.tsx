import { hrService } from './hrService';
import { Attendance } from '../types';

export const reportsEmailService = {
  /**
   * Formats and queues a professional Attendance Audit Report.
   * This is separated from standard notifications for easier future layout changes.
   */
  async sendAttendanceAudit(recipientEmail: string, attendance: Attendance[]) {
    if (attendance.length === 0) {
      console.warn("[reportsEmailService] Attempted to send audit report with zero attendance records.");
      return;
    }

    console.log(`[reportsEmailService] Preparing Attendance Audit for: ${recipientEmail} with ${attendance.length} records.`);

    const dateStr = new Date().toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });

    const sortedAttendance = [...attendance].sort((a, b) => 
      (a.employeeName || '').localeCompare(b.employeeName || '')
    );

    const rows = sortedAttendance.map((a, index) => {
      const statusColor = a.status === 'LATE' ? '#f59e0b' : a.status === 'ABSENT' ? '#ef4444' : '#10b981';
      const bgColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';
      
      return `
        <tr style="background-color: ${bgColor};">
          <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #0f172a; font-weight: 600;">
            ${a.employeeName || 'Unknown Personnel'}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #475569; font-family: monospace;">
            ${a.checkIn || '--:--'}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #475569; font-family: monospace;">
            ${a.checkOut || '--:--'}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right;">
            <span style="padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; color: ${statusColor}; background: ${statusColor}15; text-transform: uppercase;">
              ${a.status}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 20px auto; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);">
        <div style="background: #1e293b; padding: 40px 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 24px; letter-spacing: 2px; text-transform: uppercase; font-weight: 900;">Attendance Summary</h1>
          <p style="margin: 10px 0 0 0; font-size: 13px; color: #94a3b8; font-weight: 600;">AUDIT PERIOD: ${dateStr}</p>
        </div>
        
        <div style="padding: 35px;">
          <div style="margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center;">
             <span style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em;">Consolidated Records</span>
             <span style="font-size: 18px; font-weight: 900; color: #2563eb;">${attendance.length}</span>
          </div>

          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="border-bottom: 2px solid #f1f5f9;">
                <th style="padding: 12px; font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 900;">Personnel</th>
                <th style="padding: 12px; font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 900;">In</th>
                <th style="padding: 12px; font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 900;">Out</th>
                <th style="padding: 12px; font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 900; text-align: right;">Result</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <div style="margin-top: 30px; padding: 20px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px;">
            <p style="font-size: 11px; color: #475569; margin: 0; line-height: 1.6;">
              <strong>Audit Note:</strong> This report is generated automatically by the OpenHR secure engine. Data includes GPS-validated entries and selfie verification. For full interaction logs, please log in to the administrative dashboard.
            </p>
          </div>
        </div>

        <div style="background: #f1f5f9; padding: 20px; text-align: center;">
           <p style="font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; margin: 0;">OpenHR Platform • Secure Personnel Gateway</p>
        </div>
      </div>
    `;

    try {
      const result = await hrService.sendCustomEmail({ 
        recipientEmail, 
        subject: `[Audit Report] ${dateStr} - ${attendance.length} Records`,
        html,
        type: 'SYSTEM_REPORT'
      });
      console.log("[reportsEmailService] Success queuing audit email:", result);
      return result;
    } catch (err) {
      console.error("[reportsEmailService] Error dispatching to hrService:", err);
      throw err;
    }
  }
};