
import { useState, useEffect, useCallback } from 'react';
import { hrService } from '../../services/hrService';
import { AppConfig, Holiday, Team, Shift } from '../../types';

export interface SetupStep {
  id: number;
  title: string;
  description: string;
  navigateTo: string;
  navigateTab?: string;
  tutorialSlug: string;
  completed: boolean;
}

interface SetupCheckData {
  config: AppConfig | null;
  departments: string[];
  teams: Team[];
  shifts: Shift[];
  holidays: Holiday[];
  employeeCount: number;
}

const STEPS_CONFIG = [
  {
    id: 1,
    title: 'Set Company Info',
    description: 'Add your company name, logo, country, and address',
    navigateTo: 'organization',
    navigateTab: 'SYSTEM',
    tutorialSlug: 'setting-up-organization',
    check: (d: SetupCheckData) => !!(d.config?.companyName && d.config.companyName !== 'My Organization' && d.config.companyName.trim() !== ''),
  },
  {
    id: 2,
    title: 'Add Departments',
    description: 'Create departments like Engineering, HR, Finance, etc.',
    navigateTo: 'organization',
    navigateTab: 'STRUCTURE',
    tutorialSlug: 'setting-up-organization',
    check: (d: SetupCheckData) => d.departments.length > 0,
  },
  {
    id: 3,
    title: 'Configure Shifts',
    description: 'Set up work shifts with start/end times and grace periods',
    navigateTo: 'organization',
    navigateTab: 'SHIFTS',
    tutorialSlug: 'setting-up-organization',
    check: (d: SetupCheckData) => d.shifts.length > 0,
  },
  {
    id: 4,
    title: 'Add Office Locations',
    description: 'Add GPS coordinates for your offices for attendance verification',
    navigateTo: 'organization',
    navigateTab: 'PLACEMENT',
    tutorialSlug: 'setting-up-organization',
    check: (d: SetupCheckData) => !!(d.config?.officeLocations && d.config.officeLocations.length > 0),
  },
  {
    id: 5,
    title: 'Create Teams',
    description: 'Organize employees into teams with team leaders',
    navigateTo: 'organization',
    navigateTab: 'TEAMS',
    tutorialSlug: 'setting-up-organization',
    check: (d: SetupCheckData) => d.teams.length > 0,
  },
  {
    id: 6,
    title: 'Set Leave Policy',
    description: 'Configure default leave allocations (Annual, Casual, Sick)',
    navigateTo: 'organization',
    navigateTab: 'LEAVES',
    tutorialSlug: 'understanding-leave-policies',
    check: (d: SetupCheckData) => {
      // Always considered done if departments exist (leave policy has defaults)
      return d.departments.length > 0;
    },
  },
  {
    id: 7,
    title: 'Add Holidays',
    description: 'Set up your organization\'s holiday calendar',
    navigateTo: 'organization',
    navigateTab: 'HOLIDAYS',
    tutorialSlug: 'setting-up-organization',
    check: (d: SetupCheckData) => d.holidays.length > 0,
  },
  {
    id: 8,
    title: 'Add Employees',
    description: 'Invite your team members to start using OpenHR',
    navigateTo: 'employees',
    tutorialSlug: 'managing-employees',
    check: (d: SetupCheckData) => d.employeeCount > 1,
  },
];

export function useSetupChecklist(userRole: string) {
  const [steps, setSteps] = useState<SetupStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  const isAdminOrHR = userRole === 'ADMIN' || userRole === 'HR';

  const loadStatus = useCallback(async () => {
    if (!isAdminOrHR) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Load onboarding status + org data in parallel
      const [onboardingStatus, config, departments, teams, shifts, holidays, employees] = await Promise.all([
        hrService.getOnboardingStatus(),
        hrService.getConfig(),
        hrService.getDepartments(),
        hrService.getTeams(),
        hrService.getShifts(),
        hrService.getHolidays(),
        hrService.getEmployees(),
      ]);

      if (onboardingStatus?.dismissed) {
        setIsDismissed(true);
        setIsLoading(false);
        return;
      }

      const checkData: SetupCheckData = {
        config,
        departments,
        teams,
        shifts,
        holidays,
        employeeCount: employees.length,
      };

      const evaluatedSteps: SetupStep[] = STEPS_CONFIG.map(s => ({
        id: s.id,
        title: s.title,
        description: s.description,
        navigateTo: s.navigateTo,
        navigateTab: s.navigateTab,
        tutorialSlug: s.tutorialSlug,
        completed: s.check(checkData),
      }));

      setSteps(evaluatedSteps);
    } catch (e) {
      console.warn('[SetupChecklist] Failed to load:', e);
    } finally {
      setIsLoading(false);
    }
  }, [isAdminOrHR]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const dismiss = useCallback(async () => {
    try {
      await hrService.setOnboardingStatus({ dismissed: true });
      setIsDismissed(true);
    } catch (e) {
      console.warn('[SetupChecklist] Failed to dismiss:', e);
    }
  }, []);

  const reEnable = useCallback(async () => {
    try {
      await hrService.setOnboardingStatus({ dismissed: false });
      setIsDismissed(false);
      await loadStatus();
    } catch (e) {
      console.warn('[SetupChecklist] Failed to re-enable:', e);
    }
  }, [loadStatus]);

  const completedCount = steps.filter(s => s.completed).length;
  const totalCount = steps.length;
  const allComplete = completedCount === totalCount && totalCount > 0;
  const currentStep = steps.find(s => !s.completed) || null;

  return {
    steps,
    isLoading,
    isDismissed,
    completedCount,
    totalCount,
    allComplete,
    currentStep,
    dismiss,
    reEnable,
    refresh: loadStatus,
    isAdminOrHR,
  };
}
