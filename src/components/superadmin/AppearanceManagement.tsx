
import React, { useState, useEffect } from 'react';
import { Loader2, Check, Palette } from 'lucide-react';
import { THEMES } from '../../context/ThemeContext';
import { apiClient } from '../../services/api.client';

interface AppearanceManagementProps {
  onMessage: (msg: { type: 'success' | 'error'; text: string }) => void;
}

const AppearanceManagement: React.FC<AppearanceManagementProps> = ({ onMessage }) => {
  const [selectedTheme, setSelectedTheme] = useState('indigo');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadCurrentDefault();
  }, []);

  const loadCurrentDefault = async () => {
    setIsLoading(true);
    try {
      const record = await apiClient.pb?.collection('settings').getFirstListItem(
        'key = "default_theme"',
        { requestKey: 'get_default_theme' }
      );
      if (record?.value) {
        setSelectedTheme(record.value as string);
      }
    } catch (e) {
      // Not found — use default indigo
    }
    setIsLoading(false);
  };

  const handleSave = async (themeId: string) => {
    setIsSaving(true);
    setSelectedTheme(themeId);
    try {
      // Try to update existing record
      try {
        const record = await apiClient.pb?.collection('settings').getFirstListItem(
          'key = "default_theme"',
          { requestKey: 'update_default_theme' }
        );
        if (record) {
          await apiClient.pb?.collection('settings').update(record.id, { value: themeId });
        }
      } catch {
        // Not found — create new
        const orgId = apiClient.pb?.authStore.model?.organization_id || '';
        await apiClient.pb?.collection('settings').create({
          key: 'default_theme',
          value: themeId,
          organization_id: orgId,
        });
      }
      const theme = THEMES.find(t => t.id === themeId);
      onMessage({ type: 'success', text: `Default theme set to "${theme?.name || themeId}"` });
    } catch (e: any) {
      onMessage({ type: 'error', text: `Failed to save: ${e?.message || 'Unknown error'}` });
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary-light rounded-2xl">
          <Palette size={24} className="text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">Default App Theme</h3>
          <p className="text-sm text-slate-500">
            Set the default accent color for all new users. Users can still override this in their personal settings.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Accent Color</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {THEMES.map(theme => (
            <button
              key={theme.id}
              onClick={() => handleSave(theme.id)}
              disabled={isSaving}
              className={`relative group p-4 rounded-3xl border-2 transition-all text-left hover:scale-[1.02] ${
                selectedTheme === theme.id
                  ? 'border-slate-900 bg-slate-50'
                  : 'border-transparent bg-white hover:bg-slate-50 shadow-sm'
              } ${isSaving ? 'opacity-70 pointer-events-none' : ''}`}
            >
              <div
                className="h-20 w-full rounded-2xl mb-3 flex items-center justify-center relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.light} 100%)` }}
              >
                <div className="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md text-white">
                  {selectedTheme === theme.id && <Check size={16} strokeWidth={4} />}
                </div>
              </div>
              <p className="font-black text-slate-800 text-xs uppercase tracking-tight">{theme.name}</p>
              <div className="flex gap-1 mt-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.colors.primary }}></div>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.colors.hover }}></div>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.colors.light }}></div>
              </div>
              {selectedTheme === theme.id && (
                <div className="absolute top-2 right-2">
                  <span className="text-[9px] font-black text-primary bg-primary-light px-2 py-1 rounded-full uppercase">Default</span>
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="mt-6 p-4 bg-slate-50 rounded-2xl">
          <p className="text-xs text-slate-500">
            <strong>Note:</strong> This sets the default accent color for users who haven't chosen their own preference.
            Existing users who have already customized their theme will not be affected.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AppearanceManagement;
