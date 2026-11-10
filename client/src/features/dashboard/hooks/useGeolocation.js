import { createContext, createElement, useCallback, useContext, useEffect, useRef, useState } from 'react';

const GeolocationContext = createContext(null);
const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 12000,
  maximumAge: 5000
};

function getAccessError() {
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    return {
      status: 'insecure-context',
      message: 'Akses GPS memerlukan HTTPS atau localhost.'
    };
  }
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return {
      status: 'unsupported',
      message: 'Browser ini tidak mendukung geolokasi.'
    };
  }
  return null;
}

function getErrorDetails(error) {
  if (error.code === 1) {
    return {
      status: 'denied',
      permissionStatus: 'denied',
      message: 'Izin lokasi ditolak. Aktifkan izin lokasi browser atau pilih lokasi secara manual.'
    };
  }
  if (error.code === 3) {
    return {
      status: 'timeout',
      message: 'Pencarian lokasi terlalu lama. Coba deteksi ulang atau pilih lokasi secara manual.'
    };
  }
  return {
    status: 'unavailable',
    message: 'Perangkat tidak dapat memperoleh lokasi. Periksa GPS atau pilih lokasi secara manual.'
  };
}

export function GeolocationProvider({ children }) {
  const [coords, setCoords] = useState(null);
  const [status, setStatus] = useState('idle');
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const [error, setError] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const requestIdRef = useRef(0);
  const trackingSessionRef = useRef(0);
  const watchIdRef = useRef(null);
  const trackingStartingRef = useRef(false);

  const clearWatch = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const commitPosition = useCallback((position) => {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    const accuracy = position.coords.accuracy;
    if (
      !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
      !Number.isFinite(accuracy) || accuracy < 0
    ) {
      setCoords(null);
      setStatus('unavailable');
      setError({ status: 'unavailable', message: 'Browser mengembalikan koordinat GPS yang tidak valid.' });
      return null;
    }

    const location = {
      lat: latitude,
      lng: longitude,
      accuracy,
      timestamp: position.timestamp || Date.now()
    };
    setCoords(location);
    setStatus('located');
    setPermissionStatus('granted');
    setError(null);
    return location;
  }, []);

  const refreshLocation = useCallback(() => {
    const accessError = getAccessError();
    if (accessError) {
      setCoords(null);
      setStatus(accessError.status);
      setError(accessError);
      return Promise.resolve(null);
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setStatus('loading');
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (requestId !== requestIdRef.current) {
            resolve(null);
            return;
          }
          resolve(commitPosition(position));
        },
        (geoError) => {
          if (requestId !== requestIdRef.current) {
            resolve(null);
            return;
          }
          const details = getErrorDetails(geoError);
          setCoords(null);
          setStatus(details.status);
          if (details.permissionStatus) setPermissionStatus(details.permissionStatus);
          setError(details);
          resolve(null);
        },
        GEOLOCATION_OPTIONS
      );
    });
  }, [commitPosition]);

  const stopTracking = useCallback(() => {
    trackingSessionRef.current += 1;
    trackingStartingRef.current = false;
    clearWatch();
    setIsTracking(false);
  }, [clearWatch]);

  const startTracking = useCallback(async () => {
    if (trackingStartingRef.current || watchIdRef.current !== null) return null;
    const accessError = getAccessError();
    if (accessError) {
      setCoords(null);
      setStatus(accessError.status);
      setError(accessError);
      return null;
    }

    trackingStartingRef.current = true;
    const sessionId = trackingSessionRef.current + 1;
    trackingSessionRef.current = sessionId;
    setIsTracking(true);
    const location = await refreshLocation();

    if (!location || sessionId !== trackingSessionRef.current) {
      if (sessionId === trackingSessionRef.current) {
        trackingStartingRef.current = false;
        setIsTracking(false);
      }
      return null;
    }

    trackingStartingRef.current = false;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (sessionId !== trackingSessionRef.current) return;
        commitPosition(position);
      },
      (geoError) => {
        if (sessionId !== trackingSessionRef.current) return;
        clearWatch();
        setIsTracking(false);
        const details = getErrorDetails(geoError);
        setCoords(null);
        setStatus(details.status);
        if (details.permissionStatus) setPermissionStatus(details.permissionStatus);
        setError(details);
      },
      GEOLOCATION_OPTIONS
    );
    return location;
  }, [clearWatch, commitPosition, refreshLocation]);

  useEffect(() => {
    let permission;
    let isMounted = true;
    const handlePermissionChange = () => setPermissionStatus(permission?.state || 'unknown');
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (!isMounted) return;
        permission = result;
        setPermissionStatus(result.state);
        result.addEventListener?.('change', handlePermissionChange);
      }).catch(() => {});
    }
    refreshLocation();
    return () => {
      isMounted = false;
      requestIdRef.current += 1;
      trackingSessionRef.current += 1;
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      permission?.removeEventListener?.('change', handlePermissionChange);
    };
  }, [refreshLocation]);

  const value = {
    coords,
    latitude: coords?.lat ?? null,
    longitude: coords?.lng ?? null,
    accuracy: coords?.accuracy ?? null,
    timestamp: coords?.timestamp ?? null,
    status,
    permissionStatus,
    loading: status === 'loading',
    error,
    isTracking,
    isAccurate: coords ? coords.accuracy <= 50 : false,
    locate: refreshLocation,
    refreshLocation,
    updateLocation: refreshLocation,
    startTracking,
    stopTracking
  };

  return createElement(GeolocationContext.Provider, { value }, children);
}

export default function useGeolocation() {
  const location = useContext(GeolocationContext);
  if (!location) {
    throw new Error('useGeolocation must be used within GeolocationProvider');
  }
  return location;
}