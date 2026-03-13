import React from 'react';
import { MapPin, Calendar, Users, BarChart3, ClipboardCheck, Camera, Globe } from 'lucide-react';

// Summary features used on FeaturesPage
export const features = [
  {
    icon: MapPin,
    slug: 'attendance-tracking',
    title: 'Attendance Management',
    subtitle: 'Selfie-based check-in with GPS tracking',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    description: 'Eliminate buddy punching and manual timesheets with photo-verified attendance. Employees check in by taking a selfie through the app, which captures their photo along with GPS coordinates and a timestamp — ensuring authentic, tamper-proof attendance records.',
    subFeatures: [
      'Selfie-based check-in with automatic photo capture',
      'GPS location tracking for on-site verification',
      'Office mode (standard) and Factory mode (shift-based)',
      'Real-time attendance dashboard with live status',
      'Attendance logs with filtering, search, and audit trail',
      'Late arrival and early departure tracking',
      'Admin override and manual adjustment capabilities',
    ],
  },
  {
    icon: Calendar,
    slug: 'leave-management',
    title: 'Leave Management',
    subtitle: 'Complete leave lifecycle from request to approval',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    description: 'Streamline your entire leave process. Employees can apply for leave in seconds, managers get instant notifications for one-click approval, and HR has full visibility into leave balances and trends across the organization.',
    subFeatures: [
      'One-click leave application with date range picker',
      'Configurable leave types (annual, sick, casual, custom)',
      'Annual allowance and balance tracking per employee',
      'Manager approval workflow with email notifications',
      'Leave calendar view for team availability',
      'Half-day and multi-day leave support',
      'Automatic balance calculations and carry-over rules',
    ],
  },
  {
    icon: Users,
    slug: 'employee-directory',
    title: 'Employee Directory',
    subtitle: 'Centralized employee profiles and org structure',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    description: 'Maintain a complete digital record of every team member. From personal details and job information to department assignments and reporting structure — everything is organized, searchable, and accessible to authorized users.',
    subFeatures: [
      'Complete employee profiles with personal and job details',
      'Department and designation management',
      'Role-based access control (Admin, HR, Manager, Employee)',
      'Quick search and advanced filtering',
      'Employee onboarding and offboarding workflows',
      'Bulk employee import and export',
      'Profile photo management',
    ],
  },
  {
    icon: BarChart3,
    slug: 'reports-analytics',
    title: 'Reports & Analytics',
    subtitle: 'Data-driven insights for better HR decisions',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    description: 'Turn your HR data into actionable insights. Generate comprehensive reports on attendance patterns, leave utilization, and team performance. Export data for further analysis or compliance requirements.',
    subFeatures: [
      'Attendance summary reports by employee, department, or date range',
      'Leave utilization and balance reports',
      'Late arrival and absenteeism trends',
      'Interactive charts and visual dashboards',
      'Export to CSV for payroll integration',
      'Custom date range filtering',
      'Department-level analytics and comparisons',
    ],
  },
  {
    icon: ClipboardCheck,
    slug: 'performance-reviews',
    title: 'Performance Reviews',
    subtitle: 'Structured review cycles with multi-level evaluation',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    description: 'Run fair, transparent, and consistent performance reviews. Define custom competencies, set rating scales, and execute structured review cycles with self-assessment, manager evaluation, and HR finalization stages.',
    subFeatures: [
      'Configurable review cycles with custom periods',
      'Self-assessment by employees',
      'Manager evaluation with competency ratings',
      'HR review and finalization stage',
      'Customizable competency frameworks and rating scales',
      'Attendance and leave integration in review cards',
      'Review history and progress tracking',
    ],
  },
  {
    icon: Globe,
    slug: 'gps-geofencing',
    title: 'GPS & Location Verification',
    subtitle: 'Verify employee location at check-in',
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
    border: 'border-cyan-100',
    description: 'Every attendance check-in captures GPS coordinates alongside the selfie, providing location verification for remote teams, field workers, and multi-location organizations.',
    subFeatures: [
      'Automatic GPS capture on check-in',
      'Map view showing check-in locations',
      'Multi-location organization support',
      'Field worker and remote team tracking',
      'Location data in exportable reports',
    ],
  },
  {
    icon: Camera,
    slug: 'biometric-selfie-verification',
    title: 'Biometric Selfie Verification',
    subtitle: 'Photo-verified attendance without hardware',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-100',
    description: 'No fingerprint scanners or special hardware needed. OpenHR uses the camera on any smartphone to verify employee identity at check-in, eliminating buddy punching and attendance fraud.',
    subFeatures: [
      'Front-camera selfie capture on check-in',
      'Visual audit trail for managers',
      'Eliminates buddy punching',
      'No biometric hardware required',
      'Privacy-respectful: no facial recognition processing',
    ],
  },
];

// Detailed feature data used on FeatureDetailPage
export interface FeatureData {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  icon: React.FC<{ size?: number; className?: string }>;
  color: string;
  bg: string;
  border: string;
  heroDescription: string;
  sections: {
    heading: string;
    description: string;
    bullets: string[];
  }[];
  useCases: { title: string; description: string }[];
}

export const FEATURES: FeatureData[] = [
  {
    slug: 'attendance-tracking',
    title: 'Attendance Management',
    metaTitle: 'Attendance Tracking Software | OpenHR - Selfie & GPS Check-In',
    metaDescription: 'Track employee attendance with selfie-based check-in, GPS verification, and real-time dashboards. Supports office and factory shift modes. Free and open-source.',
    icon: MapPin,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    heroDescription: 'Eliminate buddy punching and manual timesheets. OpenHR uses selfie-based check-in with GPS tracking to ensure authentic, tamper-proof attendance records — all from a simple mobile interface.',
    sections: [
      {
        heading: 'Selfie-Based Verification',
        description: 'When employees check in, the app captures a selfie along with their GPS coordinates and timestamp. This creates a verifiable, tamper-proof record that eliminates common attendance fraud like buddy punching or false clock-ins.',
        bullets: [
          'Automatic front-camera selfie capture on check-in and check-out',
          'GPS coordinates recorded with each attendance entry',
          'Timestamp verification for accurate time tracking',
          'Photo evidence stored securely for audit purposes',
          'Works offline with sync when connection is restored',
        ],
      },
      {
        heading: 'Office & Factory Modes',
        description: 'Different workplaces have different needs. OpenHR supports two attendance modes to accommodate various work environments and shift patterns.',
        bullets: [
          'Office Mode: Standard check-in/check-out for regular business hours',
          'Factory Mode: Shift-based tracking for manufacturing and production environments',
          'Admins can configure which modes are available per organization',
          'Automatic overtime detection based on configured work hours',
          'Support for split shifts and flexible working hours',
        ],
      },
      {
        heading: 'Real-Time Dashboard & Logs',
        description: 'Get instant visibility into who is present, who is late, and who is absent. The attendance dashboard provides real-time status updates that help managers make informed decisions.',
        bullets: [
          'Live attendance status for all employees',
          'Late arrival and early departure flagging',
          'Detailed attendance logs with search and date filtering',
          'Admin audit trail for manual adjustments',
          'Export attendance data to CSV for payroll integration',
        ],
      },
    ],
    useCases: [
      { title: 'Remote Teams', description: 'Verify that remote employees are working from approved locations with GPS-tagged check-ins.' },
      { title: 'Field Workers', description: 'Track attendance for employees at construction sites, client locations, or on the road.' },
      { title: 'Shift-Based Work', description: 'Manage factory or warehouse shifts with automatic overtime calculation.' },
    ],
  },
  {
    slug: 'leave-management',
    title: 'Leave Management',
    metaTitle: 'Leave Management System | OpenHR - Request, Approve & Track',
    metaDescription: 'Streamline leave requests, approvals, and balance tracking. Configure custom leave types with automatic calculations. Free HR leave management software.',
    icon: Calendar,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    heroDescription: 'From application to approval in seconds. OpenHR automates your entire leave process with configurable leave types, instant notifications, and real-time balance tracking.',
    sections: [
      {
        heading: 'Easy Leave Application',
        description: 'Employees can apply for leave in just a few taps. Select the leave type, pick dates, add an optional reason, and submit. No more paper forms or email chains.',
        bullets: [
          'Intuitive date range picker with calendar view',
          'Multiple leave types: annual, sick, casual, and custom',
          'Half-day and multi-day leave support',
          'Optional reason/notes field for context',
          'View remaining balance before applying',
        ],
      },
      {
        heading: 'Manager Approval Workflow',
        description: 'Managers receive instant email notifications when leave is requested. Review and approve or reject with one click — no delays, no bottlenecks.',
        bullets: [
          'Email notifications for new leave requests',
          'One-click approve or reject from the dashboard',
          'Rejection reason field for transparency',
          'View team calendar to check for conflicts before approving',
          'Automatic balance deduction on approval',
        ],
      },
      {
        heading: 'Balance Tracking & Configuration',
        description: 'Configure leave policies that match your organization. Set annual allowances, define carry-over rules, and let the system handle the calculations automatically.',
        bullets: [
          'Configurable annual allowance per leave type',
          'Automatic balance calculations throughout the year',
          'Carry-over rules for unused leave days',
          'Leave balance reports by employee or department',
          'Year-end summary and reset automation',
        ],
      },
    ],
    useCases: [
      { title: 'Growing Teams', description: 'Replace spreadsheets with an automated system that scales with your team.' },
      { title: 'Multi-Department Orgs', description: 'Different leave policies per department with centralized reporting.' },
      { title: 'Compliance', description: 'Maintain accurate leave records for labor law compliance and audits.' },
    ],
  },
  {
    slug: 'performance-reviews',
    title: 'Performance Reviews',
    metaTitle: 'Performance Review Software | OpenHR - Structured Review Cycles',
    metaDescription: 'Run structured performance reviews with self-assessment, manager evaluation, and HR finalization. Customizable competencies and rating scales. Free HRMS.',
    icon: ClipboardCheck,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    heroDescription: 'Run fair, transparent, and data-driven performance reviews. Define competencies, set rating scales, and execute structured review cycles with multiple evaluation stages.',
    sections: [
      {
        heading: 'Multi-Stage Review Process',
        description: 'OpenHR implements a three-stage review process that ensures comprehensive, fair evaluations with input from multiple perspectives.',
        bullets: [
          'Stage 1: Employee self-assessment with competency ratings',
          'Stage 2: Direct manager evaluation and feedback',
          'Stage 3: HR review, calibration, and finalization',
          'Each stage has configurable deadlines and reminders',
          'Progress tracking across all review stages',
        ],
      },
      {
        heading: 'Customizable Competencies',
        description: 'Define the competency framework that matters to your organization. Create custom competencies, set rating scales, and ensure consistent evaluation criteria across teams.',
        bullets: [
          'Custom competency definitions with descriptions',
          'Configurable rating scales (1-5, 1-10, or custom)',
          'Weight different competencies based on importance',
          'Competency categories for organized assessment',
          'Reuse frameworks across multiple review cycles',
        ],
      },
      {
        heading: 'Integrated Data',
        description: 'Performance reviews in OpenHR automatically pull in relevant data from attendance and leave records, giving reviewers a complete picture of employee performance.',
        bullets: [
          'Attendance summary card in review interface',
          'Leave utilization data during review period',
          'Historical review scores for trend analysis',
          'Side-by-side comparison of self vs. manager ratings',
          'Exportable review reports for record-keeping',
        ],
      },
    ],
    useCases: [
      { title: 'Annual Reviews', description: 'Run company-wide annual performance reviews with consistent criteria and timelines.' },
      { title: 'Probation Reviews', description: 'Evaluate new hires at the end of their probation period with structured feedback.' },
      { title: 'Quarterly Check-ins', description: 'Implement more frequent review cycles for fast-paced teams.' },
    ],
  },
  {
    slug: 'gps-geofencing',
    title: 'GPS & Location Verification',
    metaTitle: 'GPS Attendance Tracking | OpenHR - Location Verified Check-In',
    metaDescription: 'Verify employee attendance with GPS location tracking. Ensure employees check in from approved locations. Ideal for remote teams and field workers.',
    icon: Globe,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
    border: 'border-cyan-100',
    heroDescription: 'Know exactly where your employees are when they check in. GPS-tagged attendance entries provide location verification that builds trust and accountability across distributed teams.',
    sections: [
      {
        heading: 'Automatic Location Capture',
        description: 'Every attendance check-in automatically captures GPS coordinates alongside the selfie. This creates a complete, verifiable record without requiring any extra steps from employees.',
        bullets: [
          'GPS coordinates captured automatically on check-in',
          'Location data stored with each attendance record',
          'Map view showing check-in locations for easy verification',
          'Works with both mobile and desktop devices',
          'Privacy-respectful: only captures location during check-in, not continuous tracking',
        ],
      },
      {
        heading: 'Location-Based Insights',
        description: 'Managers can review where employees checked in from, making it easy to verify on-site presence for field workers, remote employees, or multi-location teams.',
        bullets: [
          'Visual map display of check-in locations in attendance logs',
          'Compare expected vs. actual check-in locations',
          'Identify patterns in remote work locations',
          'Useful for field workforce management',
          'Location data included in exportable reports',
        ],
      },
      {
        heading: 'Multi-Location Support',
        description: 'Whether your team works from one office or across multiple sites, GPS tracking helps you maintain visibility and accountability across all locations.',
        bullets: [
          'Support for organizations with multiple office locations',
          'Field worker attendance tracking at client sites',
          'Remote work verification for hybrid teams',
          'Construction site and project-based attendance',
          'Event and temporary workspace tracking',
        ],
      },
    ],
    useCases: [
      { title: 'Construction Companies', description: 'Verify workers are checking in from the actual job site, not from home.' },
      { title: 'Sales Teams', description: 'Track attendance for field sales reps visiting client locations.' },
      { title: 'Hybrid Work', description: 'Monitor which days employees work from home vs. the office.' },
    ],
  },
  {
    slug: 'biometric-selfie-verification',
    title: 'Biometric Selfie Verification',
    metaTitle: 'Selfie-Based Attendance | OpenHR - Photo Verified Check-In',
    metaDescription: 'Prevent buddy punching with selfie-based attendance verification. Photo evidence ensures authentic check-ins. No special hardware needed.',
    icon: Camera,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-100',
    heroDescription: 'No fingerprint scanners. No hardware. Just a selfie. OpenHR uses the camera on any smartphone to verify employee identity at check-in, eliminating attendance fraud without expensive biometric equipment.',
    sections: [
      {
        heading: 'How Selfie Verification Works',
        description: 'When an employee taps "Check In", the app activates the front camera and captures a selfie. This photo is stored alongside the attendance record, creating visual proof of who checked in and when.',
        bullets: [
          'Front-camera activation on check-in and check-out',
          'Automatic photo capture — no manual upload needed',
          'Photos stored securely with the attendance record',
          'Visual audit trail for managers and HR',
          'Works on any device with a camera (phone, tablet, laptop)',
        ],
      },
      {
        heading: 'Eliminating Attendance Fraud',
        description: 'Traditional attendance systems (cards, PINs, even fingerprints) can be gamed. Selfie verification creates a visual record that makes buddy punching virtually impossible.',
        bullets: [
          'Prevents buddy punching — each check-in has a face attached',
          'No shared PINs or swipe cards to pass around',
          'No expensive biometric hardware to purchase or maintain',
          'Photo evidence available for disputes or audits',
          'Combines with GPS for location + identity verification',
        ],
      },
      {
        heading: 'Privacy & Security',
        description: 'Employee photos are treated as sensitive data. OpenHR ensures selfie data is stored securely and only accessible to authorized personnel.',
        bullets: [
          'Photos stored with role-based access control',
          'Only HR and managers can view attendance selfies',
          'No facial recognition or biometric data processing',
          'Photos used solely for attendance verification',
          'Compliant with standard data privacy practices',
        ],
      },
    ],
    useCases: [
      { title: 'Small Businesses', description: 'Get biometric-level verification without buying any hardware.' },
      { title: 'Large Workforces', description: 'Scale attendance verification to hundreds of employees without infrastructure costs.' },
      { title: 'Temporary Workers', description: 'Verify contractor and temp worker attendance without issuing badges or cards.' },
    ],
  },
  {
    slug: 'employee-directory',
    title: 'Employee Directory',
    metaTitle: 'Employee Directory & HR Database | OpenHR - Centralized Team Management',
    metaDescription: 'Manage employee profiles, departments, and org structure in one place. Role-based access, bulk import, and searchable directory. Free open-source HRMS.',
    icon: Users,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    heroDescription: 'A complete digital record of every team member. From personal details and job information to department assignments and reporting structure — everything is organized, searchable, and accessible to authorized users.',
    sections: [
      {
        heading: 'Complete Employee Profiles',
        description: 'Store all employee information in one centralized, searchable database. Each profile contains personal details, job information, emergency contacts, and employment history.',
        bullets: [
          'Personal details: name, email, phone, address, date of birth',
          'Job information: designation, department, join date, employment type',
          'Emergency contact information',
          'Profile photo management',
          'Employment history and status tracking',
        ],
      },
      {
        heading: 'Department & Role Management',
        description: 'Organize your workforce by departments, designations, and teams. Assign roles that control what each employee can see and do within the system.',
        bullets: [
          'Create and manage departments and designations',
          'Role-based access control: Admin, HR, Manager, Employee',
          'Team assignments with reporting hierarchy',
          'Department-level leave policies and settings',
          'Organizational chart visualization',
        ],
      },
      {
        heading: 'Search, Filter & Export',
        description: 'Find any employee instantly with powerful search and filtering. Export employee data for payroll, compliance, or reporting needs.',
        bullets: [
          'Full-text search across all employee fields',
          'Filter by department, designation, status, or role',
          'Bulk employee import from spreadsheets',
          'Export employee data to CSV',
          'Quick-view cards and detailed profile views',
        ],
      },
    ],
    useCases: [
      { title: 'Growing Startups', description: 'Replace scattered spreadsheets with a proper employee database from day one.' },
      { title: 'Multi-Department Orgs', description: 'Keep employee records organized across departments with role-based visibility.' },
      { title: 'HR Audits', description: 'Maintain compliance-ready employee records with complete employment history.' },
    ],
  },
  {
    slug: 'reports-analytics',
    title: 'Reports & Analytics',
    metaTitle: 'HR Reports & Analytics | OpenHR - Data-Driven HR Decisions',
    metaDescription: 'Generate attendance reports, leave utilization analytics, and team performance insights. Interactive charts and CSV export. Free open-source HR reporting.',
    icon: BarChart3,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    heroDescription: 'Turn your HR data into actionable insights. Generate comprehensive reports on attendance patterns, leave utilization, and team performance — with interactive charts and one-click CSV export.',
    sections: [
      {
        heading: 'Attendance Reports',
        description: 'Analyze attendance patterns across your organization. Identify trends in late arrivals, early departures, and absenteeism to improve workforce management.',
        bullets: [
          'Daily, weekly, and monthly attendance summaries',
          'Late arrival and early departure trend analysis',
          'Department-wise attendance comparison',
          'Individual employee attendance history',
          'Absenteeism rate tracking over time',
        ],
      },
      {
        heading: 'Leave Analytics',
        description: 'Understand how leave is being utilized across your organization. Track balances, identify peak leave periods, and ensure fair distribution.',
        bullets: [
          'Leave utilization by type, department, and employee',
          'Leave balance reports with carry-over tracking',
          'Peak leave period identification',
          'Approval rate and turnaround time metrics',
          'Year-over-year leave trend comparison',
        ],
      },
      {
        heading: 'Export & Integration',
        description: 'Get your data where you need it. Export any report to CSV for payroll processing, compliance filing, or further analysis in your preferred tools.',
        bullets: [
          'One-click CSV export for all report types',
          'Custom date range filtering on all reports',
          'Interactive charts with drill-down capability',
          'Print-ready PDF report generation',
          'Data formatted for common payroll system import',
        ],
      },
    ],
    useCases: [
      { title: 'Payroll Processing', description: 'Export attendance and leave data directly for accurate payroll calculations.' },
      { title: 'Management Reviews', description: 'Present workforce analytics in leadership meetings with visual dashboards.' },
      { title: 'Compliance Reporting', description: 'Generate required HR reports for labor law compliance and audits.' },
    ],
  },
];
