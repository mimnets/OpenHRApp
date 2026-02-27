
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
    <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-[2.5rem] border border-slate-100 shadow-sm animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 mb-5 sm:mb-6">
        <div className="p-2.5 sm:p-3 bg-primary-light rounded-xl sm:rounded-2xl text-primary">
          {darkModePreference === 'dark' ? <Moon size={20} /> : darkModePreference === 'light' ? <Sun size={20} /> : <Monitor size={20} />}
        </div>
        <div>
          <h3 className="text-lg sm:text-xl font-semibold text-slate-900">Appearance</h3>
          <p className="text-[10px] sm:text-xs font-bold text-slate-400">Choose your preferred display mode</p>
        </div>
      </div>

      <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Mode</p>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {MODE_OPTIONS.map(opt => (
          <button
            key={opt.id}
            onClick={() => setDarkModePreference(opt.id)}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-3 rounded-xl sm:rounded-2xl border-2 font-bold text-xs sm:text-sm transition-all ${
              darkModePreference === opt.id
                ? 'border-primary bg-primary-light/50 text-primary'
                : 'border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            <opt.icon size={16} />
            <span className="truncate">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
