
import { hrService } from './hrService';
import { Employee, LeaveRequest, SentEmail, Attendance } from '../types';

const STORAGE_KEY = 'hr_sent_emails';
const DEFAULT_API_URL = 'http://localhost:5000';

export const emailService = {
  getOutbox(): SentEmail[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  },

  clearOutbox() {
    localStorage.setItem(STORAGE_KEY, '[]');
  },

  deleteFromOutbox(id: string) {
    const outbox = this.getOutbox();
    const filtered = outbox.filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },

  updateOutboxEntry(id: string, updates: Partial<SentEmail>) {
    const outbox = this.getOutbox();
    const idx = outbox.findIndex(m => m.id === id);
    if (idx > -1) {
      outbox[idx] = { ...outbox[idx], ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(outbox));
    }
  },

  sanitizeUrl(url: string): string {
    return url
      .trim()
      .replace(/\/+$/, "")
      .replace(/\/api\/test$/, "")
      .replace(/\/api$/, "");
  },

  getApiBaseUrl() {
    const rawUrl = hrService.getConfig().smtp?.relayUrl || DEFAULT_API_URL;
    return this.sanitizeUrl(rawUrl);
  },

  async testConnection(manualUrl?: string) {
    const baseUrl = this.sanitizeUrl(manualUrl || this.getApiBaseUrl());
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(`${baseUrl}/api/test`, {
        method: 'GET',
        mode: 'cors',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`Status ${response.status}`);
      return { success: true, data: await response.json() };
    } catch (error: any) {
      clearTimeout(timeoutId);
      return { success: false, error: error.message || "Unreachable" };
    }
  },

  saveToOutbox(email: SentEmail) {
    const outbox = this.getOutbox();
    outbox.unshift(email);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(outbox.slice(0, 50)));
  },

  async sendPasswordReset(email: string) {
    const baseUrl = this.getApiBaseUrl();
    const outboxEmail: SentEmail = {
      id: Math.random().toString(36).substring(7),
      to: email,
      subject: 'Password Reset Request',
      body: 'Triggered backend recovery workflow.',
      sentAt: new Date().toISOString(),
      status: 'QUEUED',
      provider: 'RELAY-API'
    };

    try {
      const response = await fetch(`${baseUrl}/api/auth/password-reset-email`, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: email, requestedAt: new Date().toISOString() })
      });
      if (!response.ok) throw new Error(`Server error ${response.status}`);
      outboxEmail.status = 'SENT';
      this.saveToOutbox(outboxEmail);
      return { success: true };
    } catch (error) {
      outboxEmail.status = 'FAILED';
      this.saveToOutbox(outboxEmail);
      return { success: false, error };
    }
  },

  async sendDailyAttendanceReport(recipientEmail: string, attendanceData: Attendance[], criteria: any = {}) {
    const baseUrl = this.getApiBaseUrl();
    const outboxEmail: SentEmail = {
      id: Math.random().toString(36).substring(7),
      to: recipientEmail,
      subject: `Sync: Attendance Report (${criteria.startDate || 'Daily'})`,
      body: `Criteria: Period ${criteria.startDate} to ${criteria.endDate}, Dept: ${criteria.department}. Records: ${attendanceData.length}`,
      sentAt: new Date().toISOString(),
      status: 'QUEUED',
      provider: 'RELAY-API'
    };

    try {
      const response = await fetch(`${baseUrl}/api/reports/daily-attendance`, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail,
          startDate: criteria.startDate,
          endDate: criteria.endDate,
          department: criteria.department,
          data: attendanceData,
          requestFormats: ['PDF', 'EXCEL'],
          sentAt: new Date().toISOString()
        })
      });
      if (!response.ok) throw new Error('Relay rejected report generation');
      outboxEmail.status = 'SENT';
      this.saveToOutbox(outboxEmail);
      return true;
    } catch (error) {
      outboxEmail.status = 'FAILED';
      this.saveToOutbox(outboxEmail);
      return false;
    }
  },

  async sendLeaveStatusAlert(request: LeaveRequest, employee: Employee) {
    const baseUrl = this.getApiBaseUrl();
    const message = `Hello ${employee.name}, your leave request for ${request.startDate} has been ${request.status}.`;
    const outboxEmail: SentEmail = {
      id: Math.random().toString(36).substring(7),
      to: employee.email,
      subject: `Leave Request Update: ${request.status}`,
      body: message,
      sentAt: new Date().toISOString(),
      status: 'QUEUED',
      provider: 'RELAY-API'
    };

    try {
      const response = await fetch(`${baseUrl}/api/alerts/send-email`, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertType: 'LEAVE_STATUS',
          recipients: [{ email: employee.email, name: employee.name }],
          message: message,
          requestId: request.id,
          finalStatus: request.status
        })
      });
      if (!response.ok) throw new Error('Relay rejected alert');
      outboxEmail.status = 'SENT';
      this.saveToOutbox(outboxEmail);
      return true;
    } catch (error) {
      outboxEmail.status = 'FAILED';
      this.saveToOutbox(outboxEmail);
      return false;
    }
  },

  async sendReport(recipientEmail: string, reportName: string, filters: any = {}) {
    const baseUrl = this.getApiBaseUrl();
    const outboxEmail: SentEmail = {
      id: Math.random().toString(36).substring(7),
      to: recipientEmail,
      subject: `Report Delivery: ${reportName}`,
      body: `Range: ${filters.startDate} to ${filters.endDate} | Filter: ${filters.department}`,
      sentAt: new Date().toISOString(),
      status: 'QUEUED',
      provider: 'RELAY-API'
    };

    try {
      const response = await fetch(`${baseUrl}/api/reports/send-email`, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: `REP-${Math.floor(Math.random() * 1000)}`,
          recipientEmail: recipientEmail,
          reportType: reportName,
          filters: filters,
          sentAt: new Date().toISOString()
        })
      });
      if (!response.ok) throw new Error('Relay rejected report');
      outboxEmail.status = 'SENT';
      this.saveToOutbox(outboxEmail);
      return true;
    } catch (error) {
      outboxEmail.status = 'FAILED';
      this.saveToOutbox(outboxEmail);
      return false;
    }
  },

  async sendWelcomeEmail(employee: Employee) {
    return this.sendReport(employee.email, 'Welcome Onboarding Kit');
  }
};
