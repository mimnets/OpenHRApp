
import React from 'react';
import { Loader2 } from 'lucide-react';
import { useDashboard } from '../hooks/dashboard/useDashboard';
import { EmployeeDashboard } from '../components/dashboard/EmployeeDashboard';
import { ManagerDashboard } from '../components/dashboard/ManagerDashboard';
import { AdminDashboard } from '../components/dashboard/AdminDashboard';

interface DashboardProps {
  user: any;
  onNavigate: (path: string, params?: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate }) => {
  const { data, isLoading } = useDashboard(user);

  if (isLoading || !data) {
    return (
      <div className="h-64 w-full flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  const isAdmin = user.role === 'ADMIN' || user.role === 'HR';
  const isManager = user.role === 'MANAGER';

  if (isAdmin) {
    return <AdminDashboard data={data} isLoading={isLoading} onNavigate={onNavigate} />;
  }

  if (isManager) {
    return <ManagerDashboard data={data} isLoading={isLoading} onNavigate={onNavigate} />;
  }

  return <EmployeeDashboard data={data} isLoading={isLoading} onNavigate={onNavigate} />;
};

export default Dashboard;
