
import { Employee, Attendance, LeaveRequest, User, Holiday, AppConfig, LeaveWorkflow, LeaveBalance, Role } from '../types';
import { DEPARTMENTS, DESIGNATIONS, BD_HOLIDAYS, DEFAULT_CONFIG } from '../constants.tsx';

const STORAGE_KEYS = {
  EMPLOYEES: 'hr_employees',
  ATTENDANCE: 'hr_attendance',
  LEAVES: 'hr_leaves',
  BALANCES: 'hr_balances',
  CURRENT_USER: 'hr_current_user',
  DEPARTMENTS: 'hr_departments',
  DESIGNATIONS: 'hr_designations',
  HOLIDAYS: 'hr_holidays',
  CONFIG: 'hr_config',
  WORKFLOWS: 'hr_workflows',
};

type ChangeListener = () => void;
const listeners: Set<ChangeListener> = new Set();

const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'EMP001',
    name: 'Admin User',
    email: 'admin@probashi.com',
    username: 'admin',
    role: 'ADMIN',
    department: 'Human Resources',
    designation: 'HR Director',
    joiningDate: '2022-01-01',
    mobile: '01711000000',
    emergencyContact: '01711999999',
    salary: 150000,
    status: 'ACTIVE',
    employmentType: 'PERMANENT',
    location: 'Dhaka',
    avatar: 'https://picsum.photos/seed/admin/200',
    nid: '1234567890',
    password: '123',
    workType: 'OFFICE'
  },
  {
    id: 'EMP002',
    name: 'Anisur Rahman',
    email: 'anis@probashi.com',
    username: 'anis',
    role: 'EMPLOYEE',
    department: 'Engineering',
    designation: 'Senior Developer',
    joiningDate: '2023-03-15',
    mobile: '01711222333',
    emergencyContact: '01711444555',
    salary: 85000,
    status: 'ACTIVE',
    employmentType: 'PERMANENT',
    location: 'Dhaka',
    avatar: 'https://picsum.photos/seed/anis/200',
    nid: '0987654321',
    lineManagerId: 'EMP001',
    password: '123',
    workType: 'OFFICE'
  }
];

export const hrService = {
  subscribe(listener: ChangeListener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  notify() {
    listeners.forEach(l => l());
  },

  initialize() {
    if (!localStorage.getItem(STORAGE_KEYS.EMPLOYEES)) {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(INITIAL_EMPLOYEES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.DEPARTMENTS)) {
      localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(DEPARTMENTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.DESIGNATIONS)) {
      localStorage.setItem(STORAGE_KEYS.DESIGNATIONS, JSON.stringify(DESIGNATIONS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.HOLIDAYS)) {
      localStorage.setItem(STORAGE_KEYS.HOLIDAYS, JSON.stringify(BD_HOLIDAYS.map((h, i) => ({...h, id: `H${i}`} ))));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CONFIG)) {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(DEFAULT_CONFIG));
    }
    if (!localStorage.getItem(STORAGE_KEYS.WORKFLOWS)) {
      const initialWorkflows: LeaveWorkflow[] = DEPARTMENTS.map(d => ({
        department: d,
        approverRole: 'HR' // Default: Manager -> HR -> Approve
      }));
      localStorage.setItem(STORAGE_KEYS.WORKFLOWS, JSON.stringify(initialWorkflows));
    }
    this.initializeBalances();
  },

  initializeBalances() {
    if (!localStorage.getItem(STORAGE_KEYS.BALANCES)) {
      const employees = this.getEmployees();
      const balances: Record<string, LeaveBalance> = {};
      employees.forEach(emp => {
        balances[emp.id] = { employeeId: emp.id, ANNUAL: 14, CASUAL: 10, SICK: 14 };
      });
      localStorage.setItem(STORAGE_KEYS.BALANCES, JSON.stringify(balances));
    }
  },

  exportFullData(): string {
    const exportObj: Record<string, any> = {};
    Object.values(STORAGE_KEYS).forEach(key => {
      exportObj[key] = localStorage.getItem(key);
    });
    return JSON.stringify(exportObj);
  },

  login(email: string, password: string): User | null {
    const employees = this.getEmployees();
    const normalizedInput = email.trim().toLowerCase();
    const user = employees.find(e => 
      (e.email.toLowerCase() === normalizedInput || e.username?.toLowerCase() === normalizedInput) && 
      ((e.password || '123') === password)
    );
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      return user;
    }
    return null;
  },

  logout() {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  getCurrentUser(): User | null {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  },

  getEmployees(): Employee[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.EMPLOYEES) || '[]');
  },

  addEmployee(employee: Employee) {
    const employees = this.getEmployees();
    employees.push(employee);
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
    this.notify();
  },

  updateProfile(userId: string, updates: Partial<Employee>) {
    const employees = this.getEmployees();
    const index = employees.findIndex(e => e.id === userId);
    if (index > -1) {
      employees[index] = { ...employees[index], ...updates };
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
      this.notify();
      return employees[index];
    }
    return null;
  },

  deleteEmployee(id: string) {
    const employees = this.getEmployees();
    const filtered = employees.filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(filtered));
    this.notify();
  },

  getDepartments(): string[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.DEPARTMENTS) || '[]');
  },

  setDepartments(depts: string[]) {
    localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(depts));
    this.notify();
  },

  getDesignations(): string[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.DESIGNATIONS) || '[]');
  },

  setDesignations(desigs: string[]) {
    localStorage.setItem(STORAGE_KEYS.DESIGNATIONS, JSON.stringify(desigs));
    this.notify();
  },

  getConfig(): AppConfig {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG) || JSON.stringify(DEFAULT_CONFIG));
  },

  setConfig(config: AppConfig) {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
    this.notify();
  },

  getHolidays(): Holiday[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.HOLIDAYS) || '[]');
  },

  setHolidays(holidays: Holiday[]) {
    localStorage.setItem(STORAGE_KEYS.HOLIDAYS, JSON.stringify(holidays));
    this.notify();
  },

  getWorkflows(): LeaveWorkflow[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.WORKFLOWS) || '[]');
  },

  setWorkflows(workflows: LeaveWorkflow[]) {
    localStorage.setItem(STORAGE_KEYS.WORKFLOWS, JSON.stringify(workflows));
    this.notify();
  },

  getAttendance(): Attendance[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE) || '[]');
  },

  getActiveAttendance(employeeId: string): Attendance | undefined {
    return this.getAttendance().find(a => a.employeeId === employeeId && !a.checkOut);
  },

  getTodayAttendance(employeeId: string): Attendance[] {
    const today = new Date().toISOString().split('T')[0];
    return this.getAttendance().filter(a => a.employeeId === employeeId && a.date === today);
  },

  saveAttendance(attendance: Attendance) {
    const list = this.getAttendance();
    list.push(attendance);
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(list));
    this.notify();
  },

  updateAttendance(id: string, updates: Partial<Attendance>) {
    const list = this.getAttendance();
    const index = list.findIndex(a => a.id === id);
    if (index > -1) {
      list[index] = { ...list[index], ...updates };
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(list));
      this.notify();
    }
  },

  getLeaves(): LeaveRequest[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.LEAVES) || '[]');
  },

  saveLeaveRequest(request: LeaveRequest) {
    const list = this.getLeaves();
    list.push(request);
    localStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(list));
    this.notify();
  },

  // Added modifyLeaveRequest to handle updates to existing leave requests as called in pages/Leave.tsx
  modifyLeaveRequest(id: string, updates: Partial<LeaveRequest>) {
    const list = this.getLeaves();
    const index = list.findIndex(r => r.id === id);
    if (index > -1) {
      list[index] = { ...list[index], ...updates };
      localStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(list));
      this.notify();
    }
  },

  updateLeaveStatus(requestId: string, status: 'APPROVED' | 'REJECTED' | 'PENDING_HR', remarks?: string, approverRole?: Role) {
    const list = this.getLeaves();
    const index = list.findIndex(r => r.id === requestId);
    if (index > -1) {
      const request = list[index];
      const applicant = this.getEmployees().find(e => e.id === request.employeeId);
      const workflow = this.getWorkflows().find(w => w.department === applicant?.department);
      
      const isFinalApprover = (workflow?.approverRole === approverRole) || approverRole === 'ADMIN';

      if (status === 'REJECTED') {
        request.status = 'REJECTED';
        request.approverRemarks = remarks;
      } else if (status === 'APPROVED') {
        if (request.status === 'PENDING_MANAGER') {
          // If the workflow says Manager is enough or if user is Admin, approve. Otherwise, move to HR.
          if (isFinalApprover) {
            request.status = 'APPROVED';
            this.deductLeaveBalance(request.employeeId, request.type as any, request.totalDays);
          } else {
            request.status = 'PENDING_HR';
            request.managerRemarks = remarks;
          }
        } else if (request.status === 'PENDING_HR') {
          request.status = 'APPROVED';
          request.approverRemarks = remarks;
          this.deductLeaveBalance(request.employeeId, request.type as any, request.totalDays);
        }
      }

      localStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(list));
      this.notify();
    }
  },

  getAllLeaveBalances(): Record<string, LeaveBalance> {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.BALANCES) || '{}');
  },

  getLeaveBalance(employeeId: string): LeaveBalance {
    const all = this.getAllLeaveBalances();
    return all[employeeId] || { employeeId, ANNUAL: 14, CASUAL: 10, SICK: 14 };
  },

  deductLeaveBalance(employeeId: string, type: 'ANNUAL' | 'CASUAL' | 'SICK', days: number) {
    const all = this.getAllLeaveBalances();
    if (all[employeeId] && (type === 'ANNUAL' || type === 'CASUAL' || type === 'SICK')) {
      all[employeeId][type] = Math.max(0, all[employeeId][type] - days);
      localStorage.setItem(STORAGE_KEYS.BALANCES, JSON.stringify(all));
      this.notify();
    }
  },

  isManagerOfSomeone(managerId: string): boolean {
    return this.getEmployees().some(e => e.lineManagerId === managerId);
  }
};
