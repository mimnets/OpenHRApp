
import { useState, useCallback, useEffect } from 'react';
import { OFFICE_LOCATIONS } from '../../constants';
import { hrService } from '../../services/hrService';
import { OfficeLocation } from '../../types';

export const useGeoLocation = () => {
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoFences, setGeoFences] = useState<OfficeLocation[]>(OFFICE_LOCATIONS);

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

  const detectLocation = useCallback((force: boolean = false) => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }
    setIsLocating(true);
    setError(null);
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        let matchedOffice = "Remote Area";
        
        // Dynamic geofencing logic
        // We use a simplified degree approximation (0.005 deg ~= 500m) for speed
        // or strictly check radius if data available.
        // 1 deg lat ~= 111km. 0.001 deg ~= 111m.
        
        for (const office of geoFences) {
           const latDiff = Math.abs(office.lat - lat);
           const lngDiff = Math.abs(office.lng - lng);
           
           // Simple Box Check (approx 500m-1km variance)
           if (latDiff < 0.005 && lngDiff < 0.005) {
              matchedOffice = office.name;
              break;
           }
        }
        
        setLocation({ lat, lng, address: matchedOffice });
        setIsLocating(false);
      },
      (err) => {
        console.error("Location error", err);
        setError("Location access denied or unavailable");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: force ? 0 : 60000 }
    );
  }, [geoFences]);

  return { location, isLocating, error, detectLocation };
};
