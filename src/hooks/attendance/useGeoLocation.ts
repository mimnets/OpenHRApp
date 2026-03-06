
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
        const address = await resolveAddress(lat, lng, geoFences);
        setLocation({ lat, lng, address });
      } else {
        // Web fallback
        if (!navigator.geolocation) {
          setError('Geolocation not supported');
          setIsLocating(false);
          return;
        }

        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            (err) => {
              console.error('Location error', err);
              reject(err);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: force ? 0 : 60000 }
          );
        });

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const address = await resolveAddress(lat, lng, geoFences);
        setLocation({ lat, lng, address });
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
