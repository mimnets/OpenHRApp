
import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';

// Hooks
import { useCamera } from '../hooks/attendance/useCamera';
import { useGeoLocation } from '../hooks/attendance/useGeoLocation';
import { useAttendance } from '../hooks/attendance/useAttendance';
import { useSubscription } from '../context/SubscriptionContext';

// UI Components
import { AttendanceHeader } from '../components/attendance/AttendanceHeader';
import { CameraFeed } from '../components/attendance/CameraFeed';
import { LocationDisplay } from '../components/attendance/LocationDisplay';
import { AttendanceActions } from '../components/attendance/AttendanceActions';

interface AttendanceProps {
  user: any;
  autoStart?: 'OFFICE' | 'FACTORY' | 'FINISH';
  onFinish?: () => void;
}

const Attendance: React.FC<AttendanceProps> = ({ user, autoStart, onFinish }) => {
  // 1. Logic Hooks
  const {
    currentTime, activeRecord, isLoading, status, submitPunch
  } = useAttendance(user, onFinish);

  const {
    videoRef, stream, error: cameraError, facingMode, isTorchOn,
    startCamera, stopCamera, toggleCamera, toggleTorch, takeSelfie
  } = useCamera();

  const {
    location, isLocating, detectLocation
  } = useGeoLocation();

  // Subscription check for write access
  const { canPerformAction, subscription } = useSubscription();
  const canPunch = canPerformAction('write');

  // 2. Local UI State
  const [remarks, setRemarks] = useState('');
  const [dutyType, setDutyType] = useState<'OFFICE' | 'FACTORY'>('OFFICE');
  const [isMobile, setIsMobile] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 3. Initialization
  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    
    // Auto-init hardware
    const initHardware = async () => {
      detectLocation(true);
      startCamera('user');

      // Set duty type based on props or existing session
      if (autoStart === 'FACTORY') setDutyType('FACTORY');
      else if (activeRecord?.dutyType) setDutyType(activeRecord.dutyType);
    };

    if (!isLoading) initHardware();

    return () => stopCamera();
  }, [autoStart, isLoading, activeRecord?.dutyType]); 

  // 4. Handlers
  const handlePunchSubmit = async () => {
    // Check subscription status
    if (!canPunch) {
      if (subscription?.status === 'EXPIRED') {
        alert('Your trial has expired. Please upgrade to continue punching attendance.');
      } else if (subscription?.status === 'SUSPENDED') {
        alert('Your account is suspended. Please contact support.');
      }
      return;
    }

    if (dutyType === 'FACTORY' && !remarks.trim()) {
      alert("Mandatory: Please mention the Factory Name and details in remarks.");
      return;
    }
    if (status !== 'idle' || !location || !stream || !canvasRef.current) return;

    const selfieData = takeSelfie(canvasRef.current);
    if (!selfieData) return;

    await submitPunch(dutyType, remarks, location, selfieData);
  };

  const handleBack = () => {
    stopCamera();
    if (onFinish) onFinish();
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  return (
    <div className="fixed inset-0 bg-[#fcfdfe] z-[9999] flex flex-col animate-in slide-in-from-bottom-6 duration-500 overflow-hidden">
      
      <AttendanceHeader 
        currentTime={currentTime} 
        onBack={handleBack} 
      />

      <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-0">
        <CameraFeed
          videoRef={videoRef}
          stream={stream}
          error={cameraError}
          facingMode={facingMode}
          isMobile={isMobile}
          isTorchOn={isTorchOn}
          toggleTorch={toggleTorch}
          toggleCamera={toggleCamera}
          showSuccess={status === 'success'}
        >
          <LocationDisplay 
            location={location} 
            isLocating={isLocating} 
            onRetry={() => detectLocation(true)} 
          />
        </CameraFeed>
      </div>

      {/* Subscription Warning Banner */}
      {!canPunch && (
        <div className="px-4 py-3 bg-red-50 border-t border-red-200 flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm font-medium">
            {subscription?.status === 'EXPIRED'
              ? 'Your trial has expired. Attendance punching is disabled.'
              : 'Your account is suspended. Please contact support.'}
          </span>
        </div>
      )}

      <AttendanceActions
        dutyType={dutyType}
        remarks={remarks}
        setRemarks={setRemarks}
        onSubmit={handlePunchSubmit}
        status={status}
        activeRecord={activeRecord}
        isDisabled={!canPunch || !location || isLocating || status !== 'idle' || !stream || (dutyType === 'FACTORY' && !remarks.trim())}
      />
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default Attendance;
