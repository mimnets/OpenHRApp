
import React, { useState, useEffect } from 'react';
import { Globe, Moon, MapPin, Upload, Building2 } from 'lucide-react';
import { AppConfig } from '../../types';
import { COUNTRIES, getFlagEmoji } from '../../data/countries';
import { apiClient } from '../../services/api.client';

interface Props {
  config: AppConfig;
  onSave: (config: AppConfig) => Promise<void>;
}

export const OrgSystem: React.FC<Props> = ({ config, onSave }) => {
  const [orgData, setOrgData] = useState({ name: '', country: 'BD', address: '', logo: '' });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load organization data
    const loadOrgData = async () => {
      if (!apiClient.pb || !apiClient.pb.authStore.model) {
        console.warn('OrgSystem: PocketBase or auth not available');
        return;
      }
      try {
        const orgId = apiClient.pb.authStore.model.organization_id;
        if (!orgId) {
          console.warn('OrgSystem: No organization_id found');
          return;
        }
        console.log('OrgSystem: Loading organization data for ID:', orgId);
        const org = await apiClient.pb.collection('organizations').getOne(orgId);
        console.log('OrgSystem: Organization data loaded:', org);
        setOrgData({
          name: org.name || '',
          country: org.country || 'BD',
          address: org.address || '',
          logo: org.logo || ''
        });
        if (org.logo) {
          setLogoPreview(apiClient.pb.files.getURL(org, org.logo));
        }
      } catch (err) {
        console.error('OrgSystem: Failed to load organization data:', err);
        // Continue with defaults even if load fails
        setOrgData({ name: '', country: 'BD', address: '', logo: '' });
      }
    };
    loadOrgData();
  }, []);

  const handleChange = (key: keyof AppConfig, value: any) => {
    onSave({ ...config, [key]: value });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Logo file size must be less than 2MB.");
        return;
      }
      if (!file.type.startsWith('image/')) {
        alert("Logo must be an image file.");
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOrgDataSave = async () => {
    if (!apiClient.pb || !apiClient.pb.authStore.model) return;
    setIsSaving(true);
    try {
      const orgId = apiClient.pb.authStore.model.organization_id;
      if (!orgId) return;

      const formData = new FormData();
      formData.append('name', orgData.name);
      formData.append('country', orgData.country);
      formData.append('address', orgData.address);
      if (logoFile) {
        formData.append('logo', logoFile);
      }

      await apiClient.pb.collection('organizations').update(orgId, formData);
      alert('Organization details updated successfully!');
    } catch (err) {
      console.error('Failed to update organization:', err);
      alert('Failed to update organization details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Organization Identity Section */}
      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8 animate-in slide-in-from-bottom-8 duration-500">
         <div className="flex items-center justify-between">
           <h3 className="text-xl font-black text-slate-900 flex items-center gap-3"><Building2 size={24} className="text-blue-500" /> Organization Identity</h3>
           <button
             onClick={handleOrgDataSave}
             disabled={isSaving}
             className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-50"
           >
             {isSaving ? 'Saving...' : 'Save Organization'}
           </button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Organization Name</label>
               <input
                 type="text"
                 className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                 placeholder="Enter organization name"
                 value={orgData.name}
                 onChange={e => setOrgData({ ...orgData, name: e.target.value })}
               />
            </div>

            <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Country</label>
               <select
                 className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all appearance-none"
                 value={orgData.country}
                 onChange={e => setOrgData({ ...orgData, country: e.target.value })}
               >
                 {COUNTRIES.map(country => (
                   <option key={country.code} value={country.code}>
                     {getFlagEmoji(country.code)} {country.name}
                   </option>
                 ))}
               </select>
            </div>

            <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Organization Logo</label>
               <div className="flex gap-4 items-center">
                 <input
                   type="file"
                   accept="image/*"
                   onChange={handleLogoChange}
                   className="flex-1 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-50 transition-all file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                 />
                 {logoPreview && (
                   <img src={logoPreview} alt="Logo" className="h-12 w-12 object-contain rounded-xl border-2 border-blue-100" />
                 )}
               </div>
            </div>

            <div className="space-y-1 md:col-span-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Address</label>
               <div className="relative">
                 <MapPin className="absolute left-5 top-5 text-slate-300" size={18} />
                 <textarea
                   className="w-full pl-14 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-50 transition-all resize-none"
                   rows={2}
                   placeholder="Organization address"
                   value={orgData.address}
                   onChange={e => setOrgData({ ...orgData, address: e.target.value })}
                 />
               </div>
            </div>
         </div>
      </div>

      {/* System Configuration Section */}
      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8 animate-in slide-in-from-bottom-8 duration-500">
         <h3 className="text-xl font-black text-slate-900 flex items-center gap-3"><Globe size={24} className="text-blue-500" /> System Configuration</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Timezone</label>
               <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all" value={config.timezone} onChange={e => handleChange('timezone', e.target.value)}>
                  <option value="Asia/Dhaka">Asia/Dhaka (GMT+6)</option>
                  <option value="UTC">UTC</option>
                  <option value="Asia/Kolkata">Asia/Kolkata</option>
               </select>
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Currency</label>
               <input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-50 transition-all outline-none" value={config.currency} onChange={e => handleChange('currency', e.target.value)} />
            </div>
         </div>

         <div className="pt-8 border-t border-slate-50">
             <div className="grid grid-cols-1 gap-6">
               <div className="space-y-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                   <h4 className="font-black text-slate-900 text-sm flex items-center gap-2"><Moon size={16} className="text-indigo-500"/> Auto-Absent Automation</h4>
                   <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500">Enable Feature</span>
                      <input type="checkbox" className="w-5 h-5 accent-indigo-600 rounded-lg" checked={config.autoAbsentEnabled || false} onChange={e => handleChange('autoAbsentEnabled', e.target.checked)} />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cutoff Time (End of Day)</label>
                      <input type="time" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none" value={config.autoAbsentTime || '23:55'} onChange={e => handleChange('autoAbsentTime', e.target.value)} />
                      <p className="text-[9px] text-slate-400 mt-1">If no punch found by this time, mark as ABSENT.</p>
                   </div>
               </div>
             </div>
         </div>
      </div>
    </div>
  );
};
