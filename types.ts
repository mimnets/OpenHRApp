
export type Role = 'ADMIN' | 'MANAGER' | 'HR' | 'EMPLOYEE' | 'TEAM_LEAD' | 'MANAGEMENT';
export type WorkType = 'OFFICE' | 'FIELD';

export interface AppTheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    hover: string;
    light: string;
  };
}

export interface Team {
  id: string;
  name: string;
  leaderId: string;
  department?: string;
}

export interface User {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  designation: string;
  avatar?: string;
  username?: string;
  teamId?: string;
}

export interface Employee extends User {
  joiningDate: string;
  mobile: string;
  emergencyContact: string;
  salary: number;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
  employmentType: 'PERMANENT' | 'CONTRACT' | 'TEMPORARY';
  location: string;
  nid?: string;
  password?: string;
  lineManagerId?: string;
  workType: WorkType;
}

export interface Attendance {
  id: string;
  employeeId: string;
  employeeName?: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE' | 'EARLY_OUT';
  location?: { lat: number; lng: number; address?: string };
  remarks?: string;
  selfie?: string;
  dutyType?: 'OFFICE' | 'FACTORY';
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  lineManagerId?: string;
  type: 'ANNUAL' | 'CASUAL' | 'SICK' | 'MATERNITY' | 'PATERNITY' | 'EARNED' | 'UNPAID';
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: 'PENDING_MANAGER' | 'PENDING_HR' | 'APPROVED' | 'REJECTED';
  appliedDate: string;
  approverRemarks?: string;
  managerRemarks?: string;
}

export interface LeaveBalance {
  employeeId: string;
  ANNUAL: number;
  CASUAL: number;
  SICK: number;
}

export interface LeavePolicy {
  defaults: {
    ANNUAL: number;
    CASUAL: number;
    SICK: number;
  };
  overrides: Record<string, { // Key is employeeId
    ANNUAL: number;
    CASUAL: number;
    SICK: number;
  }>;
}

export interface LeaveWorkflow {
  department: string;
  approverRole: 'LINE_MANAGER' | 'HR' | 'ADMIN';
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
  isGovernment: boolean;
  type: 'FESTIVAL' | 'ISLAMIC' | 'NATIONAL';
}

export interface SentEmail {
  id: string;
  to: string;
  subject: string;
  body: string;
  sentAt: string;
  status: 'SENT' | 'FAILED' | 'QUEUED';
  provider: string;
}

export interface RelayConfig {
  username: string;
  fromName: string;
  isActive: boolean;
  relayUrl: string;
  resendApiKey?: string;
  useDirectResend?: boolean;
}

export interface OfficeLocation {
  name: string;
  lat: number;
  lng: number;
  radius: number;
}

export interface AppConfig {
  companyName: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  workingDays: string[];
  officeStartTime: string;
  officeEndTime: string;
  lateGracePeriod: number;
  earlyOutGracePeriod: number;
  earliestCheckIn?: string; // HH:mm - Earliest allowed punch-in
  autoSessionCloseTime?: string; // HH:mm - Auto check-out time
  defaultReportRecipient?: string;
  smtp?: RelayConfig;
  overtimeEnabled?: boolean;
  autoAbsentEnabled?: boolean;
  autoAbsentTime?: string; // HH:mm
  officeLocations?: OfficeLocation[];
}
