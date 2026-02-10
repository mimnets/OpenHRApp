
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { hrService } from '../services/hrService';
import { LeaveRequest, LeaveBalance } from '../types';

// New Modules
import { LeaveGuidelines } from '../components/leave/LeaveGuidelines';
import EmployeeLeaveModule from '../components/leave/EmployeeLeaveModule';
import ManagerialLeaveModule from '../components/leave/ManagerialLeaveModule';
import { HRLeaveModule } from '../components/leave/HRLeaveModule';

interface LeaveProps {
  user: any;
  autoOpen?: boolean;
}

const Leave: React.FC<LeaveProps> = ({ user, autoOpen }) => {
  const isAdmin = user.role === 'ADMIN' || user.role === 'HR';
  const isManager = user.role === 'MANAGER' || user.role === 'TEAM_LEAD' || user.role === 'MANAGEMENT';
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);

  const refreshData = async () => {
    try {
      const [fetchedLeaves, userBalance] = await Promise.all([
        hrService.getLeaves(),
        hrService.getLeaveBalance(user.id)
      ]);
      setLeaves(fetchedLeaves);
      setBalance(userBalance);
    } catch (e) { 
      console.error("Refresh failed", e); 
    } finally { 
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
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* 1. Global Guidelines Display */}
      <LeaveGuidelines role={user.role} />

      {/* 2. Employee Module (Everyone gets this) */}
      <EmployeeLeaveModule 
        user={user} 
        balance={balance} 
        history={leaves.filter(l => l.employeeId === user.id)}
        onRefresh={refreshData}
        initialOpen={autoOpen}
      />

      {/* 3. Managerial Module (Team Leads, Managers, Directors) */}
      {isManager && (
        <div className="pt-12 border-t border-slate-100">
          <ManagerialLeaveModule 
            user={user} 
            requests={leaves}
            onRefresh={refreshData}
            roleLabel={user.role === 'TEAM_LEAD' ? 'Team Lead' : user.role === 'MANAGEMENT' ? 'Director' : 'Manager'}
          />
        </div>
      )}

      {/* 4. HR/Admin Module (Compliance) */}
      {isAdmin && (
        <div className="pt-12 border-t border-slate-100">
          <HRLeaveModule 
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
