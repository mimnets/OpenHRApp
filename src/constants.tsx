import { Holiday, AppConfig } from './types';

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
  defaultReportRecipient: ""
};