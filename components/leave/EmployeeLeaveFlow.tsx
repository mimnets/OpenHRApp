
import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Clock, AlertTriangle, Send, RefreshCw, X, AlertCircle, Info } from 'lucide-react';
import { employeeService } from '../../services/employeeService';
import { hrService } from '../../services/hrService';
import { LeaveBalance, LeaveRequest, Holiday, AppConfig } from '../../types';

interface Props {
  user: any;
  balance: LeaveBalance | null;
  history: LeaveRequest[];
  onRefresh: () => void;
  initialOpen?: boolean;
}

const EmployeeLeaveFlow: React.FC<Props> = ({ user, balance, history, onRefresh, initialOpen }) => {
  const [showForm, setShowForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ type: 'ANNUAL', start: '', end: '', reason: '' });
  
  // Smart Calculation State
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [calculatedDays, setCalculatedDays] = useState(0);
  const [calculationDetails, setCalculationDetails] = useState<string>('');

  useEffect(() => {
    if (initialOpen) {
      setShowForm(true);
    }
    // Fetch Metadata for calculation
    const loadMeta = async () => {
      const [hols, cfg] = await Promise.all([
        hrService.getHolidays(),
        hrService.getConfig()
      ]);
      setHolidays(hols);
      setConfig(cfg);
    };
    loadMeta();
  }, [initialOpen]);

  // Real-time calculation effect
  useEffect(() => {
    if (formData.start && formData.end && config) {
      const { days, details } = calculateNetDays(formData.start, formData.end);
      setCalculatedDays(days);
      setCalculationDetails(details);
    } else {
      setCalculatedDays(0);
      setCalculationDetails('');
    }
  }, [formData.start, formData.end, config, holidays]);

  const calculateNetDays = (startStr: string, endStr: string) => {
    if (!config) return { days: 0, details: '' };

    let count = 0;
    let holidaysFound = 0;
    let weekendsFound = 0;
    
    const cur = new Date(startStr);
    const stop = new Date(endStr);
    
    // Safety break for infinite loops if dates are crazy
    if (cur > stop) return { days: 0, details: 'Invalid Date Range' };

    // Clone to iterate
    const iterator = new Date(cur);

    while (iterator <= stop) {
      const dayName = iterator.toLocaleDateString('en-US', { weekday: 'long' });
      const dateStr = iterator.toISOString().split('T')[0];

      // 1. Check if it is a defined Working Day (e.g. is "Friday" in ["Monday", ...])
      const isWorkDay = config.workingDays.includes(dayName);

      // 2. Check if it matches a Public Holiday
      const isPublicHoliday = holidays.some(h => h.date === dateStr);

      if (!isWorkDay) {
        weekendsFound++;
      } else if (isPublicHoliday) {
        holidaysFound++;
      } else {
        count++; // Valid deductible day
      }

      iterator.setDate(iterator.getDate() + 1);
    }

    let detailStr = '';
    if (weekendsFound > 0) detailStr += `${weekendsFound} Weekend(s) excluded. `;
    if (holidaysFound > 0) detailStr += `${holidaysFound} Public Holiday(s) excluded.`;

    return { days: count, details: detailStr.trim() };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);
    
    if (calculatedDays <= 0) {
      setError("Net leave duration is 0 days. Check your dates (you might have selected only weekends or holidays).");
      setIsProcessing(false);
      return;
    }

    try {
      await employeeService.applyForLeave({
        type: formData.type as any,
        startDate: formData.start,
        endDate: formData.end,
        totalDays: calculatedDays,
        reason: formData.reason
      }, user);
      setShowForm(false);
      setFormData({ type: 'ANNUAL', start: '', end: '', reason: '' });
      onRefresh();
    } catch (err: any) {
      setError(err.message || "Submission failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black text-slate-900">My Leave Portal</h3>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl">
          <Plus size={18} /> New Request
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit mb-4"><Calendar size={24} /></div>
          <p className="text-4xl font-black text-slate-900 tabular-nums">{balance?.ANNUAL || 0} <span className="text-xs text-slate-400">Annual</span></p>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit mb-4"><Clock size={24} /></div>
          <p className="text-4xl font-black text-slate-900 tabular-nums">{balance?.CASUAL || 0} <span className="text-xs text-slate-400">Casual</span></p>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl w-fit mb-4"><AlertTriangle size={24} /></div>
          <p className="text-4xl font-black text-slate-900 tabular-nums">{balance?.SICK || 0} <span className="text-xs text-slate-400">Sick</span></p>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 p-8">
        <h4 className="font-black text-slate-900 mb-6 uppercase tracking-widest text-xs text-slate-400">Application History</h4>
        <div className="space-y-4">
          {history.map(req => (
            <div key={req.id} className="p-6 rounded-[32px] bg-slate-50 border border-slate-100 flex items-center justify-between hover:bg-white hover:shadow-lg transition-all">
              <div>
                <h4 className="font-black text-slate-900 uppercase tracking-tighter">{req.type} LEAVE</h4>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{req.startDate} — {req.endDate}</p>
              </div>
              <div className="text-right">
                 <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${req.status === 'APPROVED' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {req.status.replace('_', ' ')}
                </span>
                <p className="text-[9px] font-bold text-slate-300 mt-2">{req.totalDays} Day{req.totalDays !== 1 ? 's' : ''}</p>
              </div>
            </div>
          ))}
          {history.length === 0 && (
             <div className="text-center py-10">
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest">No leave history found.</p>
             </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in">
            <div className="p-8 bg-indigo-600 text-white flex justify-between items-center">
              <h3 className="text-xl font-black uppercase tracking-tight">Submit Leave</h3>
              <button onClick={() => setShowForm(false)}><X size={28} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-8">
              {error && <div className="p-4 bg-rose-50 text-rose-700 text-xs font-bold rounded-2xl flex gap-2"><AlertCircle size={16}/>{error}</div>}
              
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Leave Type</label>
                 <select className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl font-black text-sm outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="ANNUAL">Annual Leave</option><option value="CASUAL">Casual Leave</option><option value="SICK">Sick Leave</option>
                 </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Start Date</label>
                   <input type="date" required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl font-bold text-sm outline-none" value={formData.start} onChange={e => setFormData({...formData, start: e.target.value})} />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">End Date</label>
                   <input type="date" required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl font-bold text-sm outline-none" value={formData.end} onChange={e => setFormData({...formData, end: e.target.value})} />
                </div>
              </div>

              {/* Dynamic Calculation Feedback */}
              {formData.start && formData.end && (
                 <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-3xl flex items-start gap-3">
                    <Info size={20} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div>
                       <p className="text-indigo-900 font-black text-sm">Total Deductible: {calculatedDays} Day{calculatedDays !== 1 ? 's' : ''}</p>
                       {calculationDetails && <p className="text-[10px] font-bold text-indigo-500 mt-1">{calculationDetails}</p>}
                    </div>
                 </div>
              )}

              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Reason</label>
                 <textarea required placeholder="Reason for absence..." className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl font-bold text-sm min-h-[100px] outline-none" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} />
              </div>

              <button type="submit" disabled={isProcessing} className="w-full py-5 bg-indigo-600 text-white rounded-[32px] font-black uppercase tracking-widest text-[10px] shadow-xl flex items-center justify-center gap-2">
                 {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />} Send Application
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeLeaveFlow;
