
import React from 'react';
import { useDashboard } from '../hooks/dashboard/useDashboard';
import { EmployeeDashboard } from '../components/dashboard/EmployeeDashboard';
import { ManagerDashboard } from '../components/dashboard/ManagerDashboard';
import { AdminDashboard } from '../components/dashboard/AdminDashboard';

const DashboardSkeleton = () => (
  <div className="animate-pulse space-y-6 p-4">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 bg-slate-100 rounded-2xl" />
      <div className="space-y-2 flex-1">
        <div className="h-5 bg-slate-100 rounded w-1/3" />
        <div className="h-3 bg-slate-50 rounded w-1/4" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="h-24 bg-white rounded-2xl border border-slate-100" />
      <div className="h-24 bg-white rounded-2xl border border-slate-100" />
    </div>
    <div className="h-40 bg-white rounded-2xl border border-slate-100" />
    <div className="h-32 bg-white rounded-2xl border border-slate-100" />
  </div>
);

interface DashboardProps {
  user: any;
  onNavigate: (path: string, params?: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate }) => {
  const { data, isLoading } = useDashboard(user);

  if (isLoading || !data) {
    return <DashboardSkeleton />;
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
