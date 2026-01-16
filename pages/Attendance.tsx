// Add React to the import list to resolve namespace errors
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  MapPin, 
  Clock, 
  X, 
  LogOut, 
  RefreshCw, 
  History, 
  ShieldCheck, 
  CameraOff, 
  Activity, 
  Loader2,
  ChevronRight,
  CalendarCheck,
  UserMinus,
  Briefcase,
  Search,
  Edit2,
  Trash2,
  Save,
  Camera,
  Building2,
  Building
} from 'lucide-react';
import { hrService } from '../services/hrService';
import { OFFICE_LOCATIONS } from '../constants.tsx';
import { Attendance as AttendanceType, LeaveRequest, AppConfig } from '../types';

const Attendance: React.FC<{ user: any }> = ({ user }) => {
  const isAdmin = user.role === 'ADMIN' || user.role === 'HR';
  const [currentTab, setCurrentTab] = useState<'STATION' | 'ACTIVITY'>(isAdmin ? 'ACTIVITY' : 'STATION');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [status, setStatus] = useState<'idle' | 'pushed' | 'loading'>('idle');
  const [activeRecord, setActiveRecord] = useState<AttendanceType | undefined>(undefined);
  const [allAttendance, setAllAttendance] = useState<AttendanceType[]>([]);
  const [userLeaves, setUserLeaves] = useState<LeaveRequest[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [remarks, setRemarks] = useState('');
  const [dutyType, setDutyType] = useState<'OFFICE' | 'FACTORY'>('OFFICE');
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [previewSelfie, setPreviewSelfie] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  // Admin Search/Edit states
  const [adminSearch, setAdminSearch] = useState('');
  const [editingRecord, setEditingRecord] = useState<AttendanceType | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const refreshData = useCallback(async () => {
    try {
      const [active, allAtt, allLeaves, config] = await Promise.all([
        hrService.getActiveAttendance(user.id),
        hrService.getAttendance(),
        hrService.getLeaves(),
        hrService.getConfig()
      ]);
      
      setActiveRecord(active);
      setAllAttendance(allAtt);
      setUserLeaves(allLeaves.filter(l => l.employeeId === user.id));
      setAppConfig(config);
      setDataError(null);
    } catch (e: any) {
      setDataError('Failed to sync records');
    }
  }, [user.id]);

  const analytics = useMemo(() => {
    const userRecords = allAttendance.filter(a => a.employeeId === user.id);
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthlyRecords = userRecords.filter(a => {
      const d = new Date(a.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    return {
      present: monthlyRecords.filter(a => a.status === 'PRESENT').length,
      late: monthlyRecords.filter(a => a.status === 'LATE').length,
      absent: monthlyRecords.filter(a => a.status === 'ABSENT').length,
      pendingLeaves: userLeaves.filter(l => l.status.startsWith('PENDING')).length,
      totalLeavesThisYear: userLeaves.filter(l => l.status === 'APPROVED' && new Date(l.startDate).getFullYear() === currentYear).reduce((acc, l) => acc + l.totalDays, 0),
      lastThreeDays: userRecords.slice(0, 3),
      personalHistory: userRecords.sort((a,b) => b.date.localeCompare(a.date))
    };
  }, [allAttendance, userLeaves, user.id]);

  const filteredAttendance = useMemo(() => {
    if (!isAdmin) return analytics.personalHistory;
    return allAttendance
      .filter(a => 
        (a.employeeName || '').toLowerCase().includes(adminSearch.toLowerCase()) ||
        (a.employeeId || '').toLowerCase().includes(adminSearch.toLowerCase()) ||
        (a.date || '').includes(adminSearch)
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [allAttendance, adminSearch, isAdmin, analytics.personalHistory]);

  const initCamera = useCallback(async () => {
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } } 
      });
      streamRef.current = stream;
      setCameraEnabled(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.warn("Video playback blocked", e));
        }
      }, 300);
    } catch (err: any) {
      setCameraError("Camera access required.");
      setCameraEnabled(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("No GPS");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        let matchedOffice = "Field Area";
        for (const office of OFFICE_LOCATIONS) {
           if (Math.abs(office.lat - lat) < 0.05 && Math.abs(office.lng - lng) < 0.05) {
              matchedOffice = office.name;
              break;
           }
        }
        setLocation({ lat, lng, address: matchedOffice });
        setLocationError(null);
      },
      () => setLocationError("GPS Signal Lost"),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const initData = async () => {
      setIsInitialLoading(true);
      await refreshData();
      detectLocation();
      if (currentTab === 'STATION') await initCamera();
      setIsInitialLoading(false);
    };
    initData();
    return () => { clearInterval(timer); stopCamera(); };
  }, [refreshData, detectLocation]);

  useEffect(() => {
    if (currentTab === 'STATION') initCamera();
    else stopCamera();
  }, [currentTab, initCamera, stopCamera]);

  const handlePunch = async () => {
    if (!location) { detectLocation(); return; }
    if (status === 'loading') return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!video || !canvas) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.translate(canvas.width, 0);
    ctx?.scale(-1, 1);
    ctx?.drawImage(video, 0, 0);
    const selfieData = canvas.toDataURL('image/jpeg', 0.9);

    setStatus('loading');
    try {
      const punchTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      
      if (activeRecord) {
        await hrService.updateAttendance(activeRecord.id, { checkOut: punchTime, remarks });
      } else {
        // LATE LOGIC:
        // Factory Duty is ALWAYS exempt from Late policy.
        // Office Duty counts as late if punchTime > officeStartTime + 5 mins.
        let punchStatus: AttendanceType['status'] = 'PRESENT';
        
        if (dutyType === 'OFFICE' && appConfig) {
          const [pH, pM] = punchTime.split(':').map(Number);
          const [sH, sM] = appConfig.officeStartTime.split(':').map(Number);
          const punchTotalMinutes = pH * 60 + pM;
          const startTotalMinutes = sH * 60 + sM;
          const threshold = 5; // Strict 5-minute threshold
          
          if (punchTotalMinutes > (startTotalMinutes + threshold)) {
            punchStatus = 'LATE';
          }
        }

        const finalRemarks = dutyType === 'FACTORY' 
          ? `[FACTORY VISIT: ${remarks}]` 
          : remarks;

        await hrService.saveAttendance({
          id: '', employeeId: user.id, employeeName: user.name, date: new Date().toISOString().split('T')[0],
          checkIn: punchTime, status: punchStatus, location, selfie: selfieData, remarks: finalRemarks
        });
      }
      await refreshData();
      setRemarks('');
      setStatus('pushed');
      setTimeout(() => setStatus('idle'), 2500);
    } catch (err: any) {
      setDataError(err.message);
      setStatus('idle');
    }
  };

  const handleAdminUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setStatus('loading');
    try {
      await hrService.updateAttendance(editingRecord.id, editingRecord);
      await refreshData();
      setEditingRecord(null);
    } finally {
      setStatus('idle');
    }
  };

  const handleAdminDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this attendance record?")) return;
    try {
      await hrService.deleteAttendance(id);
      await refreshData();
    } catch (e) { alert("Failed to delete."); }
  };

  const getStatusBadge = (s: AttendanceType['status']) => {
    const map: any = {
      'LATE': 'bg-amber-100 text-amber-700',
      'EARLY_OUT': 'bg-rose-100 text-rose-700',
      'PRESENT': 'bg-emerald-100 text-emerald-700',
      'ABSENT': 'bg-slate-100 text-slate-500',
      'LEAVE': 'bg-indigo-100 text-indigo-700'
    };
    return <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${map[s] || 'bg-slate-100 text-slate-500'}`}>{s}</span>;
  };

  if (isInitialLoading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={48} /></div>;

  return (
    <div className="h-full flex flex-col space-y-3 animate-in fade-in duration-500 overflow-hidden">
      <div className="flex p-1 bg-white border border-slate-100 rounded-xl shadow-sm self-center">
        <button 
          onClick={() => setCurrentTab('STATION')} 
          className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${currentTab === 'STATION' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}
        >
          <Camera size={12} /> Station
        </button>
        <button 
          onClick={() => setCurrentTab('ACTIVITY')} 
          className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${currentTab === 'ACTIVITY' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}
        >
          <Activity size={12} /> {isAdmin ? 'Organization' : 'Activity'}
        </button>
      </div>

      {currentTab === 'STATION' ? (
        <div className="flex-1 flex flex-col max-w-lg mx-auto w-full space-y-3 min-h-0 pt-1">
          {!activeRecord && (
            <div className="flex gap-2 p-1.5 bg-white border border-slate-100 rounded-2xl shadow-sm">
              <button 
                onClick={() => setDutyType('OFFICE')}
                className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all ${dutyType === 'OFFICE' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}
              >
                <Building size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Office Duty</span>
              </button>
              <button 
                onClick={() => setDutyType('FACTORY')}
                className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all ${dutyType === 'FACTORY' ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}
              >
                <Building2 size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Factory Visit</span>
              </button>
            </div>
          )}

          <div className={`relative flex-1 rounded-[2.5rem] overflow-hidden border-[6px] shadow-2xl transition-all duration-1000 ${activeRecord ? 'border-emerald-500/20 bg-emerald-950' : 'border-white bg-slate-900'} max-h-[48vh] sm:max-h-[52vh]`}>
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
              <div className="bg-black/40 backdrop-blur-lg border border-white/10 px-6 py-2 rounded-2xl text-white text-center">
                <p className="text-[7px] font-black uppercase tracking-[0.3em] opacity-40 mb-1">Live Sync Clock</p>
                <p className="text-xl font-black tabular-nums">{currentTime.toLocaleTimeString('en-US', { hour12: false })}</p>
              </div>
            </div>

            {cameraEnabled ? (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white/40">
                <CameraOff size={32} className="mb-2 opacity-20" />
                <p className="font-black uppercase tracking-widest text-[9px] mb-4">{cameraError || 'Camera Required'}</p>
                <button onClick={initCamera} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg">Restore Access</button>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
            
            {status === 'loading' && (
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md z-30 flex flex-col items-center justify-center text-white">
                <RefreshCw className="animate-spin mb-3 text-indigo-400" size={36} />
                <p className="font-black uppercase tracking-[0.2em] text-[10px]">Processing Biometric...</p>
              </div>
            )}
            
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none gap-2">
              <div className="bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full text-white">
                 <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                   <MapPin size={12} className={location ? 'text-emerald-400' : 'text-rose-400'} />
                   <span className="truncate max-w-[100px]">{location ? location.address : 'GPS Linking...'}</span>
                 </div>
              </div>
              <div className="bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 px-4 py-2 rounded-full text-emerald-400 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                <ShieldCheck size={12} /> Encrypted
              </div>
            </div>
          </div>

          <div className="space-y-3 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-xl">
            <div className="relative">
              <input 
                type="text"
                placeholder={dutyType === 'FACTORY' ? "Which Factory? (Required)" : "Session remarks (Optional)"}
                className={`w-full px-5 py-4 bg-slate-50 border rounded-2xl text-[12px] font-bold outline-none focus:ring-4 transition-all ${dutyType === 'FACTORY' ? 'border-amber-200 focus:ring-amber-50' : 'border-slate-100 focus:ring-indigo-50'}`}
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
              />
              {dutyType === 'FACTORY' && (
                <Building2 className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500 opacity-50" size={16} />
              )}
            </div>
            <button 
              onClick={handlePunch}
              disabled={!location || status !== 'idle' || !cameraEnabled || (dutyType === 'FACTORY' && !remarks && !activeRecord)}
              className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${
                activeRecord 
                  ? 'bg-rose-600 text-white shadow-rose-200' 
                  : dutyType === 'FACTORY' 
                    ? 'bg-amber-600 text-white shadow-amber-200' 
                    : 'bg-indigo-600 text-white shadow-indigo-200'
              } disabled:opacity-40`}
            >
              {activeRecord ? <LogOut size={16}/> : <CalendarCheck size={16}/>}
              {activeRecord ? 'Terminate Session' : dutyType === 'FACTORY' ? 'Start Factory Duty' : 'Authenticate Entry'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto no-scrollbar space-y-6 animate-in slide-in-from-bottom-8 duration-700">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm col-span-2 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><CalendarCheck size={20} /></div>
                <span className="text-[8px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Logged</span>
              </div>
              <div>
                <h4 className="text-3xl font-black text-slate-900 tabular-nums">{analytics.present}</h4>
                <p className="text-[8px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Days Present</p>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl w-fit mb-3"><Clock size={20} /></div>
              <div>
                <h4 className="text-2xl font-black text-slate-900 tabular-nums">{analytics.late}</h4>
                <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Late</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl w-fit mb-3"><UserMinus size={20} /></div>
              <div>
                <h4 className="text-2xl font-black text-slate-900 tabular-nums">{analytics.absent}</h4>
                <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Absent</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between col-span-2">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Briefcase size={20} /></div>
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">Balance</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <h4 className="text-2xl font-black text-slate-900 tabular-nums">{analytics.totalLeavesThisYear}</h4>
                   <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Approved</p>
                </div>
                <div>
                   <h4 className="text-2xl font-black text-slate-900 tabular-nums">{analytics.pendingLeaves}</h4>
                   <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Pending</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                  <History size={20} className="text-indigo-600" /> {isAdmin ? 'Global Workforce Audit' : 'My Session History'}
                </h3>
                {isAdmin && (
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search name, ID or date..."
                      className="w-full pl-12 pr-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                      value={adminSearch}
                      onChange={e => setAdminSearch(e.target.value)}
                    />
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                {filteredAttendance.map((h, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-3xl group hover:bg-white hover:shadow-xl transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white shadow-sm overflow-hidden flex items-center justify-center border border-slate-100 cursor-zoom-in group-hover:scale-105 transition-transform" onClick={() => h.selfie && setPreviewSelfie(h.selfie)}>
                        {h.selfie ? <img src={h.selfie} className="w-full h-full object-cover scale-x-[-1]" /> : <Clock size={16} className="text-slate-200" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                           <p className="text-xs font-black text-slate-900 tabular-nums">{new Date(h.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                           {isAdmin && <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-lg">{h.employeeName}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          {h.checkIn} — {h.checkOut || <span className="text-indigo-600 animate-pulse">Running</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {getStatusBadge(h.status)}
                      {isAdmin && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                           <button onClick={() => setEditingRecord(h)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl"><Edit2 size={14}/></button>
                           <button onClick={() => handleAdminDelete(h.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"><Trash2 size={14}/></button>
                        </div>
                      )}
                      <ChevronRight size={16} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}
                {filteredAttendance.length === 0 && (
                  <div className="py-24 text-center text-slate-300 font-black uppercase text-[11px] tracking-[0.2em]">
                    No workforce activity detected.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Edit Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[160] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in">
             <div className="bg-slate-900 p-8 flex justify-between items-center text-white">
                <div className="flex items-center gap-3">
                  <Edit2 size={20} className="text-indigo-400" />
                  <h3 className="text-sm font-black uppercase tracking-widest">Adjust Record</h3>
                </div>
                <button onClick={() => setEditingRecord(null)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={24}/></button>
             </div>
             <form onSubmit={handleAdminUpdate} className="p-10 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Check In</label>
                    <input type="time" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold" value={editingRecord.checkIn} onChange={e => setEditingRecord({...editingRecord, checkIn: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Check Out</label>
                    <input type="time" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold" value={editingRecord.checkOut} onChange={e => setEditingRecord({...editingRecord, checkOut: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Session Date</label>
                  <input type="date" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold" value={editingRecord.date} onChange={e => setEditingRecord({...editingRecord, date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Status Audit</label>
                  <select className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none" value={editingRecord.status} onChange={e => setEditingRecord({...editingRecord, status: e.target.value as any})}>
                    <option value="PRESENT">Standard Present</option>
                    <option value="LATE">Verified Late</option>
                    <option value="ABSENT">Unexcused Absent</option>
                    <option value="EARLY_OUT">Early Departure</option>
                  </select>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setEditingRecord(null)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-[2rem] font-black uppercase text-[10px] tracking-widest transition-all hover:bg-slate-200">Cancel</button>
                  <button type="submit" disabled={status === 'loading'} className="flex-1 py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all">
                    {status === 'loading' ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16}/>} Commit
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Selfie Preview */}
      {previewSelfie && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[200] flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300" onClick={() => setPreviewSelfie(null)}>
           <div className="max-w-xl w-full aspect-square rounded-[3rem] overflow-hidden border-8 border-white/10 shadow-2xl relative">
              <img src={previewSelfie} className="w-full h-full object-cover scale-x-[-1]" />
              <button className="absolute top-6 right-6 p-4 bg-black/60 text-white rounded-2xl hover:bg-white hover:text-black transition-all shadow-xl" onClick={() => setPreviewSelfie(null)}>
                <X size={24} />
              </button>
              <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
                 <div className="flex items-center gap-3 text-white">
                    <ShieldCheck className="text-emerald-400" />
                    <span className="font-black uppercase tracking-widest text-xs">Biometric Verification Proof</span>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;