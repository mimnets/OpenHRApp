
import React, { useState, useEffect } from 'react';
import { Globe, Moon, MapPin, Building2, Tag, Sparkles } from 'lucide-react';
import { AppConfig } from '../../types';
import { COUNTRIES, getFlagEmoji } from '../../data/countries';
import { TIMEZONE_OPTIONS } from '../../constants';
import { apiClient } from '../../services/api.client';
import { supabase } from '../../services/supabase';
import { convertFileToWebP } from '../../utils/imageConvert';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

interface Props {
  config: AppConfig;
  onSave: (config: AppConfig) => Promise<void>;
}

export const OrgSystem: React.FC<Props> = ({ config, onSave }) => {
  const { showToast } = useToast();
  const { user } = useAuth();
  /**
   * The Organization page is reachable by ADMIN and HR (Sidebar.tsx). Agreeing to publish the
   * company's name and trademark is not an HR-clerk decision, so the showcase block below is
   * gated more narrowly than the tab around it. The database trigger enforces the same rule.
   */
  const isOrgAdmin = user?.role === 'ADMIN';
  const [orgData, setOrgData] = useState({ name: '', country: 'BD', address: '', logo: '', showOnLanding: false });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  /** False when the schema predates migration 0024 — hide the control rather than offer a save that fails. */
  const [consentSupported, setConsentSupported] = useState(true);

  useEffect(() => {
    const loadOrgData = async () => {
      const orgId = apiClient.getOrganizationId();
      if (!orgId) return;
      /**
       * `show_on_landing` arrives in migration 0024. A deployment that has not run it yet —
       * a self-hosted install on an older schema, or this branch before `supabase db push` —
       * would otherwise get a 42703 on the whole select and render an empty form, losing the
       * name, country, address and logo along with the column it was actually missing. Fall
       * back to the pre-0024 column list and treat consent as not given.
       */
      let { data: org, error } = await supabase
        .from('organizations')
        .select('name, country, address, logo, show_on_landing')
        .eq('id', orgId)
        .maybeSingle();

      if (error?.code === '42703') {
        ({ data: org, error } = await supabase
          .from('organizations')
          .select('name, country, address, logo')
          .eq('id', orgId)
          .maybeSingle());
        setConsentSupported(false);
      }

      if (error || !org) return;
      setOrgData({
        name: org.name || '',
        country: org.country || 'BD',
        address: org.address || '',
        logo: org.logo || '',
        showOnLanding: (org as { show_on_landing?: boolean }).show_on_landing === true,
      });
      if (org.logo) {
        const { data } = supabase.storage.from('org-logos').getPublicUrl(org.logo);
        setLogoPreview(data.publicUrl);
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
        showToast("Logo file size must be less than 2MB.", 'error');
        return;
      }
      if (!file.type.startsWith('image/')) {
        showToast("Logo must be an image file.", 'error');
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
    const orgId = apiClient.getOrganizationId();
    if (!orgId) return;
    setIsSaving(true);
    try {
      let logoPath = orgData.logo;
      if (logoFile) {
        const webpLogo = await convertFileToWebP(logoFile);
        const fileName = `${orgId}/logo.webp`;
        const { error: uploadError } = await supabase.storage
          .from('org-logos')
          .upload(fileName, webpLogo, { upsert: true, contentType: 'image/webp' });
        if (uploadError) throw uploadError;
        logoPath = fileName;
      }
      const { error } = await supabase
        .from('organizations')
        .update({
          name: orgData.name,
          country: orgData.country,
          address: orgData.address,
          logo: logoPath,
          // Only an ADMIN may send this. HR sees no control, and the trigger rejects it anyway.
          ...(isOrgAdmin && consentSupported ? { show_on_landing: orgData.showOnLanding } : {}),
        })
        .eq('id', orgId);
      if (error) throw error;
      showToast('Organization details updated successfully!', 'success');
    } catch (err) {
      console.error('Failed to update organization:', err);
      showToast('Failed to update organization details.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Organization Identity Section */}
      <div className="bg-white p-10 rounded-xl border border-slate-100 shadow-sm space-y-8 animate-in slide-in-from-bottom-8 duration-500">
         <div className="flex items-center justify-between">
           <h3 className="text-xl font-semibold text-slate-900 flex items-center gap-3"><Building2 size={24} className="text-primary" /> Organization Identity</h3>
           <button
             onClick={handleOrgDataSave}
             disabled={isSaving}
             className="px-6 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover transition-all disabled:opacity-50"
           >
             {isSaving ? 'Saving...' : 'Save Organization'}
           </button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
               <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Organization Name</label>
               <input
                 type="text"
                 className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                 placeholder="Enter organization name"
                 value={orgData.name}
                 onChange={e => setOrgData({ ...orgData, name: e.target.value })}
               />
            </div>

            <div className="space-y-1">
               <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Country</label>
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
               <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Organization Logo</label>
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

            {/*
              Showcase consent — Addendum 4 §5b. Sits directly under the logo field because this
              is the one screen where an admin is already looking at both assets being licensed:
              the organization name above and the logo immediately preceding.

              It names what is being agreed to rather than just offering a switch, and withdrawal
              is in the same place as the grant — a consent you cannot easily take back is not
              really a consent. ADMIN only; see isOrgAdmin above.
            */}
            {isOrgAdmin && consentSupported && (
              <div className="md:col-span-2">
                <label
                  htmlFor="show-on-landing"
                  className="flex items-start gap-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:border-blue-200 transition-colors"
                >
                  <input
                    id="show-on-landing"
                    type="checkbox"
                    checked={orgData.showOnLanding}
                    onChange={e => setOrgData({ ...orgData, showOnLanding: e.target.checked })}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-primary focus:ring-4 focus:ring-blue-50 cursor-pointer"
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                      <Sparkles size={15} className="text-primary shrink-0" />
                      Feature us on the OpenHRApp website
                    </span>
                    <span className="block mt-1.5 text-xs font-medium text-slate-500 leading-relaxed">
                      Show your organization&rsquo;s name and logo in the showcase on our homepage.
                      We will not use them anywhere else, and you can turn this off at any time —
                      it takes effect immediately. Off by default.
                    </span>
                    {orgData.showOnLanding && !logoPreview && (
                      <span className="block mt-2 text-xs font-semibold text-amber-600">
                        No logo uploaded yet — your organization will appear as a monogram until you add one.
                      </span>
                    )}
                  </span>
                </label>
              </div>
            )}

            <div className="space-y-1 md:col-span-2">
               <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Address</label>
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
      <div className="bg-white p-10 rounded-xl border border-slate-100 shadow-sm space-y-8 animate-in slide-in-from-bottom-8 duration-500">
         <h3 className="text-xl font-semibold text-slate-900 flex items-center gap-3"><Globe size={24} className="text-primary" /> System Configuration</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
               <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Timezone</label>
               <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all" value={config.timezone} onChange={e => handleChange('timezone', e.target.value)}>
                  {TIMEZONE_OPTIONS.map(group => (
                    <optgroup key={group.group} label={group.group}>
                      {group.zones.map(zone => (
                        <option key={zone.value} value={zone.value}>{zone.label}</option>
                      ))}
                    </optgroup>
                  ))}
               </select>
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Currency</label>
               <input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-50 transition-all outline-none" value={config.currency} onChange={e => handleChange('currency', e.target.value)} />
            </div>
         </div>

         <div className="pt-8 border-t border-slate-50">
             <div className="grid grid-cols-1 gap-6">
               <div className="space-y-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                   <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2"><Moon size={16} className="text-indigo-500"/> Auto-Absent Automation</h4>
                   <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500">Enable Feature</span>
                      <input type="checkbox" className="w-5 h-5 accent-indigo-600 rounded-lg" checked={config.autoAbsentEnabled || false} onChange={e => handleChange('autoAbsentEnabled', e.target.checked)} />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">Cutoff Time (End of Day)</label>
                      <input type="time" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none" value={config.autoAbsentTime || '23:55'} onChange={e => handleChange('autoAbsentTime', e.target.value)} />
                      <p className="text-[9px] text-slate-400 mt-1">If no punch found by this time, mark as ABSENT.</p>
                   </div>
               </div>
               <div className="space-y-2 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                   <div className="flex items-center justify-between gap-4">
                      <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2"><MapPin size={16} className="text-rose-500"/> Allow Check-In Without Location</h4>
                      <input type="checkbox" className="w-5 h-5 accent-indigo-600 rounded-lg shrink-0" checked={config.allowCheckInWithoutLocation !== false} onChange={e => handleChange('allowCheckInWithoutLocation', e.target.checked)} />
                   </div>
                   <p className="text-[9px] text-slate-400">When a phone cannot get a location, the employee can still check in with a selfie and a reason. The record is flagged in Attendance Logs.</p>
               </div>
             </div>
         </div>
      </div>

      {/* Duty Type Labels Section */}
      <div className="bg-white p-10 rounded-xl border border-slate-100 shadow-sm space-y-8 animate-in slide-in-from-bottom-8 duration-500">
         <h3 className="text-xl font-semibold text-slate-900 flex items-center gap-3"><Tag size={24} className="text-primary" /> Duty Type Labels</h3>
         <p className="text-xs text-slate-400 -mt-4">Customize the display names for your two duty types. Internal values remain unchanged.</p>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
               <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Duty Type 1 (e.g. Office, HQ, Remote)</label>
               <input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-50 transition-all outline-none" value={config.dutyLabel1 || 'Office'} onChange={e => handleChange('dutyLabel1', e.target.value)} placeholder="Office" />
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Duty Type 2 (e.g. Factory, Field, On-site)</label>
               <input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-blue-50 transition-all outline-none" value={config.dutyLabel2 || 'Factory'} onChange={e => handleChange('dutyLabel2', e.target.value)} placeholder="Factory" />
            </div>
         </div>
      </div>
    </div>
  );
};
