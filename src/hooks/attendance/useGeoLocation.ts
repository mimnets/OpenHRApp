
import { useState, useCallback, useEffect, useRef } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { OFFICE_LOCATIONS } from '../../constants';
import { hrService } from '../../services/hrService';
import { OfficeLocation } from '../../types';

/**
 * Geolocation hook for attendance check-in/check-out.
 *
 * PWA / Chrome location guide:
 * - Geolocation API requires HTTPS (or localhost for dev).
 * - PWAs installed via "Add to Home Screen" run in a separate browser context;
 *   location permissions granted in the browser do NOT carry over automatically.
 *   Users must grant permission again when the PWA prompts.
 * - On Android, location must be enabled at OS level (Settings > Location > On)
 *   AND allowed for the app/browser (Settings > Apps > Chrome/PWA > Permissions > Location).
 * - On iOS, go to Settings > Privacy > Location Services > Safari Websites (or the PWA name).
 * - If `enableHighAccuracy: true` fails (no GPS hardware / indoors), we automatically
 *   retry with `enableHighAccuracy: false` to use network-based location as fallback.
 */

// Helper: get a user-friendly error message from GeolocationPositionError codes
const getLocationErrorMessage = (err: any): string => {
  // Standard GeolocationPositionError codes
  const code = err?.code ?? err?.PERMISSION_DENIED;

  switch (code) {
    case 1: // PERMISSION_DENIED
      if (Capacitor.isNativePlatform()) {
        return 'Location permission denied. Please enable it in your device Settings > Apps > Open HR > Permissions > Location.';
      }
      // Check if PWA (standalone mode)
      if (window.matchMedia?.('(display-mode: standalone)')?.matches) {
        return 'Location blocked. Open your device Settings > Apps > find this app > Permissions > Location > Allow.';
      }
      return 'Location permission denied. Please tap the lock icon in your browser address bar and allow Location access, then retry.';

    case 2: // POSITION_UNAVAILABLE
      return 'Location unavailable. Please ensure Location/GPS is turned ON in your device Settings and you are not in airplane mode.';

    case 3: // TIMEOUT
      return 'Location timed out. Please move to an area with better GPS signal or turn on Wi-Fi for faster location detection, then retry.';

    default:
      return 'Could not detect location. Please check that Location is enabled in your device Settings and try again.';
  }
};

export const useGeoLocation = () => {
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoFences, setGeoFences] = useState<OfficeLocation[]>(OFFICE_LOCATIONS);
  const watchIdRef = useRef<string | null>(null);

  // Load dynamic locations on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await hrService.getConfig();
        if (config.officeLocations && config.officeLocations.length > 0) {
          setGeoFences(config.officeLocations);
        }
      } catch (e) {
        // Fallback to constants is already set
      }
    };
    loadConfig();
  }, []);

  const matchOffice = (lat: number, lng: number, fences: OfficeLocation[]): string | null => {
    for (const office of fences) {
      const latDiff = Math.abs(office.lat - lat);
      const lngDiff = Math.abs(office.lng - lng);
      if (latDiff < 0.005 && lngDiff < 0.005) {
        return office.name;
      }
    }
    return null; // No geofence match — will attempt reverse geocoding
  };

  // Reverse geocode using OpenStreetMap Nominatim (free, no API key needed)
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (!response.ok) throw new Error('Geocode failed');
      const data = await response.json();

      if (data.address) {
        const addr = data.address;
        // Build a concise readable address from parts
        const parts: string[] = [];
        if (addr.road || addr.pedestrian) parts.push(addr.road || addr.pedestrian);
        if (addr.neighbourhood || addr.suburb) parts.push(addr.neighbourhood || addr.suburb);
        if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
        if (parts.length > 0) return parts.join(', ');
      }

      if (data.display_name) {
        // Truncate long display names to first 3 meaningful parts
        const parts = data.display_name.split(', ').slice(0, 3);
        return parts.join(', ');
      }

      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  const resolveAddress = async (lat: number, lng: number, fences: OfficeLocation[]): Promise<string> => {
    const officeName = matchOffice(lat, lng, fences);
    if (officeName) return officeName;
    return await reverseGeocode(lat, lng);
  };

  // Web: attempt getCurrentPosition with given options, returns position or throws
  const webGetPosition = (options: PositionOptions): Promise<GeolocationPosition> => {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  };

  const detectLocation = useCallback(async (force: boolean = false) => {
    setIsLocating(true);
    setError(null);

    try {
      if (Capacitor.isNativePlatform()) {
        // Request permissions on native
        const perms = await Geolocation.requestPermissions();
        if (perms.location !== 'granted' && perms.coarseLocation !== 'granted') {
          setError('Location permission denied. Please enable it in your device Settings > Apps > Open HR > Permissions > Location.');
          setIsLocating(false);
          return;
        }

        let pos;
        try {
          pos = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: force ? 0 : 60000,
          });
        } catch (highAccErr: any) {
          // If high accuracy fails (no GPS / indoors), retry with network-based location
          if (highAccErr?.code === 2 || highAccErr?.code === 3) {
            pos = await Geolocation.getCurrentPosition({
              enableHighAccuracy: false,
              timeout: 20000,
              maximumAge: force ? 0 : 60000,
            });
          } else {
            throw highAccErr;
          }
        }

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const address = await resolveAddress(lat, lng, geoFences);
        setLocation({ lat, lng, address });
      } else {
        // Web / PWA fallback
        if (!navigator.geolocation) {
          setError('Geolocation is not supported by this browser. Please use Chrome, Safari, or Firefox.');
          setIsLocating(false);
          return;
        }

        let pos: GeolocationPosition;
        try {
          // Try high accuracy first (GPS) with a generous timeout
          pos = await webGetPosition({
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: force ? 0 : 60000,
          });
        } catch (highAccErr: any) {
          // If timeout or position unavailable, retry with network-based location
          if (highAccErr?.code === 2 || highAccErr?.code === 3) {
            pos = await webGetPosition({
              enableHighAccuracy: false,
              timeout: 20000,
              maximumAge: force ? 0 : 60000,
            });
          } else {
            throw highAccErr;
          }
        }

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const address = await resolveAddress(lat, lng, geoFences);
        setLocation({ lat, lng, address });
      }
    } catch (err: any) {
      console.error('Geolocation detection failed:', err);
      setError(getLocationErrorMessage(err));
    } finally {
      setIsLocating(false);
    }
  }, [geoFences]);

  const watchLocation = useCallback(async () => {
    if (watchIdRef.current) return; // Already watching

    if (Capacitor.isNativePlatform()) {
      const perms = await Geolocation.requestPermissions();
      if (perms.location !== 'granted' && perms.coarseLocation !== 'granted') {
        setError('Location permission denied. Please enable it in Settings.');
        return;
      }

      const id = await Geolocation.watchPosition(
        { enableHighAccuracy: true },
        (pos, err) => {
          if (err) {
            setError('Location watch error.');
            return;
          }
          if (pos) {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            resolveAddress(lat, lng, geoFences).then(address => {
              setLocation({ lat, lng, address });
            });
          }
        }
      );
      watchIdRef.current = id;
    }
  }, [geoFences]);

  const clearWatch = useCallback(async () => {
    if (watchIdRef.current) {
      await Geolocation.clearWatch({ id: watchIdRef.current });
      watchIdRef.current = null;
    }
  }, []);

  return { location, isLocating, error, detectLocation, watchLocation, clearWatch };
};
