
import React, { useState, useEffect } from 'react';
import { 
  User, ArrowLeft, Save, RefreshCw, Mail, UserCheck, Hash
} from 'lucide-react';
import { hrService } from '../services/hrService';
import { User as UserType, Employee } from '../types';

interface SettingsProps {
  user: UserType;
  onBack?: () => void;
}

const ProfileSkeleton = () => (
  <div className="max-w-3xl animate-pulse">
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 space-y-8">
      <div className="flex items-center gap-4 border-b border-slate-50 pb-8">
        <div className="w-20 h-20 bg-slate-100 rounded-[2rem]"></div>
        <div className="space-y-2 flex-1">
          <div className="h-6 bg-slate-100 rounded-lg w-1/3"></div>
          <div className="h-4 bg-slate-50 rounded-lg w-1/4"></div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 bg-slate-50 rounded w-1/4 ml-1"></div>
            <div className="h-14 bg-slate-50 border border-slate-100 rounded-2xl w-full"></div>
          </div>
        ))}
      </div>
      <div className="flex justify-end pt-4">
        <div className="h-14 bg-slate-100 rounded-[2rem] w-40"></div>
      </div>
    </div>
  </div>
);

const Settings: React.FC<SettingsProps> = ({ user, onBack }) => {
  const [profile, setProfile] = useState<Partial<Employee> & { managerName?: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const employees = await hrService.getEmployees();
        const myData = employees.find(e => e.id === user.id);
        
        if (myData) {
          const manager = employees.find(e => e.id === myData.lineManagerId);
          setProfile({
            ...myData,
            managerName: manager ? manager.name : 'No Direct Manager'
          });
        } else {
          setProfile({
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
            designation: user.designation,
            employeeId: user.employeeId,
            managerName: 'No Direct Manager'
          } as any);
        }
      } catch (err) {
        console.error("Settings load failed:", err);
      }
    };
    load();
  }, [user.id, user.name, user.email, user.role, user.department, user.designation, user.employeeId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (profile) {
        await hrService.updateProfile(user.id, profile);
        alert('Personal profile updated successfully.');
        window.location.reload();
      }
    } catch (e) {
      alert('Operation failed. Check server connection.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {onBack && <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><ArrowLeft size={20} /></button>}
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Profile</h1>
            <p className="text-slate-500 font-medium">Manage your identity and personal preferences</p>
          </div>
        </div>
      </header>

      {!profile ? (
        <ProfileSkeleton />
      ) : (
        <div className="max-w-3xl">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 space-y-8 animate-in slide-in-from-left-4">
            <div className="flex items-center gap-4 border-b border-slate-50 pb-8">
              <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-indigo-600 font-black text-2xl uppercase relative overflow-hidden">
                 {profile.avatar ? <img src={profile.avatar} className="w-full h-full object-cover" /> : profile.name?.[0]}
              </div>
              <div>
                 <h3 className="text-xl font-black text-slate-900">{profile.name}</h3>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{profile.designation} • {profile.department}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Official Employee ID</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input type="text" readOnly className="w-full pl-12 pr-4 py-4 bg-slate-100 border border-slate-200 rounded-2xl font-black text-sm text-slate-500 cursor-not-allowed" value={profile.employeeId || 'Not Assigned'} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Reporting To</label>
                <div className="relative">
                  <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input type="text" readOnly className="w-full pl-12 pr-4 py-4 bg-slate-100 border border-slate-200 rounded-2xl font-black text-sm text-slate-500 cursor-not-allowed" value={profile.managerName || 'No Direct Manager'} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input type="text" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-50" value={profile.name || ''} onChange={e => setProfile({...profile, name: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Work Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input type="email" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-50" value={profile.email || ''} onChange={e => setProfile({...profile, email: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button onClick={handleSave} disabled={isSaving} className="px-12 py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl transition-all flex items-center gap-3">
                {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />} 
                Update My Info
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
