
import { useState, useRef, useEffect } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export const useCamera = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [loading, setLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const startCamera = async (mode: 'user' | 'environment' = 'user') => {
    stopCamera();
    setLoading(true);
    try {
      setError(null);

      // Let getUserMedia() run directly — on native, Capacitor's
      // BridgeWebChromeClient handles the Android permission dialog automatically.
      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1080 },
          height: { ideal: 1440 }
        }
      });
      setStream(s);
      setFacingMode(mode);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch (err: any) {
      // On native, fall back silently — takePhoto() will still work
      if (Capacitor.isNativePlatform()) {
        setError(null); // Clear error — fallback available via takePhoto
      } else {
        setError('Camera permission denied.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
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

  const takeSelfie = (canvas: HTMLCanvasElement): string | null => {
    if (!stream || !videoRef.current) return null;

    const video = videoRef.current;
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
    return canvas.toDataURL('image/webp', 0.8);
  };

  /** Capacitor fallback: take a single photo when live stream isn't available */
  const takePhoto = async (): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        quality: 80,
        width: 1080,
        height: 1440,
        correctOrientation: true,
      });
      return photo.dataUrl ?? null;
    } catch (err: any) {
      if (err?.message?.includes('cancelled') || err?.message?.includes('canceled')) {
        // User cancelled — not an error
        return null;
      }
      setError('Failed to take photo. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  /** Pick a photo from the device gallery */
  const selectFromGallery = async (): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        quality: 80,
        width: 1080,
        height: 1440,
        correctOrientation: true,
      });
      return photo.dataUrl ?? null;
    } catch (err: any) {
      if (err?.message?.includes('cancelled') || err?.message?.includes('canceled')) {
        return null;
      }
      setError('Failed to select photo. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.error(e));
    }
    return () => stopCamera();
  }, [stream]);

  return {
    videoRef,
    stream,
    error,
    facingMode,
    isTorchOn,
    startCamera,
    stopCamera,
    toggleCamera,
    toggleTorch,
    takeSelfie,
    takePhoto,
    selectFromGallery,
    loading
  };
};
