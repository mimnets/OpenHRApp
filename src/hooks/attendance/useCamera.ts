
import { useState, useRef, useEffect, useCallback } from 'react';
import { convertToWebP } from '../../utils/imageConvert';

const blobToDataURL = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const pickImageFile = (capture: 'user' | 'environment' | null): Promise<File | null> => {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (capture) input.setAttribute('capture', capture);
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.style.opacity = '0';
    document.body.appendChild(input);

    let settled = false;
    const finish = (file: File | null) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(file);
    };

    input.onchange = () => finish(input.files?.[0] ?? null);
    input.oncancel = () => finish(null);
    // Some browsers don't fire `cancel`; clean up after a delay if window regains focus with no file
    const onFocus = () => {
      setTimeout(() => {
        if (!settled && !input.files?.length) finish(null);
      }, 500);
      window.removeEventListener('focus', onFocus);
    };
    window.addEventListener('focus', onFocus);

    input.click();
  });
};

export const useCamera = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [loading, setLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  streamRef.current = stream;
  const facingModeRef = useRef<'user' | 'environment'>(facingMode);
  facingModeRef.current = facingMode;

  const stopCamera = useCallback(() => {
    const currentStream = streamRef.current;
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setStream(null);
    }
  }, []);

  const startCamera = useCallback(async (mode: 'user' | 'environment' = 'user') => {
    const existingStream = streamRef.current;
    if (existingStream) {
      existingStream.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setStream(null);
    }

    setLoading(true);
    try {
      setError(null);

      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1080 },
          height: { ideal: 1440 }
        }
      });

      streamRef.current = s;
      setStream(s);
      setFacingMode(mode);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }

      // Auto-recover when the OS reclaims the camera (e.g. tab backgrounded)
      const videoTrack = s.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          if (streamRef.current === s) {
            setTimeout(() => {
              if (streamRef.current === s) {
                startCamera(facingModeRef.current);
              }
            }, 500);
          }
        };
      }
    } catch (err: any) {
      // iOS PWA standalone: live stream may be blocked but takePhoto() still works via <input capture>
      const isIOSPWA =
        /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        ((navigator as any).standalone === true ||
          window.matchMedia('(display-mode: standalone)').matches);
      setError(isIOSPWA ? null : 'Camera permission denied.');
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleCamera = useCallback(() => {
    setFacingMode(prev => {
      const nextMode = prev === 'user' ? 'environment' : 'user';
      setIsTorchOn(false);
      startCamera(nextMode);
      return prev;
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

  /** Fallback: open the device camera via <input type=file capture> when live stream isn't available */
  const takePhoto = useCallback(async (): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);
      const file = await pickImageFile('user');
      if (!file) return null;
      const webp = await convertToWebP(file, 0.7, 1080);
      return await blobToDataURL(webp);
    } catch {
      setError('Failed to take photo. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /** Pick a photo from the device gallery via <input type=file> (no capture attribute) */
  const selectFromGallery = useCallback(async (): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);
      const file = await pickImageFile(null);
      if (!file) return null;
      const webp = await convertToWebP(file, 0.7, 1080);
      return await blobToDataURL(webp);
    } catch {
      setError('Failed to select photo. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {
        // play() can fail on iOS PWA before user activation; autoPlay+playsInline retries.
      });
    }
  }, [stream]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && streamRef.current) {
        const tracks = streamRef.current.getVideoTracks();
        const allEnded = tracks.length === 0 || tracks.every(t => t.readyState === 'ended');
        if (allEnded) {
          startCamera(facingModeRef.current);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [startCamera]);

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
