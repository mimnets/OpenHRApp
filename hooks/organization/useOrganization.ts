
import { useState, useEffect } from 'react';
import { hrService } from '../../services/hrService';
import { Holiday, AppConfig, LeaveWorkflow, Employee, Team, LeavePolicy } from '../../types';
import { DEFAULT_CONFIG, BD_HOLIDAYS } from '../../constants';

export const useOrganization = () => {
  const [departments, setDepartments] = useState<string[]>([]);
  const [designations, setDesignations] = useState<string[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [workflows, setWorkflows] = useState<LeaveWorkflow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leavePolicy, setLeavePolicy] = useState<LeavePolicy>({ defaults: { ANNUAL: 15, CASUAL: 10, SICK: 14 }, overrides: {} });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [depts, desigs, hols, wfs, emps, appConfig, teamsList, lPolicy] = await Promise.allSettled([
        hrService.getDepartments(), hrService.getDesignations(), hrService.getHolidays(),
        hrService.getWorkflows(), hrService.getEmployees(), hrService.getConfig(),
        hrService.getTeams(), hrService.getLeavePolicy()
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
            const originalMembers: string[] = employees.filter(e => e.teamId === finalTeamId).map(e => e.id);
            const toAdd: string[] = [...selectedMembers].filter(id => !originalMembers.includes(id));
            const toRemove: string[] = originalMembers.filter(id => !selectedMembers.has(id));
            
            // AUTOMATION: Set Line Manager to the Team Leader
            const newLeaderId = data.leaderId || null;

            await Promise.all([
                // New members: Assign Team ID AND Line Manager ID
                ...toAdd.map(id => hrService.updateProfile(id, { 
                    team_id: finalTeamId,
                    line_manager_id: newLeaderId // <--- AUTOMATIC ASSIGNMENT
                })),
                
                // Removed members: Clear Team ID AND Line Manager ID
                ...toRemove.map(id => hrService.updateProfile(id, { 
                    team_id: null,
                    line_manager_id: null 
                })),

                // Existing members: Ensure Line Manager ID is synced (in case Leader changed)
                ...[...selectedMembers].filter(id => originalMembers.includes(id)).map(id => hrService.updateProfile(id, {
                    line_manager_id: newLeaderId
                }))
            ]);
            
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
      await hrService.deleteTeam(teamId);
      
      // Cleanup: Remove team_id from users
      const members = employees.filter(e => e.teamId === teamId);
      await Promise.all(members.map(m => hrService.updateProfile(m.id, { team_id: null, line_manager_id: null })));

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

  return {
    departments, designations, holidays, teams, config, workflows, employees, leavePolicy,
    isLoading, isSaving,
    saveConfig, updateDepartments, updateDesignations, updateHolidays, saveTeam, deleteTeam, updateLeavePolicy, updateWorkflows
  };
};
