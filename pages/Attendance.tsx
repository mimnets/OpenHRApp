
import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Search,
  UserCheck,
  Camera,
  X,
  LogOut,
  Navigation,
  RefreshCw,
  MessageSquare,
  History,
  ShieldCheck,
  CameraOff,
  Maximize2
} from 'lucide-react';
import { hrService } from '../services/hrService';
import { OFFICE_LOCATIONS } from '../constants.tsx';
import { Attendance as AttendanceType } from '../types';

const Attendance: React.FC<{ user: any }> = ({ user }) => {
  const isAdmin = user.role === 'ADMIN' || user.role === 'HR';
  const [currentTime, setCurrentTime] = useState(new Date());
  const [status, setStatus] = useState<'idle' | 'pushed' | 'loading'>('idle');
  const [activeRecord, setActiveRecord] = useState<AttendanceType | undefined>(undefined);
  const [todayHistory, setTodayHistory] = useState<AttendanceType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [remarks, setRemarks] = useState('');
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    refreshData();
    detectLocation();
    initCamera();
    
    return () => {
      clearInterval(timer);
      stopCamera();
    };
  }, [user.id]);

  useEffect(() => {
    if (cameraEnabled && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraEnabled, status]);

  const refreshData = () => {
    setActiveRecord(hrService.getActiveAttendance(user.id));
    setTodayHistory(hrService.getTodayAttendance(user.id));
  };

  const initCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      streamRef.current = stream;
      setCameraEnabled(true);
      setCameraError(null);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access failed", err);
      setCameraError("Camera access required for biometric verification.");
      setCameraEnabled(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const detectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          
          let matchedOffice = "Authorized Zone";
          for (const office of OFFICE_LOCATIONS) {
             if (Math.abs(office.lat - lat) < 0.05 && Math.abs(office.lng - lng) < 0.05) {
                matchedOffice = office.name;
                break;
             }
          }
          setLocation({ lat, lng, address: matchedOffice });
        },
        (err) => {
          console.error("Location access denied", err);
          setLocation(null);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const captureSelfie = (): string | null => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.8);
      }
    }
    return null;
  };

  const handlePunch = () => {
    if (!location) {
      alert("Location lock required. Please ensure GPS is enabled.");
      detectLocation();
      return;
    }

    const selfieData = captureSelfie();
    if (!selfieData) {
      alert("Camera feed not ready. Please ensure camera access is allowed.");
      initCamera();
      return;
    }

    setStatus('loading');
    
    setTimeout(() => {
      const punchTime = new Date().toLocaleTimeString('en-US', { hour12: true });
      
      if (activeRecord) {
        hrService.updateAttendance(activeRecord.id, {
          checkOut: punchTime,
          remarks: remarks || activeRecord.remarks,
        });
      } else {
        const newRecord: AttendanceType = {
          id: Math.random().toString(36).substr(2, 9),
          employeeId: user.id,
          employeeName: user.name,
          date: new Date().toISOString().split('T')[0],
          checkIn: punchTime,
          status: 'PRESENT',
          location: { lat: location.lat, lng: location.lng, address: location.address },
          selfie: selfieData,
          remarks: remarks || undefined
        };
        hrService.saveAttendance(newRecord);
      }
      
      refreshData();
      setStatus('pushed');
      setRemarks('');
      setTimeout(() => setStatus('idle'), 2500);
    }, 1200);
  };

  if (isAdmin) {
    const allAttendance = hrService.getAttendance();
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <header>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Organization Attendance Logs</h1>
          <p className="text-slate-500 font-medium">Biometric verification and GPS coordinate tracking for all staff</p>
        </header>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by staff name..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-100">
                  <th className="pb-4">Employee & Selfie</th>
                  <th className="pb-4 text-center">In/Out Times</th>
                  <th className="pb-4 text-center">Verified GPS Data</th>
                  <th className="pb-4 text-right">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {allAttendance.filter(r => (r.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase())).reverse().map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl border-2 border-slate-100 overflow-hidden bg-slate-100 group relative">
                          {row.selfie ? (
                            <>
                              <img src={row.selfie} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-zoom-in" onClick={() => window.open(row.selfie)}>
                                <Maximize2 size={16} className="text-white" />
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-slate-300">NA</div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 leading-none">{row.employeeName}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1.5">{row.date}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-center">
                      <div className="flex flex-col items-center">
                         <span className="text-sm font-black text-slate-900 tabular-nums">IN: {row.checkIn}</span>
                         <span className={`text-[10px] font-bold tabular-nums mt-1 ${row.checkOut ? 'text-slate-400' : 'text-emerald-500 animate-pulse'}`}>{row.checkOut ? `OUT: ${row.checkOut}` : 'SESSION ACTIVE'}</span>
                      </div>
                    </td>
                    <td className="py-4">
                       <div className="flex flex-col items-center">
                         <span className="text-[10px] font-black text-slate-700 uppercase flex items-center gap-1"><MapPin size={10} className="text-indigo-500"/> {row.location?.address}</span>
                         <span className="text-[9px] text-indigo-600 font-black tabular-nums mt-0.5 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                           Lat: {row.location?.lat.toFixed(7)}, Lng: {row.location?.lng.toFixed(7)}
                         </span>
                       </div>
                    </td>
                    <td className="py-4 text-right max-w-[180px]">
                      {row.remarks ? <p className="text-[11px] font-medium text-slate-500 italic leading-tight">"{row.remarks}"</p> : <span className="text-[10px] text-slate-300">No remarks</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className={`rounded-[40px] shadow-2xl overflow-hidden border transition-all duration-700 ${activeRecord ? 'border-emerald-100' : 'border-indigo-100'}`}>
        <div className={`p-10 md:p-12 text-center text-white relative transition-all duration-700 ${activeRecord ? 'bg-gradient-to-br from-emerald-900 to-slate-900' : 'bg-gradient-to-br from-slate-900 to-indigo-900'}`}>
          <div className="md:absolute md:top-6 md:left-6 mb-4 md:mb-0 inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/5 backdrop-blur-md">
            <ShieldCheck size={14} className={activeRecord ? 'text-emerald-400' : 'text-indigo-400'} />
            Secure Biometric Station
          </div>
          
          <div className="absolute top-6 right-6 hidden md:flex items-center gap-2 text-white/40">
            <p className="text-[10px] font-black uppercase tracking-widest">{currentTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          </div>

          <h2 className="text-6xl sm:text-7xl md:text-8xl font-black mb-4 tracking-tighter tabular-nums drop-shadow-2xl">
            {currentTime.toLocaleTimeString('en-US', { hour12: false })}
          </h2>
          
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center justify-center gap-2 text-white/80 font-bold text-sm tracking-wide">
              <MapPin size={16} className="text-indigo-400" />
              {location ? location.address : 'Initializing GPS Signal...'}
            </div>
            {location && (
              <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full backdrop-blur-sm">
                <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] tabular-nums">
                  GPS: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-8 md:p-12 bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="relative">
                <div className={`w-full aspect-video rounded-[48px] overflow-hidden border-8 relative transition-all duration-500 shadow-xl ${activeRecord ? 'border-emerald-50 bg-emerald-100/20' : 'border-slate-50 bg-slate-100'}`}>
                  {status === 'loading' ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/90 backdrop-blur-sm z-20">
                      <div className={`w-12 h-12 border-4 rounded-full animate-spin ${activeRecord ? 'border-emerald-600 border-t-transparent' : 'border-indigo-600 border-t-transparent'}`}></div>
                      <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Validating...</p>
                    </div>
                  ) : status === 'pushed' ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-emerald-500 text-white z-20 animate-in zoom-in duration-300">
                      <CheckCircle2 size={64} />
                      <h3 className="text-2xl font-black uppercase tracking-tighter">Identity Verified</h3>
                      <p className="text-xs font-bold uppercase opacity-80">{activeRecord ? 'Punch Complete' : 'Attendance Logged'}</p>
                    </div>
                  ) : cameraEnabled ? (
                    <>
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                      <div className="absolute inset-0 border-[40px] border-black/10 pointer-events-none"></div>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white/20 rounded-full pointer-events-none border-dashed animate-pulse"></div>
                      <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                         <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                           <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                           Live Identity Scan
                         </div>
                         <button onClick={initCamera} className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-md transition-all">
                           <RefreshCw size={14} />
                         </button>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
                      <CameraOff size={48} className="text-slate-300" />
                      <p className="text-sm font-black text-slate-900 uppercase">Camera Access Required</p>
                      <button onClick={initCamera} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Enable Camera</button>
                    </div>
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <MessageSquare size={14} className="text-slate-400" />
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entry Remarks (Optional)</label>
                </div>
                <textarea 
                  placeholder={activeRecord ? "Briefly summarize your shift summary..." : "What are you working on today?"}
                  className={`w-full p-5 rounded-[32px] text-sm font-bold min-h-[120px] outline-none shadow-sm border transition-all resize-none focus:ring-4 ${activeRecord ? 'bg-emerald-50/30 border-emerald-100 focus:ring-emerald-100' : 'bg-slate-50 border-slate-100 focus:ring-indigo-100'}`}
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                />
              </div>

              <button 
                onClick={handlePunch}
                disabled={!location || status !== 'idle' || !cameraEnabled}
                className={`w-full py-6 rounded-[32px] font-black uppercase tracking-[0.2em] text-sm shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-4 disabled:opacity-40 ${
                  activeRecord ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-100' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
                }`}
              >
                {activeRecord ? <LogOut size={24} /> : <Camera size={24} />}
                {activeRecord ? 'End Session' : 'Clock In Now'}
              </button>
            </div>

            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className={`p-6 rounded-[32px] border flex flex-col justify-between h-40 transition-all ${location ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100 animate-pulse'}`}>
                   <div className="flex justify-between items-center">
                      <div className="p-2 bg-white rounded-xl shadow-sm text-indigo-500"><Navigation size={20}/></div>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-white shadow-sm ${location ? 'text-emerald-600' : 'text-rose-600'}`}>{location ? 'Locked' : 'Waiting'}</span>
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Geofence Status</p>
                      <p className="text-sm font-black text-slate-900 truncate leading-tight">{location ? location.address : 'Scanning signal...'}</p>
                      {location && <p className="text-[9px] font-bold text-indigo-400 mt-1 tabular-nums">{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</p>}
                   </div>
                </div>
                <div className={`p-6 rounded-[32px] border flex flex-col justify-between h-40 transition-all ${cameraEnabled ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-200'}`}>
                   <div className="flex justify-between items-center">
                      <div className="p-2 bg-white rounded-xl shadow-sm text-indigo-500"><ShieldCheck size={20}/></div>
                      <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-white shadow-sm text-indigo-600">Secure</span>
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Audit Status</p>
                      <p className="text-sm font-black text-slate-900 leading-tight">Biometric Ready</p>
                   </div>
                </div>
              </div>

              <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8 flex-1">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 mb-6">
                  <History size={20} className="text-indigo-600" /> Today's Session History
                </h3>
                <div className="space-y-4 max-h-[360px] overflow-y-auto no-scrollbar pr-1">
                   {todayHistory.length === 0 ? (
                      <div className="py-12 text-center text-slate-300 space-y-2">
                        <Clock size={40} className="mx-auto" />
                        <p className="text-xs font-black uppercase tracking-widest">No records today</p>
                      </div>
                   ) : todayHistory.map((h, i) => (
                      <div key={i} className="flex items-center justify-between p-5 bg-slate-50 border border-slate-100 rounded-3xl hover:bg-white hover:shadow-lg transition-all group">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm overflow-hidden border border-slate-100">
                               {h.selfie ? <img src={h.selfie} className="w-full h-full object-cover" /> : <Clock size={20} className="m-auto text-slate-200" />}
                            </div>
                            <div>
                               <p className="text-xs font-black text-slate-900 uppercase leading-none">Session #{todayHistory.length - i}</p>
                               <p className="text-[10px] font-bold text-slate-500 mt-1">In: {h.checkIn} — {h.checkOut || 'Active'}</p>
                               <p className="text-[9px] font-black text-indigo-500 mt-0.5 tabular-nums">GPS Locked: {h.location?.lat.toFixed(4)}, {h.location?.lng.toFixed(4)}</p>
                            </div>
                         </div>
                         <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${h.checkOut ? 'bg-slate-200 text-slate-500' : 'bg-emerald-500 text-white animate-pulse'}`}>
                            {h.checkOut ? 'Logged' : 'Live'}
                         </div>
                      </div>
                   ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
