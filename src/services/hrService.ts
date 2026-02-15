
import { authService } from './auth.service';
import { employeeService } from './employee.service';
import { attendanceService } from './attendance.service';
import { leaveService } from './leave.service';
import { organizationService } from './organization.service';
import { verificationService } from './verification.service';
import { shiftService } from './shift.service';
import { apiClient } from './api.client';

export const hrService = {
  subscribe: apiClient.subscribe.bind(apiClient),
  notify: apiClient.notify.bind(apiClient),
  
  // Auth
  login: authService.login,
  logout: authService.logout,
  finalizePasswordReset: authService.finalizePasswordReset,
  registerOrganization: authService.registerOrganization,
  requestVerificationEmail: authService.requestVerificationEmail,
  confirmVerification: verificationService.verifyEmailToken,
  
  // Employee
  getEmployees: employeeService.getEmployees,
  addEmployee: employeeService.addEmployee,
  updateProfile: employeeService.updateProfile,
  deleteEmployee: employeeService.deleteEmployee,
  
  // Attendance
  getAttendance: attendanceService.getAttendance,
  getActiveAttendance: attendanceService.getActiveAttendance,
  saveAttendance: attendanceService.saveAttendance,
  updateAttendance: attendanceService.updateAttendance,
  deleteAttendance: attendanceService.deleteAttendance,

  // Leaves (Delegate to leaveService)
  getLeaves: leaveService.getLeaves,
  saveLeaveRequest: leaveService.saveLeaveRequest,
  updateLeaveStatus: leaveService.updateLeaveStatus,
  getLeaveBalance: leaveService.getLeaveBalance,
  adminCreateLeave: leaveService.adminCreateLeave,
  adminUpdateLeave: leaveService.adminUpdateLeave,
  adminDeleteLeave: leaveService.adminDeleteLeave,

  // Organization & Config
  prefetchMetadata: organizationService.prefetchMetadata,
  getConfig: organizationService.getConfig,
  setConfig: organizationService.setConfig,
  getDepartments: organizationService.getDepartments,
  setDepartments: organizationService.setDepartments,
  getDesignations: organizationService.getDesignations,
  setDesignations: organizationService.setDesignations,
  getHolidays: organizationService.getHolidays,
  setHolidays: organizationService.setHolidays,
  getTeams: organizationService.getTeams,
  createTeam: organizationService.createTeam,
  updateTeam: organizationService.updateTeam,
  deleteTeam: organizationService.deleteTeam,
  getWorkflows: organizationService.getWorkflows,
  setWorkflows: organizationService.setWorkflows,
  getLeavePolicy: organizationService.getLeavePolicy,
  setLeavePolicy: organizationService.setLeavePolicy,
  sendCustomEmail: organizationService.sendCustomEmail,
  getReportQueueLog: organizationService.getReportQueueLog,
  testPocketBaseConnection: organizationService.testPocketBaseConnection,

  // Shifts
  getShifts: shiftService.getShifts.bind(shiftService),
  createShift: shiftService.createShift.bind(shiftService),
  updateShift: shiftService.updateShift.bind(shiftService),
  deleteShift: shiftService.deleteShift.bind(shiftService),
  getShiftOverrides: shiftService.getShiftOverrides.bind(shiftService),
  setShiftOverrides: shiftService.setShiftOverrides.bind(shiftService),
  resolveShiftForEmployee: shiftService.resolveShiftForEmployee.bind(shiftService)
};