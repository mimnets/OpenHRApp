
import React, { useState, useEffect } from 'react';
import { Loader2, Check, Palette } from 'lucide-react';
import { THEMES, useTheme, cacheThemeId } from '../../context/ThemeContext';
import { organizationService } from '../../services/organization.service';
import { useAuth } from '../../context/AuthContext';

interface AppearanceManagementProps {
  onMessage: (msg: { type: 'success' | 'error'; text: string }) => void;
}

const AppearanceManagement: React.FC<AppearanceManagementProps> = ({ onMessage }) => {
  const { setTheme } = useTheme();
  const { user } = useAuth();
  const [selectedTheme, setSelectedTheme] = useState('arctic-frost');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pushToAllOrgs, setPushToAllOrgs] = useState(false);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    loadCurrentDefault();
  }, []);

  const loadCurrentDefault = async () => {
    setIsLoading(true);
    try {
      const value = isSuperAdmin
        ? await organizationService.getPlatformSetting('default_theme', 'arctic-frost')
        : await organizationService.getSetting('default_theme', 'arctic-frost');
      if (value) setSelectedTheme(value as string);
    } catch (e) {
      // use default
    }
    setIsLoading(false);
  };

  const handleSave = async (themeId: string) => {
    setIsSaving(true);
    setSelectedTheme(themeId);
    try {
      if (isSuperAdmin) {
        // Super admin saves as a platform-wide default.
        await organizationService.setPlatformSetting('default_theme', themeId);

        if (pushToAllOrgs) {
          // Push the theme to every existing organization so they inherit it
          // immediately instead of waiting for the cascade on next read.
          await organizationService.setSettingForAllOrganizations('default_theme', themeId);
        }
      } else {
        // Org admin — scoped to their own organization.
        await organizationService.setSetting('default_theme', themeId);
      }

      setTheme(themeId);
      cacheThemeId(themeId);
      const theme = THEMES.find(t => t.id === themeId);

      if (isSuperAdmin) {
        const suffix = pushToAllOrgs
          ? ' Pushed to all existing organizations.'
          : ' Individual org admins can override this with their own theme.';
        onMessage({
          type: 'success',
          text: `Platform-wide default theme set to "${theme?.name || themeId}".${suffix}`,
        });
      } else {
        onMessage({
          type: 'success',
          text: `Global theme set to "${theme?.name || themeId}". All users will see this on their next visit.`,
        });
      }
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
          <h3 className="text-xl font-bold text-slate-900">
            {isSuperAdmin ? 'Platform-Wide Default Theme' : 'Global App Theme'}
          </h3>
          <p className="text-sm text-slate-500">
            {isSuperAdmin
              ? 'Set the default accent color for all organizations on the platform.'
              : 'Set the accent color for all users across the platform.'}
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
              <p className="font-semibold text-slate-800 text-xs uppercase tracking-tight">{theme.name}</p>
              <div className="flex gap-1 mt-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.colors.primary }}></div>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.colors.hover }}></div>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.colors.light }}></div>
              </div>
              {selectedTheme === theme.id && (
                <div className="absolute top-2 right-2">
                  <span className="text-[9px] font-semibold text-primary bg-primary-light px-2 py-1 rounded-full uppercase">Active</span>
                </div>
              )}
            </button>
          ))}
        </div>

        {isSuperAdmin && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={pushToAllOrgs}
                onChange={(e) => setPushToAllOrgs(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-amber-900">
                Push this theme to all existing organizations
              </span>
            </label>
            <p className="text-xs text-amber-700 mt-1 ml-7">
              When checked, the selected theme will be immediately applied to every organization.
              Otherwise, organizations without their own theme will fall back to this platform default
              on their next setting read.
            </p>
          </div>
        )}

        <div className="mt-6 p-4 bg-slate-50 rounded-2xl">
          <p className="text-xs text-slate-500">
            {isSuperAdmin ? (
              <>
                <strong>Note:</strong> This sets the <strong>platform-wide default</strong> accent color.
                Individual organization admins can override this with their own theme via their admin panel.
                Users can still choose their own light/dark mode preference.
              </>
            ) : (
              <>
                <strong>Note:</strong> This sets the global accent color for the entire organization.
                All users will see the updated theme. Users can still choose their own light/dark mode preference.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AppearanceManagement;
