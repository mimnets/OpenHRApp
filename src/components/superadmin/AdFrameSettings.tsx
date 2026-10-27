import React, { useEffect, useState } from 'react';
import { Loader2, MonitorSmartphone } from 'lucide-react';
import { organizationService } from '../../services/organization.service';
import {
  AD_PLACEMENTS, ADSTERRA_SIZES, AdFrameConfig, AdsterraSize, DEFAULT_AD_FRAME_CONFIG, isPlacementOn, resolveAdFrameSrc,
} from '../ads/AdBanner';

/** Same rules the ad page re-checks before using a value; see ads-frame/index.html. */
export const validateAdFrameConfig = (cfg: AdFrameConfig): string | null => {
  const https = (v: string) => { try { return new URL(v).protocol === 'https:'; } catch { return false; } };
  const key = /^[A-Za-z0-9]+$/;
  if (cfg.adsterra.enabled && !key.test(cfg.adsterra.key)) return 'Adsterra phone key must be letters and numbers only.';
  if (cfg.adsterra.keyWide && !key.test(cfg.adsterra.keyWide)) return 'Adsterra desktop key must be letters and numbers only.';
  if (![cfg.adsterra.keySize, cfg.adsterra.keyWideSize].every(s => (ADSTERRA_SIZES as readonly string[]).includes(s))) return 'Pick a size for each Adsterra key.';
  if (cfg.aads.enabled && !/^\d+$/.test(cfg.aads.unit)) return 'A-Ads unit must be a number.';
  if (cfg.zoho.enabled && (!https(cfg.zoho.img) || !https(cfg.zoho.href))) return 'Zoho image and link must both be https:// URLs.';
  if (cfg.zoho.imgWide && !https(cfg.zoho.imgWide)) return 'Zoho 728x90 image must be an https:// URL.';
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
          placements: { ...stored.placements },
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
          <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2"><MonitorSmartphone size={20} /> Platform Ads</h4>
          <p className="text-sm text-slate-500 mt-1">
            Rotating banners in the placements switched on below, shown to every organization except those on the paid
            ad-free plan (ACTIVE) and the demo, and to visitors of public pages. They run in an isolated frame on the ad
            subdomain, so ad code cannot read app data. Desktop shows a 728x90 banner, phones a 300x250 one.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Ad page: {frameUrl ?? <span className="text-amber-600">VITE_AD_FRAME_URL is not set — the frame will not show</span>}
          </p>
        </div>
        <Toggle on={cfg.enabled} onClick={() => setCfg(prev => ({ ...prev, enabled: !prev.enabled }))} label="All ads" />
      </div>

      <div>
        <h5 className="font-bold text-slate-900 mb-2">Placements</h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {AD_PLACEMENTS.map(p => {
            const on = isPlacementOn(cfg.placements, p.id);
            return (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-sm text-slate-700">{p.label}</span>
                <Toggle on={on} label={p.label}
                  onClick={() => setCfg(prev => ({ ...prev, placements: { ...prev.placements, [p.id]: !on } }))} />
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Never shown on the check-in camera, attendance history or leave screens; after each check-in/out the app
          returns to the dashboard, where the dashboard ad shows. A landing page ad may reduce sign-ups.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="font-bold text-slate-900">Adsterra</h5>
            <Toggle on={cfg.adsterra.enabled} onClick={() => set('adsterra', { enabled: !cfg.adsterra.enabled })} label="Adsterra" />
          </div>
          {([['key', 'keySize', 'Banner key (phones)'], ['keyWide', 'keyWideSize', 'Banner key (desktop, optional)']] as const).map(([k, s, ph]) => (
            <div key={k} className="flex gap-2">
              <input className={input} placeholder={ph} value={cfg.adsterra[k]}
                onChange={e => set('adsterra', { [k]: e.target.value.trim() })} />
              <select aria-label={`${ph} size`} value={cfg.adsterra[s]}
                onChange={e => set('adsterra', { [s]: e.target.value as AdsterraSize })}
                className="px-2 py-2 border border-slate-200 rounded-lg text-sm">
                {ADSTERRA_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
              </select>
            </div>
          ))}
          <p className="text-[11px] text-slate-400">Pick the size the unit was created with in Adsterra. The largest one that fits the space is shown.</p>
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
          <input className={input} placeholder="300x250 image URL (https://…)" value={cfg.zoho.img}
            onChange={e => set('zoho', { img: e.target.value.trim() })} />
          <input className={input} placeholder="728x90 image URL (optional)" value={cfg.zoho.imgWide}
            onChange={e => set('zoho', { imgWide: e.target.value.trim() })} />
          <input className={input} placeholder="Affiliate link (https://…)" value={cfg.zoho.href}
            onChange={e => set('zoho', { href: e.target.value.trim() })} />
          {weight('zoho')}
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Each banner load picks one enabled provider at random; a higher weight is picked more often. If a desktop key
        or image is missing, the 300x250 one is shown centered instead. If no provider is enabled, a "Remove ads" link
        to the pricing page is shown. Earnings are reported in each provider's own dashboard.
      </p>

      <button onClick={save} disabled={saving}
        className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover disabled:opacity-50 flex items-center gap-2">
        {saving && <Loader2 size={16} className="animate-spin" />} Save ads
      </button>
    </div>
  );
};

export default AdFrameSettings;
