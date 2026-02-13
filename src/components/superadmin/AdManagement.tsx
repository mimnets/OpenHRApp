import React, { useState, useEffect, useRef } from 'react';
import { Loader2, X, Code, Image, Globe } from 'lucide-react';
import { apiClient } from '../../services/api.client';
import { AdConfig, AdSlot, AdPlaceholder } from '../ads';

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
  { id: 'blog-post-content', name: 'Blog Post Content', description: 'Inside blog post content area', size: '300x250' }
];

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

// System organization name for global settings (fallback if Super Admin has no org)
const SYSTEM_ORG_NAME = '__SYSTEM__';

interface AdManagementProps {
  onMessage: (msg: { type: 'success' | 'error'; text: string }) => void;
}

const AdManagement: React.FC<AdManagementProps> = ({ onMessage }) => {
  const [configs, setConfigs] = useState<Record<AdSlot, AdConfig>>({} as Record<AdSlot, AdConfig>);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingSlot, setEditingSlot] = useState<AdSlot | null>(null);
  const [editForm, setEditForm] = useState<AdConfig | null>(null);
  const systemOrgIdRef = useRef<string | null>(null);

  // Get organization ID for storing global ad settings
  // Priority: 1) Super Admin's own org (e.g., "Platform"), 2) SYSTEM org, 3) Create SYSTEM org
  const getSystemOrgId = async (): Promise<string> => {
    if (systemOrgIdRef.current) return systemOrgIdRef.current;

    // First, check if Super Admin has their own organization
    const superAdminOrgId = apiClient.pb?.authStore.model?.organization_id;
    if (superAdminOrgId) {
      console.log('[AdManagement] Using Super Admin organization:', superAdminOrgId);
      systemOrgIdRef.current = superAdminOrgId;
      return superAdminOrgId;
    }

    // Fallback: Look for or create SYSTEM org (for Super Admins without org)
    try {
      const existing = await apiClient.pb?.collection('organizations').getFirstListItem(
        `name = "${SYSTEM_ORG_NAME}"`,
        { requestKey: 'get_system_org' }
      );
      if (existing) {
        systemOrgIdRef.current = existing.id;
        return existing.id;
      }
    } catch {
      // Not found, create it
    }

    try {
      const newOrg = await apiClient.pb?.collection('organizations').create({
        name: SYSTEM_ORG_NAME,
        subscription_status: 'ACTIVE',
        address: 'System Organization for Global Settings'
      });
      if (newOrg) {
        systemOrgIdRef.current = newOrg.id;
        console.log('[AdManagement] Created SYSTEM organization:', newOrg.id);
        return newOrg.id;
      }
    } catch (e) {
      console.error('[AdManagement] Failed to create SYSTEM org:', e);
    }

    throw new Error('Could not get or create SYSTEM organization');
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setIsLoading(true);
    try {
      // First, ensure we have the SYSTEM org ID
      const systemOrgId = await getSystemOrgId();

      const loadedConfigs: Record<AdSlot, AdConfig> = {} as Record<AdSlot, AdConfig>;

      for (const slot of AD_SLOTS) {
        try {
          // Find ad config in SYSTEM organization
          const setting = await apiClient.pb?.collection('settings').getFirstListItem(
            `key = "ad_config_${slot.id}" && organization_id = "${systemOrgId}"`,
            { requestKey: `ad_${slot.id}` }
          );
          if (setting?.value) {
            loadedConfigs[slot.id] = { ...setting.value as AdConfig, id: setting.id };
          } else {
            loadedConfigs[slot.id] = { id: '', slot: slot.id, ...DEFAULT_CONFIG };
          }
        } catch (e: any) {
          // 404 is expected for new slots
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

  const openEditModal = (slot: AdSlot) => {
    setEditingSlot(slot);
    setEditForm({ ...configs[slot] });
  };

  const closeEditModal = () => {
    setEditingSlot(null);
    setEditForm(null);
  };

  const handleSave = async () => {
    if (!editingSlot || !editForm) return;

    setIsSaving(true);
    try {
      const key = `ad_config_${editingSlot}`;
      const systemOrgId = await getSystemOrgId();

      // Check if setting exists in SYSTEM org
      const existing = await apiClient.pb?.collection('settings').getFirstListItem(
        `key = "${key}" && organization_id = "${systemOrgId}"`,
        { requestKey: `save_ad_${editingSlot}` }
      ).catch(() => null);

      if (existing) {
        await apiClient.pb?.collection('settings').update(existing.id, {
          value: editForm
        });
      } else {
        // Create in SYSTEM organization
        console.log('[AdManagement] Creating setting in SYSTEM org:', systemOrgId);
        await apiClient.pb?.collection('settings').create({
          key,
          value: editForm,
          organization_id: systemOrgId
        });
      }

      setConfigs(prev => ({ ...prev, [editingSlot]: editForm }));
      onMessage({ type: 'success', text: `Ad slot "${editingSlot}" updated successfully` });
      closeEditModal();
    } catch (e: any) {
      console.error('[AdManagement] Save error:', e);
      const errorMsg = e?.data?.data?.organization_id?.message || e?.data?.message || e?.message || 'Failed to save configuration';
      onMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleEnabled = async (slot: AdSlot) => {
    const config = configs[slot];
    const updated = { ...config, enabled: !config.enabled };

    setConfigs(prev => ({ ...prev, [slot]: updated }));

    try {
      const key = `ad_config_${slot}`;
      const systemOrgId = await getSystemOrgId();

      const existing = await apiClient.pb?.collection('settings').getFirstListItem(
        `key = "${key}" && organization_id = "${systemOrgId}"`,
        { requestKey: `toggle_ad_${slot}` }
      ).catch(() => null);

      if (existing) {
        await apiClient.pb?.collection('settings').update(existing.id, { value: updated });
      } else {
        await apiClient.pb?.collection('settings').create({
          key,
          value: updated,
          organization_id: systemOrgId
        });
      }

      onMessage({ type: 'success', text: `Ad slot "${slot}" ${updated.enabled ? 'enabled' : 'disabled'}` });
    } catch (e: any) {
      console.error('[AdManagement] Toggle error:', e);
      setConfigs(prev => ({ ...prev, [slot]: config }));
      onMessage({ type: 'error', text: 'Failed to update status.' });
    }
  };

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

      {/* Ad Slots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AD_SLOTS.map(slot => {
          const config = configs[slot.id];
          return (
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
        })}
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
                      placeholder="https://example.com/ad-image.png"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-light outline-none"
                    />
                  </div>
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
