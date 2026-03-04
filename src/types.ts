
export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'HR' | 'EMPLOYEE' | 'TEAM_LEAD' | 'MANAGEMENT';
export type WorkType = 'OFFICE' | 'FIELD';
export type SubscriptionStatus = 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'SUSPENDED' | 'AD_SUPPORTED';

export type UpgradeRequestType = 'DONATION' | 'TRIAL_EXTENSION' | 'AD_SUPPORTED';
export type UpgradeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type DonationTier = 'TIER_3MO' | 'TIER_6MO' | 'TIER_1YR' | 'TIER_LIFETIME';

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  displayOrder: number;
  isActive: boolean;
  created?: string;
}

export interface ShowcaseOrganization {
  id: string;
  name: string;
  logo: string;
  country?: string;
  industry?: string;
  websiteUrl?: string;
  tagline?: string;
  displayOrder: number;
  isActive: boolean;
  created?: string;
}

export interface AppTheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    hover: string;
    light: string;
  };
}

export interface Organization {
  id: string;
  name: string;
  address?: string;
  logo?: string;
  country?: string;
  subscriptionStatus?: SubscriptionStatus;
  trialEndDate?: string;
  created?: string;
  updated?: string;
  // Computed fields
  userCount?: number;
  adminEmail?: string;
}

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  trialEndDate?: string;
  daysRemaining?: number;
  isSuperAdmin: boolean;
  isReadOnly: boolean;  // true for EXPIRED
  isBlocked: boolean;   // true for SUSPENDED
  showAds: boolean;     // true for AD_SUPPORTED
}

export interface UpgradeRequest {
  id: string;
  organizationId: string;
  organizationName?: string;
  requestType: UpgradeRequestType;
  status: UpgradeRequestStatus;
  // Donation fields
  donationAmount?: number;
  donationTier?: DonationTier;
  donationReference?: string;
  donationScreenshot?: string;
  // Extension fields
  extensionReason?: string;
  extensionDays?: number;
  // Processing fields
  adminNotes?: string;
  processedBy?: string;
  processedAt?: string;
  created?: string;
}

export interface PlatformStats {
  totalOrganizations: number;
  totalUsers: number;
  activeOrganizations: number;
  trialOrganizations: number;
  expiredOrganizations: number;
  recentRegistrations: number;
}

export interface Team {
  id: string;
  name: string;
  leaderId: string;
  department?: string;
  organizationId?: string;
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
  shiftId?: string;
  organizationId?: string;
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
  organizationId?: string;
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
  organizationId?: string;
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

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  coverImage: string;
  status: 'DRAFT' | 'PUBLISHED';
  authorId: string;
  authorName: string;
  publishedAt: string;
  created: string;
  updated: string;
}

export interface Tutorial {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  coverImage: string;
  status: 'DRAFT' | 'PUBLISHED';
  authorName: string;
  displayOrder: number;
  parentId: string;
  category: string;
  publishedAt: string;
  created: string;
  updated: string;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  lateGracePeriod: number;
  earlyOutGracePeriod: number;
  earliestCheckIn: string;
  autoSessionCloseTime: string;
  workingDays: string[];
  isDefault: boolean;
}

export interface ShiftOverride {
  id: string;
  employeeId: string;
  shiftId: string;
  startDate: string;
  endDate: string;
  reason: string;
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
  dutyLabel1?: string; // Display label for OFFICE duty type (default "Office")
  dutyLabel2?: string; // Display label for FACTORY duty type (default "Factory")
}

export interface RegistrationData {
  orgName: string;
  adminName: string;
  email: string;
  password: string;
  country: string;
  address?: string;
  logo?: File | null;
}

// Performance Review Types
export type ReviewCycleType = 'MID_YEAR' | 'YEAR_END';
export type ReviewCycleStatus = 'UPCOMING' | 'OPEN' | 'CLOSED' | 'ARCHIVED';
export type ReviewStatus = 'DRAFT' | 'SELF_REVIEW_SUBMITTED' | 'MANAGER_REVIEWED' | 'COMPLETED';
export type CompetencyId = 'AGILITY' | 'COLLABORATION' | 'CUSTOMER_FOCUS' | 'DEVELOPING_OTHERS' | 'GLOBAL_MINDSET' | 'INNOVATION_MINDSET';
export type HROverallRating = 'EXCELLENT' | 'VERY_GOOD' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'UNSATISFACTORY';

export interface ReviewCycle {
  id: string;
  name: string;
  cycleType: ReviewCycleType;
  startDate: string;
  endDate: string;
  reviewStartDate: string;
  reviewEndDate: string;
  activeCompetencies: CompetencyId[];
  isActive: boolean;
  status: ReviewCycleStatus;
  organizationId: string;
}

export interface CompetencyRating {
  competencyId: CompetencyId;
  rating: number;
  comment: string;
}

export interface AttendanceSummary {
  totalWorkingDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  earlyOutDays: number;
  attendancePercentage: number;
}

export interface LeaveSummary {
  annualLeaveTaken: number;
  casualLeaveTaken: number;
  sickLeaveTaken: number;
  unpaidLeaveTaken: number;
  totalLeaveDays: number;
}

export interface PerformanceReview {
  id: string;
  employeeId: string;
  employeeName: string;
  cycleId: string;
  lineManagerId?: string;
  managerName?: string;
  status: ReviewStatus;
  submittedAt?: string;
  managerReviewedAt?: string;
  completedAt?: string;
  // Self-assessment ratings
  selfRatings: CompetencyRating[];
  // Manager ratings
  managerRatings: CompetencyRating[];
  // Attendance summary
  attendanceSummary: AttendanceSummary;
  // Leave summary
  leaveSummary: LeaveSummary;
  // HR finalization
  hrFinalRemarks?: string;
  hrOverallRating?: HROverallRating;
  finalizedBy?: string;
  organizationId: string;
}
