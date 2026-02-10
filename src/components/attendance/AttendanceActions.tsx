
import React from 'react';
import { AlertCircle, RefreshCw, Fingerprint } from 'lucide-react';
import { Attendance } from '../../types';

interface Props {
  dutyType: 'OFFICE' | 'FACTORY';
  remarks: string;
  setRemarks: (val: string) => void;
  onSubmit: () => void;
  status: 'idle' | 'loading' | 'success';
  isDisabled: boolean;
  activeRecord?: Attendance;
}

export const AttendanceActions: React.FC<Props> = ({ 
  dutyType, remarks, setRemarks, onSubmit, status, isDisabled, activeRecord 
}) => {
  return (
    <div className="px-8 pt-4 pb-12 flex flex-col items-center gap-4">
      <div className="w-full max-w-[320px] space-y-2">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-1.5">
          {dutyType === 'FACTORY' && <AlertCircle size={10} className="text-emerald-500" />}
          {dutyType} {dutyType === 'FACTORY' && "(Mandatory)"}
        </p>
        <input 
          type="text"
          placeholder={dutyType === 'FACTORY' ? "Factory Name & Details..." : "Optional remarks..."}
          className={`w-full px-6 py-3.5 bg-white border rounded-2xl text-slate-700 text-xs font-bold placeholder:text-slate-300 outline-none shadow-sm transition-all ${dutyType === 'FACTORY' && !remarks ? 'border-emerald-200 bg-emerald-50/10' : 'border-slate-100'}`}
          value={remarks}
          onChange={e => setRemarks(e.target.value)}
        />
      </div>

      <div className="w-full max-w-[320px]">
        <button 
          onClick={onSubmit}
          disabled={isDisabled}
          className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.1em] text-[20px] shadow-xl shadow-primary-light transition-all active:scale-95 flex items-center justify-center gap-3 text-white disabled:opacity-20 bg-primary hover:bg-primary-hover`}
        >
          {status === 'loading' ? (
            <RefreshCw className="animate-spin" size={18}/> 
          ) : (
            <>
              <Fingerprint size={18} /> 
              {activeRecord ? 'Complete Session' : 'Begin Session'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
