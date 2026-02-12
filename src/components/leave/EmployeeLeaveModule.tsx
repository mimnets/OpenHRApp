
import React, { useState, useEffect } from 'react';
import { Plus, Send, RefreshCw, X, AlertCircle, Info } from 'lucide-react';
import { employeeService } from '../../services/employeeService';
import { hrService } from '../../services/hrService';
import { LeaveBalance, LeaveRequest, Holiday, AppConfig } from '../../types';

interface Props {
  user: any;
  balance: LeaveBalance | null;
  history: LeaveRequest[];
  onRefresh: () => void;
  initialOpen?: boolean;
  readOnly?: boolean;
}

const EmployeeLeaveModule: React.FC<Props> = ({ user, balance, history, onRefresh, initialOpen, readOnly = false }) => {
  const [showForm, setShowForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ type: 'ANNUAL', start: '', end: '', reason: '' });
  
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [calculatedDays, setCalculatedDays] = useState(0);
  const [calculationDetails, setCalculationDetails] = useState<string>('');

  useEffect(() => {
    if (initialOpen) setShowForm(true);
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
    let weekendsFound = 0;
    let holidaysFound = 0;
    const cur = new Date(startStr);
    const stop = new Date(endStr);
    
    if (cur > stop) return { days: 0, details: 'Invalid Date Range' };

    const iterator = new Date(cur);
    while (iterator <= stop) {
      const dayName = iterator.toLocaleDateString('en-US', { weekday: 'long' });
      const dateStr = iterator.toISOString().split('T')[0];
      const isWorkDay = config.workingDays.includes(dayName);
      const isPublicHoliday = holidays.some(h => h.date === dateStr);

      if (!isWorkDay) weekendsFound++;
      else if (isPublicHoliday) holidaysFound++;
      else count++;
      iterator.setDate(iterator.getDate() + 1);
    }

    let detailStr = '';
    if (weekendsFound > 0) detailStr += `${weekendsFound} Weekend(s) excluded. `;
    if (holidaysFound > 0) detailStr += `${holidaysFound} Holiday(s) excluded.`;
    return { days: count, details: detailStr.trim() };
  };

  const getAvailableBalance = (type: string) => {
    if (!balance) return 0;
    const key = type as keyof Pick<LeaveBalance, 'ANNUAL' | 'CASUAL' | 'SICK'>;
    return balance[key] || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);
    
    if (calculatedDays <= 0) {
      setError("Net leave duration is 0 days.");
      setIsProcessing(false);
      return;
    }
    const currentAvailable = getAvailableBalance(formData.type);
    if (calculatedDays > currentAvailable) {
      setError(`Insufficient Balance. Available: ${currentAvailable} days.`);
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black text-slate-900">Personal Leave Dashboard</h3>
        <button
          onClick={() => setShowForm(true)}
          disabled={readOnly}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl transition-all ${
            readOnly
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          <Plus size={18} /> Apply Leave
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center gap-2">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Annual</p>
          <p className="text-4xl font-black text-indigo-600">{balance?.ANNUAL || 0}</p>
          <p className="text-[9px] font-bold text-slate-300 uppercase">Days Remaining</p>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center gap-2">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Casual</p>
          <p className="text-4xl font-black text-emerald-600">{balance?.CASUAL || 0}</p>
          <p className="text-[9px] font-bold text-slate-300 uppercase">Days Remaining</p>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center gap-2">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sick</p>
          <p className="text-4xl font-black text-rose-600">{balance?.SICK || 0}</p>
          <p className="text-[9px] font-bold text-slate-300 uppercase">Days Remaining</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8">
        <h4 className="font-black text-slate-900 mb-6 uppercase tracking-widest text-xs text-slate-400">My Application History</h4>
        <div className="space-y-3">
          {history.map(req => (
            <div key={req.id} className="p-5 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white hover:shadow-md transition-all group">
              <div className="flex items-center gap-4">
                 <div className={`w-2 h-12 rounded-full flex-shrink-0 ${req.status === 'APPROVED' ? 'bg-emerald-500' : req.status === 'REJECTED' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                 <div>
                    <h4 className="font-black text-slate-800 text-sm uppercase leading-tight">{req.type} Leave</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{req.startDate} — {req.endDate}</p>
                 </div>
              </div>
              <div className="flex items-center justify-between w-full sm:w-auto sm:flex-col sm:items-end pl-6 sm:pl-0 sm:gap-1">
                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase whitespace-nowrap ${req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : req.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                  {req.status.replace('_', ' ')}
                </span>
                <p className="text-[10px] font-bold text-slate-400">{req.totalDays} Day{req.totalDays !== 1 ? 's' : ''}</p>
              </div>
            </div>
          ))}
          {history.length === 0 && <p className="text-center text-slate-400 text-xs font-black uppercase tracking-widest py-8">No applications found.</p>}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in">
            <div className="p-8 bg-indigo-600 text-white flex justify-between items-center">
              <h3 className="text-lg font-black uppercase tracking-tight">New Leave Request</h3>
              <button onClick={() => setShowForm(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {error && <div className="p-4 bg-rose-50 text-rose-700 text-xs font-bold rounded-2xl flex gap-2"><AlertCircle size={16}/>{error}</div>}
              
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Leave Type</label>
                 <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="ANNUAL">Annual Leave</option><option value="CASUAL">Casual Leave</option><option value="SICK">Sick Leave</option>
                 </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Start Date</label>
                   <input type="date" required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none" value={formData.start} onChange={e => setFormData({...formData, start: e.target.value})} />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">End Date</label>
                   <input type="date" required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none" value={formData.end} onChange={e => setFormData({...formData, end: e.target.value})} />
                </div>
              </div>

              {formData.start && formData.end && (
                 <div className={`p-4 border rounded-2xl flex items-center gap-3 ${calculatedDays > getAvailableBalance(formData.type) ? 'bg-rose-50 border-rose-100' : 'bg-indigo-50 border-indigo-100'}`}>
                    <Info size={18} className={calculatedDays > getAvailableBalance(formData.type) ? 'text-rose-500' : 'text-indigo-500'} />
                    <div>
                       <p className={`font-black text-xs ${calculatedDays > getAvailableBalance(formData.type) ? 'text-rose-900' : 'text-indigo-900'}`}>Net Days: {calculatedDays}</p>
                       <p className="text-[9px] font-bold text-slate-500">{calculationDetails}</p>
                    </div>
                 </div>
              )}

              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Reason</label>
                 <textarea required placeholder="Explain reason..." className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm min-h-[100px] outline-none" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} />
              </div>

              <button type="submit" disabled={isProcessing || calculatedDays > getAvailableBalance(formData.type)} className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-xl flex items-center justify-center gap-2 disabled:opacity-50">
                 {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />} Submit Application
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeLeaveModule;
