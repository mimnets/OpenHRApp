
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { hrService } from '../services/hrService';
import { LeaveRequest, LeaveBalance, Employee } from '../types';

import EmployeeLeaveFlow from '../components/leave/EmployeeLeaveFlow';
import ManagerLeaveFlow from '../components/leave/ManagerLeaveFlow';
import AdminLeaveFlow from '../components/leave/AdminLeaveFlow';

interface LeaveProps {
  user: any;
  autoOpen?: boolean;
}

const Leave: React.FC<LeaveProps> = ({ user, autoOpen }) => {
  const isAdmin = user.role === 'ADMIN' || user.role === 'HR';
  const isManager = user.role === 'MANAGER';
  
  // Split loading state: Initial (blocking) vs Refresh (background)
  const [isInitializing, setIsInitializing] = useState(true);
  
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const refreshData = async () => {
    try {
      const [fetchedLeaves, userBalance, fetchedEmps] = await Promise.all([
        hrService.getLeaves(),
        hrService.getLeaveBalance(user.id),
        hrService.getEmployees()
      ]);
      setLeaves(fetchedLeaves);
      setBalance(userBalance);
      setEmployees(fetchedEmps);
    } catch (e) { 
      console.error("Refresh failed", e); 
    } finally { 
      // Only turn off initialization on the first run
      setIsInitializing(false); 
    }
  };

  useEffect(() => { 
    setIsInitializing(true);
    refreshData(); 
  }, [user.id]);

  if (isInitializing) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      {/* 1. Personal Portal (Everyone sees their own history) */}
      <EmployeeLeaveFlow 
        user={user} 
        balance={balance} 
        history={leaves.filter(l => l.employeeId === user.id)}
        onRefresh={refreshData}
        initialOpen={autoOpen}
      />

      {/* 2. Managerial Portal (If Manager) */}
      {isManager && (
        <div className="pt-12 border-t border-slate-100">
          <ManagerLeaveFlow 
            user={user} 
            requests={leaves.filter(l => employees.some(e => e.id === l.employeeId && (e.lineManagerId === user.id || e.teamId === user.teamId)))}
            onRefresh={refreshData}
          />
        </div>
      )}

      {/* 3. HR/Admin Portal (If HR/Admin) */}
      {isAdmin && (
        <div className="pt-12 border-t border-slate-100">
          <AdminLeaveFlow 
            user={user} 
            requests={leaves}
            onRefresh={refreshData}
          />
        </div>
      )}
    </div>
  );
};

export default Leave;
