
import { useState, useCallback, useEffect, useRef } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { OFFICE_LOCATIONS } from '../../constants';
import { hrService } from '../../services/hrService';
import { OfficeLocation } from '../../types';

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

  const matchOffice = (lat: number, lng: number, fences: OfficeLocation[]): string => {
    for (const office of fences) {
      const latDiff = Math.abs(office.lat - lat);
      const lngDiff = Math.abs(office.lng - lng);
      if (latDiff < 0.005 && lngDiff < 0.005) {
        return office.name;
      }
    }
    return 'Remote Area';
  };

  const detectLocation = useCallback(async (force: boolean = false) => {
    setIsLocating(true);
    setError(null);

    try {
      if (Capacitor.isNativePlatform()) {
        // Request permissions on native
        const perms = await Geolocation.requestPermissions();
        if (perms.location !== 'granted' && perms.coarseLocation !== 'granted') {
          setError('Location permission denied. Please enable it in Settings.');
          setIsLocating(false);
          return;
        }

        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: force ? 0 : 60000,
        });

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocation({ lat, lng, address: matchOffice(lat, lng, geoFences) });
      } else {
        // Web fallback
        if (!navigator.geolocation) {
          setError('Geolocation not supported');
          setIsLocating(false);
          return;
        }

        await new Promise<void>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
              setLocation({ lat, lng, address: matchOffice(lat, lng, geoFences) });
              resolve();
            },
            (err) => {
              console.error('Location error', err);
              reject(err);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: force ? 0 : 60000 }
          );
        });
      }
    } catch (err: any) {
      setError('Location access denied or unavailable.');
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
            setLocation({ lat, lng, address: matchOffice(lat, lng, geoFences) });
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
