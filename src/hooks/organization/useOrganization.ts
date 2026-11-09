
import { useState, useEffect } from 'react';
import { hrService } from '../../services/hrService';
import { Holiday, AppConfig, LeaveWorkflow, Employee, Team, LeavePolicy, ShiftOverride, OrgNotificationConfig } from '../../types';
import { DEFAULT_CONFIG, DEFAULT_NOTIFICATION_CONFIG } from '../../constants';
import { teamProfileUpdates } from '../../utils/reportingLine';

export const useOrganization = () => {
  const [departments, setDepartments] = useState<string[]>([]);
  const [designations, setDesignations] = useState<string[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [workflows, setWorkflows] = useState<LeaveWorkflow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leavePolicy, setLeavePolicy] = useState<LeavePolicy>({ defaults: {}, overrides: {} });
  const [shiftOverrides, setShiftOverrides] = useState<ShiftOverride[]>([]);
  const [notificationConfig, setNotificationConfig] = useState<OrgNotificationConfig>(DEFAULT_NOTIFICATION_CONFIG);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [depts, desigs, hols, wfs, emps, appConfig, teamsList, lPolicy, shiftOverridesList, notifConfig] = await Promise.allSettled([
        hrService.getDepartments(), hrService.getDesignations(), hrService.getHolidays(),
        hrService.getWorkflows(), hrService.getEmployees(), hrService.getConfig(),
        hrService.getTeams(), hrService.getLeavePolicy(), hrService.getShiftOverrides(),
        hrService.getNotificationConfig()
      ]);

      if (depts.status === 'fulfilled') setDepartments(depts.value);
      if (desigs.status === 'fulfilled') setDesignations(desigs.value);
      if (hols.status === 'fulfilled') setHolidays(hols.value);
      if (wfs.status === 'fulfilled') setWorkflows(wfs.value || []);
      if (emps.status === 'fulfilled') setEmployees(emps.value);
      if (appConfig.status === 'fulfilled') {
        const cfg = appConfig.value;
        if (!Array.isArray(cfg.workingDays)) cfg.workingDays = DEFAULT_CONFIG.workingDays;
        setConfig(cfg);
      }
      if (teamsList.status === 'fulfilled') setTeams(teamsList.value);
      if (lPolicy.status === 'fulfilled') setLeavePolicy(lPolicy.value);
      if (shiftOverridesList.status === 'fulfilled') setShiftOverrides(shiftOverridesList.value);
      if (notifConfig.status === 'fulfilled') setNotificationConfig(notifConfig.value);
    } catch (err) { 
      console.error("Critical loading error:", err); 
    } finally { 
      setIsLoading(false); 
    }
  };

  useEffect(() => { loadAllData(); }, []);

  // -- Actions --

  const saveConfig = async (newConfig: AppConfig) => {
    setIsSaving(true);
    try { 
        await hrService.setConfig(newConfig); 
        setConfig(newConfig);
    } catch (err) { throw err; } 
    finally { setIsSaving(false); }
  };

  const updateDepartments = async (newDepts: string[]) => {
      setIsSaving(true);
      await hrService.setDepartments(newDepts);
      setDepartments(newDepts);
      setIsSaving(false);
  };

  const updateDesignations = async (newDesigs: string[]) => {
      setIsSaving(true);
      await hrService.setDesignations(newDesigs);
      setDesignations(newDesigs);
      setIsSaving(false);
  };

  const updateHolidays = async (newHolidays: Holiday[]) => {
      setIsSaving(true);
      await hrService.setHolidays(newHolidays);
      setHolidays(newHolidays);
      setIsSaving(false);
  };

  const saveTeam = async (teamId: string | null, data: Partial<Team>, selectedMembers: Set<string>) => {
      setIsSaving(true);
      let targetId = teamId;
      const previousLeaderId = teams.find(t => t.id === teamId)?.leaderId;
      try {
        // 1. Create or Update Team Record
        let finalTeamId = targetId;
        if (targetId) {
            await hrService.updateTeam(targetId, data);
        } else {
            const newTeam: any = await hrService.createTeam(data);
            finalTeamId = newTeam?.id;
        }

        // 2. Sync Members & Line Managers
        if (finalTeamId) {
            const changes = teamProfileUpdates(finalTeamId, previousLeaderId, data.leaderId || null, selectedMembers, employees);
            await Promise.all(changes.map(c => hrService.updateProfile(c.id, c.updates)));


            // Reload specific data
            const [uTeams, uEmps] = await Promise.all([hrService.getTeams(), hrService.getEmployees()]);
            setTeams(uTeams);
            setEmployees(uEmps);
        }
      } finally {
          setIsSaving(false);
      }
  };

  const deleteTeam = async (teamId: string) => {
      setIsSaving(true);
      const leaderId = teams.find(t => t.id === teamId)?.leaderId;
      await hrService.deleteTeam(teamId);

      // Cleanup: Remove team_id from users
      const changes = teamProfileUpdates(teamId, leaderId, null, new Set(), employees);
      await Promise.all(changes.map(c => hrService.updateProfile(c.id, c.updates)));

      const uTeams = await hrService.getTeams();
      const uEmps = await hrService.getEmployees();
      setTeams(uTeams);
      setEmployees(uEmps);
      setIsSaving(false);
  };

  const updateLeavePolicy = async (newPolicy: LeavePolicy) => {
      setIsSaving(true);
      await hrService.setLeavePolicy(newPolicy);
      setLeavePolicy(newPolicy);
      setIsSaving(false);
  };
  
  const updateWorkflows = async (newWorkflows: LeaveWorkflow[]) => {
      setIsSaving(true);
      await hrService.setWorkflows(newWorkflows);
      setWorkflows(newWorkflows);
      setIsSaving(false);
  };

  const saveNotificationConfig = async (newConfig: OrgNotificationConfig) => {
    setIsSaving(true);
    try {
      await hrService.setNotificationConfig(newConfig);
      setNotificationConfig(newConfig);
    } catch (err) { throw err; }
    finally { setIsSaving(false); }
  };

  const updateShiftOverrides = async (newOverrides: ShiftOverride[]) => {
      setIsSaving(true);
      await hrService.setShiftOverrides(newOverrides);
      setShiftOverrides(newOverrides);
      setIsSaving(false);
  };

  return {
    departments, designations, holidays, teams, config, workflows, employees, leavePolicy, shiftOverrides, notificationConfig,
    isLoading, isSaving,
    saveConfig, updateDepartments, updateDesignations, updateHolidays, saveTeam, deleteTeam, updateLeavePolicy, updateWorkflows,
    updateShiftOverrides, saveNotificationConfig
  };
};
