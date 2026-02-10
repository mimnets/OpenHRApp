
import { useState, useEffect } from 'react';
import { hrService } from '../../services/hrService';
import { Employee, Attendance, LeaveBalance, Holiday, Team, AppConfig, LeaveWorkflow } from '../../types';

export interface DashboardData {
  freshUser: Employee;
  activeShift?: Attendance;
  userBalance: LeaveBalance | null;
  leaveUsed: number;
  upcomingHoliday: Holiday | null;
  teamMembersCount: number;
  activeTeamMembers: number;
  teamInfo: Team | null;
  appConfig: AppConfig | null;
  myManager?: Employee;
  myTeamName: string;
  approverLabel: string;
}

export const useDashboard = (user: any) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const isAdmin = user.role === 'ADMIN' || user.role === 'HR';
        const isManager = user.role === 'MANAGER' || user.role === 'TEAM_LEAD' || user.role === 'MANAGEMENT';

        const [active, balance, emps, leaves, hols, atts, teams, config, wfs] = await Promise.all([
          hrService.getActiveAttendance(user.id),
          hrService.getLeaveBalance(user.id),
          hrService.getEmployees(),
          hrService.getLeaves(),
          hrService.getHolidays(),
          hrService.getAttendance(),
          hrService.getTeams(),
          hrService.getConfig(),
          hrService.getWorkflows()
        ]);

        // CRITICAL: Find fresh user record
        const me = emps.find(e => e.id === user.id) || user;

        // 1. Calculate Stats
        const myUsedLeaves = leaves
          .filter(l => l.employeeId === user.id && l.status === 'APPROVED')
          .reduce((acc, curr) => acc + (curr.totalDays || 0), 0);

        const futureHols = hols
          .filter(h => h.date >= today)
          .sort((a, b) => a.date.localeCompare(b.date));

        // 2. Filter Team Members based on Role
        let visibleEmployees: Employee[] = [];
        let teamInfo: Team | null = null;

        if (isAdmin) {
          visibleEmployees = emps;
        } else if (isManager) {
          // STRICT MANAGER VISIBILITY:
          // 1. Find teams I lead
          const myLedTeams = teams.filter(t => t.leaderId === me.id);
          const myLedTeamIds = myLedTeams.map(t => t.id);
          
          // 2. Filter employees: Must report to me OR be in a team I lead
          visibleEmployees = emps.filter(e => 
            (e.teamId && myLedTeamIds.includes(e.teamId)) || 
            (e.lineManagerId === me.id)
          );
          
          // For Dashboard display, if I lead multiple teams, just show count. 
          // If I lead one, show that team name. If I lead none but have reports, show "Direct Reports".
          teamInfo = myLedTeams.length > 0 ? myLedTeams[0] : null;
        } else {
          // Employee: See peers in same team
          visibleEmployees = emps.filter(e => me.teamId && e.teamId === me.teamId);
        }

        const visibleIds = visibleEmployees.map(t => t.id);
        const presentToday = atts.filter(a => a.date === today && visibleIds.includes(a.employeeId));

        // 3. Context Info
        const myManager = emps.find(e => e.id === me.lineManagerId);
        const myTeamName = teams.find(t => t.id === me.teamId)?.name || 'Unassigned';
        const myWorkflow = wfs?.find((w: LeaveWorkflow) => w.department === me.department);
        const role = myWorkflow?.approverRole || 'LINE_MANAGER';
        const approverLabel = role === 'HR' ? 'HR Department' : (role === 'ADMIN' ? 'Admin' : 'Line Manager');

        setData({
          freshUser: me,
          activeShift: active,
          userBalance: balance,
          leaveUsed: myUsedLeaves,
          upcomingHoliday: futureHols[0] || null,
          teamMembersCount: visibleEmployees.length,
          activeTeamMembers: presentToday.length,
          teamInfo,
          appConfig: config,
          myManager,
          myTeamName,
          approverLabel
        });

      } catch (err) {
        console.error("Dashboard data fetch failed", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user.id, user.role]);

  return { data, isLoading };
};
