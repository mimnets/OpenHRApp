
import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, DarkModePreference } from '../../context/ThemeContext';

const MODE_OPTIONS: { id: DarkModePreference; label: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
];

export const ThemeSelector: React.FC = () => {
  const { darkModePreference, setDarkModePreference } = useTheme();

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-slate-50 rounded-2xl text-slate-600">
          {darkModePreference === 'dark' ? <Moon size={24} /> : darkModePreference === 'light' ? <Sun size={24} /> : <Monitor size={24} />}
        </div>
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Appearance</h3>
          <p className="text-xs font-bold text-slate-400">Choose your preferred display mode</p>
        </div>
      </div>

      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Mode</p>
      <div className="flex gap-3">
        {MODE_OPTIONS.map(opt => (
          <button
            key={opt.id}
            onClick={() => setDarkModePreference(opt.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 font-bold text-sm transition-all ${
              darkModePreference === opt.id
                ? 'border-primary bg-primary-light/50 text-primary'
                : 'border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            <opt.icon size={18} />
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};
