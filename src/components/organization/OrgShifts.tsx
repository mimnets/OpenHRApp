
import React from 'react';
import { Clock, Plus, Trash2, Edit, Star, CalendarClock, Users } from 'lucide-react';
import { Shift, ShiftOverride, Employee } from '../../types';

interface Props {
  shifts: Shift[];
  overrides: ShiftOverride[];
  employees: Employee[];
  onAddShift: () => void;
  onEditShift: (index: number) => void;
  onDeleteShift: (index: number) => void;
  onAddOverride: () => void;
  onDeleteOverride: (index: number) => void;
}

export const OrgShifts: React.FC<Props> = ({
  shifts, overrides, employees,
  onAddShift, onEditShift, onDeleteShift,
  onAddOverride, onDeleteOverride
}) => {
  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || 'Unknown';
  const getShiftName = (id: string) => shifts.find(s => s.id === id)?.name || 'Unknown Shift';
  const getAssignedCount = (shiftId: string) => employees.filter(e => e.shiftId === shiftId).length;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* Shifts Section */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 bg-primary text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Clock size={20} />
            <h3 className="text-sm font-black uppercase tracking-wider">Shift Definitions</h3>
          </div>
          <button onClick={onAddShift} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all">
            <Plus size={18} />
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {shifts.map((shift, i) => (
            <div key={shift.id} className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] space-y-4 group hover:bg-white hover:shadow-md transition-all relative">
              {shift.isDefault && (
                <div className="absolute top-4 right-4">
                  <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-600 rounded-full text-[8px] font-black uppercase tracking-widest">
                    <Star size={10} /> Default
                  </span>
                </div>
              )}
              <div>
                <h4 className="font-black text-slate-900 text-sm">{shift.name}</h4>
                <p className="text-[10px] font-bold text-slate-400 mt-1">
                  {shift.startTime} — {shift.endTime}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-2.5 rounded-xl border border-slate-100/50">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Late Grace</p>
                  <p className="text-xs font-black text-slate-700">{shift.lateGracePeriod} min</p>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-100/50">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Early Out</p>
                  <p className="text-xs font-black text-slate-700">{shift.earlyOutGracePeriod} min</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => {
                  const fullDay = { Mon:'Monday', Tue:'Tuesday', Wed:'Wednesday', Thu:'Thursday', Fri:'Friday', Sat:'Saturday', Sun:'Sunday' }[day]!;
                  const isActive = shift.workingDays.includes(fullDay);
                  return (
                    <span key={day} className={`text-[8px] font-black px-2 py-1 rounded-lg ${isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-300'}`}>
                      {day}
                    </span>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100/50">
                <div className="flex items-center gap-1 text-slate-400">
                  <Users size={12} />
                  <span className="text-[9px] font-bold">{getAssignedCount(shift.id)} assigned</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onEditShift(i)} className="p-1.5 text-slate-400 hover:text-primary"><Edit size={14}/></button>
                  <button onClick={() => onDeleteShift(i)} className="p-1.5 text-slate-400 hover:text-rose-500"><Trash2 size={14}/></button>
                </div>
              </div>
            </div>
          ))}
          {shifts.length === 0 && (
            <p className="col-span-full text-center text-slate-400 py-10 font-bold uppercase text-xs">
              No shifts configured. Click + to create your first shift.
            </p>
          )}
        </div>
      </div>

      {/* Overrides Section */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 bg-slate-800 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <CalendarClock size={20} />
            <h3 className="text-sm font-black uppercase tracking-wider">Temporary Shift Overrides</h3>
          </div>
          <button onClick={onAddOverride} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all">
            <Plus size={18} />
          </button>
        </div>
        <div className="p-6 space-y-3">
          {overrides.map((ov, i) => (
            <div key={ov.id} className="p-5 bg-slate-50 border border-slate-100 rounded-[2rem] flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-white transition-all">
              <div className="space-y-1">
                <h4 className="font-black text-slate-900 text-sm">{getEmployeeName(ov.employeeId)}</h4>
                <p className="text-[10px] font-bold text-primary">{getShiftName(ov.shiftId)}</p>
                <p className="text-[10px] font-bold text-slate-400">
                  {ov.startDate} to {ov.endDate}
                  {ov.reason && <span className="ml-2 text-slate-300">— {ov.reason}</span>}
                </p>
              </div>
              <button onClick={() => onDeleteOverride(i)} className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {overrides.length === 0 && (
            <p className="text-center text-slate-400 py-10 font-bold uppercase text-xs">
              No temporary overrides active.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
