import React, { useState, useEffect, useRef } from 'react';
import { Loader2, X, Code, Image, Globe, AlertTriangle } from 'lucide-react';
import { organizationService } from '../../services/organization.service';
import { superAdminService } from '../../services/superadmin.service';
import type { Organization } from '../../types';
import { AdConfig, AdSlot, AdPlaceholder } from '../ads';
import { isPwaAdSlot, resolvePwaImageSrc, PWA_SPONSORED_LINK } from '../ads/AdBanner';
import type { FormatTargeting, PageTargetGroup } from '../../config/monetag';
import { DEFAULT_IPP_TARGETING, DEFAULT_VIGNETTE_TARGETING } from '../../config/monetag';

const PAGE_TARGET_GROUPS: { id: PageTargetGroup; name: string; description: string }[] = [
  { id: 'guides-listing', name: 'Guides listing', description: '/how-to-use' },
  { id: 'guides-articles', name: 'Guides articles', description: '/how-to-use/:slug' },
  { id: 'blog-listing', name: 'Blog listing', description: '/blog' },
  { id: 'blog-articles', name: 'Blog articles', description: '/blog/:slug' },
  { id: 'landing-page', name: 'Public landing', description: '/' },
];

const AD_SLOTS: { id: AdSlot; name: string; description: string; size: string }[] = [
  { id: 'sidebar', name: 'Sidebar', description: 'Bottom of sidebar navigation', size: '300x250' },
  { id: 'dashboard', name: 'Dashboard', description: 'Below dashboard stats', size: '728x90' },
  { id: 'reports', name: 'Reports', description: 'Reports page sidebar', size: '300x250' },
  { id: 'footer', name: 'Footer', description: 'Footer area on all pages', size: '728x90' },
  { id: 'landing-hero', name: 'Landing Hero', description: 'Below hero section on landing page', size: '728x90' },
  { id: 'landing-mid', name: 'Landing Mid', description: 'Between sections on landing page', size: '728x90' },
  { id: 'blog-header', name: 'Blog Header', description: 'Top of blog listing page', size: '728x90' },
  { id: 'blog-feed', name: 'Blog Feed', description: 'Below blog post grid', size: '728x90' },
  { id: 'blog-post-top', name: 'Blog Post Top', description: 'Top of blog post page', size: '728x90' },
  { id: 'blog-post-content', name: 'Blog Post Content', description: 'Inside blog post content area', size: '300x250' },
  // Phase 2A: PWA authenticated page slots (default OFF, mobile-first)
  { id: 'attendance-success', name: 'Attendance Success', description: 'After successful check-in/check-out on attendance page', size: '320x100' },
  { id: 'leave-success', name: 'Leave Success', description: 'After successful leave submission', size: '320x100' },
  { id: 'dashboard-below-cards', name: 'Dashboard Below Cards', description: 'Below summary cards on employee dashboard', size: '320x100' }
];

const LEGACY_AD_SLOTS = AD_SLOTS.filter(slot => !isPwaAdSlot(slot.id));
const PWA_AD_SLOT_META = AD_SLOTS.filter(slot => isPwaAdSlot(slot.id));
const PWA_KEYS = PWA_AD_SLOT_META.map(slot => `ad_config_${slot.id}`);

const DEFAULT_CONFIG: Omit<AdConfig, 'id' | 'slot'> = {
  enabled: false,
  adType: 'image',
  adsenseClient: '',
  adsenseSlot: '',
  customHtml: '',
  imageUrl: '',
  linkUrl: '',
  altText: ''
};

interface AdManagementProps {
  onMessage: (msg: { type: 'success' | 'error'; text: string }) => void;
}

const AdManagement: React.FC<AdManagementProps> = ({ onMessage }) => {
  const [configs, setConfigs] = useState<Record<AdSlot, AdConfig>>({} as Record<AdSlot, AdConfig>);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingSlot, setEditingSlot] = useState<AdSlot | null>(null);
  const [editForm, setEditForm] = useState<AdConfig | null>(null);

  // Phase 3F: PWA slots belong to an explicitly selected organization, never the caller's own org.
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [pwaOrgId, setPwaOrgId] = useState('');
  const [pwaConfigs, setPwaConfigs] = useState<Partial<Record<AdSlot, AdConfig>> | null>(null);
  const [editOrgId, setEditOrgId] = useState('');
  const pwaRequest = useRef(0); // bumps on every selection; older responses and saves are discarded

  // Monetag Controls state
  const [monetagIppEnabled, setMonetagIppEnabled] = useState(false);
  const [monetagVignetteEnabled, setMonetagVignetteEnabled] = useState(false);
  const [monetagIppTargeting, setMonetagIppTargeting] = useState<FormatTargeting>(DEFAULT_IPP_TARGETING);
  const [monetagVignetteTargeting, setMonetagVignetteTargeting] = useState<FormatTargeting>(DEFAULT_VIGNETTE_TARGETING);
  const [monetagLoading, setMonetagLoading] = useState(true);
  const [showIppWarning, setShowIppWarning] = useState(false);
  const [showVignetteWarning, setShowVignetteWarning] = useState(false);

  useEffect(() => {
    loadConfigs();
    loadMonetagSettings();
    superAdminService.getAllOrganizations().then(setOrgs);
  }, []);

  const isAdSupported = (orgId: string) =>
    orgs.some(org => org.id === orgId && org.subscriptionStatus === 'AD_SUPPORTED');

  const selectPwaOrg = async (orgId: string) => {
    const request = ++pwaRequest.current;
    setPwaOrgId(orgId);
    setPwaConfigs(null);
    if (editingSlot && isPwaAdSlot(editingSlot)) closeEditModal();
    if (!orgId || !isAdSupported(orgId)) return;
    try {
      const stored = await superAdminService.getOrgSettings(orgId, PWA_KEYS);
      if (request !== pwaRequest.current) return;
      setPwaConfigs(Object.fromEntries(PWA_AD_SLOT_META.map(slot => {
        const value = stored[`ad_config_${slot.id}`] as AdConfig | undefined;
        return [slot.id, value ? { ...value, slot: slot.id } : { id: '', slot: slot.id, ...DEFAULT_CONFIG }];
      })));
    } catch (e) {
      if (request !== pwaRequest.current) return;
      console.error('[AdManagement] PWA org settings load error:', e);
      onMessage({ type: 'error', text: 'Failed to load in-app ad settings for this organization' });
    }
  };

  // Every PWA write names its organization and is refused unless that organization is AD_SUPPORTED.
  const writePwaConfig = async (orgId: string, slot: AdSlot, value: AdConfig) => {
    if (!orgId || !isAdSupported(orgId)) throw new Error('Select an AD_SUPPORTED organization first');
    const request = pwaRequest.current;
    await superAdminService.setOrgSetting(orgId, `ad_config_${slot}`, value);
    if (request === pwaRequest.current) setPwaConfigs(prev => prev && { ...prev, [slot]: value });
  };

  const loadConfigs = async () => {
    setIsLoading(true);
    try {
      const loadedConfigs: Record<AdSlot, AdConfig> = {} as Record<AdSlot, AdConfig>;
      for (const slot of LEGACY_AD_SLOTS) {
        const value = await organizationService.getSetting(`ad_config_${slot.id}`, null);
        if (value) {
          loadedConfigs[slot.id] = { ...(value as AdConfig), slot: slot.id };
        } else {
          loadedConfigs[slot.id] = { id: '', slot: slot.id, ...DEFAULT_CONFIG };
        }
      }
      setConfigs(loadedConfigs);
    } catch (e) {
      console.error('[AdManagement] Load error:', e);
      onMessage({ type: 'error', text: 'Failed to load ad configurations' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadMonetagSettings = async () => {
    setMonetagLoading(true);
    try {
      const ippEnabled = await organizationService.getSetting('monetag_ipp_enabled', false);
      const vignetteEnabled = await organizationService.getSetting('monetag_vignette_enabled', false);
      const ippTargeting = await organizationService.getSetting('monetag_ipp_targeting', DEFAULT_IPP_TARGETING);
      const vignetteTargeting = await organizationService.getSetting('monetag_vignette_targeting', DEFAULT_VIGNETTE_TARGETING);
      
      setMonetagIppEnabled(Boolean(ippEnabled));
      setMonetagVignetteEnabled(Boolean(vignetteEnabled));
      setMonetagIppTargeting({ ...DEFAULT_IPP_TARGETING, ...(ippTargeting as FormatTargeting || {}) });
      setMonetagVignetteTargeting({ ...DEFAULT_VIGNETTE_TARGETING, ...(vignetteTargeting as FormatTargeting || {}) });
    } catch (e) {
      console.error('[AdManagement] Monetag settings load error:', e);
      // Default to OFF on error
      setMonetagIppEnabled(false);
      setMonetagVignetteEnabled(false);
      setMonetagIppTargeting(DEFAULT_IPP_TARGETING);
      setMonetagVignetteTargeting(DEFAULT_VIGNETTE_TARGETING);
    } finally {
      setMonetagLoading(false);
    }
  };

  const handleMonetagIppToggle = async () => {
    const newValue = !monetagIppEnabled;
    
    if (newValue && !showIppWarning) {
      setShowIppWarning(true);
      return;
    }
    
    setShowIppWarning(false);
    
    try {
      await organizationService.setSetting('monetag_ipp_enabled', newValue);
      setMonetagIppEnabled(newValue);
      onMessage({ 
        type: 'success', 
        text: `In-Page Push ${newValue ? 'enabled' : 'disabled'}. ${newValue ? 'Note: Already-loaded pages may continue running vendor code until their document contexts end.' : ''}` 
      });
    } catch (e: any) {
      console.error('[AdManagement] Monetag IPP toggle error:', e);
      onMessage({ type: 'error', text: 'Failed to update In-Page Push setting' });
    }
  };

  const handleMonetagVignetteToggle = async () => {
    const newValue = !monetagVignetteEnabled;
    
    if (newValue && !showVignetteWarning) {
      setShowVignetteWarning(true);
      return;
    }
    
    setShowVignetteWarning(false);
    
    try {
      await organizationService.setSetting('monetag_vignette_enabled', newValue);
      setMonetagVignetteEnabled(newValue);
      onMessage({ 
        type: 'success', 
        text: `Vignette ${newValue ? 'enabled' : 'disabled'}. ${newValue ? 'Note: Already-loaded pages may continue running vendor code until their document contexts end.' : ''}` 
      });
    } catch (e: any) {
      console.error('[AdManagement] Monetag Vignette toggle error:', e);
      onMessage({ type: 'error', text: 'Failed to update Vignette setting' });
    }
  };

  const cancelMonetagIppToggle = () => {
    setShowIppWarning(false);
  };

  const cancelMonetagVignetteToggle = () => {
    setShowVignetteWarning(false);
  };

  const handleIppTargetingToggle = async (group: PageTargetGroup) => {
    const newTargeting = { ...monetagIppTargeting, [group]: !monetagIppTargeting[group] };
    try {
      await organizationService.setSetting('monetag_ipp_targeting', newTargeting);
      setMonetagIppTargeting(newTargeting);
      onMessage({ type: 'success', text: `IPP targeting for "${group}" updated` });
    } catch (e: any) {
      console.error('[AdManagement] IPP targeting toggle error:', e);
      onMessage({ type: 'error', text: 'Failed to update IPP targeting' });
    }
  };

  const handleVignetteTargetingToggle = async (group: PageTargetGroup) => {
    const newTargeting = { ...monetagVignetteTargeting, [group]: !monetagVignetteTargeting[group] };
    try {
      await organizationService.setSetting('monetag_vignette_targeting', newTargeting);
      setMonetagVignetteTargeting(newTargeting);
      onMessage({ type: 'success', text: `Vignette targeting for "${group}" updated` });
    } catch (e: any) {
      console.error('[AdManagement] Vignette targeting toggle error:', e);
      onMessage({ type: 'error', text: 'Failed to update Vignette targeting' });
    }
  };

  const openEditModal = (slot: AdSlot) => {
    if (isPwaAdSlot(slot)) {
      const config = pwaConfigs?.[slot];
      if (!pwaOrgId || !config) return;
      setEditOrgId(pwaOrgId);
      setEditingSlot(slot);
      setEditForm({ ...config, adType: 'image' });
      return;
    }
    setEditingSlot(slot);
    setEditForm({ ...configs[slot] });
  };

  // Phase 3D: PWA slots persist only image fields; the click destination is the fixed SmartLink.
  const toPwaImageConfig = (config: AdConfig): AdConfig =>
    ({ ...config, adType: 'image', adsenseClient: '', adsenseSlot: '', customHtml: '', linkUrl: '' });

  const PWA_IMAGE_ERROR = 'PWA slots need a self-hosted image on this site, e.g. /img/sponsored-320x100.png';

  const closeEditModal = () => {
    setEditingSlot(null);
    setEditForm(null);
  };

  const handleSave = async () => {
    if (!editingSlot || !editForm) return;
    const toSave = isPwaAdSlot(editingSlot) ? toPwaImageConfig(editForm) : editForm;
    if (isPwaAdSlot(editingSlot) && !resolvePwaImageSrc(toSave)) {
      onMessage({ type: 'error', text: PWA_IMAGE_ERROR });
      return;
    }
    setIsSaving(true);
    try {
      if (isPwaAdSlot(editingSlot)) {
        await writePwaConfig(editOrgId, editingSlot, toSave);
      } else {
        await organizationService.setSetting(`ad_config_${editingSlot}`, toSave);
        setConfigs(prev => ({ ...prev, [editingSlot]: toSave }));
      }
      onMessage({ type: 'success', text: `Ad slot "${editingSlot}" updated successfully` });
      closeEditModal();
    } catch (e: any) {
      console.error('[AdManagement] Save error:', e);
      onMessage({ type: 'error', text: e?.message || 'Failed to save configuration' });
    } finally {
      setIsSaving(false);
    }
  };

  const togglePwaEnabled = async (slot: AdSlot) => {
    const config = pwaConfigs?.[slot];
    if (!pwaOrgId || !config) return;
    if (!config.enabled && !resolvePwaImageSrc(config)) {
      onMessage({ type: 'error', text: PWA_IMAGE_ERROR });
      return;
    }
    const updated = { ...config, enabled: !config.enabled };
    try {
      await writePwaConfig(pwaOrgId, slot, updated);
      onMessage({ type: 'success', text: `Ad slot "${slot}" ${updated.enabled ? 'enabled' : 'disabled'}` });
    } catch (e: any) {
      console.error('[AdManagement] PWA toggle error:', e);
      onMessage({ type: 'error', text: e?.message || 'Failed to update status.' });
    }
  };

  const toggleEnabled = async (slot: AdSlot) => {
    if (isPwaAdSlot(slot)) return togglePwaEnabled(slot);
    const config = configs[slot];
    const updated = { ...config, enabled: !config.enabled };
    setConfigs(prev => ({ ...prev, [slot]: updated }));
    try {
      await organizationService.setSetting(`ad_config_${slot}`, updated);
      onMessage({ type: 'success', text: `Ad slot "${slot}" ${updated.enabled ? 'enabled' : 'disabled'}` });
    } catch (e: any) {
      console.error('[AdManagement] Toggle error:', e);
      setConfigs(prev => ({ ...prev, [slot]: config }));
      onMessage({ type: 'error', text: 'Failed to update status.' });
    }
  };

  const renderSlotCard = (slot: typeof AD_SLOTS[number], config: AdConfig | undefined) => (
    <div
      key={slot.id}
      className={`bg-white rounded-2xl border p-6 ${config?.enabled ? 'border-emerald-200' : 'border-slate-200'}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="font-bold text-slate-900">{slot.name}</h4>
          <p className="text-xs text-slate-500">{slot.description}</p>
          <p className="text-xs text-slate-400 mt-1">Size: {slot.size}</p>
        </div>
        <button
          onClick={() => toggleEnabled(slot.id)}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
            config?.enabled
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {config?.enabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>

      {config?.enabled && (
        <div className="mb-4 p-3 bg-slate-50 rounded-lg text-xs">
          <span className="font-medium text-slate-600">Type: </span>
          <span className="text-slate-800 capitalize">{config.adType}</span>
          {config.adType === 'adsense' && config.adsenseSlot && (
            <span className="text-slate-500 ml-2">(Slot: {config.adsenseSlot})</span>
          )}
          {config.adType === 'image' && config.imageUrl && (
            <span className="text-slate-500 ml-2">(Image configured)</span>
          )}
        </div>
      )}

      <button
        onClick={() => openEditModal(slot.id)}
        className="w-full py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
      >
        Configure
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Ad Management</h3>
          <p className="text-sm text-slate-500 mt-1">Configure ad slots for AD_SUPPORTED organizations</p>
        </div>
      </div>

      {/* Monetag Controls Section */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border-2 border-purple-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h4 className="text-lg font-bold text-purple-900 flex items-center gap-2">
              <Globe size={20} />
              Monetag Advertising Controls
            </h4>
            <p className="text-sm text-purple-700 mt-1">
              Platform-wide advertising formats for public content pages. These are separate from the organization ad slots above.
            </p>
          </div>
        </div>

        {monetagLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-purple-600" size={24} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* In-Page Push Control */}
            <div className={`bg-white rounded-xl border-2 p-5 ${monetagIppEnabled ? 'border-emerald-300' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h5 className="font-bold text-slate-900">In-Page Push</h5>
                  <p className="text-xs text-slate-500 mt-1">Zone: 12046475</p>
                </div>
                <button
                  onClick={handleMonetagIppToggle}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    monetagIppEnabled
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {monetagIppEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              
              <p className="text-xs text-slate-600 mb-3">
                Non-intrusive push notifications displayed directly on eligible tutorial articles. 
                Requires explicit visitor consent. Anonymous visitors only.
              </p>

              {showIppWarning && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-amber-900 mb-1">
                        Enable In-Page Push Advertising?
                      </p>
                      <p className="text-xs text-amber-800 mb-2">
                        This will load third-party advertising scripts on eligible public tutorial pages 
                        for anonymous visitors who have explicitly granted advertising consent.
                      </p>
                      <p className="text-xs text-amber-800 mb-2">
                        <strong>Important:</strong> Already-loaded pages may continue running vendor code 
                        until their document contexts end, even after disabling.
                      </p>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={handleMonetagIppToggle}
                          className="px-3 py-1 bg-amber-600 text-white text-xs font-bold rounded hover:bg-amber-700"
                        >
                          Yes, Enable
                        </button>
                        <button
                          onClick={cancelMonetagIppToggle}
                          className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded hover:bg-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-xs text-slate-500">
                <strong>Eligible pages:</strong> Tutorial articles only (/how-to-use/:slug)
              </div>
            </div>

            {/* Vignette Control */}
            <div className={`bg-white rounded-xl border-2 p-5 ${monetagVignetteEnabled ? 'border-emerald-300' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h5 className="font-bold text-slate-900">Vignette</h5>
                  <p className="text-xs text-slate-500 mt-1">Zone: 12054036</p>
                </div>
                <button
                  onClick={handleMonetagVignetteToggle}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    monetagVignetteEnabled
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {monetagVignetteEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              
              <p className="text-xs text-slate-600 mb-3">
                Full-page interstitial ads shown between page transitions on eligible tutorial articles. 
                Requires explicit visitor consent. Anonymous visitors only.
              </p>

              {showVignetteWarning && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-amber-900 mb-1">
                        Enable Vignette Advertising?
                      </p>
                      <p className="text-xs text-amber-800 mb-2">
                        This will load third-party advertising scripts on eligible public tutorial pages 
                        for anonymous visitors who have explicitly granted advertising consent.
                      </p>
                      <p className="text-xs text-amber-800 mb-2">
                        <strong>Important:</strong> Already-loaded pages may continue running vendor code 
                        until their document contexts end, even after disabling.
                      </p>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={handleMonetagVignetteToggle}
                          className="px-3 py-1 bg-amber-600 text-white text-xs font-bold rounded hover:bg-amber-700"
                        >
                          Yes, Enable
                        </button>
                        <button
                          onClick={cancelMonetagVignetteToggle}
                          className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded hover:bg-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-xs text-slate-500">
                <strong>Eligible pages:</strong> Tutorial articles only (/how-to-use/:slug)
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 p-3 bg-purple-100 rounded-lg">
          <p className="text-xs text-purple-900">
            <strong>Note:</strong> Both formats require explicit visitor consent, are restricted to anonymous visitors,
            and preserve all existing consent withdrawal and document teardown behavior. Script URLs and zone IDs are hardcoded and cannot be modified through this interface.
            Page targeting controls which page groups are eligible for each format.
          </p>
        </div>

        {/* IPP Targeting Panel */}
        <div className="mt-6 bg-white rounded-xl border-2 border-slate-200 p-5">
          <h5 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Globe size={16} />
            IPP Page Targeting
          </h5>
          <p className="text-xs text-slate-600 mb-3">
            Select which page groups are eligible for In-Page Push advertising. Each group can be independently enabled.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PAGE_TARGET_GROUPS.map((group) => (
              <div key={group.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-900">{group.name}</p>
                  <p className="text-xs text-slate-500">{group.description}</p>
                </div>
                <button
                  onClick={() => handleIppTargetingToggle(group.id)}
                  disabled={!monetagIppEnabled}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    monetagIppTargeting[group.id]
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                  } ${!monetagIppEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {monetagIppTargeting[group.id] ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            ))}
          </div>
          {!monetagIppEnabled && (
            <p className="text-xs text-amber-600 mt-3">
              <strong>Note:</strong> IPP master switch is disabled. Enable it above to activate targeting.
            </p>
          )}
        </div>

        {/* Vignette Targeting Panel */}
        <div className="mt-4 bg-white rounded-xl border-2 border-slate-200 p-5">
          <h5 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Globe size={16} />
            Vignette Page Targeting
          </h5>
          <p className="text-xs text-slate-600 mb-3">
            Select which page groups are eligible for Vignette advertising. Each group can be independently enabled.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PAGE_TARGET_GROUPS.map((group) => (
              <div key={group.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-900">{group.name}</p>
                  <p className="text-xs text-slate-500">{group.description}</p>
                </div>
                <button
                  onClick={() => handleVignetteTargetingToggle(group.id)}
                  disabled={!monetagVignetteEnabled}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    monetagVignetteTargeting[group.id]
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                  } ${!monetagVignetteEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {monetagVignetteTargeting[group.id] ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            ))}
          </div>
          {!monetagVignetteEnabled && (
            <p className="text-xs text-amber-600 mt-3">
              <strong>Note:</strong> Vignette is disabled at the code level. Targeting settings are saved but will not take effect until Vignette is enabled.
            </p>
          )}
        </div>
      </div>

      {/* Organization Ad Slots Section */}
      <div>
        <h4 className="text-lg font-bold text-slate-900 mb-3">Organization Ad Slots</h4>
        <p className="text-sm text-slate-500 mb-4">Configure ad slots for AD_SUPPORTED organizations</p>
      </div>

      {/* Ad Slots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {LEGACY_AD_SLOTS.map(slot => renderSlotCard(slot, configs[slot.id]))}
      </div>

      {/* Phase 3F: In-app (PWA) slots, managed per explicitly selected organization */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div>
          <h4 className="text-lg font-bold text-slate-900">In-App Sponsored Slots (PWA)</h4>
          <p className="text-sm text-slate-500">
            Image-only slots inside the employee app. Choose an organization; only AD_SUPPORTED organizations can be configured.
          </p>
        </div>
        <div className="space-y-2">
          <label htmlFor="pwa-ad-org" className="text-sm font-medium text-slate-600">Organization</label>
          <select
            id="pwa-ad-org"
            value={pwaOrgId}
            onChange={(e) => selectPwaOrg(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-light outline-none"
          >
            <option value="">Select an organization…</option>
            {orgs.map(org => (
              <option key={org.id} value={org.id} disabled={org.subscriptionStatus !== 'AD_SUPPORTED'}>
                {org.name} — {org.subscriptionStatus || 'TRIAL'}
              </option>
            ))}
          </select>
        </div>
        {!pwaOrgId ? (
          <p className="text-sm text-slate-500">Select an AD_SUPPORTED organization to manage its in-app slots.</p>
        ) : !pwaConfigs ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="animate-spin" size={16} /> Loading settings for this organization…
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PWA_AD_SLOT_META.map(slot => renderSlotCard(slot, pwaConfigs[slot.id]))}
          </div>
        )}
      </div>

      {/* Preview Section */}
      <div className="bg-slate-50 rounded-2xl p-6">
        <h4 className="font-bold text-slate-700 mb-4">Ad Placement Preview</h4>
        <div className="grid grid-cols-4 gap-4 items-start">
          <div className="col-span-1 space-y-2">
            <div className="text-xs font-bold text-slate-500 uppercase">Sidebar</div>
            <AdPlaceholder slot="sidebar" />
          </div>
          <div className="col-span-3 space-y-4">
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase mb-2">Dashboard</div>
              <AdPlaceholder slot="dashboard" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase mb-2">Footer</div>
              <AdPlaceholder slot="footer" />
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingSlot && editForm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900">Configure {editingSlot} Ad</h3>
              <button onClick={closeEditModal} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Ad Type Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Ad Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setEditForm({ ...editForm, adType: 'image' })}
                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                      editForm.adType === 'image' ? 'border-primary bg-primary-light' : 'border-slate-200'
                    }`}
                  >
                    <Image size={20} />
                    <span className="text-xs font-medium">Image</span>
                  </button>
                  {!isPwaAdSlot(editingSlot) && (<>
                  <button
                    onClick={() => setEditForm({ ...editForm, adType: 'adsense' })}
                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                      editForm.adType === 'adsense' ? 'border-primary bg-primary-light' : 'border-slate-200'
                    }`}
                  >
                    <Globe size={20} />
                    <span className="text-xs font-medium">AdSense</span>
                  </button>
                  <button
                    onClick={() => setEditForm({ ...editForm, adType: 'custom' })}
                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                      editForm.adType === 'custom' ? 'border-primary bg-primary-light' : 'border-slate-200'
                    }`}
                  >
                    <Code size={20} />
                    <span className="text-xs font-medium">Custom HTML</span>
                  </button>
                  </>)}
                </div>
              </div>

              {/* Image Ad Fields */}
              {editForm.adType === 'image' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Image URL *</label>
                    <input
                      type="url"
                      value={editForm.imageUrl || ''}
                      onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                      placeholder={isPwaAdSlot(editingSlot) ? '/img/sponsored-320x100.png' : 'https://example.com/ad-image.png'}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-light outline-none"
                    />
                  </div>
                  {isPwaAdSlot(editingSlot) ? (
                  <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 space-y-1">
                    <p><strong>Image-only slot.</strong> Use a self-hosted image on this site (e.g. <code>/img/sponsored-320x100.png</code>). External image hosts are rejected.</p>
                    <p>The click destination is fixed and cannot be edited: <code className="break-all">{PWA_SPONSORED_LINK}</code>. It opens in a new tab only when the employee taps the ad, with a visible "Sponsored" label.</p>
                    <p>Saved for <strong>{orgs.find(org => org.id === editOrgId)?.name || 'the selected organization'}</strong> only. Its employees see it only while the organization is AD_SUPPORTED and this slot is enabled.</p>
                  </div>
                  ) : (<>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Link URL (optional)</label>
                    <input
                      type="url"
                      value={editForm.linkUrl || ''}
                      onChange={(e) => setEditForm({ ...editForm, linkUrl: e.target.value })}
                      placeholder="https://example.com/landing-page"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-light outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Alt Text</label>
                    <input
                      type="text"
                      value={editForm.altText || ''}
                      onChange={(e) => setEditForm({ ...editForm, altText: e.target.value })}
                      placeholder="Advertisement description"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-light outline-none"
                    />
                  </div>
                  </>)}
                </>
              )}

              {/* AdSense Fields */}
              {editForm.adType === 'adsense' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">AdSense Client ID *</label>
                    <input
                      type="text"
                      value={editForm.adsenseClient || ''}
                      onChange={(e) => setEditForm({ ...editForm, adsenseClient: e.target.value })}
                      placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-light outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Ad Slot ID *</label>
                    <input
                      type="text"
                      value={editForm.adsenseSlot || ''}
                      onChange={(e) => setEditForm({ ...editForm, adsenseSlot: e.target.value })}
                      placeholder="1234567890"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-light outline-none"
                    />
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-700">
                    Make sure to add the AdSense script to your index.html head section.
                  </div>
                </>
              )}

              {/* Custom HTML Fields */}
              {editForm.adType === 'custom' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Custom HTML *</label>
                  <textarea
                    value={editForm.customHtml || ''}
                    onChange={(e) => setEditForm({ ...editForm, customHtml: e.target.value })}
                    placeholder="<div>Your custom ad HTML...</div>"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-light outline-none font-mono text-sm"
                    rows={6}
                  />
                  <div className="p-3 bg-red-50 rounded-lg text-xs text-red-700">
                    Warning: Only use trusted HTML. Malicious scripts can compromise security.
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                onClick={closeEditModal}
                className="flex-1 py-3 border border-slate-200 rounded-xl font-medium hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving && <Loader2 size={18} className="animate-spin" />}
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdManagement;
