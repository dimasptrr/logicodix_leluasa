import { useCallback, useState } from 'react';

export default function useGeolocation() {
  const [coords, setCoords] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | ok | denied | unsupported

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('unsupported');
      return;
    }
    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus('ok');
      },
      () => setStatus('denied'),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  return { coords, status, locate };
}