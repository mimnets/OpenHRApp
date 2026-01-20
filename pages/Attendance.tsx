
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Clock, 
  LogOut, 
  RefreshCw, 
  History, 
  CameraOff, 
  Loader2,
  Building2,
  Building,
  ArrowLeft,
  CheckCircle2,
  Fingerprint,
  Flashlight,
  SwitchCamera,
  CalendarDays,
  ShieldCheck,
  MapPin,
  Scan,
  X,
  AlertCircle
} from 'lucide-react';
import { hrService } from '../services/hrService';
import { OFFICE_LOCATIONS } from '../constants.tsx';
import { Attendance as AttendanceType, AppConfig } from '../types';

const Attendance: React.FC<{ user: any }> = ({ user }) => {
  const [view, setView] = useState<'STATION' | 'CAMERA'>('STATION');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [activeRecord, setActiveRecord] = useState<AttendanceType | undefined>(undefined);
  const [allAttendance, setAllAttendance] = useState<AttendanceType[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [remarks, setRemarks] = useState('');
  const [dutyType, setDutyType] = useState<'OFFICE' | 'FACTORY'>('OFFICE');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  // Camera Controls
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Check mobile status
  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [active, allAtt, config] = await Promise.all([
        hrService.getActiveAttendance(user.id),
        hrService.getAttendance(),
        hrService.getConfig()
      ]);
      
      // Auto-Close/Stale Session Logic:
      // If the active record is from a previous day, we treat it as "ghosted"
      // User cannot Clock Out for a previous day session.
      if (active && active.date !== today) {
        setActiveRecord(undefined); 
      } else {
        setActiveRecord(active);
      }
      
      setAllAttendance(allAtt.filter(a => a.employeeId === user.id));
      setAppConfig(config);
    } catch (e: any) {
      console.error('Data sync failed', e);
    }
  }, [user.id]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const initData = async () => {
      setIsInitialLoading(true);
      await refreshData();
      detectLocation();
      setIsInitialLoading(false);
    };
    initData();
    return () => clearInterval(timer);
  }, [refreshData]);

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        let matchedOffice = "Remote Area";
        for (const office of OFFICE_LOCATIONS) {
           if (Math.abs(office.lat - lat) < 0.01 && Math.abs(office.lng - lng) < 0.01) {
              matchedOffice = office.name;
              break;
           }
        }
        setLocation({ lat, lng, address: matchedOffice });
      },
      null,
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    stopCamera();
    try {
      setCameraError(null);
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: mode, 
          width: { ideal: 1080 }, 
          height: { ideal: 1440 } 
        } 
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch (err: any) {
      setCameraError("Camera permission denied.");
    }
  };

  const toggleCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    setIsTorchOn(false);
    startCamera(nextMode);
  };

  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    const capabilities = (track as any).getCapabilities?.() || {};
    if (capabilities.torch) {
      try {
        await track.applyConstraints({ advanced: [{ torch: !isTorchOn } as any] });
        setIsTorchOn(!isTorchOn);
      } catch (e) { console.error(e); }
    }
  };

  const enterCameraMode = (type: 'OFFICE' | 'FACTORY') => {
    setDutyType(type);
    setView('CAMERA');
    startCamera('user');
    setFacingMode('user');
    detectLocation();
  };

  const exitCameraMode = () => {
    stopCamera();
    setView('STATION');
    setRemarks('');
    setStatus('idle');
  };

  useEffect(() => {
    if (view === 'CAMERA' && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.error(e));
    }
  }, [view, stream]);

  const handlePunchSubmit = async () => {
    // Validation for Factory Duty
    if (dutyType === 'FACTORY' && !remarks.trim()) {
      alert("Mandatory: Please mention the Factory Name and details in remarks.");
      return;
    }

    if (status !== 'idle' || !location || !stream) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!video || !canvas) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0);
    }
    const selfieData = canvas.toDataURL('image/jpeg', 0.8);

    setStatus('loading');
    try {
      const punchTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      const today = new Date().toISOString().split('T')[0];

      if (activeRecord && !activeRecord.checkOut) {
        // CLOCK OUT
        await hrService.updateAttendance(activeRecord.id, { checkOut: punchTime, remarks });
      } else {
        // CLOCK IN
        let punchStatus: AttendanceType['status'] = 'PRESENT';
        
        // Compliance Logic for Office Duty
        if (dutyType === 'OFFICE' && appConfig) {
          const [pH, pM] = punchTime.split(':').map(Number);
          const [sH, sM] = appConfig.officeStartTime.split(':').map(Number);
          const grace = appConfig.lateGracePeriod || 0;
          
          if ((pH * 60 + pM) > (sH * 60 + sM + grace)) {
            punchStatus = 'LATE';
          }
        }
        
        await hrService.saveAttendance({
          id: '', employeeId: user.id, employeeName: user.name, date: today,
          checkIn: punchTime, status: punchStatus, location, selfie: selfieData, 
          remarks: dutyType === 'FACTORY' ? `[FACTORY] ${remarks}` : remarks,
          dutyType: dutyType
        });
      }
      
      setStatus('success');
      await refreshData();
      setTimeout(() => exitCameraMode(), 1500);
    } catch (err) {
      setStatus('idle');
    }
  };

  if (isInitialLoading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  // -------------------- STATION VIEW (Dashboard) --------------------
  if (view === 'STATION') {
    return (
      <div className="flex-1 flex flex-col space-y-10 max-w-lg mx-auto w-full pb-24 animate-in fade-in duration-500 px-4">
        
        {/* Elegant Time Header */}
        <div className="text-center py-6 space-y-2">
          <p className="text-[9px] font-black uppercase text-slate-300 tracking-[0.4em]">Live Station Time</p>
          <div className="flex items-center justify-center gap-1">
            <h2 className="text-6xl font-black text-[#0f172a] tracking-tighter tabular-nums">
              {currentTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
            </h2>
            <div className="flex flex-col items-start -mt-1">
               <span className="text-2xl font-black text-indigo-600/20 tabular-nums">:{currentTime.toLocaleTimeString('en-US', { hour12: false, second: '2-digit' })}</span>
            </div>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            {currentTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
          </p>
        </div>

        {/* Dynamic Action Buttons */}
        <div className="space-y-4">
          <div className="flex gap-4 p-1.5 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm">
            <button 
              onClick={() => enterCameraMode('OFFICE')}
              className={`flex-1 h-16 rounded-[2rem] flex items-center justify-center gap-3 transition-all font-black uppercase text-[10px] tracking-widest ${activeRecord ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 active:scale-95'}`}
            >
              <Building size={16} /> Office
            </button>
            <button 
              onClick={() => enterCameraMode('FACTORY')}
              className={`flex-1 h-16 rounded-[2rem] flex items-center justify-center gap-3 transition-all font-black uppercase text-[10px] tracking-widest ${activeRecord ? 'bg-slate-100 text-slate-400' : 'bg-emerald-600 text-white shadow-xl shadow-emerald-100 active:scale-95'}`}
            >
              <Building2 size={16} /> Factory
            </button>
          </div>
          
          {activeRecord && (
            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-3xl flex items-center gap-4 animate-in slide-in-from-top-2">
              <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white"><Clock size={18}/></div>
              <div className="flex-1">
                 <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Session Running</p>
                 <p className="text-sm font-black text-blue-900 leading-none">Started at {activeRecord.checkIn} — {activeRecord.dutyType || 'Shift'}</p>
              </div>
              <button onClick={() => enterCameraMode(activeRecord.dutyType === 'FACTORY' ? 'FACTORY' : 'OFFICE')} className="px-5 py-2.5 bg-white text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">Clock Out</button>
            </div>
          )}
        </div>

        {/* Summaries */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shadow-inner"><Clock size={20} /></div>
            <div>
              <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Start</p>
              <p className="text-xl font-black text-slate-900 tabular-nums">{activeRecord?.checkIn || '--:--'}</p>
            </div>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center shadow-inner"><LogOut size={20} /></div>
            <div>
              <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">End</p>
              <p className="text-xl font-black text-slate-900 tabular-nums">{activeRecord?.checkOut || '--:--'}</p>
            </div>
          </div>
        </div>

        {/* Logs */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
             <History className="text-indigo-600" size={24} />
             <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">Today's Log</h3>
          </div>
          <div className="space-y-3">
            {allAttendance.slice(0, 3).map((item) => (
              <div key={item.id} className="bg-white p-5 rounded-[2.5rem] border border-slate-50 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-100 rounded-full flex-shrink-0 overflow-hidden ring-4 ring-white shadow-sm">
                    {item.selfie ? <img src={item.selfie} className="w-full h-full object-cover scale-x-[-1]" /> : <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-300 font-black text-xs uppercase">{item.employeeName?.[0]}</div>}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{new Date(item.date).toLocaleDateString('en-GB')}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.checkIn} — {item.checkOut || 'Active'}</p>
                  </div>
                </div>
                <span className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${item.status === 'LATE' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // -------------------- CAMERA VIEW (Separate Page) --------------------
  return (
    <div className="fixed inset-0 bg-[#fcfdfe] z-[9999] flex flex-col animate-in slide-in-from-bottom-6 duration-500 overflow-y-auto no-scrollbar">
      <div className="p-8 pt-16 flex flex-col items-center relative">
        <button onClick={exitCameraMode} className="absolute left-8 top-16 w-12 h-12 flex items-center justify-center bg-white shadow-xl text-slate-400 rounded-2xl active:scale-90 border border-slate-100"><ArrowLeft size={24} /></button>
        <div className="text-center space-y-1">
           <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{currentTime.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }).toUpperCase()}</p>
           <p className="text-5xl font-black text-[#0f172a] tabular-nums tracking-tighter">{currentTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 mt-4">
        <div className="relative w-full max-w-[360px] aspect-[4/5] rounded-[4rem] overflow-hidden bg-slate-900 shadow-2xl ring-[14px] ring-white">
          {stream ? (
            <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 text-white/40">
              {cameraError ? <><CameraOff size={48} className="text-rose-500 mb-4" /><p className="font-black uppercase text-[10px] tracking-widest">{cameraError}</p></> : <Loader2 size={48} className="text-indigo-500 animate-spin mb-4" />}
            </div>
          )}
          
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center pt-10">
             <div className="px-6 py-2.5 bg-emerald-500 rounded-full text-[10px] font-black text-white uppercase tracking-widest shadow-2xl flex items-center gap-2 ring-4 ring-emerald-500/20 animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                Face Detected
             </div>
             <div className="absolute inset-10 border-2 border-white/10 rounded-[4rem] border-dashed"></div>
          </div>

          {isMobile && (
            <>
              <button onClick={toggleTorch} className={`absolute top-8 left-8 w-11 h-11 backdrop-blur-md rounded-2xl flex items-center justify-center ${isTorchOn ? 'bg-amber-400 text-white' : 'bg-black/30 text-white'}`}><Flashlight size={18} /></button>
              <button onClick={toggleCamera} className="absolute top-8 right-8 w-11 h-11 bg-black/30 backdrop-blur-md rounded-2xl flex items-center justify-center text-white active:scale-90"><SwitchCamera size={18} /></button>
            </>
          )}

          {status === 'success' && (
            <div className="absolute inset-0 bg-emerald-600/95 flex flex-col items-center justify-center z-[1002] animate-in zoom-in">
              <div className="p-6 bg-white rounded-full shadow-2xl mb-6"><CheckCircle2 size={64} className="text-emerald-500 animate-bounce" /></div>
              <h3 className="text-2xl font-black text-white uppercase tracking-[0.2em]">Verified</h3>
            </div>
          )}
        </div>
      </div>

      <div className="p-10 pb-20 flex flex-col items-center gap-8">
        <div className="w-full max-w-[360px] space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
            {dutyType === 'FACTORY' && <AlertCircle size={10} className="text-emerald-500" />}
            {dutyType} / Remarks / Notes {dutyType === 'FACTORY' && "(Mandatory)"}
          </p>
          <input 
            type="text"
            placeholder={dutyType === 'FACTORY' ? "Mention factory name & details..." : "Optional remarks..."}
            className={`w-full px-8 py-5 bg-white border rounded-[2.5rem] text-slate-700 text-sm font-bold placeholder:text-slate-300 outline-none shadow-sm transition-all ${dutyType === 'FACTORY' && !remarks ? 'border-emerald-200 bg-emerald-50/10' : 'border-slate-100'}`}
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
          />
        </div>

        <div className="w-full max-w-[360px] flex flex-col items-center">
          <button 
            onClick={handlePunchSubmit}
            disabled={!location || status !== 'idle' || !stream || (dutyType === 'FACTORY' && !remarks.trim())}
            className={`w-full py-6 rounded-[2.5rem] font-black uppercase tracking-[0.15em] text-xs shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-4 text-white disabled:opacity-20 ${dutyType === 'FACTORY' ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-indigo-500 to-blue-600'}`}
          >
            {status === 'loading' ? <RefreshCw className="animate-spin" size={24}/> : <><Fingerprint size={24} /> {activeRecord ? 'Complete Session' : 'Begin Session'}</>}
          </button>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default Attendance;
