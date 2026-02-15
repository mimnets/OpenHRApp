
import React, { useState, useEffect } from 'react';
import { X, Send, RefreshCw, AlertCircle, UserPlus, Edit3 } from 'lucide-react';
import { hrService } from '../../services/hrService';
import { LeaveRequest } from '../../types';

interface Employee {
  id: string;
  name: string;
  department: string;
}

interface Props {
  mode: 'create' | 'edit';
  leave?: LeaveRequest | null;
  employees: Employee[];
  onClose: () => void;
  onSaved: () => void;
}

const LEAVE_TYPES = ['ANNUAL', 'CASUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'EARNED', 'UNPAID'];
const STATUS_OPTIONS = ['APPROVED', 'PENDING_MANAGER', 'PENDING_HR', 'REJECTED'];

const AdminLeaveFormModal: React.FC<Props> = ({ mode, leave, employees, onClose, onSaved }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [employeeId, setEmployeeId] = useState(leave?.employeeId || '');
  const [type, setType] = useState<string>(leave?.type || 'ANNUAL');
  const [startDate, setStartDate] = useState(leave?.startDate?.split(' ')[0] || '');
  const [endDate, setEndDate] = useState(leave?.endDate?.split(' ')[0] || '');
  const [reason, setReason] = useState(leave?.reason || '');
  const [status, setStatus] = useState<string>(leave?.status || 'APPROVED');
  const [remarks, setRemarks] = useState(leave?.approverRemarks || '');
  const [totalDays, setTotalDays] = useState(leave?.totalDays || 0);

  // Auto-calc total days (simple calendar diff — admin can override)
  useEffect(() => {
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (e >= s) {
        const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        setTotalDays(diff);
      }
    }
  }, [startDate, endDate]);

  const selectedEmployee = employees.find(e => e.id === employeeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'create' && !employeeId) {
      setError('Please select an employee.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Please select start and end dates.');
      return;
    }
    if (totalDays <= 0) {
      setError('Total days must be greater than 0.');
      return;
    }

    setIsProcessing(true);
    try {
      if (mode === 'create') {
        await hrService.adminCreateLeave({
          employeeId,
          employeeName: selectedEmployee?.name || '',
          type,
          startDate,
          endDate,
          totalDays,
          reason,
          status,
          remarks
        });
      } else if (leave) {
        await hrService.adminUpdateLeave(leave.id, {
          type,
          startDate,
          endDate,
          totalDays,
          reason,
          status,
          approverRemarks: remarks
        });
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const headerColor = mode === 'create' ? 'bg-indigo-600' : 'bg-amber-600';
  const HeaderIcon = mode === 'create' ? UserPlus : Edit3;
  const headerTitle = mode === 'create' ? 'Create Leave (Admin)' : 'Edit Leave (Admin)';
  const submitLabel = mode === 'create' ? 'Create Leave' : 'Save Changes';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in max-h-[90vh] flex flex-col">
        <div className={`p-8 ${headerColor} text-white flex justify-between items-center flex-shrink-0`}>
          <div className="flex items-center gap-3">
            <HeaderIcon size={20} />
            <h3 className="text-lg font-black uppercase tracking-tight">{headerTitle}</h3>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-lg transition-colors"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto">
          {error && (
            <div className="p-4 bg-rose-50 text-rose-700 text-xs font-bold rounded-2xl flex gap-2 items-start">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />{error}
            </div>
          )}

          {/* Employee Selector (create only) */}
          {mode === 'create' && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Employee</label>
              <select
                required
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
              >
                <option value="">— Select Employee —</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
                ))}
              </select>
            </div>
          )}

          {/* Edit mode: show employee name as read-only */}
          {mode === 'edit' && leave && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</p>
              <p className="text-sm font-black text-slate-800 mt-1">{leave.employeeName}</p>
            </div>
          )}

          {/* Leave Type */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Leave Type</label>
            <select
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
              value={type}
              onChange={e => setType(e.target.value)}
            >
              {LEAVE_TYPES.map(t => (
                <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()} Leave</option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Start Date</label>
              <input type="date" required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-50 transition-all" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">End Date</label>
              <input type="date" required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-50 transition-all" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          {/* Total Days (auto-calculated, editable override) */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Total Days</label>
            <input type="number" min={0} step={0.5} required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-50 transition-all" value={totalDays} onChange={e => setTotalDays(Number(e.target.value))} />
          </div>

          {/* Reason */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Reason</label>
            <textarea placeholder="Leave reason..." className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm min-h-[80px] outline-none focus:ring-4 focus:ring-indigo-50 transition-all" value={reason} onChange={e => setReason(e.target.value)} />
          </div>

          {/* Status */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Status</label>
            <select
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          {/* Remarks */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Admin Remarks</label>
            <textarea placeholder="Optional admin notes..." className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm min-h-[60px] outline-none focus:ring-4 focus:ring-indigo-50 transition-all" value={remarks} onChange={e => setRemarks(e.target.value)} />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isProcessing}
            className={`w-full py-5 ${headerColor} text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-all`}
          >
            {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />} {submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLeaveFormModal;
