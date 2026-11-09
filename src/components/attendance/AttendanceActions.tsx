
import React from 'react';
import { AlertCircle, RefreshCw, Fingerprint } from 'lucide-react';
import { Attendance } from '../../types';
import { AdFrame } from '../ads/AdBanner';

interface Props {
  dutyType: 'OFFICE' | 'FACTORY';
  dutyLabel?: string;
  remarks: string;
  setRemarks: (val: string) => void;
  onSubmit: () => void;
  status: 'idle' | 'loading' | 'success';
  isDisabled: boolean;
  activeRecord?: Attendance;
  canSkipLocation?: boolean;
  withoutLocation?: boolean;
  onToggleWithoutLocation?: () => void;
}

export const AttendanceActions: React.FC<Props> = ({
  dutyType, dutyLabel, remarks, setRemarks, onSubmit, status, isDisabled, activeRecord,
  canSkipLocation, withoutLocation, onToggleWithoutLocation
}) => {
  const displayLabel = dutyLabel || (dutyType === 'FACTORY' ? 'Factory' : 'Office');
  const remarksRequired = dutyType === 'FACTORY' || !!withoutLocation;
  const remarksPlaceholder = withoutLocation
    ? (dutyType === 'FACTORY' ? `${displayLabel} Name & why no location...` : 'Why is your location not available?')
    : (dutyType === 'FACTORY' ? `${displayLabel} Name & Details...` : 'Optional remarks...');

  return (
    <div className="px-8 pt-4 pb-12 flex flex-col items-center gap-4">
      {/* Cross-origin frame without camera/location permission; the remarks field keeps it away from the button. */}
      <div className="w-full max-w-[320px]">
        <AdFrame placement="attendance" />
      </div>
      {canSkipLocation && (
        <div className="w-full max-w-[320px] px-2 flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium text-slate-500 leading-snug">
            {withoutLocation ? 'This check-in will be flagged for HR. A reason is required.' : 'Location not working?'}
          </p>
          <button
            type="button"
            onClick={onToggleWithoutLocation}
            className="shrink-0 min-h-[44px] px-2 text-xs font-bold text-primary"
          >
            {withoutLocation ? 'Cancel' : 'Check in without location'}
          </button>
        </div>
      )}
      <div className="w-full max-w-[320px] space-y-2">
        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest px-2 flex items-center gap-1.5">
          {remarksRequired && <AlertCircle size={10} className="text-emerald-500" />}
          {displayLabel} {remarksRequired && "(Mandatory)"}
        </p>
        <input
          type="text"
          placeholder={remarksPlaceholder}
          className={`w-full px-6 py-3.5 bg-white border rounded-2xl text-slate-700 text-xs font-bold placeholder:text-slate-300 outline-none shadow-sm transition-all ${remarksRequired && !remarks ? 'border-emerald-200 bg-emerald-50/10' : 'border-slate-100'}`}
          value={remarks}
          onChange={e => setRemarks(e.target.value)}
        />
      </div>

      <div className="w-full max-w-[320px]">
        <button 
          onClick={onSubmit}
          disabled={isDisabled}
          className={`w-full py-4 rounded-2xl font-semibold uppercase tracking-[0.1em] text-[20px] shadow-xl shadow-primary-light transition-all active:scale-95 flex items-center justify-center gap-3 text-white disabled:opacity-20 bg-primary hover:bg-primary-hover`}
        >
          {status === 'loading' ? (
            <RefreshCw className="animate-spin" size={18}/> 
          ) : (
            <>
              <Fingerprint size={18} /> 
              {activeRecord ? 'Check Out' : 'Check In'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
