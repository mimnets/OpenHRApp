
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
  AlertCircle,
  LocateFixed
} from 'lucide-react';
import { hrService } from '../services/hrService';
import { OFFICE_LOCATIONS } from '../constants.tsx';
import { Attendance as AttendanceType, AppConfig } from '../types';

interface AttendanceProps {
  user: any;
  autoStart?: 'OFFICE' | 'FACTORY' | 'FINISH';
  onFinish?: () => void;
}

const Attendance: React.FC<AttendanceProps> = ({ user, autoStart, onFinish }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [activeRecord, setActiveRecord] = useState<AttendanceType | undefined>(undefined);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [dutyType, setDutyType] = useState<'OFFICE' | 'FACTORY'>('OFFICE');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  const detectLocation = useCallback((force: boolean = false) => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        let matchedOffice = "Remote Area";
        for (const office of OFFICE_LOCATIONS) {
           if (Math.abs(office.lat - lat) < 0.005 && Math.abs(office.lng - lng) < 0.005) {
              matchedOffice = office.name;
              break;
           }
        }
        setLocation({ lat, lng, address: matchedOffice });
        setIsLocating(false);
      },
      (err) => {
        console.error("Location error", err);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: force ? 0 : 60000 }
    );
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [active, config] = await Promise.all([
        hrService.getActiveAttendance(user.id),
        hrService.getConfig()
      ]);
      
      if (active && active.date !== today) {
        setActiveRecord(undefined); 
      } else {
        setActiveRecord(active);
      }
      
      setAppConfig(config);
      return active;
    } catch (e: any) {
      console.error('Data sync failed', e);
    }
  }, [user.id]);

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

  const enterCameraMode = useCallback((type: 'OFFICE' | 'FACTORY') => {
    setDutyType(type);
    // Performance: Start Camera and GPS in parallel
    startCamera('user');
    setFacingMode('user');
    detectLocation(true);
  }, [facingMode]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const initData = async () => {
      setIsInitialLoading(true);
      
      // Fire parallel requests for speed
      const activePromise = refreshData();
      detectLocation(); // non-blocking geolocation call
      
      const active = await activePromise;
      
      if (autoStart === 'FINISH' && active) {
        enterCameraMode(active.dutyType || 'OFFICE');
      } else if (autoStart === 'OFFICE' || autoStart === 'FACTORY') {
        enterCameraMode(autoStart);
      } else {
        if (onFinish) onFinish();
      }
      
      setIsInitialLoading(false);
    };
    initData();
    return () => {
      clearInterval(timer);
      stopCamera();
    };
  }, [refreshData, autoStart]);

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

  const exitCameraMode = () => {
    stopCamera();
    if (onFinish) {
      onFinish();
    }
  };

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.error(e));
    }
  }, [stream]);

  const handlePunchSubmit = async () => {
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
        await hrService.updateAttendance(activeRecord.id, { checkOut: punchTime, remarks });
      } else {
        let punchStatus: AttendanceType['status'] = 'PRESENT';
        if (dutyType === 'OFFICE' && appConfig) {
          const [pH, pM] = punchTime.split(':').map(Number);
          const [sH, sM] = appConfig.officeStartTime.split(':').map(Number);
          const grace = appConfig.lateGracePeriod || 0;
          if ((pH * 60 + pM) > (sH * 60 + sM + grace)) punchStatus = 'LATE';
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
             
             <div className="mt-4 px-4 py-2 bg-black/60 backdrop-blur-md rounded-2xl flex items-center gap-2 pointer-events-auto cursor-pointer" onClick={() => detectLocation(true)}>
                <MapPin size={12} className={location ? "text-rose-400" : "text-white/40"} />
                <span className="text-[9px] font-black text-white uppercase tracking-wider">
                  {isLocating ? 'Locating...' : (location ? location.address : 'GPS Waiting')}
                </span>
                {location && !isLocating && <LocateFixed size={12} className="text-emerald-400" />}
             </div>
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
            disabled={!location || isLocating || status !== 'idle' || !stream || (dutyType === 'FACTORY' && !remarks.trim())}
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
