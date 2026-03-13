
import React, { useState, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
import { hrService } from '../../services/hrService';

// Default mapping: helpPointId → tutorial slug
const DEFAULT_GUIDE_LINKS: Record<string, string> = {
  'dashboard.admin': 'welcome-to-openhr',
  'dashboard.manager': 'welcome-to-openhr',
  'dashboard.employee': 'welcome-to-openhr',
  'attendance.clockin': 'how-to-clock-in-and-out',
  'attendance.logs': 'understanding-attendance-logs',
  'attendance.audit': 'attendance-admin-audit',
  'leave.balance': 'how-to-apply-for-leave',
  'leave.apply': 'how-to-apply-for-leave',
  'leave.manager': 'leave-approval-for-managers',
  'leave.hr': 'leave-approval-for-hr',
  'employees.directory': 'managing-employees',
  'employees.create': 'managing-employees',
  'org.structure': 'setting-up-organization',
  'org.teams': 'setting-up-organization',
  'org.placement': 'setting-up-organization',
  'org.shifts': 'setting-up-organization',
  'org.workflow': 'setting-up-organization',
  'org.leaves': 'understanding-leave-policies',
  'org.holidays': 'setting-up-organization',
  'org.notifications': 'notification-settings',
  'org.system': 'setting-up-organization',
  'reports.generator': 'generating-reports',
  'review.employee': 'performance-review-self-assessment',
  'review.manager': 'performance-review-for-managers',
  'review.hr': 'performance-review-hr-calibration',
  'announcements': 'announcements-guide',
  'notifications.admin': 'notifications-guide',
  'settings.profile': 'managing-profile-settings',
  'settings.theme': 'theme-customization',
};

// Module-level cache
let cachedGuideLinks: Record<string, string> | null = null;

export const getDefaultGuideLinks = () => ({ ...DEFAULT_GUIDE_LINKS });

export const clearGuideLinksCache = () => { cachedGuideLinks = null; };

interface HelpButtonProps {
  helpPointId: string;
  className?: string;
  size?: number;
}

const HelpButton: React.FC<HelpButtonProps> = ({ helpPointId, className = '', size = 18 }) => {
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
    window.open(`/how-to-use/${slug}`, '_blank');
  };

  return (
    <button
      onClick={handleClick}
      title="View Guide"
      className={`inline-flex items-center justify-center rounded-full text-slate-400 hover:text-primary hover:bg-primary-light transition-all duration-200 ${className}`}
      style={{ width: size + 6, height: size + 6 }}
    >
      <HelpCircle size={size} />
    </button>
  );
};

export default HelpButton;
