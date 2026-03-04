import { Holiday, AppConfig, CompetencyId, HROverallRating } from './types';

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

export const BD_HOLIDAYS: Holiday[] = [
  { id: 'bd-h1', date: '2024-02-21', name: 'Shaheed Dibash (Language Day)', isGovernment: true, type: 'NATIONAL' },
  { id: 'bd-h2', date: '2024-03-26', name: 'Independence Day', isGovernment: true, type: 'NATIONAL' },
  { id: 'bd-h3', date: '2024-04-14', name: 'Pohela Boishakh (Bengali New Year)', isGovernment: true, type: 'FESTIVAL' },
  { id: 'bd-h4', date: '2024-05-01', name: 'May Day', isGovernment: true, type: 'NATIONAL' },
  { id: 'bd-h5', date: '2024-12-16', name: 'Victory Day', isGovernment: true, type: 'NATIONAL' },
  { id: 'bd-h6', date: '2024-12-25', name: 'Christmas Day', isGovernment: true, type: 'FESTIVAL' },
  { id: 'bd-h7', date: '2024-04-10', name: 'Eid-ul-Fitr', isGovernment: true, type: 'ISLAMIC' },
  { id: 'bd-h8', date: '2024-04-11', name: 'Eid-ul-Fitr (Day 2)', isGovernment: true, type: 'ISLAMIC' },
  { id: 'bd-h9', date: '2024-06-17', name: 'Eid-ul-Adha', isGovernment: true, type: 'ISLAMIC' },
];

export const PERFORMANCE_COMPETENCIES: {
  id: CompetencyId;
  name: string;
  description: string;
  behaviors: string[];
}[] = [
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

export const RATING_SCALE: {
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

export const HR_OVERALL_RATINGS: {
  value: HROverallRating;
  label: string;
  color: string;
}[] = [
  { value: 'EXCELLENT', label: 'Excellent', color: 'bg-green-500' },
  { value: 'VERY_GOOD', label: 'Very Good', color: 'bg-blue-500' },
  { value: 'GOOD', label: 'Good', color: 'bg-yellow-500' },
  { value: 'NEEDS_IMPROVEMENT', label: 'Needs Improvement', color: 'bg-orange-500' },
  { value: 'UNSATISFACTORY', label: 'Unsatisfactory', color: 'bg-red-500' },
];

export const DEFAULT_CONFIG: AppConfig = {
  companyName: "OpenHRApp Solutions Ltd.",
  timezone: "Asia/Dhaka",
  currency: "BDT",
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