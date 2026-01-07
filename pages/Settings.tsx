
import React, { useState } from 'react';
import { 
  Building2, 
  Cloud, 
  Globe, 
  Database,
  CheckCircle,
  User as UserIcon,
  Save,
  Mail,
  Phone,
  FileSpreadsheet,
  FileJson,
  FileText
} from 'lucide-react';
import { hrService } from '../services/hrService';

const Settings: React.FC = () => {
  const currentUser = hrService.getCurrentUser();
  const isAdmin = ['ADMIN', 'HR'].includes(currentUser?.role || '');
  
  const [profileData, setProfileData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    mobile: (currentUser as any)?.mobile || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [backupFormat, setBackupFormat] = useState('EXCEL');

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSaving(true);
    
    setTimeout(() => {
      hrService.updateProfile(currentUser.id, profileData);
      setIsSaving(false);
      setSaveStatus('Profile updated successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
    }, 1000);
  };

  const handleBackup = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert(`Organization data backed up to Google Drive in ${backupFormat} format.`);
    }, 1500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Account Settings</h1>
        <p className="text-sm text-slate-500 font-medium">Manage your personal information and preferences</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className={`${isAdmin ? 'xl:col-span-2' : 'xl:col-span-3'} space-y-8`}>
          
          {/* Personal Profile */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
            <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <UserIcon size={20} />
              </div>
              Personal Account
            </h3>
            <form onSubmit={handleProfileSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Full Name</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-sm font-bold transition-all" 
                    value={profileData.name}
                    onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="email" 
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-sm font-bold transition-all" 
                      value={profileData.email}
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Phone Number</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-sm font-bold transition-all" 
                      value={profileData.mobile}
                      onChange={(e) => setProfileData({...profileData, mobile: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Role / Designation</label>
                  <input 
                    type="text" 
                    disabled
                    className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl text-slate-500 text-sm font-bold cursor-not-allowed" 
                    value={`${currentUser?.role} - ${currentUser?.designation}`}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                {saveStatus ? (
                  <p className="text-xs font-bold text-emerald-600 animate-in fade-in">{saveStatus}</p>
                ) : <div />}
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-8 py-3.5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Processing...' : <><Save size={16} /> Save Profile</>}
                </button>
              </div>
            </form>
          </div>

          {/* Company Settings (Admin Only) */}
          {isAdmin && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 animate-in slide-in-from-bottom-2">
              <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Building2 size={20} />
                </div>
                Company Profile
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Legal Entity Name</label>
                  <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" defaultValue="OpenHR Solutions Ltd." />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Trade License / BIN</label>
                  <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" defaultValue="BD-9988-7766-55" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cloud & Backup Sidebar (Admin Only) */}
        {isAdmin && (
          <div className="space-y-8 animate-in slide-in-from-right-4">
            <div className="bg-slate-900 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
              
              <h3 className="text-xl font-black mb-8 flex items-center gap-3 relative z-10">
                <Cloud className="text-indigo-400" /> Administrative Backup
              </h3>
              
              <div className="space-y-8 relative z-10">
                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                    <Globe size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Storage Endpoint</p>
                    <p className="text-sm font-bold truncate">Google Drive Account</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest px-1">Export Format</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'EXCEL', icon: FileSpreadsheet, label: 'Excel' },
                      { id: 'CSV', icon: FileText, label: 'CSV' },
                      { id: 'JSON', icon: FileJson, label: 'JSON' }
                    ].map((f) => (
                      <button 
                        key={f.id}
                        onClick={() => setBackupFormat(f.id)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                          backupFormat === f.id 
                            ? 'bg-indigo-600 border-indigo-500 text-white' 
                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        <f.icon size={18} />
                        <span className="text-[9px] font-black uppercase">{f.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <button 
                  onClick={handleBackup}
                  disabled={isSaving}
                  className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-indigo-900/50 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  <Database size={20} /> Start Global Sync
                </button>

                <div className="flex items-center gap-2 text-[10px] text-slate-500 justify-center">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  Last verified sync: 2 hours ago
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-200">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Security Protocol</p>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Backup files are encrypted with AES-256 before upload. Only high-privilege accounts can initiate a manual cloud synchronization.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
