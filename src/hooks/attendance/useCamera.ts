
import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export const useCamera = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [loading, setLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  // Use a ref to always have the current stream value for cleanup/stop
  const streamRef = useRef<MediaStream | null>(null);
  streamRef.current = stream;

  const stopCamera = useCallback(() => {
    const currentStream = streamRef.current;
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setStream(null);
    }
  }, []);

  const startCamera = useCallback(async (mode: 'user' | 'environment' = 'user') => {
    // Stop any existing stream using the ref (avoids stale closure)
    const existingStream = streamRef.current;
    if (existingStream) {
      existingStream.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setStream(null);
    }

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

      // Guard: if the component unmounted or a newer startCamera call
      // already replaced the stream, stop this one immediately.
      streamRef.current = s;
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
  }, []);

  const toggleCamera = useCallback(() => {
    setFacingMode(prev => {
      const nextMode = prev === 'user' ? 'environment' : 'user';
      setIsTorchOn(false);
      startCamera(nextMode);
      return prev; // startCamera will update via setFacingMode
    });
  }, [startCamera]);

  const toggleTorch = useCallback(async () => {
    const currentStream = streamRef.current;
    if (!currentStream) return;
    const track = currentStream.getVideoTracks()[0];
    const capabilities = (track as any).getCapabilities?.() || {};
    if (capabilities.torch) {
      try {
        await track.applyConstraints({ advanced: [{ torch: !isTorchOn } as any] });
        setIsTorchOn(!isTorchOn);
      } catch (e) { console.error(e); }
    }
  }, [isTorchOn]);

  const takeSelfie = useCallback((canvas: HTMLCanvasElement): string | null => {
    if (!streamRef.current || !videoRef.current) return null;

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
  }, [facingMode]);

  /** Capacitor fallback: take a single photo when live stream isn't available */
  const takePhoto = useCallback(async (): Promise<string | null> => {
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
  }, []);

  /** Pick a photo from the device gallery */
  const selectFromGallery = useCallback(async (): Promise<string | null> => {
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
  }, []);

  // Assign stream to video element whenever it changes
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {
        // play() can fail on iOS PWA if page isn't user-activated yet;
        // the video element's autoPlay + playsInline attributes will
        // retry automatically once the user interacts.
      });
    }
  }, [stream]);

  // Cleanup on unmount — use ref so the closure always has the latest stream
  useEffect(() => {
    return () => {
      const s = streamRef.current;
      if (s) {
        s.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

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
