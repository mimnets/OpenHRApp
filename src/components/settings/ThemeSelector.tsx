
import React from 'react';
import { Palette, Check } from 'lucide-react';
import { useTheme, THEMES } from '../../context/ThemeContext';

export const ThemeSelector: React.FC = () => {
  const { currentTheme, setTheme } = useTheme();

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-slate-50 rounded-2xl text-slate-600">
          <Palette size={24} />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900">Appearance</h3>
          <p className="text-xs font-bold text-slate-400">Customize your workspace interface</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {THEMES.map(theme => (
          <button
            key={theme.id}
            onClick={() => setTheme(theme.id)}
            className={`relative group p-4 rounded-3xl border-2 transition-all text-left hover:scale-[1.02] ${
              currentTheme.id === theme.id 
                ? 'border-slate-900 bg-slate-50' 
                : 'border-transparent bg-white hover:bg-slate-50 shadow-sm'
            }`}
          >
            <div className="h-20 w-full rounded-2xl mb-3 flex items-center justify-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.light} 100%)` }}>
               <div className="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md text-white">
                  {currentTheme.id === theme.id && <Check size={16} strokeWidth={4} />}
               </div>
            </div>
            <p className="font-black text-slate-800 text-xs uppercase tracking-tight">{theme.name}</p>
            <div className="flex gap-1 mt-2">
               <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.colors.primary }}></div>
               <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.colors.hover }}></div>
               <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.colors.light }}></div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
