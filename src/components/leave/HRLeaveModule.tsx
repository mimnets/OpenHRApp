
import React, { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw, X, ArrowRight, FileCheck, Ban, Plus, List, Clock } from 'lucide-react';
import { hrService } from '../../services/hrService';
import { LeaveRequest } from '../../types';
import AdminLeaveFormModal from './AdminLeaveFormModal';
import AdminAllLeaves from './AdminAllLeaves';

interface Props {
  user: any;
  requests: LeaveRequest[];
  onRefresh: () => void;
  readOnly?: boolean;
}

type Tab = 'pending' | 'all';

export const HRLeaveModule: React.FC<Props> = ({ requests, onRefresh, readOnly = false }) => {
  const [showVerify, setShowVerify] = useState<LeaveRequest | null>(null);
  const [remarks, setRemarks] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('pending');

  // Admin CRUD state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTarget, setEditTarget] = useState<LeaveRequest | null>(null);
  const [employees, setEmployees] = useState<{ id: string; name: string; department: string }[]>([]);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const emps = await hrService.getEmployees();
        setEmployees(emps.map(e => ({ id: e.id, name: e.name, department: e.department })));
      } catch { /* ignore */ }
    };
    loadEmployees();
  }, []);

  const pendingHR = requests.filter(r => r.status === 'PENDING_HR');
  const pendingCount = requests.filter(r => r.status === 'PENDING_HR' || r.status === 'PENDING_MANAGER').length;

  const handleVerify = async (action: 'APPROVED' | 'REJECTED') => {
    if (!showVerify || readOnly) return;
    setIsProcessing(true);
    try {
      await hrService.updateLeaveStatus(showVerify.id, action, remarks, 'HR');
      onRefresh();
      setShowVerify(null);
      setRemarks('');
    } catch (e) { alert("Verification failed"); }
    finally { setIsProcessing(false); }
  };

  const handleFormSaved = () => {
    setShowCreateModal(false);
    setEditTarget(null);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-900">HR Administration</h3>
          <p className="text-xs font-bold text-slate-400 mt-1">Manage, verify, and administrate all leave records</p>
        </div>
        <div className="flex items-center gap-3">
          {!readOnly && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-indigo-700 transition-all"
            >
              <Plus size={16} /> Create Leave
            </button>
          )}
          <button onClick={onRefresh} className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-400 hover:text-primary transition-colors">
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'pending'
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'bg-white border border-slate-100 text-slate-400 hover:text-slate-600'
          }`}
        >
          <Clock size={14} /> Pending Approval
          {pendingCount > 0 && (
            <span className={`ml-1 px-2 py-0.5 rounded-full text-[9px] font-black ${
              activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
            }`}>{pendingCount}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'all'
              ? 'bg-slate-800 text-white shadow-lg'
              : 'bg-white border border-slate-100 text-slate-400 hover:text-slate-600'
          }`}
        >
          <List size={14} /> All Leaves
          <span className={`ml-1 px-2 py-0.5 rounded-full text-[9px] font-black ${
            activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
          }`}>{requests.length}</span>
        </button>
      </div>

      {/* Pending HR Tab (original verification flow) */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
          <div className="space-y-4">
            {pendingHR.map(req => (
              <div key={req.id} className="p-6 rounded-[2rem] bg-emerald-50/50 border border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:bg-white hover:shadow-lg transition-all">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-sm border border-emerald-500">
                    {req.employeeName[0]}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 uppercase tracking-tighter text-lg">{req.employeeName}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1"><ShieldCheck size={10} /> Manager Approved</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{req.type}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => !readOnly && setShowVerify(req)}
                  disabled={readOnly}
                  className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 ${
                    readOnly
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  Verify <ArrowRight size={14}/>
                </button>
              </div>
            ))}

            {/* Pending Manager leaves — admin can also review these */}
            {requests.filter(r => r.status === 'PENDING_MANAGER').map(req => (
              <div key={req.id} className="p-6 rounded-[2rem] bg-orange-50/50 border border-orange-100 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:bg-white hover:shadow-lg transition-all">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-sm border border-orange-400">
                    {req.employeeName[0]}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 uppercase tracking-tighter text-lg">{req.employeeName}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1"><Clock size={10} /> Awaiting Manager</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{req.type}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => !readOnly && setShowVerify(req)}
                  disabled={readOnly}
                  className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 ${
                    readOnly
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-orange-500 text-white hover:bg-orange-600'
                  }`}
                >
                  Review <ArrowRight size={14}/>
                </button>
              </div>
            ))}

            {pendingCount === 0 && (
              <div className="text-center py-16">
                <FileCheck size={48} className="text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-black uppercase text-xs tracking-widest">All Clear</p>
                <p className="text-slate-300 text-[10px] font-bold mt-1">No requests waiting for approval.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* All Leaves Tab */}
      {activeTab === 'all' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
          <AdminAllLeaves
            requests={requests}
            onEdit={(leave) => setEditTarget(leave)}
            onRefresh={onRefresh}
            readOnly={readOnly}
          />
        </div>
      )}

      {/* Original HR Verification Modal */}
      {showVerify && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in">
            <div className={`p-8 ${showVerify.status === 'PENDING_MANAGER' ? 'bg-orange-500' : 'bg-emerald-600'} text-white flex justify-between items-center`}>
              <div className="flex items-center gap-3"><ShieldCheck size={20}/><h3 className="text-lg font-black uppercase tracking-tight">{showVerify.status === 'PENDING_MANAGER' ? 'Admin Override' : 'Final Verification'}</h3></div>
              <button onClick={() => setShowVerify(null)} className="hover:bg-white/10 p-2 rounded-lg transition-colors"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-3">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</p>
                  <p className="text-sm font-black text-slate-800">{showVerify.employeeName}</p>
                </div>
                <div className="w-full h-px bg-slate-200"></div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</p>
                    <p className="text-xs font-bold text-slate-700">{showVerify.type}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</p>
                    <p className="text-xs font-bold text-slate-700">{showVerify.totalDays} Day(s)</p>
                  </div>
                </div>
                <div className="w-full h-px bg-slate-200"></div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dates</p>
                  <p className="text-xs font-bold text-slate-700">{showVerify.startDate?.split(' ')[0]} — {showVerify.endDate?.split(' ')[0]}</p>
                </div>
                <div className="w-full h-px bg-slate-200"></div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">User Reason</p>
                  <p className="text-xs font-bold text-slate-700">"{showVerify.reason}"</p>
                </div>
                {showVerify.status === 'PENDING_HR' && (
                  <>
                    <div className="w-full h-px bg-slate-200"></div>
                    <div>
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Manager's Evaluation</p>
                      <p className="text-xs font-bold text-slate-700">"{showVerify.managerRemarks || "Approved without remarks"}"</p>
                    </div>
                  </>
                )}
                {showVerify.status === 'PENDING_MANAGER' && (
                  <>
                    <div className="w-full h-px bg-slate-200"></div>
                    <div className="p-3 bg-orange-50 rounded-xl border border-orange-100">
                      <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Skipping Manager Workflow</p>
                      <p className="text-[10px] font-bold text-orange-500 mt-0.5">This leave will be directly approved/rejected by admin.</p>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Admin Remarks (Optional)</p>
                <textarea placeholder="Document any adjustments or compliance notes..." className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold min-h-[100px] outline-none focus:ring-4 focus:ring-emerald-50 transition-all" value={remarks} onChange={e => setRemarks(e.target.value)} />
              </div>

              <div className="flex gap-4 pt-2">
                <button disabled={isProcessing} onClick={() => handleVerify('REJECTED')} className="flex-1 py-4 bg-rose-50 text-rose-600 rounded-[2rem] font-black uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-rose-100 transition-colors">
                  <Ban size={16}/> Decline
                </button>
                <button disabled={isProcessing} onClick={() => handleVerify('APPROVED')} className="flex-[1.5] py-4 bg-emerald-600 text-white rounded-[2rem] font-black uppercase text-[10px] shadow-xl flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors">
                  {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : <FileCheck size={16} />} Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <AdminLeaveFormModal
          mode="create"
          employees={employees}
          onClose={() => setShowCreateModal(false)}
          onSaved={handleFormSaved}
        />
      )}

      {/* Edit Modal */}
      {editTarget && (
        <AdminLeaveFormModal
          mode="edit"
          leave={editTarget}
          employees={employees}
          onClose={() => setEditTarget(null)}
          onSaved={handleFormSaved}
        />
      )}
    </div>
  );
};
