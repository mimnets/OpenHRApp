import React, { useEffect } from 'react';
import { MapPin, Calendar, Users, BarChart3, ClipboardCheck, Camera, Shield, Smartphone, Globe, Bell, Settings, Check, ArrowRight } from 'lucide-react';
import BlogNavbar from '../components/blog/BlogNavbar';
import BlogFooter from '../components/blog/BlogFooter';
import { navigateTo, updatePageMeta, setJsonLd } from '../utils/seo';

const features = [
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

const platformFeatures = [
  {
    icon: Smartphone,
    title: 'Works on Any Device',
    description: 'Progressive Web App that works on phones, tablets, and desktops. Install it like a native app — no app store needed.',
  },
  {
    icon: Globe,
    title: 'Cloud-Based & Always Available',
    description: 'Access your HR system from anywhere. All data is securely stored in the cloud with automatic backups.',
  },
  {
    icon: Bell,
    title: 'Real-Time Notifications',
    description: 'Email and in-app notifications for leave requests, approvals, attendance alerts, and announcements.',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Role-based access control ensures employees only see what they should. All data is encrypted and protected.',
  },
  {
    icon: Settings,
    title: 'Customizable',
    description: 'Configure departments, designations, leave types, review cycles, themes, and more to match your organization.',
  },
];

const comparisonRows = [
  { feature: 'Attendance tracking', openhr: true, typical: true },
  { feature: 'Selfie + GPS verification', openhr: true, typical: false },
  { feature: 'Leave management', openhr: true, typical: true },
  { feature: 'Custom leave types', openhr: true, typical: 'Paid add-on' },
  { feature: 'Employee directory', openhr: true, typical: true },
  { feature: 'Performance reviews', openhr: true, typical: 'Paid add-on' },
  { feature: 'Reports & analytics', openhr: true, typical: true },
  { feature: 'Email notifications', openhr: true, typical: true },
  { feature: 'Mobile app (PWA)', openhr: true, typical: 'Paid add-on' },
  { feature: 'Open source', openhr: true, typical: false },
  { feature: 'Free tier available', openhr: true, typical: false },
  { feature: 'No per-user pricing', openhr: true, typical: false },
];

interface FeaturesPageProps {
  onBack: () => void;
  onRegisterClick?: () => void;
}

const FeaturesPage: React.FC<FeaturesPageProps> = ({ onBack, onRegisterClick }) => {
  useEffect(() => {
    updatePageMeta(
      'Features | OpenHR - Open Source HRMS',
      'Explore all OpenHR features: selfie-based attendance with GPS, leave management, employee directory, performance reviews, reports, and more. Free and open-source.',
      'https://openhrapp.com/features'
    );
    setJsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'OpenHR Features',
      description: 'Complete list of OpenHR HRMS features including attendance management, leave management, employee directory, performance reviews, and analytics.',
      url: 'https://openhrapp.com/features',
      isPartOf: {
        '@type': 'WebSite',
        name: 'OpenHRApp',
        url: 'https://openhrapp.com',
      },
    });
    return () => { setJsonLd(null); };
  }, []);

  const handleGetStarted = () => {
    if (onRegisterClick) {
      navigateTo('/');
      setTimeout(() => onRegisterClick(), 100);
    } else {
      navigateTo('/');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <BlogNavbar onBack={onBack} />

      {/* Hero */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
          <span className="text-xs font-bold text-primary uppercase tracking-widest">Features</span>
          <h1 className="text-4xl md:text-5xl font-semibold text-slate-900 tracking-tight mt-4 mb-6">
            All-in-One HR Management
          </h1>
          <p className="text-lg md:text-xl text-slate-500 max-w-3xl mx-auto leading-relaxed">
            Everything you need to manage attendance, leave, employees, performance reviews, and reports — in one free, open-source platform.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleGetStarted}
              className="px-8 py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition-colors shadow-sm text-sm"
            >
              Get Started Free
            </button>
            <button
              onClick={() => navigateTo('/how-to-use')}
              className="px-8 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm border border-slate-200"
            >
              View Guides
            </button>
          </div>
        </div>
      </div>

      {/* Feature Sections */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="space-y-24">
            {features.map((feature, index) => (
              <section key={feature.title} id={feature.title.toLowerCase().replace(/\s+/g, '-')}>
                <div className={`flex flex-col ${index % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-12 items-start`}>
                  {/* Text Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-12 h-12 ${feature.bg} rounded-xl flex items-center justify-center`}>
                        <feature.icon size={22} className={feature.color} />
                      </div>
                      <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-slate-900">{feature.title}</h2>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-primary mb-4">{feature.subtitle}</p>
                    <p className="text-slate-600 text-base leading-relaxed mb-8">
                      {feature.description}
                    </p>

                    {/* Sub-features list */}
                    <ul className="space-y-3">
                      {feature.subFeatures.map(sub => (
                        <li key={sub} className="flex items-start gap-3">
                          <Check size={18} className={`${feature.color} mt-0.5 flex-shrink-0`} />
                          <span className="text-sm text-slate-700">{sub}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => navigateTo(`/features/${feature.slug}`)}
                      className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-hover transition-colors"
                    >
                      Learn more about {feature.title.toLowerCase()} <ArrowRight size={14} />
                    </button>
                  </div>

                  {/* Visual Placeholder */}
                  <div className="flex-1 min-w-0 w-full">
                    <div className={`${feature.bg} ${feature.border} border rounded-2xl p-8 md:p-12 flex flex-col items-center justify-center min-h-[320px]`}>
                      <feature.icon size={64} className={`${feature.color} opacity-20 mb-4`} />
                      <p className="text-sm font-semibold text-slate-400">{feature.title}</p>
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* Platform Features */}
        <div className="bg-white border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Platform</span>
              <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 mt-3 mb-4">
                Built for Modern Teams
              </h2>
              <p className="text-slate-500 text-lg">
                Beyond core HR features, OpenHR is designed to be fast, accessible, and customizable.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {platformFeatures.map(pf => (
                <div
                  key={pf.title}
                  className="p-6 bg-slate-50/50 border border-slate-100 rounded-2xl hover:bg-white hover:shadow-lg hover:shadow-slate-100 hover:border-slate-200 transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-5">
                    <pf.icon size={22} className="text-primary" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{pf.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{pf.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Comparison</span>
            <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 mt-3 mb-4">
              OpenHR vs Typical Paid HRMS
            </h2>
            <p className="text-slate-500 text-lg">
              Get more features out of the box — without the per-user pricing.
            </p>
          </div>
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-100">
                <div className="px-6 py-4 text-sm font-bold text-slate-900">Feature</div>
                <div className="px-6 py-4 text-sm font-bold text-primary text-center">OpenHR</div>
                <div className="px-6 py-4 text-sm font-bold text-slate-500 text-center">Typical Paid HRMS</div>
              </div>
              {/* Table Rows */}
              {comparisonRows.map((row, i) => (
                <div
                  key={row.feature}
                  className={`grid grid-cols-3 ${i < comparisonRows.length - 1 ? 'border-b border-slate-50' : ''} hover:bg-slate-50/50 transition-colors`}
                >
                  <div className="px-6 py-3.5 text-sm text-slate-700">{row.feature}</div>
                  <div className="px-6 py-3.5 flex justify-center">
                    {row.openhr === true ? (
                      <Check size={18} className="text-emerald-500" />
                    ) : (
                      <span className="text-sm text-slate-400">{String(row.openhr)}</span>
                    )}
                  </div>
                  <div className="px-6 py-3.5 flex justify-center">
                    {row.typical === true ? (
                      <Check size={18} className="text-slate-400" />
                    ) : row.typical === false ? (
                      <span className="text-sm text-slate-300">-</span>
                    ) : (
                      <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full">{String(row.typical)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-primary/5 border-y border-primary/10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 text-center">
            <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 mb-4">
              Ready to simplify your HR?
            </h2>
            <p className="text-lg text-slate-500 mb-8 max-w-2xl mx-auto">
              Join organizations already using OpenHR. Free to start, no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleGetStarted}
                className="px-8 py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition-colors shadow-sm text-sm flex items-center gap-2"
              >
                Get Started Free <ArrowRight size={16} />
              </button>
              <button
                onClick={() => navigateTo('/blog')}
                className="px-8 py-3.5 bg-white text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm border border-slate-200"
              >
                Read Our Blog
              </button>
            </div>
          </div>
        </div>
      </div>

      <BlogFooter />
    </div>
  );
};

export default FeaturesPage;
