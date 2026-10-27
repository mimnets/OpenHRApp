import React, { useEffect, useState } from 'react';
import { Loader2, MonitorSmartphone } from 'lucide-react';
import { organizationService } from '../../services/organization.service';
import { AdFrameConfig, DEFAULT_AD_FRAME_CONFIG, resolveAdFrameSrc } from '../ads/AdBanner';

/** Same rules the ad page re-checks before using a value; see ads-frame/index.html. */
export const validateAdFrameConfig = (cfg: AdFrameConfig): string | null => {
  const https = (v: string) => { try { return new URL(v).protocol === 'https:'; } catch { return false; } };
  if (cfg.adsterra.enabled && !/^[A-Za-z0-9]+$/.test(cfg.adsterra.key)) return 'Adsterra key must be letters and numbers only.';
  if (cfg.aads.enabled && !/^\d+$/.test(cfg.aads.unit)) return 'A-Ads unit must be a number.';
  if (cfg.zoho.enabled && (!https(cfg.zoho.img) || !https(cfg.zoho.href))) return 'Zoho image and link must both be https:// URLs.';
  for (const p of [cfg.adsterra, cfg.aads, cfg.zoho]) {
    if (!Number.isInteger(p.weight) || p.weight < 0 || p.weight > 10) return 'Weights must be whole numbers from 0 to 10.';
  }
  return null;
};

const input = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-light outline-none';

const Toggle: React.FC<{ on: boolean; onClick: () => void; label: string }> = ({ on, onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    aria-label={label}
    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${on ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
  >
    {on ? 'On' : 'Off'}
  </button>
);

const AdFrameSettings: React.FC<{ onMessage: (msg: { type: 'success' | 'error'; text: string }) => void }> = ({ onMessage }) => {
  const [cfg, setCfg] = useState<AdFrameConfig>(DEFAULT_AD_FRAME_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const frameUrl = resolveAdFrameSrc();

  useEffect(() => {
    // Platform-level explicitly: get_ad_frame_settings() reads only the organization_id = null row,
    // and getSetting/setSetting would scope to the Super Admin's own org if their profile has one.
    organizationService.getPlatformSetting('ad_frame_config', null)
      .then((stored: Partial<AdFrameConfig> | null) => {
        if (!stored) return;
        setCfg({
          enabled: stored.enabled === true,
          adsterra: { ...DEFAULT_AD_FRAME_CONFIG.adsterra, ...stored.adsterra },
          aads: { ...DEFAULT_AD_FRAME_CONFIG.aads, ...stored.aads },
          zoho: { ...DEFAULT_AD_FRAME_CONFIG.zoho, ...stored.zoho },
        });
      })
      .catch(() => onMessage({ type: 'error', text: 'Failed to load dashboard ad settings' }))
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends 'adsterra' | 'aads' | 'zoho'>(p: K, patch: Partial<AdFrameConfig[K]>) =>
    setCfg(prev => ({ ...prev, [p]: { ...prev[p], ...patch } }));

  const save = async () => {
    const problem = validateAdFrameConfig(cfg);
    if (problem) { onMessage({ type: 'error', text: problem }); return; }
    setSaving(true);
    try {
      await organizationService.setPlatformSetting('ad_frame_config', cfg);
      onMessage({ type: 'success', text: 'Dashboard ad settings saved. Changes appear on the next dashboard load.' });
    } catch (e: any) {
      onMessage({ type: 'error', text: e?.message || 'Failed to save dashboard ad settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" size={24} /></div>;
  }

  const weight = (p: 'adsterra' | 'aads' | 'zoho') => (
    <label className="text-xs text-slate-500 flex items-center gap-2">
      Weight
      <input type="number" min={0} max={10} value={cfg[p].weight}
        onChange={e => set(p, { weight: Number(e.target.value) } as any)}
        className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-sm" />
    </label>
  );

  return (
    <div className="bg-white rounded-2xl border-2 border-primary/30 p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2"><MonitorSmartphone size={20} /> Dashboard Ads</h4>
          <p className="text-sm text-slate-500 mt-1">
            One rotating banner on the employee dashboard, shown to every organization except those on the paid
            ad-free plan (ACTIVE) and the demo. It runs in an isolated frame on the ad subdomain, so ad code cannot read app data.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Ad page: {frameUrl ?? <span className="text-amber-600">VITE_AD_FRAME_URL is not set — the frame will not show</span>}
          </p>
        </div>
        <Toggle on={cfg.enabled} onClick={() => setCfg(prev => ({ ...prev, enabled: !prev.enabled }))} label="All dashboard ads" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="font-bold text-slate-900">Adsterra</h5>
            <Toggle on={cfg.adsterra.enabled} onClick={() => set('adsterra', { enabled: !cfg.adsterra.enabled })} label="Adsterra" />
          </div>
          <input className={input} placeholder="Banner 320x50 key" value={cfg.adsterra.key}
            onChange={e => set('adsterra', { key: e.target.value.trim() })} />
          {weight('adsterra')}
        </div>

        <div className="rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="font-bold text-slate-900">A-Ads</h5>
            <Toggle on={cfg.aads.enabled} onClick={() => set('aads', { enabled: !cfg.aads.enabled })} label="A-Ads" />
          </div>
          <input className={input} placeholder="Ad unit number" value={cfg.aads.unit}
            onChange={e => set('aads', { unit: e.target.value.trim() })} />
          {weight('aads')}
        </div>

        <div className="rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="font-bold text-slate-900">Zoho (affiliate)</h5>
            <Toggle on={cfg.zoho.enabled} onClick={() => set('zoho', { enabled: !cfg.zoho.enabled })} label="Zoho" />
          </div>
          <input className={input} placeholder="Banner image URL (https://…)" value={cfg.zoho.img}
            onChange={e => set('zoho', { img: e.target.value.trim() })} />
          <input className={input} placeholder="Affiliate link (https://…)" value={cfg.zoho.href}
            onChange={e => set('zoho', { href: e.target.value.trim() })} />
          {weight('zoho')}
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Each dashboard load picks one enabled provider at random; a higher weight is picked more often. If none is
        enabled, a "Remove ads" link to the pricing page is shown. Earnings are reported in each provider's own dashboard.
      </p>

      <button onClick={save} disabled={saving}
        className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover disabled:opacity-50 flex items-center gap-2">
        {saving && <Loader2 size={16} className="animate-spin" />} Save dashboard ads
      </button>
    </div>
  );
};

export default AdFrameSettings;
