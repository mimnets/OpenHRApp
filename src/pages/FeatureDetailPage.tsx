import React, { useEffect } from 'react';
import { MapPin, Calendar, Users, BarChart3, ClipboardCheck, Camera, Globe, Smartphone, Shield, Check, ArrowLeft, ArrowRight } from 'lucide-react';
import BlogNavbar from '../components/blog/BlogNavbar';
import BlogFooter from '../components/blog/BlogFooter';
import { navigateTo, updatePageMeta, setJsonLd } from '../utils/seo';

interface FeatureData {
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

const FEATURES: FeatureData[] = [
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
];

const FEATURE_SLUGS = FEATURES.map(f => f.slug);

interface FeatureDetailPageProps {
  slug: string;
  onBack: () => void;
}

const FeatureDetailPage: React.FC<FeatureDetailPageProps> = ({ slug, onBack }) => {
  const feature = FEATURES.find(f => f.slug === slug);

  const currentIndex = FEATURE_SLUGS.indexOf(slug);
  const prevFeature = currentIndex > 0 ? FEATURES[currentIndex - 1] : null;
  const nextFeature = currentIndex < FEATURES.length - 1 ? FEATURES[currentIndex + 1] : null;

  useEffect(() => {
    if (feature) {
      updatePageMeta(
        feature.metaTitle,
        feature.metaDescription,
        `https://openhrapp.com/features/${feature.slug}`
      );
      setJsonLd({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: feature.title,
        description: feature.metaDescription,
        url: `https://openhrapp.com/features/${feature.slug}`,
        isPartOf: {
          '@type': 'WebSite',
          name: 'OpenHRApp',
          url: 'https://openhrapp.com',
        },
      });
    }
    return () => { setJsonLd(null); };
  }, [slug, feature]);

  if (!feature) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <BlogNavbar onBack={onBack} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Feature Not Found</h2>
            <p className="text-slate-500 mb-6">The feature page you're looking for doesn't exist.</p>
            <button
              onClick={() => navigateTo('/features')}
              className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-all"
            >
              View All Features
            </button>
          </div>
        </div>
        <BlogFooter />
      </div>
    );
  }

  const FeatureIcon = feature.icon;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <BlogNavbar onBack={onBack} />

      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-sm text-slate-500">
            <button onClick={() => navigateTo('/')} className="hover:text-primary transition-colors font-medium">Home</button>
            <span>/</span>
            <button onClick={() => navigateTo('/features')} className="hover:text-primary transition-colors font-medium">Features</button>
            <span>/</span>
            <span className="text-slate-900 font-semibold">{feature.title}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <div className={`${feature.bg} border-b ${feature.border}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="max-w-3xl">
            <div className={`w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm border ${feature.border}`}>
              <FeatureIcon size={32} className={feature.color} />
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold text-slate-900 tracking-tight mb-6">
              {feature.title}
            </h1>
            <p className="text-lg md:text-xl text-slate-600 leading-relaxed">
              {feature.heroDescription}
            </p>
            <div className="mt-8">
              <button
                onClick={() => navigateTo('/')}
                className="px-8 py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition-colors shadow-sm text-sm"
              >
                Get Started Free
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Sections */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="space-y-20">
            {feature.sections.map((section, i) => (
              <section key={i}>
                <div className={`flex flex-col ${i % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-12 items-start`}>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">{section.heading}</h2>
                    <p className="text-slate-600 text-base leading-relaxed mb-8">{section.description}</p>
                    <ul className="space-y-3">
                      {section.bullets.map(bullet => (
                        <li key={bullet} className="flex items-start gap-3">
                          <Check size={18} className={`${feature.color} mt-0.5 flex-shrink-0`} />
                          <span className="text-sm text-slate-700">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex-1 min-w-0 w-full">
                    <div className={`${feature.bg} ${feature.border} border rounded-2xl p-8 md:p-12 flex flex-col items-center justify-center min-h-[280px]`}>
                      <FeatureIcon size={56} className={`${feature.color} opacity-15 mb-3`} />
                      <p className="text-sm font-medium text-slate-400">{section.heading}</p>
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* Use Cases */}
        <div className="bg-white border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-semibold text-slate-900">Who Is This For?</h2>
              <p className="text-slate-500 mt-3">Common use cases for {feature.title.toLowerCase()}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {feature.useCases.map(uc => (
                <div key={uc.title} className="text-center">
                  <div className={`w-14 h-14 ${feature.bg} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                    <FeatureIcon size={24} className={feature.color} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{uc.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{uc.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Prev / Next Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {prevFeature ? (
              <button
                onClick={() => navigateTo(`/features/${prevFeature.slug}`)}
                className="flex items-center gap-3 p-5 bg-white border border-slate-200 rounded-xl hover:border-primary hover:shadow-sm transition-all text-left"
              >
                <ArrowLeft size={18} className="text-slate-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-400 font-medium">Previous Feature</p>
                  <p className="text-sm font-bold text-slate-900">{prevFeature.title}</p>
                </div>
              </button>
            ) : <div />}
            {nextFeature && (
              <button
                onClick={() => navigateTo(`/features/${nextFeature.slug}`)}
                className="flex items-center justify-end gap-3 p-5 bg-white border border-slate-200 rounded-xl hover:border-primary hover:shadow-sm transition-all text-right"
              >
                <div className="min-w-0">
                  <p className="text-xs text-slate-400 font-medium">Next Feature</p>
                  <p className="text-sm font-bold text-slate-900">{nextFeature.title}</p>
                </div>
                <ArrowRight size={18} className="text-slate-400 flex-shrink-0" />
              </button>
            )}
          </div>

          {/* Back to all features */}
          <div className="mt-8 pt-8 border-t border-slate-200">
            <button
              onClick={() => navigateTo('/features')}
              className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-primary transition-colors"
            >
              <ArrowLeft size={16} /> View all features
            </button>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-primary/5 border-y border-primary/10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-4">
              Ready to try {feature.title.toLowerCase()}?
            </h2>
            <p className="text-lg text-slate-500 mb-8">
              Get started for free. No credit card required.
            </p>
            <button
              onClick={() => navigateTo('/')}
              className="px-8 py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition-colors shadow-sm text-sm"
            >
              Get Started Free
            </button>
          </div>
        </div>
      </div>

      <BlogFooter />
    </div>
  );
};

export default FeatureDetailPage;
