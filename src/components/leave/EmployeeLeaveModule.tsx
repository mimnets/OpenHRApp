
import React, { useState, useEffect } from 'react';
import { Plus, Send, RefreshCw, X, AlertCircle, Info, Download } from 'lucide-react';
import { employeeService } from '../../services/employeeService';
import { hrService } from '../../services/hrService';
import { apiClient } from '../../services/api.client';
import { LeaveBalance, LeaveRequest, Holiday, AppConfig, Shift, CustomLeaveType } from '../../types';
import { DEFAULT_LEAVE_TYPES } from '../../constants';

const fetchImageAsDataUrl = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
};

const getScaledLogoDims = (dataUrl: string, maxSize: number): Promise<{ w: number; h: number }> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxSize / img.naturalWidth, maxSize / img.naturalHeight);
      resolve({ w: img.naturalWidth * ratio, h: img.naturalHeight * ratio });
    };
    img.onerror = () => resolve({ w: maxSize, h: maxSize });
    img.src = dataUrl;
  });

interface Props {
  user: any;
  balance: LeaveBalance | null;
  history: LeaveRequest[];
  onRefresh: () => void;
  initialOpen?: boolean;
  readOnly?: boolean;
}

const resolveWorkingDays = (config: AppConfig, employeeShift: Shift | null): string[] => {
  if (employeeShift) return employeeShift.workingDays;
  return config.workingDays || [];
};

const EmployeeLeaveModule: React.FC<Props> = ({ user, balance, history, onRefresh, initialOpen, readOnly = false }) => {
  const [showForm, setShowForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ type: 'ANNUAL', start: '', end: '', reason: '' });
  
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [employeeShift, setEmployeeShift] = useState<Shift | null>(null);
  const [calculatedDays, setCalculatedDays] = useState(0);
  const [calculationDetails, setCalculationDetails] = useState<string>('');
  const [leaveTypes, setLeaveTypes] = useState<CustomLeaveType[]>(DEFAULT_LEAVE_TYPES);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);

  useEffect(() => {
    if (initialOpen) setShowForm(true);
    const loadMeta = async () => {
      const [hols, cfg, lt] = await Promise.all([
        hrService.getHolidays(),
        hrService.getConfig(),
        hrService.getLeaveTypes(),
      ]);
      setHolidays(hols);
      setConfig(cfg);
      setLeaveTypes(lt);
      const shift = await hrService.resolveShiftForEmployee(user.id, user.shiftId);
      setEmployeeShift(shift);
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
  }, [formData.start, formData.end, config, holidays, employeeShift]);

  const calculateNetDays = (startStr: string, endStr: string) => {
    if (!config) return { days: 0, details: '' };
    const workingDays = resolveWorkingDays(config, employeeShift);
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
      const isWorkDay = workingDays.includes(dayName);
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
    return (balance[type] as number) || 0;
  };

  const generateLeavePdf = async (req: LeaveRequest) => {
    setGeneratingPdfId(req.id);
    try {
      // Fetch org info
      let orgName = '', orgAddress = '', logoDataUrl: string | null = null;
      try {
        const orgId = apiClient.getOrganizationId();
        if (orgId && apiClient.pb) {
          const org = await apiClient.pb.collection('organizations').getOne(orgId);
          orgName = org.name || '';
          orgAddress = org.address || '';
          if (org.logo) {
            const logoUrl = apiClient.pb.files.getURL(org, org.logo);
            logoDataUrl = await fetchImageAsDataUrl(logoUrl);
          }
        }
      } catch { /* proceed without org info */ }

      // Fetch manager name
      let managerName = 'N/A';
      try {
        if (req.lineManagerId && apiClient.pb) {
          const mgr = await apiClient.pb.collection('users').getOne(req.lineManagerId);
          managerName = mgr.name || 'N/A';
        }
      } catch { /* proceed with N/A */ }

      const jsPDFModule = await import('jspdf');
      const autoTableModule = await import('jspdf-autotable');
      const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF;
      if (autoTableModule.applyPlugin) autoTableModule.applyPlugin(jsPDF);

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 15;

      // Header: logo + org name + address
      const logoSize = 18;
      let textStartX = 14;
      if (logoDataUrl) {
        try {
          const logoDims = await getScaledLogoDims(logoDataUrl, logoSize);
          doc.addImage(logoDataUrl, 'PNG', 14, y - 4, logoDims.w, logoDims.h);
          textStartX = 14 + logoDims.w + 5;
        } catch { /* skip logo */ }
      }
      if (orgName) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(orgName, textStartX, y + 2);
        if (orgAddress) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.text(orgAddress, textStartX, y + 8);
        }
      }
      y += 20;

      // HR line
      doc.setDrawColor(200);
      doc.setLineWidth(0.5);
      doc.line(14, y, pageWidth - 14, y);
      y += 12;

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Leave Application', pageWidth / 2, y, { align: 'center' });
      y += 14;

      // Helper for sections
      const drawSection = (title: string, rows: [string, string][]) => {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 80);
        doc.text(title, 14, y);
        y += 2;
        doc.setDrawColor(220);
        doc.line(14, y, pageWidth - 14, y);
        y += 6;

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        rows.forEach(([label, value]) => {
          doc.setFont('helvetica', 'bold');
          doc.text(label + ':', 18, y);
          doc.setFont('helvetica', 'normal');
          const lines = doc.splitTextToSize(value || 'N/A', pageWidth - 70);
          doc.text(lines, 65, y);
          y += lines.length * 5 + 2;
        });
        y += 4;
      };

      // Applicant Info
      drawSection('Applicant Information', [
        ['Name', user.name || ''],
        ['Employee ID', user.employeeId || ''],
        ['Department', user.department || ''],
        ['Designation', user.designation || ''],
      ]);

      // Leave Details
      drawSection('Leave Details', [
        ['Type', req.type],
        ['Start Date', req.startDate],
        ['End Date', req.endDate],
        ['Total Days', String(req.totalDays)],
        ['Reason', req.reason || ''],
      ]);

      // Approval Status
      const statusLabel = req.status.replace('_', ' ');
      drawSection('Approval Status', [
        ['Status', statusLabel],
        ['Manager', managerName],
        ['Manager Remarks', req.managerRemarks || 'N/A'],
        ['Approver Remarks', req.approverRemarks || 'N/A'],
        ['Applied Date', req.appliedDate || ''],
      ]);

      // Signature lines at bottom
      const sigY = Math.max(y + 20, 250);
      doc.setDrawColor(0);
      doc.setLineWidth(0.3);
      // Employee signature
      doc.line(25, sigY, 90, sigY);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Employee Signature', 35, sigY + 5);
      doc.setFont('helvetica', 'bold');
      doc.text(user.name || '', 40, sigY + 10);
      // Manager signature
      doc.line(pageWidth - 90, sigY, pageWidth - 25, sigY);
      doc.setFont('helvetica', 'normal');
      doc.text('Manager/Approver Signature', pageWidth - 85, sigY + 5);
      doc.setFont('helvetica', 'bold');
      doc.text(managerName, pageWidth - 70, sigY + 10);

      doc.save(`Leave_Application_${req.type}_${req.startDate}.pdf`);
    } catch (err) {
      console.error('Failed to generate leave PDF', err);
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const balanceTypes = leaveTypes.filter(t => t.hasBalance);

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
      setFormData({ type: leaveTypes[0]?.id || 'ANNUAL', start: '', end: '', reason: '' });
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
        <h3 className="text-xl font-semibold text-slate-900">Personal Leave Dashboard</h3>
        <button
          onClick={() => setShowForm(true)}
          disabled={readOnly}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold uppercase tracking-widest text-[10px] shadow-xl transition-all ${
            readOnly
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
              : 'bg-primary text-white hover:bg-primary-hover'
          }`}
        >
          <Plus size={18} /> Apply Leave
        </button>
      </div>

      <div className={`grid grid-cols-1 gap-6 ${['','md:grid-cols-1','md:grid-cols-2','md:grid-cols-3','md:grid-cols-4'][Math.min(balanceTypes.length, 4)] || 'md:grid-cols-4'}`}>
        {balanceTypes.map(lt => (
          <div key={lt.id} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center gap-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{lt.name.replace(' Leave', '')}</p>
            <p className="text-4xl font-semibold text-primary">{getAvailableBalance(lt.id)}</p>
            <p className="text-[9px] font-bold text-slate-300 uppercase">Days Remaining</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-100 p-8">
        <h4 className="font-semibold text-slate-900 mb-6 uppercase tracking-widest text-xs text-slate-400">My Application History</h4>
        <div className="space-y-3">
          {history.map(req => (
            <div key={req.id} className="p-5 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white hover:shadow-md transition-all group">
              <div className="flex items-center gap-4">
                 <div className={`w-2 h-12 rounded-full flex-shrink-0 ${req.status === 'APPROVED' ? 'bg-emerald-500' : req.status === 'REJECTED' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                 <div>
                    <h4 className="font-semibold text-slate-800 text-sm uppercase leading-tight">{req.type} Leave</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{req.startDate} — {req.endDate}</p>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-3 py-1 rounded-lg text-[9px] font-semibold uppercase whitespace-nowrap ${req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : req.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                    {req.status.replace('_', ' ')}
                  </span>
                  <p className="text-[10px] font-bold text-slate-400">{req.totalDays} Day{req.totalDays !== 1 ? 's' : ''}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); generateLeavePdf(req); }}
                  disabled={generatingPdfId === req.id}
                  className="p-2 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/10 transition-all disabled:opacity-50"
                  title="Download PDF"
                >
                  {generatingPdfId === req.id ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                </button>
              </div>
            </div>
          ))}
          {history.length === 0 && <p className="text-center text-slate-400 text-xs font-semibold uppercase tracking-widest py-8">No applications found.</p>}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in">
            <div className="p-8 bg-primary text-white flex justify-between items-center">
              <h3 className="text-lg font-semibold uppercase tracking-tight">New Leave Request</h3>
              <button onClick={() => setShowForm(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {error && <div className="p-4 bg-rose-50 text-rose-700 text-xs font-bold rounded-2xl flex gap-2"><AlertCircle size={16}/>{error}</div>}
              
              <div className="space-y-1">
                 <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Leave Type</label>
                 <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    {leaveTypes.filter(t => t.hasBalance).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                 </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Start Date</label>
                   <input type="date" required className="w-full px-3 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none" value={formData.start} onChange={e => setFormData({...formData, start: e.target.value})} />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">End Date</label>
                   <input type="date" required className="w-full px-3 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none" value={formData.end} onChange={e => setFormData({...formData, end: e.target.value})} />
                </div>
              </div>

              {formData.start && formData.end && (
                 <div className={`p-4 border rounded-2xl flex items-center gap-3 ${calculatedDays > getAvailableBalance(formData.type) ? 'bg-rose-50 border-rose-100' : 'bg-primary-light border-primary-light'}`}>
                    <Info size={18} className={calculatedDays > getAvailableBalance(formData.type) ? 'text-rose-500' : 'text-primary'} />
                    <div>
                       <p className={`font-semibold text-xs ${calculatedDays > getAvailableBalance(formData.type) ? 'text-rose-900' : 'text-primary'}`}>Net Days: {calculatedDays}</p>
                       <p className="text-[9px] font-bold text-slate-500">{calculationDetails}</p>
                    </div>
                 </div>
              )}

              <div className="space-y-1">
                 <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Reason</label>
                 <textarea required placeholder="Explain reason..." className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm min-h-[100px] outline-none" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} />
              </div>

              <button type="submit" disabled={isProcessing || calculatedDays > getAvailableBalance(formData.type)} className="w-full py-5 bg-primary text-white rounded-xl font-semibold uppercase tracking-widest text-[10px] shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-primary-hover transition-all">
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
