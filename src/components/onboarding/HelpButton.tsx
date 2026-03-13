
import React, { useState, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
import { hrService } from '../../services/hrService';

// Default mapping: helpPointId → tutorial slug
const DEFAULT_GUIDE_LINKS: Record<string, string> = {
  // Dashboard
  'dashboard.admin': 'welcome-to-openhr',
  'dashboard.manager': 'welcome-to-openhr',
  'dashboard.employee': 'welcome-to-openhr',
  // Sidebar menu items
  'sidebar.dashboard': 'welcome-to-openhr',
  'sidebar.profile': 'managing-profile-settings',
  'sidebar.attendance-logs': 'understanding-attendance-logs',
  'sidebar.attendance-audit': 'attendance-admin-audit',
  'sidebar.leave': 'how-to-apply-for-leave',
  'sidebar.announcements': 'announcements-guide',
  'sidebar.admin-notifications': 'notifications-guide',
  'sidebar.employees': 'managing-employees',
  'sidebar.performance-review': 'performance-review-self-assessment',
  'sidebar.organization': 'setting-up-organization',
  'sidebar.reports': 'generating-reports',
  'sidebar.settings': 'managing-profile-settings',
  // Attendance
  'attendance.clockin': 'how-to-clock-in-and-out',
  'attendance.logs': 'understanding-attendance-logs',
  'attendance.audit': 'attendance-admin-audit',
  // Leave
  'leave.balance': 'how-to-apply-for-leave',
  'leave.apply': 'how-to-apply-for-leave',
  'leave.manager': 'leave-approval-for-managers',
  'leave.hr': 'leave-approval-for-hr',
  // Employees
  'employees.directory': 'managing-employees',
  'employees.create': 'managing-employees',
  // Organization tabs
  'org.structure': 'setting-up-organization',
  'org.teams': 'setting-up-organization',
  'org.placement': 'setting-up-organization',
  'org.shifts': 'setting-up-organization',
  'org.workflow': 'setting-up-organization',
  'org.leaves': 'understanding-leave-policies',
  'org.holidays': 'setting-up-organization',
  'org.notifications': 'notification-settings',
  'org.system': 'setting-up-organization',
  // Reports
  'reports.generator': 'generating-reports',
  // Performance Reviews
  'review.employee': 'performance-review-self-assessment',
  'review.manager': 'performance-review-for-managers',
  'review.hr': 'performance-review-hr-calibration',
  // Other
  'announcements': 'announcements-guide',
  'notifications.admin': 'notifications-guide',
  'settings.profile': 'managing-profile-settings',
  'settings.theme': 'theme-customization',
};

// Module-level cache
let cachedGuideLinks: Record<string, string> | null = null;

export const getDefaultGuideLinks = () => ({ ...DEFAULT_GUIDE_LINKS });

export const clearGuideLinksCache = () => { cachedGuideLinks = null; };

type HelpButtonVariant = 'default' | 'sidebar' | 'inline';

interface HelpButtonProps {
  helpPointId: string;
  className?: string;
  size?: number;
  variant?: HelpButtonVariant;
}

const HelpButton: React.FC<HelpButtonProps> = ({ helpPointId, className = '', size = 18, variant = 'default' }) => {
  const [slug, setSlug] = useState<string | null>(DEFAULT_GUIDE_LINKS[helpPointId] || null);

  useEffect(() => {
    let cancelled = false;
    const loadLinks = async () => {
      try {
        if (cachedGuideLinks) {
          if (!cancelled) setSlug(cachedGuideLinks[helpPointId] || DEFAULT_GUIDE_LINKS[helpPointId] || null);
          return;
        }
        const links = await hrService.getGuideHelpLinks();
        if (links && Object.keys(links).length > 0) {
          cachedGuideLinks = links;
          if (!cancelled) setSlug(links[helpPointId] || DEFAULT_GUIDE_LINKS[helpPointId] || null);
        }
      } catch {
        // Use defaults on error
      }
    };
    loadLinks();
    return () => { cancelled = true; };
  }, [helpPointId]);

  if (!slug) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    window.open(`/how-to-use/${slug}`, '_blank');
  };

  // Variant-specific styles
  const variantStyles: Record<HelpButtonVariant, string> = {
    default: 'text-primary/60 hover:text-primary hover:bg-primary-light shadow-sm border border-primary/10 hover:border-primary/30',
    sidebar: 'text-slate-300 hover:text-primary hover:bg-primary-light/50 opacity-0 group-hover:opacity-100 transition-all duration-300',
    inline: 'text-primary/50 hover:text-primary hover:bg-primary-light',
  };

  return (
    <button
      onClick={handleClick}
      title="View Guide"
      className={`inline-flex items-center justify-center rounded-full transition-all duration-200 flex-shrink-0 ${variantStyles[variant]} ${className}`}
      style={{ width: size + 8, height: size + 8 }}
    >
      <HelpCircle size={size} />
    </button>
  );
};

export default HelpButton;
