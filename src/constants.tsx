import { AppConfig, CustomCompetency, CustomLeaveType, OrgReviewConfig, OrgNotificationConfig, UserNotificationPreferences } from './types';

export const DEPARTMENTS = [
  "Engineering",
  "Human Resources",
  "Finance",
  "Operations",
  "Marketing",
  "Sales",
  "Product",
  "Factory"
];

export const DESIGNATIONS = [
  "Senior Developer",
  "Junior Developer",
  "HR Manager",
  "Operations Lead",
  "Finance Associate",
  "Marketing Specialist",
  "UX Designer",
  "Factory Supervisor",
  "Field Technician"
];

export const OFFICE_LOCATIONS = [
  { name: "Dhaka HQ (Gulshan)", lat: 23.7925, lng: 90.4078, radius: 500 },
  { name: "Chittagong Branch", lat: 22.3569, lng: 91.7832, radius: 500 },
  { name: "Sylhet Tech Hub", lat: 24.8949, lng: 91.8687, radius: 500 },
  { name: "Factory Zone", lat: 23.9999, lng: 90.5000, radius: 2000 },
  { name: "Remote Office", lat: 0, lng: 0, radius: 9999999 }
];

export const DEFAULT_COMPETENCIES: CustomCompetency[] = [
  {
    id: 'AGILITY',
    name: 'Agility',
    description: 'Adapts quickly to changing priorities and drives transparent change management.',
    behaviors: ['Transparency in change', 'Involving others in decisions', 'Building flexible teams', 'Making timely decisions'],
  },
  {
    id: 'COLLABORATION',
    name: 'Collaboration',
    description: 'Works effectively across teams, shares knowledge, and builds trust.',
    behaviors: ['Knowledge sharing', 'Strengthening networks', 'Welcoming diversity of opinion', 'Building trust'],
  },
  {
    id: 'CUSTOMER_FOCUS',
    name: 'Customer Focus',
    description: 'Understands and anticipates customer needs to deliver exceptional value.',
    behaviors: ['Understanding customer needs', 'Building relationships', 'Engaging in digital dialog', 'Confirming satisfaction'],
  },
  {
    id: 'DEVELOPING_OTHERS',
    name: 'Developing Others',
    description: 'Invests in the growth of team members through coaching, feedback, and development opportunities.',
    behaviors: ['Motivating the team', 'Setting development priorities', 'Providing constructive feedback', 'Assessing capabilities'],
  },
  {
    id: 'GLOBAL_MINDSET',
    name: 'Global Mindset',
    description: 'Thinks broadly about enterprise impact and adapts across cultural contexts.',
    behaviors: ['Enterprise-wide understanding', 'Awareness of implications', 'Cultural adaptation', 'Cross-functional thinking'],
  },
  {
    id: 'INNOVATION_MINDSET',
    name: 'Innovation Mindset',
    description: 'Encourages experimentation, embraces new ideas, and drives creative solutions.',
    behaviors: ['Rapid prototyping', 'Sharing ideas openly', 'Encouraging experimentation', 'Creative expression'],
  },
];

// Keep old name as alias for backward compat during transition
export const PERFORMANCE_COMPETENCIES = DEFAULT_COMPETENCIES;

export const DEFAULT_RATING_SCALE: {
  value: number;
  label: string;
  color: string;
}[] = [
  { value: 1, label: 'Needs Significant Improvement', color: 'bg-red-500' },
  { value: 2, label: 'Below Expectations', color: 'bg-orange-500' },
  { value: 3, label: 'Meets Expectations', color: 'bg-yellow-500' },
  { value: 4, label: 'Exceeds Expectations', color: 'bg-blue-500' },
  { value: 5, label: 'Outstanding', color: 'bg-green-500' },
];

export const RATING_SCALE = DEFAULT_RATING_SCALE;

export const DEFAULT_OVERALL_RATINGS: {
  value: string;
  label: string;
  color: string;
}[] = [
  { value: 'EXCELLENT', label: 'Excellent', color: 'bg-green-500' },
  { value: 'VERY_GOOD', label: 'Very Good', color: 'bg-blue-500' },
  { value: 'GOOD', label: 'Good', color: 'bg-yellow-500' },
  { value: 'NEEDS_IMPROVEMENT', label: 'Needs Improvement', color: 'bg-orange-500' },
  { value: 'UNSATISFACTORY', label: 'Unsatisfactory', color: 'bg-red-500' },
];

export const HR_OVERALL_RATINGS = DEFAULT_OVERALL_RATINGS;

export const DEFAULT_LEAVE_TYPES: CustomLeaveType[] = [
  { id: 'ANNUAL', name: 'Annual Leave', color: 'bg-primary', hasBalance: true },
  { id: 'CASUAL', name: 'Casual Leave', color: 'bg-emerald-500', hasBalance: true },
  { id: 'SICK', name: 'Sick Leave', color: 'bg-rose-500', hasBalance: true },
  { id: 'MATERNITY', name: 'Maternity Leave', color: 'bg-pink-500', hasBalance: false },
  { id: 'PATERNITY', name: 'Paternity Leave', color: 'bg-indigo-500', hasBalance: false },
  { id: 'EARNED', name: 'Earned Leave', color: 'bg-amber-500', hasBalance: false },
  { id: 'UNPAID', name: 'Unpaid Leave', color: 'bg-slate-500', hasBalance: false },
];

export const DEFAULT_REVIEW_CONFIG: OrgReviewConfig = {
  competencies: DEFAULT_COMPETENCIES,
  ratingScale: {
    min: 1,
    max: 5,
    labels: DEFAULT_RATING_SCALE,
  },
  overallRatings: DEFAULT_OVERALL_RATINGS,
};

export const DEFAULT_NOTIFICATION_CONFIG: OrgNotificationConfig = {
  enabledTypes: ['ANNOUNCEMENT', 'LEAVE', 'ATTENDANCE', 'REVIEW', 'SYSTEM'],
  emailDigestFrequency: 'IMMEDIATE',
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
};

export const DEFAULT_USER_NOTIFICATION_PREFS: UserNotificationPreferences = {
  mutedTypes: [],
  emailDigestFrequency: 'IMMEDIATE',
};

export const TIMEZONE_OPTIONS = [
  { group: "UTC", zones: [
    { label: "UTC (GMT+0)", value: "UTC" },
  ]},
  { group: "Africa", zones: [
    { label: "Africa/Cairo (GMT+2)", value: "Africa/Cairo" },
    { label: "Africa/Johannesburg (GMT+2)", value: "Africa/Johannesburg" },
    { label: "Africa/Lagos (GMT+1)", value: "Africa/Lagos" },
    { label: "Africa/Nairobi (GMT+3)", value: "Africa/Nairobi" },
  ]},
  { group: "America", zones: [
    { label: "America/Argentina/Buenos_Aires (GMT-3)", value: "America/Argentina/Buenos_Aires" },
    { label: "America/Mexico_City (GMT-6)", value: "America/Mexico_City" },
    { label: "America/New_York (GMT-5)", value: "America/New_York" },
    { label: "America/Sao_Paulo (GMT-3)", value: "America/Sao_Paulo" },
    { label: "America/Toronto (GMT-5)", value: "America/Toronto" },
  ]},
  { group: "Asia", zones: [
    { label: "Asia/Bahrain (GMT+3)", value: "Asia/Bahrain" },
    { label: "Asia/Bangkok (GMT+7)", value: "Asia/Bangkok" },
    { label: "Asia/Colombo (GMT+5:30)", value: "Asia/Colombo" },
    { label: "Asia/Dhaka (GMT+6)", value: "Asia/Dhaka" },
    { label: "Asia/Dubai (GMT+4)", value: "Asia/Dubai" },
    { label: "Asia/Ho_Chi_Minh (GMT+7)", value: "Asia/Ho_Chi_Minh" },
    { label: "Asia/Hong_Kong (GMT+8)", value: "Asia/Hong_Kong" },
    { label: "Asia/Jakarta (GMT+7)", value: "Asia/Jakarta" },
    { label: "Asia/Jerusalem (GMT+2)", value: "Asia/Jerusalem" },
    { label: "Asia/Karachi (GMT+5)", value: "Asia/Karachi" },
    { label: "Asia/Kathmandu (GMT+5:45)", value: "Asia/Kathmandu" },
    { label: "Asia/Kolkata (GMT+5:30)", value: "Asia/Kolkata" },
    { label: "Asia/Kuala_Lumpur (GMT+8)", value: "Asia/Kuala_Lumpur" },
    { label: "Asia/Kuwait (GMT+3)", value: "Asia/Kuwait" },
    { label: "Asia/Manila (GMT+8)", value: "Asia/Manila" },
    { label: "Asia/Muscat (GMT+4)", value: "Asia/Muscat" },
    { label: "Asia/Qatar (GMT+3)", value: "Asia/Qatar" },
    { label: "Asia/Riyadh (GMT+3)", value: "Asia/Riyadh" },
    { label: "Asia/Seoul (GMT+9)", value: "Asia/Seoul" },
    { label: "Asia/Shanghai (GMT+8)", value: "Asia/Shanghai" },
    { label: "Asia/Singapore (GMT+8)", value: "Asia/Singapore" },
    { label: "Asia/Taipei (GMT+8)", value: "Asia/Taipei" },
    { label: "Asia/Tokyo (GMT+9)", value: "Asia/Tokyo" },
  ]},
  { group: "Australia", zones: [
    { label: "Australia/Sydney (GMT+10)", value: "Australia/Sydney" },
  ]},
  { group: "Europe", zones: [
    { label: "Europe/Amsterdam (GMT+1)", value: "Europe/Amsterdam" },
    { label: "Europe/Berlin (GMT+1)", value: "Europe/Berlin" },
    { label: "Europe/Brussels (GMT+1)", value: "Europe/Brussels" },
    { label: "Europe/Copenhagen (GMT+1)", value: "Europe/Copenhagen" },
    { label: "Europe/Dublin (GMT+0)", value: "Europe/Dublin" },
    { label: "Europe/Helsinki (GMT+2)", value: "Europe/Helsinki" },
    { label: "Europe/Istanbul (GMT+3)", value: "Europe/Istanbul" },
    { label: "Europe/London (GMT+0)", value: "Europe/London" },
    { label: "Europe/Madrid (GMT+1)", value: "Europe/Madrid" },
    { label: "Europe/Oslo (GMT+1)", value: "Europe/Oslo" },
    { label: "Europe/Paris (GMT+1)", value: "Europe/Paris" },
    { label: "Europe/Rome (GMT+1)", value: "Europe/Rome" },
    { label: "Europe/Stockholm (GMT+1)", value: "Europe/Stockholm" },
    { label: "Europe/Vienna (GMT+1)", value: "Europe/Vienna" },
    { label: "Europe/Zurich (GMT+1)", value: "Europe/Zurich" },
  ]},
  { group: "Pacific", zones: [
    { label: "Pacific/Auckland (GMT+12)", value: "Pacific/Auckland" },
  ]},
];

export const DEFAULT_CONFIG: AppConfig = {
  companyName: "OpenHRApp Solutions Ltd.",
  timezone: "UTC",
  currency: "USD",
  dateFormat: "DD/MM/YYYY",
  workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Sunday"],
  officeStartTime: "09:00",
  officeEndTime: "18:00",
  lateGracePeriod: 5,
  earlyOutGracePeriod: 15,
  defaultReportRecipient: "",
  dutyLabel1: "Office",
  dutyLabel2: "Factory"
};