
import React from 'react';
import { BookOpen, CheckCircle2, ShieldAlert, User, Briefcase, Building } from 'lucide-react';
import { Role } from '../../types';

interface Props {
  role: Role;
}

export const LeaveGuidelines: React.FC<Props> = ({ role }) => {
  const getGuidelines = () => {
    switch (role) {
      case 'EMPLOYEE':
        return {
          title: 'Employee Guidelines',
          icon: User,
          color: 'bg-blue-50 text-blue-600',
          rules: [
            "Ensure you have sufficient leave balance before applying.",
            "Casual leave must be applied 2 days in advance if possible.",
            "Sick leave requires a medical certificate if exceeding 3 days.",
            "Your Team Leader or Line Manager must approve before HR validation."
          ]
        };
      case 'TEAM_LEAD':
      case 'MANAGER':
        return {
          title: 'Managerial Guidelines',
          icon: Briefcase,
          color: 'bg-indigo-50 text-indigo-600',
          rules: [
            "Review your direct report's leave request within 24 hours.",
            "Ensure team coverage is adequate before approving dates.",
            "Approvals automatically forward the request to HR for documentation.",
            "Rejections are final and notify the employee immediately."
          ]
        };
      case 'MANAGEMENT':
        return {
          title: 'Management Guidelines',
          icon: ShieldAlert,
          color: 'bg-purple-50 text-purple-600',
          rules: [
            "Oversee leave patterns for Managers and Team Leads.",
            "Approval authority overrides lower-level decisions if necessary.",
            "Ensure department-wide availability during critical project phases."
          ]
        };
      case 'HR':
      case 'ADMIN':
        return {
          title: 'HR Policy & Compliance',
          icon: Building,
          color: 'bg-emerald-50 text-emerald-600',
          rules: [
            "Verify leave balances against the annual quota.",
            "Check for supporting documents (e.g., Medical Certificates).",
            "This is the final step; 'Approved' leaves are deducted from balance.",
            "You may override Manager approvals in case of policy violations."
          ]
        };
      default:
        return {
          title: 'General Policy',
          icon: BookOpen,
          color: 'bg-slate-50 text-slate-600',
          rules: ["Adhere to company policy at all times."]
        };
    }
  };

  const guide = getGuidelines();
  const Icon = guide.icon;

  return (
    <div className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-slate-100 shadow-sm mb-8 animate-in slide-in-from-top-4">
      <div className="flex items-center gap-4 mb-6">
        <div className={`p-3 rounded-2xl ${guide.color}`}>
          <Icon size={24} />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{guide.title}</h3>
          <p className="text-xs font-bold text-slate-400">Please review before proceeding</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {guide.rules.map((rule, idx) => (
          <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/50">
            <CheckCircle2 size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs font-medium text-slate-600 leading-relaxed">{rule}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
