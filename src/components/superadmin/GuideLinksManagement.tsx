
import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, Loader2, ExternalLink, BookOpen } from 'lucide-react';
import { superAdminService } from '../../services/superadmin.service';
import { tutorialService } from '../../services/tutorial.service';
import { getDefaultGuideLinks, clearGuideLinksCache } from '../onboarding/HelpButton';

interface Tutorial {
  id: string;
  title: string;
  slug: string;
  status: string;
}

// Human-readable labels for each help point
const HELP_POINT_LABELS: Record<string, { label: string; section: string }> = {
  // Sidebar menu items
  'sidebar.dashboard': { label: 'Sidebar — Dashboard', section: 'Sidebar Menu' },
  'sidebar.profile': { label: 'Sidebar — My Profile', section: 'Sidebar Menu' },
  'sidebar.attendance-logs': { label: 'Sidebar — My Attendance', section: 'Sidebar Menu' },
  'sidebar.attendance-audit': { label: 'Sidebar — Attendance Audit', section: 'Sidebar Menu' },
  'sidebar.leave': { label: 'Sidebar — Leave', section: 'Sidebar Menu' },
  'sidebar.announcements': { label: 'Sidebar — Announcements', section: 'Sidebar Menu' },
  'sidebar.admin-notifications': { label: 'Sidebar — Notifications', section: 'Sidebar Menu' },
  'sidebar.employees': { label: 'Sidebar — Team Directory', section: 'Sidebar Menu' },
  'sidebar.performance-review': { label: 'Sidebar — Performance', section: 'Sidebar Menu' },
  'sidebar.organization': { label: 'Sidebar — Organization', section: 'Sidebar Menu' },
  'sidebar.reports': { label: 'Sidebar — Reports', section: 'Sidebar Menu' },
  'sidebar.settings': { label: 'Sidebar — Settings', section: 'Sidebar Menu' },
  // Dashboard
  'dashboard.admin': { label: 'Dashboard (Admin)', section: 'Dashboard' },
  'dashboard.manager': { label: 'Dashboard (Manager)', section: 'Dashboard' },
  'dashboard.employee': { label: 'Dashboard (Employee)', section: 'Dashboard' },
  // Page headers
  'attendance.clockin': { label: 'Attendance — Clock In', section: 'Attendance' },
  'attendance.logs': { label: 'My Attendance History', section: 'Attendance' },
  'attendance.audit': { label: 'Attendance Audit', section: 'Attendance' },
  'leave.balance': { label: 'Leave Balance Cards', section: 'Leave' },
  'leave.apply': { label: 'Leave Application Form', section: 'Leave' },
  'leave.manager': { label: 'Manager Approval Hub', section: 'Leave' },
  'leave.hr': { label: 'HR Administration', section: 'Leave' },
  'employees.directory': { label: 'Employee Directory', section: 'Employees' },
  'employees.create': { label: 'Add Employee Form', section: 'Employees' },
  // Organization tabs
  'org.structure': { label: 'Organization — Structure', section: 'Organization' },
  'org.teams': { label: 'Organization — Teams', section: 'Organization' },
  'org.placement': { label: 'Organization — Placement', section: 'Organization' },
  'org.shifts': { label: 'Organization — Shifts', section: 'Organization' },
  'org.workflow': { label: 'Organization — Workflow', section: 'Organization' },
  'org.leaves': { label: 'Organization — Leaves', section: 'Organization' },
  'org.holidays': { label: 'Organization — Holidays', section: 'Organization' },
  'org.notifications': { label: 'Organization — Notifications', section: 'Organization' },
  'org.system': { label: 'Organization — System', section: 'Organization' },
  // Other pages
  'reports.generator': { label: 'Reports Generator', section: 'Reports' },
  'review.employee': { label: 'Performance Review (Employee)', section: 'Reviews' },
  'review.manager': { label: 'Performance Review (Manager)', section: 'Reviews' },
  'review.hr': { label: 'Performance Review (HR)', section: 'Reviews' },
  'announcements': { label: 'Announcements', section: 'Other' },
  'notifications.admin': { label: 'Admin Notifications', section: 'Other' },
  'settings.profile': { label: 'Profile Settings', section: 'Other' },
  'settings.theme': { label: 'Theme Customization', section: 'Other' },
};

interface Props {
  onMessage: (msg: { type: 'success' | 'error'; text: string } | null) => void;
}

const GuideLinksManagement: React.FC<Props> = ({ onMessage }) => {
  const [linkMap, setLinkMap] = useState<Record<string, string>>({});
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [currentLinks, allTutorials] = await Promise.all([
          superAdminService.getGuideHelpLinks(),
          tutorialService.getAllTutorials(),
        ]);
        const defaults = getDefaultGuideLinks();
        setLinkMap(currentLinks && Object.keys(currentLinks).length > 0 ? currentLinks : defaults);
        setTutorials(allTutorials.filter((t: any) => t.status === 'PUBLISHED').map((t: any) => ({
          id: t.id,
          title: t.title,
          slug: t.slug,
          status: t.status,
        })));
      } catch (e) {
        console.warn('[GuideLinks] Load failed:', e);
        setLinkMap(getDefaultGuideLinks());
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleChange = (helpPointId: string, slug: string) => {
    setLinkMap(prev => ({ ...prev, [helpPointId]: slug }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await superAdminService.setGuideHelpLinks(linkMap);
      clearGuideLinksCache();
      onMessage({ type: 'success', text: 'Guide links saved successfully.' });
    } catch (e: any) {
      onMessage({ type: 'error', text: e?.message || 'Failed to save guide links.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setLinkMap(getDefaultGuideLinks());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  // Group by section
  const sections = Object.entries(HELP_POINT_LABELS).reduce<Record<string, { id: string; label: string }[]>>((acc, [id, info]) => {
    if (!acc[info.section]) acc[info.section] = [];
    acc[info.section].push({ id, label: info.label });
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen size={22} className="text-primary" />
            Guide Help Links
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Configure which tutorial opens when users click the help button on each page.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
          >
            <RotateCcw size={14} /> Reset
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-xl transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>
        </div>
      </div>

      {Object.entries(sections).map(([sectionName, items]) => (
        <div key={sectionName} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{sectionName}</p>
          </div>
          <div className="divide-y divide-slate-50">
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between px-4 py-3 gap-4">
                <label className="text-sm font-medium text-slate-700 whitespace-nowrap min-w-0 truncate flex-shrink-0">
                  {item.label}
                </label>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <select
                    value={linkMap[item.id] || ''}
                    onChange={(e) => handleChange(item.id, e.target.value)}
                    className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30 max-w-[220px]"
                  >
                    <option value="">— None —</option>
                    {tutorials.map(t => (
                      <option key={t.id} value={t.slug}>{t.title}</option>
                    ))}
                  </select>
                  {linkMap[item.id] && (
                    <button
                      onClick={() => window.open(`/how-to-use/${linkMap[item.id]}`, '_blank')}
                      title="Preview"
                      className="p-1 text-slate-400 hover:text-primary transition-colors"
                    >
                      <ExternalLink size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default GuideLinksManagement;
