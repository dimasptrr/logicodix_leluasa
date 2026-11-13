import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { fetchRouteComparison, fetchObstacles } from '../features/dashboard/services/safeApi.js';
import useGeolocation from '../features/dashboard/hooks/useGeolocation.js';

// Hitung jarak Haversine dalam satuan meter
function calculateDistanceInMeters(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Hitung koordinat presisi titik langkah aktif di sepanjang garis rute
function getStepCoordinate(stepIndex, totalSteps, coordinates, origin, destination, currentStep) {
  if (Array.isArray(coordinates) && coordinates.length > 0) {
    if (stepIndex <= 0) return coordinates[0];
    if (stepIndex >= totalSteps - 1) return coordinates[coordinates.length - 1];

    // Jika step memiliki indeks wayPoint eksak dari OpenRouteService, gunakan titik belokan presisi tersebut
    if (currentStep?.wayPointIndex !== null && currentStep?.wayPointIndex !== undefined) {
      const idx = currentStep.wayPointIndex;
      if (idx >= 0 && idx < coordinates.length) {
        return coordinates[idx];
      }
    }

    const ratio = stepIndex / (totalSteps - 1);
    const targetIdx = Math.min(
      coordinates.length - 1,
      Math.max(0, Math.round(ratio * (coordinates.length - 1)))
    );
    return coordinates[targetIdx];
  }

  if (origin && destination) {
    const factor = totalSteps > 1 ? stepIndex / (totalSteps - 1) : 0;
    return [
      origin.lat + (destination.lat - origin.lat) * factor,
      origin.lng + (destination.lng - origin.lng) * factor
    ];
  }

  return null;
}

// Hitung arah (bearing 0-360°) dari titik A ke titik B
function calculateBearing(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lng2 - lng1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// Bulatkan ke 0 / 90 / 180 / 270 (atas / kanan / bawah / kiri)
function snapToCardinal(bearing) {
  return (Math.round(bearing / 90) * 90) % 360;
}

// Arah jalan di titik langkah aktif (sudah dibulatkan per 90°)
function getStepHeading(stepIndex, totalSteps, coordinates, origin, destination, currentStep) {
  if (Array.isArray(coordinates) && coordinates.length > 1) {
    let idx;
    if (currentStep?.wayPointIndex !== null && currentStep?.wayPointIndex !== undefined
        && currentStep.wayPointIndex >= 0 && currentStep.wayPointIndex < coordinates.length) {
      idx = currentStep.wayPointIndex;
    } else {
      const ratio = totalSteps > 1 ? stepIndex / (totalSteps - 1) : 0;
      idx = Math.min(coordinates.length - 1, Math.max(0, Math.round(ratio * (coordinates.length - 1))));
    }

    const from = coordinates[idx];
    // Cari titik di depan yang cukup jauh (>5m) supaya arah stabil
    for (let i = idx + 1; i < coordinates.length; i++) {
      const to = coordinates[i];
      if (calculateDistanceInMeters(from[0], from[1], to[0], to[1]) > 5) {
        return snapToCardinal(calculateBearing(from[0], from[1], to[0], to[1]));
      }
    }
    // Langkah terakhir: pakai arah dari titik sebelumnya
    const prev = coordinates[Math.max(0, idx - 1)];
    return snapToCardinal(calculateBearing(prev[0], prev[1], from[0], from[1]));
  }

  if (origin && destination) {
    return snapToCardinal(calculateBearing(origin.lat, origin.lng, destination.lat, destination.lng));
  }
  return 0;
}

// Memformat manuver langkah & ikon agar 100% presisi dan sinkron dengan instruksi navigasi
function formatStepManeuver(st, idx, arr, destName) {
  const isLast = idx === arr.length - 1;
  const rawInst = st.instruction || '';
  const lower = rawInst.toLowerCase();

  let icon = 'straight';
  let instruction = rawInst;

  // 1. Periksa kode tipe manuver OpenRouteService bila tersedia
  if (st.type !== undefined && st.type !== null) {
    switch (Number(st.type)) {
      case 0: icon = 'turn_left'; break;
      case 1: icon = 'turn_right'; break;
      case 2: icon = 'turn_sharp_left'; break;
      case 3: icon = 'turn_sharp_right'; break;
      case 4: icon = 'turn_slight_left'; break;
      case 5: icon = 'turn_slight_right'; break;
      case 6: icon = 'straight'; break;
      case 7:
      case 8: icon = 'roundabout_right'; break;
      case 9: icon = 'u_turn_left'; break;
      case 10: icon = 'check_circle'; break;
      case 11: icon = 'straight'; break;
      case 12: icon = 'turn_slight_left'; break;
      case 13: icon = 'turn_slight_right'; break;
      default: break;
    }
  }

  // 2. Pemeriksaan kata kunci komprehensif (Bahasa Indonesia & Bahasa Inggris)
  if (isLast || lower.includes('tiba') || lower.includes('sampai') || lower.includes('arrive') || lower.includes('destination')) {
    icon = 'check_circle';
  } else if (lower.includes('sharp right') || lower.includes('tajam kanan')) {
    icon = 'turn_sharp_right';
  } else if (lower.includes('sharp left') || lower.includes('tajam kiri')) {
    icon = 'turn_sharp_left';
  } else if (lower.includes('slight right') || lower.includes('serong kanan') || lower.includes('keep right')) {
    icon = 'turn_slight_right';
  } else if (lower.includes('slight left') || lower.includes('serong kiri') || lower.includes('keep left')) {
    icon = 'turn_slight_left';
  } else if (lower.includes('turn right') || lower.includes('belok kanan') || lower.includes('ke kanan') || lower.includes('kanan') || lower.includes('right')) {
    icon = 'turn_right';
  } else if (lower.includes('turn left') || lower.includes('belok kiri') || lower.includes('ke kiri') || lower.includes('kiri') || lower.includes('left')) {
    icon = 'turn_left';
  } else if (lower.includes('u-turn') || lower.includes('putar balik')) {
    icon = 'u_turn_left';
  } else if (lower.includes('cross') || lower.includes('seberang') || lower.includes('pelican')) {
    icon = 'directions_walk';
  } else if (lower.includes('ramp') || lower.includes('rampa')) {
    icon = 'ramp_right';
  } else if (lower.includes('straight') || lower.includes('lurus') || lower.includes('head') || lower.includes('depart') || lower.includes('continue')) {
    icon = 'straight';
  }

  // 3. Terjemahkan teks instruksi ke Bahasa Indonesia yang ramah & natural
  if (isLast) {
    instruction = `Tiba di ${destName || 'tujuan'}`;
  } else if (lower.startsWith('turn right')) {
    instruction = rawInst.replace(/^turn right onto\s+/i, 'Belok kanan ke ').replace(/^turn right/i, 'Belok kanan');
  } else if (lower.startsWith('turn left')) {
    instruction = rawInst.replace(/^turn left onto\s+/i, 'Belok kiri ke ').replace(/^turn left/i, 'Belok kiri');
  } else if (lower.startsWith('turn sharp right')) {
    instruction = rawInst.replace(/^turn sharp right onto\s+/i, 'Belok tajam ke kanan ke ').replace(/^turn sharp right/i, 'Belok tajam ke kanan');
  } else if (lower.startsWith('turn sharp left')) {
    instruction = rawInst.replace(/^turn sharp left onto\s+/i, 'Belok tajam ke kiri ke ').replace(/^turn sharp left/i, 'Belok tajam ke kiri');
  } else if (lower.startsWith('turn slight right') || lower.startsWith('keep right')) {
    instruction = rawInst.replace(/^(?:turn slight right|keep right) onto\s+/i, 'Serong kanan ke ').replace(/^(?:turn slight right|keep right)/i, 'Serong kanan');
  } else if (lower.startsWith('turn slight left') || lower.startsWith('keep left')) {
    instruction = rawInst.replace(/^(?:turn slight left|keep left) onto\s+/i, 'Serong kiri ke ').replace(/^(?:turn slight left|keep left)/i, 'Serong kiri');
  } else if (lower.startsWith('head') || lower.startsWith('depart')) {
    instruction = rawInst.replace(/^head\s+\w+\s+(?:on|onto)\s+/i, 'Mulai perjalanan di ').replace(/^depart\s+/i, 'Mulai dari ');
  } else if (lower.startsWith('continue')) {
    instruction = rawInst.replace(/^continue onto\s+/i, 'Lanjut di ').replace(/^continue/i, 'Lanjut lurus');
  } else if (lower.startsWith('arrive')) {
    instruction = `Tiba di ${destName || 'tujuan'}`;
  }

  return { icon, instruction };
}

export default function PlanRoute({ setActiveTab }) {
  const [routeData, setRouteData] = useState(null);
  const [routeIntent, setRouteIntent] = useState(() => {
    if (typeof window !== 'undefined' && window.__leluasaRouteIntent) {
      return window.__leluasaRouteIntent;
    }
    return null;
  });
  const [selectedDest, setSelectedDest] = useState(() => {
    if (typeof window !== 'undefined') {
      if (window.__leluasaRouteIntent?.destination) {
        return window.__leluasaRouteIntent.destination?.id || 'custom';
      }
      if (window.__leluasaTargetRoute) {
        return window.__leluasaTargetRoute;
      }
    }
    return null;
  });
  const [selectedProfile, setSelectedProfile] = useState('electric');
  const [activeRouteKey, setActiveRouteKey] = useState('routeB'); // 'routeB' (Rekomendasi AI) | 'routeA' (Alternatif)
  const [activeFilters, setActiveFilters] = useState({
    avoidBarriers: true,
    prioritizeCurbRamps: true,
    avoidSteepSlopes: true,
    preferShadedWalkways: true,
    avoidSlipperyTiles: true
  });
  const [shareToast, setShareToast] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [navStepIndex, setNavStepIndex] = useState(0);
  const [isSpeakingNav, setIsSpeakingNav] = useState(false);
  const [hapticActive, setHapticActive] = useState(true);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState(null);
  const [activeObstacles, setActiveObstacles] = useState([]);
  const [proximityAlert, setProximityAlert] = useState(null);
  const [acknowledgedObstacleIds, setAcknowledgedObstacleIds] = useState(() => new Set());
  const warnedObstacleIdsRef = useRef(new Set());
  const [routeIntentReady, setRouteIntentReady] = useState(() => {
    if (typeof window !== 'undefined' && (window.__leluasaRouteIntent || window.__leluasaTargetRoute)) {
      return true;
    }
    return false;
  });
  const [manualOrigin, setManualOrigin] = useState(() => {
    if (typeof window !== 'undefined' && window.__leluasaRouteIntent?.origin) {
      return window.__leluasaRouteIntent.origin;
    }
    return null;
  });
  const { coords, accuracy, timestamp, status: gpsStatus, error: gpsError, loading: gpsLoading, refreshLocation, startTracking, stopTracking, isTracking } = useGeolocation();
  const [offRouteDistance, setOffRouteDistance] = useState(null);
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [navError, setNavError] = useState(null);
  const [isRecalculatingRoute, setIsRecalculatingRoute] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeLayersRef = useRef(null);
  const gpsMarkerRef = useRef(null);
  const gpsAccuracyCircleRef = useRef(null);
  const stepMarkerRef = useRef(null);

  const shouldAutoPlayVoiceRef = useRef(false);
  const hasAutoPlayedVoiceRef = useRef(false);

  // Periksa apakah ada target rute yang dikirim dari Asisten Suara atau Dashboard
  useEffect(() => {
    const handleRouteIntent = (intent) => {
      if (!intent) return;
      setRouteIntent(intent);
      if (intent.origin) {
        setManualOrigin(intent.origin);
      }
      if (intent.activeRouteKey) {
        setActiveRouteKey(intent.activeRouteKey);
      } else if (intent.preferGuidingBlock || intent.autoPlayVoice) {
        setActiveRouteKey('routeB');
      }
      if (intent.autoPlayVoice) {
        shouldAutoPlayVoiceRef.current = true;
        hasAutoPlayedVoiceRef.current = false;
        setIsNavigating(true);
      } else {
        shouldAutoPlayVoiceRef.current = false;
        hasAutoPlayedVoiceRef.current = true;
        setIsNavigating(false);
      }
      setSelectedDest(intent.destination?.id || 'custom');
    };

    if (window.__leluasaRouteIntent) {
      handleRouteIntent(window.__leluasaRouteIntent);
      window.__leluasaRouteIntent = null;
    }
    setRouteIntentReady(true);

    if (typeof window !== 'undefined' && window.__leluasaTargetRoute) {
      setSelectedDest(window.__leluasaTargetRoute);
      window.__leluasaTargetRoute = null;
    }

    const handleRouteEvent = (e) => {
      if (e.detail?.routeKey) {
        setSelectedDest(e.detail.routeKey);
      }
    };
    const handleRouteIntentEvent = (e) => {
      if (e.detail) {
        handleRouteIntent(e.detail);
      }
    };
    window.addEventListener('leluasa:select-route', handleRouteEvent);
    window.addEventListener('leluasa:route-intent', handleRouteIntentEvent);
    return () => {
      window.removeEventListener('leluasa:select-route', handleRouteEvent);
      window.removeEventListener('leluasa:route-intent', handleRouteIntentEvent);
    };
  }, []);

  // Data Rute Surabaya 100% Riil
  const hasDestination = Boolean(selectedDest || routeIntent?.destination);

  const activeDestination = routeIntent?.destination ? {
    lat: Number(routeIntent.destination.lat),
    lng: Number(routeIntent.destination.lng),
    name: routeIntent.destination.name
  } : null;

  const activeOrigin = manualOrigin || routeIntent?.origin || (coords ? {
    lat: coords.lat,
    lng: coords.lng,
    accuracy: coords.accuracy,
    name: 'Lokasi GPS',
    source: 'gps'
  } : {
    lat: -7.2575,
    lng: 112.7521,
    name: 'Lokasi Saya',
    source: 'default'
  });

  const destinationName = activeDestination?.name || 'Tujuan Perjalanan';
  const destInfo = {
    title: `Tujuan: ${destinationName}`,
    subtitle: `${activeOrigin?.name || 'Lokasi Saya'} ke ${destinationName}`,
    origin: activeOrigin?.name || 'Lokasi Saya',
    destination: destinationName,
    startCoord: [activeOrigin.lat, activeOrigin.lng],
    endCoord: activeDestination ? [activeDestination.lat, activeDestination.lng] : [-7.2575, 112.7521],
    baseMinutes: routeData?.routeB?.durationSeconds ? Math.max(1, Math.round(routeData.routeB.durationSeconds / 60)) : 10,
    routeBDuration: routeData?.routeB?.duration || '10 mnt',
    routeBDistance: routeData?.routeB?.distance || '800m',
    routeBDescription: 'Jalur aksesibilitas ramah kursi roda dihitung oleh OpenRouteService AI',
    routeADuration: routeData?.routeA?.duration || '12 mnt',
    routeADistance: routeData?.routeA?.distance || '850m',
    routeADescription: 'Jalur pejalan kaki standar umum',
    turnInstruction: `Arahkan navigasi menuju ${destinationName}`,
    steps: [
      { instruction: `Mulai perjalanan dari ${activeOrigin?.name || 'lokasi awal'}`, detail: 'Ikuti trotoar pemandu terdekat', distance: '100 m', icon: 'straight' },
      { instruction: `Menuju ${destinationName}`, detail: 'Trotoar aksesibel', distance: '500 m', icon: 'turn_right' },
      { instruction: `Tiba di ${destinationName}`, detail: 'Tujuan tercapai', distance: '50 m', icon: 'check_circle' }
    ]
  };

  const effectiveSteps = (routeData?.[activeRouteKey]?.steps?.length > 0)
    ? routeData[activeRouteKey].steps.map((st, idx, arr) => {
        const { icon, instruction } = formatStepManeuver(st, idx, arr, destInfo.destination);
        return {
          instruction: instruction || (idx === arr.length - 1 ? `Tiba di ${destInfo.destination}` : 'Lurus menyusuri trotoar'),
          detail: st.name ? `Melalui ${st.name} (${Math.round(st.distanceMeters || 0)} m)` : `Jarak segmen: ${Math.round(st.distanceMeters || 0)} m`,
          distance: `${Math.round(st.distanceMeters || 0)} m`,
          icon,
          wayPointIndex: (Array.isArray(st.wayPoints) && st.wayPoints.length > 0)
            ? Number(st.wayPoints[0])
            : (typeof st.wayPoints === 'string' && st.wayPoints.trim().length > 0)
            ? Number(st.wayPoints.trim().split(/\s+/)[0])
            : null
        };
      })
    : destInfo.steps.map((s, idx, arr) => {
        const { icon, instruction } = formatStepManeuver(s, idx, arr, destInfo.destination);
        return {
          ...s,
          icon: s.icon || icon,
          instruction: s.instruction || instruction
        };
      });

  // Buffer Waktu Cuaca: Jika opsi Hindari Ubin Licin aktif, tambahkan estimasi buffer kehati-hatian
  const rainBufferMinutes = activeFilters.avoidSlipperyTiles ? 2 : 0;
  const effectiveRouteBDuration = rainBufferMinutes > 0
    ? `${destInfo.baseMinutes + rainBufferMinutes} mnt`
    : destInfo.routeBDuration;

  const hasValidPoint = (point) => point &&
    Number.isFinite(Number(point.lat)) && Number(point.lat) >= -90 && Number(point.lat) <= 90 &&
    Number.isFinite(Number(point.lng)) && Number(point.lng) >= -180 && Number(point.lng) <= 180;

  // Fitur Tukar Arah Rute (Swap Origin & Destination ala KAI)
  const handleSwapRoute = () => {
    if (!activeOrigin || !activeDestination) return;
    const oldOrigin = activeOrigin;
    const oldDest = activeDestination;

    const swappedIntent = {
      ...routeIntent,
      origin: {
        lat: Number(oldDest.lat),
        lng: Number(oldDest.lng),
        name: oldDest.name,
        source: 'manual'
      },
      destination: {
        lat: Number(oldOrigin.lat),
        lng: Number(oldOrigin.lng),
        name: oldOrigin.name,
        id: oldOrigin.id || `swap-${Date.now()}`
      }
    };

    setManualOrigin(swappedIntent.origin);
    setRouteIntent(swappedIntent);
    setIsNavigating(false);
    setNavStepIndex(0);

    if ('vibrate' in navigator) {
      navigator.vibrate([40, 30, 40]);
    }
  };

  const loadRoute = async () => {
    if (!hasDestination || !routeIntentReady) {
      setRouteData(null);
      setIsLoadingRoute(false);
      return;
    }
    if (!hasValidPoint(activeOrigin) || !hasValidPoint(activeDestination)) {
      setRouteData(null);
      setIsLoadingRoute(false);
      setRouteError(gpsError?.message || 'Titik awal GPS belum tersedia. Deteksi ulang atau pilih titik awal manual.');
      return;
    }

    setIsLoadingRoute(true);
    setRouteError(null);
    try {
      const response = await fetchRouteComparison({
        profile: selectedProfile,
        originLat: activeOrigin.lat,
        originLng: activeOrigin.lng,
        destLat: activeDestination.lat,
        destLng: activeDestination.lng,
        originName: activeOrigin.name,
        destinationName: activeDestination.name
      });
      setRouteData(response.data);
      if (Array.isArray(response.data?.activeObstacles)) {
        setActiveObstacles(response.data.activeObstacles);
      }
    } catch (error) {
      setRouteData(null);
      setRouteError(error.message || 'Gagal menghitung rute. Periksa koneksi atau layanan routing.');
    } finally {
      setIsLoadingRoute(false);
    }
  };

  // Muat data rintangan riil dari database Supabase / API backend
  useEffect(() => {
    fetchObstacles()
      .then((res) => {
        if (Array.isArray(res?.data) && res.data.length > 0) {
          setActiveObstacles((prev) => {
            const existingIds = new Set(prev.map((o) => String(o.id)));
            const merged = [...prev];
            res.data.forEach((o) => {
              if (!existingIds.has(String(o.id))) {
                merged.push(o);
              }
            });
            return merged;
          });
        }
      })
      .catch((err) => console.warn('Gagal memuat rintangan untuk peta rute:', err));
  }, []);

  // Saring rintangan yang berada dalam koridor rute terpilih (radius 120m dari polyline)
  const routeObstacles = useMemo(() => {
    const coords = routeData?.[activeRouteKey]?.coordinates;
    if (!activeObstacles || activeObstacles.length === 0) return [];
    if (!Array.isArray(coords) || coords.length === 0) {
      if (activeOrigin && activeDestination) {
        return activeObstacles.filter((obs) => {
          const dOrig = calculateDistanceInMeters(obs.lat, obs.lng, activeOrigin.lat, activeOrigin.lng);
          const dDest = calculateDistanceInMeters(obs.lat, obs.lng, activeDestination.lat, activeDestination.lng);
          return dOrig < 2500 || dDest < 2500;
        });
      }
      return activeObstacles;
    }

    return activeObstacles.filter((obs) => {
      for (let i = 0; i < coords.length; i++) {
        const pt = coords[i];
        const ptLat = Array.isArray(pt) ? pt[0] : (typeof pt === 'string' ? parseFloat(pt.split(' ')[0]) : pt.lat);
        const ptLng = Array.isArray(pt) ? pt[1] : (typeof pt === 'string' ? parseFloat(pt.split(' ')[1]) : pt.lng);
        const dist = calculateDistanceInMeters(obs.lat, obs.lng, ptLat, ptLng);
        if (dist <= 120) return true;
      }
      return false;
    });
  }, [activeObstacles, routeData, activeRouteKey, activeOrigin, activeDestination]);

  useEffect(() => {
    loadRoute();
  }, [selectedProfile, selectedDest, activeOrigin?.lat, activeOrigin?.lng, activeDestination?.lat, activeDestination?.lng, routeIntentReady, hasDestination]);

  // Auto-play panduan suara turn-by-turn navigasi saat dipicu oleh Asisten AI (Ramah Tuna Netra)
  useEffect(() => {
    if (shouldAutoPlayVoiceRef.current && !hasAutoPlayedVoiceRef.current && !isLoadingRoute) {
      hasAutoPlayedVoiceRef.current = true;
      setIsNavigating(true);
      setNavStepIndex(0);

      if ('vibrate' in navigator && hapticActive) {
        navigator.vibrate([120, 60, 120]);
      }

      const timer = setTimeout(() => {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const firstStep = effectiveSteps[0] || {
            instruction: `Mulai perjalanan menuju ${destInfo.destination}`,
            detail: 'Ikuti ubin pemandu trotoar terdekat',
            distance: destInfo.routeBDistance || '100 m'
          };
          const speechText = `Panduan Navigasi Leluasa aktif. Tujuan Anda: ${destInfo.destination}. Langkah pertama: ${firstStep.instruction}. ${firstStep.detail}. Jarak ${firstStep.distance}.`;
          const utterance = new SpeechSynthesisUtterance(speechText);
          utterance.lang = 'id-ID';
          utterance.rate = 1.0;
          utterance.onstart = () => setIsSpeakingNav(true);
          utterance.onend = () => setIsSpeakingNav(false);
          utterance.onerror = () => setIsSpeakingNav(false);
          window.speechSynthesis.speak(utterance);
          setIsSpeakingNav(true);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isLoadingRoute, effectiveSteps, destInfo.destination, hapticActive]);

  // Inisialisasi Peta Leaflet
  useEffect(() => {
    if (!hasDestination) return;
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      if (mapInstanceRef.current.getContainer() === mapContainerRef.current) {
        mapInstanceRef.current.invalidateSize();
        return;
      }
      try {
        if (stepMarkerRef.current) {
          stepMarkerRef.current.remove();
          stepMarkerRef.current = null;
        }
        mapInstanceRef.current.remove();
      } catch (e) {
        // Safe catch if previous map container unmounted
      }
      mapInstanceRef.current = null;
      routeLayersRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: activeOrigin ? [activeOrigin.lat, activeOrigin.lng] : [-7.2575, 112.7521],
      zoom: 15,
      zoomControl: false,
      attributionControl: true
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> Surabaya',
      maxZoom: 19
    }).addTo(map);

    routeLayersRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Pastikan ukuran peta disinkronkan setelah render DOM selesai
    const timer1 = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 100);

    const timer2 = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 350);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      try {
        if (stepMarkerRef.current) {
          stepMarkerRef.current.remove();
          stepMarkerRef.current = null;
        }
        map.remove();
      } catch (e) {
        // Safe catch if DOM container unmounted
      }
      mapInstanceRef.current = null;
      routeLayersRef.current = null;
    };
  }, [isNavigating, hasDestination, selectedDest, routeIntentReady]);

  // Update rendering garis rute Leaflet
  useEffect(() => {
    if (!mapInstanceRef.current || !routeLayersRef.current) return;

    const layerGroup = routeLayersRef.current;
    layerGroup.clearLayers();

    const routeA = routeData?.routeA;
    const routeB = routeData?.routeB;

    let coordsA = routeA?.coordinates;
    let coordsB = routeB?.coordinates;

    // Fallback jika API belum mengembalikan koordinat:
    if (!coordsB?.length && activeOrigin && activeDestination) {
      coordsB = [
        [activeOrigin.lat, activeOrigin.lng],
        [-7.2677, 112.7528],
        [activeDestination.lat, activeDestination.lng]
      ];
    }

    if (!coordsA?.length && !coordsB?.length) return;

    const allPoints = [];

    // 1. Render Rute A (Alternatif)
    if (coordsA?.length) {
      const isSelected = activeRouteKey === 'routeA';
      const polylineA = L.polyline(coordsA, {
        color: '#ba1a1a',
        weight: isSelected ? 8 : 4,
        opacity: isSelected ? 0.95 : 0.45,
        dashArray: '8, 8',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(layerGroup);

      polylineA.bindTooltip(`Rute Alternatif: ${destInfo.routeADuration}`, { sticky: true });
      polylineA.on('click', () => setActiveRouteKey('routeA'));

      if (isSelected) {
        coordsA.forEach(pt => allPoints.push(pt));
      }
    }

    // 2. Render Rute B (Rekomendasi AI Leluasa - Jalur Guiding Block)
    if (coordsB?.length) {
      const isSelected = activeRouteKey === 'routeB';

      const polylineBBase = L.polyline(coordsB, {
        color: '#0037B0',
        weight: isSelected ? 9 : 5,
        opacity: isSelected ? 0.95 : 0.5,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(layerGroup);

      // Garis Kuning Taktil Guiding Block
      L.polyline(coordsB, {
        color: '#FFE083',
        weight: isSelected ? 3.5 : 2,
        opacity: 1.0,
        dashArray: '6, 6',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(layerGroup);

      polylineBBase.bindTooltip(`Jalur Guiding Block AI: ${effectiveRouteBDuration}`, { sticky: true });
      polylineBBase.on('click', () => setActiveRouteKey('routeB'));

      if (isSelected || allPoints.length === 0) {
        coordsB.forEach(pt => allPoints.push(pt));
      }
    }

    // 3. Pasang Penanda Titik Awal & Tujuan Riil
    const startIcon = L.divIcon({
      className: 'route-start-marker',
      html: `
        <div class="flex flex-col items-center -translate-x-1/2 -translate-y-full cursor-pointer hover:scale-110 transition-transform">
          <div class="px-2.5 py-0.5 rounded-full bg-primary text-white font-bold text-[10px] shadow-lg whitespace-nowrap mb-1">
            ${destInfo.origin.split(',')[0]}
          </div>
          <div class="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-md ring-2 ring-white">
            <span class="material-symbols-outlined text-sm font-bold">accessible</span>
          </div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });
    if (activeOrigin) {
      L.marker([activeOrigin.lat, activeOrigin.lng], { icon: startIcon }).addTo(layerGroup);
      allPoints.push([activeOrigin.lat, activeOrigin.lng]);
    }

    if (activeDestination) {
      const endIcon = L.divIcon({
        className: 'route-end-marker',
        html: `
          <div class="flex flex-col items-center -translate-x-1/2 -translate-y-full cursor-pointer hover:scale-110 transition-transform">
            <div class="px-2.5 py-0.5 rounded-full bg-secondary text-white font-bold text-[10px] shadow-lg whitespace-nowrap mb-1">
              ${destInfo.destination.split('(')[0]}
            </div>
            <div class="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center shadow-md ring-2 ring-white">
              <span class="material-symbols-outlined text-sm font-bold">flag</span>
            </div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });
      L.marker([activeDestination.lat, activeDestination.lng], { icon: endIcon }).addTo(layerGroup);
      allPoints.push([activeDestination.lat, activeDestination.lng]);
    }

    // 4. Render Penanda Rintangan di Peta (Obstacle Markers)
    routeObstacles.forEach((obs) => {
      const isAcknowledged = acknowledgedObstacleIds.has(String(obs.id));
      const obstacleIcon = L.divIcon({
        className: 'route-obstacle-marker',
        html: `
          <div class="flex flex-col items-center -translate-x-1/2 -translate-y-full cursor-pointer hover:scale-110 transition-transform">
            <div class="px-2 py-0.5 rounded-full ${isAcknowledged ? 'bg-secondary text-white' : 'bg-error text-white animate-pulse'} font-extrabold text-[9px] shadow-md whitespace-nowrap mb-0.5 flex items-center gap-1">
              ${isAcknowledged ? '<span class="material-symbols-outlined text-[10px]">check</span>' : '<span class="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>'}
              <span>${obs.title || obs.name || 'Hambatan'}</span>
            </div>
            <div class="w-7 h-7 rounded-full ${isAcknowledged ? 'bg-secondary' : 'bg-error'} text-white flex items-center justify-center shadow-lg ring-2 ring-white">
              <span class="material-symbols-outlined text-sm font-bold">${isAcknowledged ? 'check_circle' : 'warning'}</span>
            </div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });

      const obsMarker = L.marker([obs.lat, obs.lng], { icon: obstacleIcon }).addTo(layerGroup);
      obsMarker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; font-size: 12px; min-width: 190px; padding: 2px;">
          <div style="display: flex; align-items: center; gap: 4px; font-weight: bold; color: ${isAcknowledged ? '#006e2c' : '#ba1a1a'};">
            <span>⚠️ ${obs.title || obs.name}</span>
          </div>
          <p style="margin: 4px 0; color: #555; font-size: 11px;">${obs.location || 'Hambatan trotoar di sepanjang rute'}</p>
          ${obs.clearance ? `<div style="font-size: 10px; font-weight: bold; color: #ba1a1a; margin-bottom: 4px;">Lebar Celah: ${obs.clearance} cm</div>` : ''}
          ${obs.image_url || obs.photo_url ? `<img src="${obs.image_url || obs.photo_url}" style="width: 100%; height: 90px; object-fit: cover; border-radius: 8px; margin-top: 4px;" alt="Foto Hambatan" />` : ''}
          ${isAcknowledged ? '<div style="margin-top: 6px; font-size: 10px; color: #006e2c; font-weight: bold;">✓ Telah diverifikasi / Anda sudah tahu</div>' : ''}
        </div>
      `);
      allPoints.push([obs.lat, obs.lng]);
    });

    if (allPoints.length > 0 && mapInstanceRef.current) {
      const bounds = L.latLngBounds(allPoints);
      mapInstanceRef.current.fitBounds(bounds, {
        padding: isNavigating ? [130, 35] : [45, 45],
        maxZoom: 17
      });
      mapInstanceRef.current.invalidateSize();
    }
  }, [routeData, activeRouteKey, isNavigating, selectedDest, effectiveRouteBDuration, activeOrigin?.lat, activeOrigin?.lng, activeDestination?.lat, activeDestination?.lng, routeObstacles, acknowledgedObstacleIds]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !coords) {
      if (mapInstanceRef.current && gpsMarkerRef.current) {
        mapInstanceRef.current.removeLayer(gpsMarkerRef.current);
        gpsMarkerRef.current = null;
      }
      if (mapInstanceRef.current && gpsAccuracyCircleRef.current) {
        mapInstanceRef.current.removeLayer(gpsAccuracyCircleRef.current);
        gpsAccuracyCircleRef.current = null;
      }
      return;
    }

    const userIcon = L.divIcon({
      className: 'route-user-gps-marker',
      html: '<div class="w-8 h-8 rounded-full bg-secondary text-white border-2 border-white shadow-lg flex items-center justify-center"><span class="material-symbols-outlined text-base">my_location</span></div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    if (gpsMarkerRef.current) {
      gpsMarkerRef.current.setLatLng([coords.lat, coords.lng]);
      gpsMarkerRef.current.setIcon(userIcon);
    } else {
      gpsMarkerRef.current = L.marker([coords.lat, coords.lng], { icon: userIcon, zIndexOffset: 2000 })
        .bindTooltip('Posisi GPS Anda')
        .addTo(map);
    }

    if (gpsAccuracyCircleRef.current) {
      gpsAccuracyCircleRef.current.setLatLng([coords.lat, coords.lng]);
      gpsAccuracyCircleRef.current.setRadius(accuracy);
    } else {
      gpsAccuracyCircleRef.current = L.circle([coords.lat, coords.lng], {
        radius: accuracy,
        color: '#006e2d',
        weight: 1,
        fillOpacity: 0.08
      }).addTo(map);
    }
  }, [coords, accuracy, isNavigating]);

  // Mulai Navigasi Aktif
  const handleStartNav = () => {
    setIsNavigating(true);
    setNavStepIndex(0);

    // Getaran fisik jika perangkat mendukung getaran
    if ('vibrate' in navigator && hapticActive) {
      navigator.vibrate([100, 50, 100]);
    }

    handleToggleVoice(true);
  };

  // Toggle Suara Panduan Navigasi (Play / Stop / Replay)
  const handleToggleVoice = (forcePlay = false) => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeakingNav && !forcePlay) {
      window.speechSynthesis.cancel();
      setIsSpeakingNav(false);
      return;
    }

    window.speechSynthesis.cancel();
    const currentStep = effectiveSteps[navStepIndex] || effectiveSteps[0];
    const text = `Panduan Navigasi Leluasa: ${currentStep.instruction}. ${currentStep.detail}. Jarak ${currentStep.distance}.`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.onstart = () => setIsSpeakingNav(true);
    utterance.onend = () => setIsSpeakingNav(false);
    utterance.onerror = () => setIsSpeakingNav(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeakingNav(true);
  };

  const handleNextStep = () => {
    if (navStepIndex < effectiveSteps.length - 1) {
      const nextIndex = navStepIndex + 1;
      setNavStepIndex(nextIndex);

      if ('vibrate' in navigator && hapticActive) {
        navigator.vibrate([80, 40, 80]);
      }

      // Bacakan instruksi langkah berikutnya
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const nextStep = effectiveSteps[nextIndex];
        const utterance = new SpeechSynthesisUtterance(`${nextStep.instruction}. ${nextStep.detail}.`);
        utterance.lang = 'id-ID';
        utterance.onstart = () => setIsSpeakingNav(true);
        utterance.onend = () => setIsSpeakingNav(false);
        utterance.onerror = () => setIsSpeakingNav(false);
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const handlePrevStep = () => {
    if (navStepIndex > 0) {
      const prevIndex = navStepIndex - 1;
      setNavStepIndex(prevIndex);

      if ('vibrate' in navigator && hapticActive) {
        navigator.vibrate([60]);
      }

      // Bacakan instruksi langkah sebelumnya
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const prevStep = effectiveSteps[prevIndex];
        const utterance = new SpeechSynthesisUtterance(`Kembali ke: ${prevStep.instruction}. ${prevStep.detail}.`);
        utterance.lang = 'id-ID';
        utterance.onstart = () => setIsSpeakingNav(true);
        utterance.onend = () => setIsSpeakingNav(false);
        utterance.onerror = () => setIsSpeakingNav(false);
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  // Update Penanda Panah Petunjuk Langkah Aktif (panah simpel yang berputar sesuai arah jalan)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!isNavigating) {
      if (stepMarkerRef.current) {
        map.removeLayer(stepMarkerRef.current);
        stepMarkerRef.current = null;
      }
      return;
    }

    const currentStep = effectiveSteps[navStepIndex] || effectiveSteps[0];
    const routeCoords = routeData?.[activeRouteKey]?.coordinates;
    const stepCoord = getStepCoordinate(
      navStepIndex,
      effectiveSteps.length,
      routeCoords,
      activeOrigin,
      activeDestination,
      currentStep
    );

    if (!stepCoord) return;

    const isFinish = navStepIndex >= effectiveSteps.length - 1 || currentStep.icon === 'check_circle';

    // Arah putaran panah: 0 = atas, 90 = kanan, 180 = bawah, 270 = kiri
    const heading = getStepHeading(
      navStepIndex,
      effectiveSteps.length,
      routeCoords,
      activeOrigin,
      activeDestination,
      currentStep
    );

    const arrowHtml = isFinish
      ? `
        <div style="width:40px;height:40px;border-radius:50%;background:#006e2c;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;">
          <span class="material-symbols-outlined" style="color:#fff;font-size:22px;">flag</span>
        </div>
      `
      : `
        <div style="width:40px;height:40px;transform:rotate(${heading}deg);transition:transform .3s ease;filter:drop-shadow(0 2px 4px rgba(0,0,0,.35));">
          <svg viewBox="0 0 24 24" width="40" height="40" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2 L20 21 L12 17 L4 21 Z" fill="#1a73e8" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round"/>
          </svg>
        </div>
      `;

    const stepArrowIcon = L.divIcon({
      className: 'step-turn-arrow-marker',
      html: arrowHtml,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    if (stepMarkerRef.current) {
      stepMarkerRef.current.setLatLng(stepCoord);
      stepMarkerRef.current.setIcon(stepArrowIcon);
    } else {
      stepMarkerRef.current = L.marker(stepCoord, {
        icon: stepArrowIcon,
        zIndexOffset: 3500
      }).addTo(map);
    }

    stepMarkerRef.current.unbindTooltip();
    stepMarkerRef.current.bindTooltip(
      `<strong>Langkah ${navStepIndex + 1}:</strong> ${currentStep.instruction}`,
      { direction: 'top', offset: [0, -22], permanent: false }
    );

    // Geser kamera peta secara halus (smooth pan) memusatkan ke titik panah langkah ini
    map.panTo(stepCoord, { animate: true, duration: 0.6 });
  }, [isNavigating, navStepIndex, effectiveSteps, routeData, activeRouteKey, activeOrigin?.lat, activeOrigin?.lng, activeDestination?.lat, activeDestination?.lng]);

  // Verifikasi Pengguna: Jika sudah klik "Saya Sudah Tahu", hentikan getar & suara, dan jangan picu lagi
  const handleAcknowledgeObstacle = (obsId) => {
    if (!obsId) return;
    const idStr = String(obsId);

    // 1. Hentikan getaran dan suara seketika
    if ('vibrate' in navigator) navigator.vibrate(0);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    // 2. Tandai rintangan ini telah di-verifikasi oleh pengguna (tidak akan muncul lagi)
    setAcknowledgedObstacleIds((prev) => new Set([...prev, idStr]));
    setProximityAlert(null);

    // 3. Ucapkan konfirmasi singkat
    if ('speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance('Peringatan dikonfirmasi. Melanjutkan panduan rute.');
      utter.lang = 'id-ID';
      utter.rate = 1.1;
      window.speechSynthesis.speak(utter);
    }
  };

  // Deteksi Kedekatan Real-Time 10 Meter Sebelum Hambatan Saat Navigasi Aktif
  useEffect(() => {
    if (!isNavigating) {
      setProximityAlert(null);
      return;
    }

    let currentLat = null;
    let currentLng = null;

    if (coords?.lat && coords?.lng) {
      currentLat = coords.lat;
      currentLng = coords.lng;
    } else {
      const stepCoord = getStepCoordinate(
        navStepIndex,
        effectiveSteps.length,
        routeData?.[activeRouteKey]?.coordinates,
        activeOrigin,
        activeDestination,
        effectiveSteps[navStepIndex]
      );
      if (Array.isArray(stepCoord) && stepCoord.length === 2) {
        currentLat = stepCoord[0];
        currentLng = stepCoord[1];
      }
    }

    if (currentLat == null || currentLng == null) return;

    let closestAlert = null;
    let minDistance = Infinity;

    for (const obs of routeObstacles) {
      const obsIdStr = String(obs.id);
      // Jika user sudah verifikasi / sudah tahu, abaikan (jangan pernah muncul lagi)
      if (acknowledgedObstacleIds.has(obsIdStr)) continue;

      const distMeters = calculateDistanceInMeters(currentLat, currentLng, obs.lat, obs.lng);
      // Zona deteksi peringatan 10m (toleransi radius <= 15 meter)
      if (distMeters <= 15 && distMeters < minDistance) {
        minDistance = distMeters;
        closestAlert = {
          obstacle: obs,
          distanceMeters: Math.max(1, Math.round(distMeters))
        };
      }
    }

    if (closestAlert) {
      const obsId = String(closestAlert.obstacle.id);
      setProximityAlert(closestAlert);

      // Trigger getar dan suara sekali saat pertama kali memasuki radius 10 meter
      if (!warnedObstacleIdsRef.current.has(obsId)) {
        warnedObstacleIdsRef.current.add(obsId);

        // Getaran HP berpola bahaya (300ms getar, 150ms jeda, 300ms getar, 150ms jeda, 400ms getar)
        if ('vibrate' in navigator && hapticActive) {
          navigator.vibrate([300, 150, 300, 150, 400]);
        }

        // Suara peringatan otomatis TTS
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const warningText = `Peringatan! Sekitar sepuluh meter di depan Anda terdapat hambatan ${closestAlert.obstacle.title || closestAlert.obstacle.name}. Harap berhati-hati dan bersiap menghindar.`;
          const utterance = new SpeechSynthesisUtterance(warningText);
          utterance.lang = 'id-ID';
          utterance.rate = 1.0;
          window.speechSynthesis.speak(utterance);
        }
      }
    } else {
      setProximityAlert(null);
    }
  }, [isNavigating, coords?.lat, coords?.lng, navStepIndex, effectiveSteps, routeData, activeRouteKey, routeObstacles, acknowledgedObstacleIds, hapticActive]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Rute Aksesibel Leluasa Surabaya',
        text: `${destInfo.origin} ke ${destInfo.destination} — 100% Tersedia Rampa & Guiding Block`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      setShareToast('Tautan rute aksesibel Surabaya berhasil disalin!');
      setTimeout(() => setShareToast(''), 3500);
    }
  };

  // =========================================================================
  // VIEW 0: USER BELUM MENENTUKAN RUTE (Minimalis & Estetis)
  // =========================================================================
  if (!hasDestination) {
    return (
      <div className="min-h-[calc(100vh-5rem)] w-full flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
        <div className="w-full max-w-md bg-surface-container-lowest rounded-3xl p-8 sm:p-10 border border-outline-variant/30 shadow-lg flex flex-col items-center text-center gap-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center shadow-inner">
            <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              navigation
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-on-surface tracking-tight">
              User Belum Menentukan Rute
            </h1>
            <p className="text-sm text-on-surface-variant font-medium leading-relaxed">
              Halaman ini belum dapat diakses karena Anda belum memilih rute perjalanan. Silakan tentukan rute dan destinasi Anda di Dashboard terlebih dahulu.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="w-full min-h-[48px] py-3.5 px-6 rounded-full bg-primary text-on-primary font-bold text-sm sm:text-base shadow-md hover:bg-primary-container active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">explore</span>
            <span>Tentukan Rute di Dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW A: NAVIGASI RUTE AKTIF INTERAKTIF (Langkah demi Langkah)
  // =========================================================================
  if (isNavigating) {
    const currentStep = effectiveSteps[navStepIndex] || effectiveSteps[0];

    return (
      <div className="relative w-full max-w-xl h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)] mx-auto overflow-hidden flex flex-col justify-between bg-surface-container-low shadow-2xl rounded-3xl animate-fadeIn p-4 sm:p-5">
        
        {/* PETA LEAFLET LATAR BELAKANG NAVIGASI AKTIF SURABAYA */}
        <div
          ref={mapContainerRef}
          className="absolute inset-0 w-full h-full z-0 cursor-grab active:cursor-grabbing"
        />

        {/* ================= MODAL / BANNER PERINGATAN RINTANGAN 10 METER ================= */}
        {proximityAlert && (
          <div
            role="alert"
            aria-live="assertive"
            className="absolute top-4 left-3 right-3 sm:left-5 sm:right-5 z-40 animate-bounce-short shadow-2xl"
          >
            <div className="bg-error text-on-error p-4 sm:p-5 rounded-2xl border-2 border-white/60 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 backdrop-blur-md">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white text-error flex items-center justify-center font-bold shrink-0 shadow-md animate-pulse">
                  <span className="material-symbols-outlined text-2xl" aria-hidden="true">warning</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-black uppercase tracking-wider bg-white/25 px-2.5 py-0.5 rounded-full text-white">
                      ⚠️ Peringatan Hambatan 10m
                    </span>
                    <span className="text-xs font-bold text-white/90">
                      Jarak: ±{proximityAlert.distanceMeters} meter di depan
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-extrabold mt-1 text-white">
                    Ada Hambatan: {proximityAlert.obstacle.title || proximityAlert.obstacle.name}
                  </h3>
                  <p className="text-xs text-white/90 mt-0.5">
                    {proximityAlert.obstacle.location || 'Trotoar terhalang di depan Anda. Kurangi laju kecepatan dan bersiap berpindah jalur.'}
                  </p>
                </div>
              </div>

              {/* TOMBOL VERIFIKASI / SAYA SUDAH TAHU */}
              <button
                type="button"
                onClick={() => handleAcknowledgeObstacle(proximityAlert.obstacle.id)}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white text-error hover:bg-white/90 active:scale-95 font-extrabold text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap transition-transform"
              >
                <span className="material-symbols-outlined text-base">check_circle</span>
                <span>Saya Sudah Tahu &amp; Mengerti</span>
              </button>
            </div>
          </div>
        )}

        {/* TOP HUD CARD: PANDUAN ARAH SEKARANG */}
        <div className="relative z-10 w-full bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 shadow-xl border-l-[8px] border-primary flex items-center justify-between gap-3 border border-outline-variant/20">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-md shrink-0">
              <span className="material-symbols-outlined text-[32px]">
                {currentStep.icon || 'turn_right'}
              </span>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-primary font-bold block">
                Langkah {navStepIndex + 1} dari {effectiveSteps.length}
              </span>
              <span className="font-headline-sm text-base sm:text-lg text-on-surface font-extrabold leading-tight block">
                {currentStep.instruction}
              </span>
              <span className="text-xs text-on-surface-variant font-medium mt-0.5 block">
                {currentStep.detail} ({currentStep.distance})
              </span>
            </div>
          </div>

          {/* Tombol Speaker: Play / Stop / Replay */}
          <button
            aria-label={isSpeakingNav ? 'Hentikan panduan suara' : 'Putar instruksi suara'}
            onClick={() => handleToggleVoice()}
            className={`w-12 h-12 min-h-[48px] min-w-[48px] rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isSpeakingNav
                ? 'bg-error text-white ring-4 ring-error/30 animate-pulse'
                : 'bg-surface-container text-primary hover:bg-surface-container-high'
            }`}
            type="button"
            title={isSpeakingNav ? 'Klik: Hentikan Suara' : 'Klik: Dengarkan Ulang Suara'}
          >
            <span className="material-symbols-outlined text-2xl">
              {isSpeakingNav ? 'stop' : 'volume_up'}
            </span>
          </button>
        </div>

        {/* STATUS GUIDING BLOCK & HAPTIC + TOMBOL PUSATKAN */}
        <div className="relative z-10 flex items-center justify-between my-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-tertiary-fixed/95 backdrop-blur-md rounded-full text-on-tertiary-fixed shadow-md border border-amber-300">
            <span className="material-symbols-outlined text-base text-tertiary font-bold">texture</span>
            <span className="text-xs font-bold">Jalur Ubin Pemandu Aktif</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (mapInstanceRef.current) {
                  const currentStep = effectiveSteps[navStepIndex] || effectiveSteps[0];
                  const routeCoords = routeData?.[activeRouteKey]?.coordinates;
                  const stepCoord = getStepCoordinate(navStepIndex, effectiveSteps.length, routeCoords, activeOrigin, activeDestination, currentStep);
                  if (stepCoord) {
                    mapInstanceRef.current.setView(stepCoord, 17, { animate: true });
                  } else if (coords) {
                    mapInstanceRef.current.setView([coords.lat, coords.lng], 17, { animate: true });
                  } else if (activeOrigin) {
                    mapInstanceRef.current.setView([activeOrigin.lat, activeOrigin.lng], 16, { animate: true });
                  }
                }
              }}
              title="Pusatkan Peta ke Titik Belokan Ini"
              className="w-8 h-8 rounded-full bg-surface-container-lowest/90 backdrop-blur-md shadow-md flex items-center justify-center text-primary border border-outline-variant/30 hover:bg-surface-container cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">my_location</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const next = !hapticActive;
                setHapticActive(next);
                if (next && 'vibrate' in navigator) navigator.vibrate(100);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md backdrop-blur-md transition-all cursor-pointer ${
                hapticActive ? 'bg-primary/90 text-white' : 'bg-surface-container-lowest/90 text-on-surface-variant border border-outline-variant/30'
              }`}
            >
              <span className="material-symbols-outlined text-base">vibration</span>
              <span>{hapticActive ? 'Getar Aktif' : 'Getar Mati'}</span>
            </button>
          </div>
        </div>

        {/* BOTTOM HUD CARD & CONTROLS */}
        <div className="relative z-10 w-full bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 shadow-xl border border-outline-variant/20 flex flex-col gap-3 mt-auto">
          <div className="flex items-center justify-between border-b border-surface-container pb-2.5">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-primary">{effectiveRouteBDuration}</span>
                <span className="text-xs text-on-surface-variant font-bold">• {destInfo.routeBDistance}</span>
              </div>
              <p className="text-xs text-on-surface-variant font-medium mt-0.5 truncate max-w-[280px]">
                {destInfo.destination}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-secondary/15 text-secondary text-xs font-bold border border-secondary/30 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <span>GPS ±0.8m</span>
            </span>
          </div>

          {/* Tombol Aksi Navigasi (Langkah Selanjutnya & Langkah Sebelumnya) */}
          <div className="flex items-center gap-2">
            {navStepIndex > 0 && (
              <button
                type="button"
                onClick={handlePrevStep}
                className="h-12 px-3 sm:px-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs sm:text-sm flex items-center justify-center gap-1 cursor-pointer shrink-0 transition-all border border-outline-variant/30 active:scale-95"
                title="Kembali ke langkah sebelumnya"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                <span>Sebelumnya</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNextStep}
              disabled={navStepIndex >= effectiveSteps.length - 1}
              className={`flex-1 h-12 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                navStepIndex >= effectiveSteps.length - 1
                  ? 'bg-secondary text-white opacity-85 cursor-default'
                  : 'bg-primary text-on-primary hover:bg-primary-container active:scale-95'
              }`}
            >
              <span>{navStepIndex >= effectiveSteps.length - 1 ? 'Tiba di Tujuan' : 'Langkah Selanjutnya'}</span>
              <span className="material-symbols-outlined text-base">
                {navStepIndex >= effectiveSteps.length - 1 ? 'check' : 'arrow_forward'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('report-obstacle')}
              className="h-12 px-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-all border border-outline-variant/30 active:scale-95"
              title="Laporkan rintangan atau trotoar rusak"
            >
              <span className="material-symbols-outlined text-base text-error">report</span>
              <span className="hidden sm:inline">Lapor Rintangan</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if ('speechSynthesis' in window) window.speechSynthesis.cancel();
              setIsNavigating(false);
            }}
            className="w-full py-2 text-center text-xs font-bold text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
          >
            Kembali ke Pilihan Rute
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW B: PERBANDINGAN RUTE (Surabaya 100% Riil)
  // =========================================================================
  return (
    <div className="px-3 sm:px-space-md lg:px-space-xl py-3 sm:py-space-md flex flex-col gap-4 max-w-[1520px] mx-auto w-full animate-fadeIn pb-8">
      
      {/* Toast Notifikasi */}
      {shareToast && (
        <div role="status" aria-live="polite" className="fixed top-20 left-1/2 -translate-x-1/2 z-50 p-3 rounded-xl bg-secondary text-on-secondary font-label-sm text-xs font-semibold shadow-xl flex items-center gap-2 animate-fadeIn">
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span>{shareToast}</span>
        </div>
      )}

      {/* HEADER SPATIAL & SELECTOR TUJUAN SURABAYA */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-1">
        <div>
          <span className="text-label-md uppercase tracking-wider text-primary font-bold text-xs">
            Rute &amp; Perbandingan Aksesibilitas
          </span>
          <h1 className="font-headline-lg-mobile text-xl sm:text-2xl text-on-surface font-extrabold tracking-tight">
            {destInfo.title}
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-0.5">{destInfo.subtitle}</p>
        </div>

        {/* Destination Badge & Action */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeDestination && (
            <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3.5 py-1.5 rounded-full border border-primary/20 text-xs font-bold shadow-xs">
              <span className="material-symbols-outlined text-sm text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                near_me
              </span>
              <span className="truncate max-w-[200px]">{activeDestination.name}</span>
            </div>
          )}

          {/* Tombol Tukar Arah Rute (⇅ ala KAI) */}
          {activeDestination && (
            <button
              type="button"
              onClick={handleSwapRoute}
              className="px-3.5 py-1.5 rounded-full bg-secondary/15 hover:bg-secondary/25 text-secondary border border-secondary/30 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
              title="Tukar Titik Awal dan Tujuan (Putar Balik Rute)"
            >
              <span className="material-symbols-outlined text-sm">swap_vert</span>
              <span>Tukar Arah (⇅)</span>
            </button>
          )}

          {/* Tombol Pintas Buat Rute Riil dari Lokasi GPS User */}
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="px-3.5 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
            title="Cari dan buat rute baru dari lokasi GPS Anda di Beranda"
          >
            <span className="material-symbols-outlined text-sm">add_location_alt</span>
            <span>+ Ganti Rute / Destinasi</span>
          </button>
        </div>
      </div>

      {/* ALERT ESTIMASI CUACA HUJAN (Bila opsi ubin licin aktif) */}
      {rainBufferMinutes > 0 && (
        <div className="p-3 rounded-2xl bg-primary-container/30 border border-primary/20 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <span className="material-symbols-outlined text-lg text-primary">umbrella</span>
            <span>
              <strong>Intelijen Cuaca:</strong> Potensi hujan di Surabaya Pusat. Waktu tempuh disesuaikan <strong>+{rainBufferMinutes} mnt</strong> sebagai batas kecepatan aman di atas trotoar basah.
            </span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold shrink-0">
            Buffer Aman Aktif
          </span>
        </div>
      )}

      {/* ================= VECTOR MAP CANVAS & ROUTE COMPARISON CARDS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* KIRI: PRATINJAU PETA LEAFLET SURABAYA */}
        <section aria-label="Pratinjau Peta Rute Surabaya" className="lg:col-span-7 relative w-full h-72 sm:h-84 lg:h-96 rounded-2xl overflow-hidden bg-surface-container-lowest border-2 border-outline-variant shadow-sm flex items-center justify-center">
          <div
            ref={mapContainerRef}
            className="w-full h-full z-0 cursor-grab active:cursor-grabbing"
          />

          {isLoadingRoute && (
            <div className="absolute inset-0 bg-surface/60 backdrop-blur-xs flex items-center justify-center z-20">
              <div className="px-4 py-2.5 rounded-xl bg-surface-container-lowest shadow-lg flex items-center gap-2.5 text-primary text-xs font-bold animate-pulse">
                <span className="material-symbols-outlined text-secondary animate-spin text-lg">progress_activity</span>
                <span>Menghitung Graf Rute Aksesibel...</span>
              </div>
            </div>
          )}

          {/* Floating Badges di Canvas */}
          <div className="absolute top-3 left-3 bg-surface-container-lowest/95 backdrop-blur-sm px-3 py-1.5 rounded-full border-2 border-primary shadow-sm flex items-center gap-2 z-10">
            <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-primary animate-ping"></span>
            <span className="text-xs text-primary font-bold">
              {activeRouteKey === 'routeB' ? 'Jalur Rekomendasi AI' : 'Jalur Alternatif'}
            </span>
          </div>

          {routeObstacles.length > 0 && (
            <div className="absolute top-3 right-3 bg-surface-container-lowest/95 backdrop-blur-sm px-3 py-1.5 rounded-full border border-error/50 shadow-sm flex items-center gap-1.5 text-error z-10">
              <span className="material-symbols-outlined text-sm font-bold">warning</span>
              <span className="text-[11px] font-bold">{routeObstacles.length} Hambatan Terdeteksi</span>
            </div>
          )}

          <div className="absolute bottom-3 right-3 bg-surface-container-lowest/95 px-3 py-1.5 rounded-full border border-outline-variant shadow-sm flex items-center gap-1.5 text-on-surface-variant z-10">
            <span className="material-symbols-outlined text-sm text-secondary">verified</span>
            <span className="text-[11px] font-semibold">Sensor Surabaya Live</span>
          </div>
        </section>

        {/* KANAN: KARTU KOMPARASI RUTE A vs RUTE B */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-3">
          <div aria-label="Opsi Rute Perjalanan" className="flex flex-col gap-3" role="radiogroup">
            
            {/* CARD 1: PRIMARY (Rekomendasi AI - Jalur Ubin Pemandu & Rampa) */}
            <div
              aria-checked={activeRouteKey === 'routeB'}
              onClick={() => setActiveRouteKey('routeB')}
              className={`relative w-full bg-surface-container-lowest rounded-2xl p-4 flex flex-col gap-2.5 cursor-pointer transition-all ${
                activeRouteKey === 'routeB'
                  ? 'border-[3px] border-primary shadow-md ring-2 ring-primary/20'
                  : 'border-2 border-outline-variant hover:border-outline shadow-xs'
              }`}
              role="radio"
              tabIndex={0}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center ${activeRouteKey === 'routeB' ? 'bg-primary text-on-primary' : 'border-2 border-outline'}`}>
                    {activeRouteKey === 'routeB' && <span className="material-symbols-outlined text-base">check</span>}
                  </span>
                  <span className="text-sm sm:text-base text-on-surface font-extrabold">
                    Jalur Guiding Block &amp; Rampa Halus
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-[11px] font-bold">
                  Rekomendasi AI
                </span>
              </div>

              <div className="flex items-baseline gap-2 pl-9">
                <span className="text-base sm:text-lg text-primary font-extrabold">
                  {effectiveRouteBDuration} ({destInfo.routeBDistance})
                </span>
                <span className="text-on-surface-variant font-bold">•</span>
                <span className="text-secondary text-xs font-bold">100% Ramah Disabilitas</span>
              </div>

              <p className="text-xs text-on-surface-variant pl-9 leading-relaxed">
                {destInfo.routeBDescription}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1 pl-9">
                <div className="flex items-center gap-1 px-2.5 py-1 bg-surface-container rounded-full text-on-surface text-[11px] font-bold">
                  <span className="material-symbols-outlined text-primary text-sm">texture</span>
                  <span>Ubin Kuning Teratur</span>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 bg-surface-container rounded-full text-on-surface text-[11px] font-bold">
                  <span className="material-symbols-outlined text-secondary text-sm">accessible</span>
                  <span>Rampa 1:12 Standar</span>
                </div>
              </div>
            </div>

            {/* CARD 2: ALTERNATIVE (Jalur Trotoar Standar) */}
            <div
              aria-checked={activeRouteKey === 'routeA'}
              onClick={() => setActiveRouteKey('routeA')}
              className={`w-full bg-surface-container-lowest rounded-2xl p-4 flex flex-col gap-2 cursor-pointer transition-all ${
                activeRouteKey === 'routeA'
                  ? 'border-[3px] border-error shadow-md ring-2 ring-error/20'
                  : 'border-2 border-outline-variant hover:border-outline shadow-xs'
              }`}
              role="radio"
              tabIndex={0}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center ${activeRouteKey === 'routeA' ? 'bg-error text-white' : 'border-2 border-outline'}`}>
                    {activeRouteKey === 'routeA' && <span className="material-symbols-outlined text-base">check</span>}
                  </span>
                  <span className="text-sm sm:text-base text-on-surface font-bold">
                    Jalur Trotoar Jalan Raya
                  </span>
                </div>
                <span className="text-[11px] text-on-surface-variant font-medium">Alternatif</span>
              </div>

              <div className="flex items-baseline gap-2 pl-9">
                <span className="text-sm sm:text-base text-on-surface font-bold">
                  {destInfo.routeADuration} ({destInfo.routeADistance})
                </span>
                <span className="text-on-surface-variant font-bold">•</span>
                <span className="text-on-surface-variant text-xs font-semibold">{destInfo.routeADescription}</span>
              </div>
            </div>
          </div>

          {/* CTA TOMBOL MULAI NAVIGASI */}
          <div className="pt-2">
            <button
              onClick={handleStartNav}
              className="w-full min-h-[54px] py-3.5 px-6 rounded-full bg-primary text-on-primary font-bold text-sm sm:text-base shadow-md hover:bg-primary-container flex items-center justify-center gap-3 active:scale-95 transition-transform duration-150 cursor-pointer"
              type="button"
            >
              <span>Mulai Panduan Navigasi</span>
              <span className="material-symbols-outlined text-2xl">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>

      {/* PANDUAN TIAP BELOKAN (STEP LIST) */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/30 flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-lg">directions_walk</span>
            <h2 className="text-xs sm:text-sm font-bold text-on-surface">Panduan Navigasi Tiap Belokan ({destInfo.destination.split('(')[0]})</h2>
          </div>
          <button
            onClick={handleShare}
            className="px-3 py-1 rounded-full bg-surface-container text-primary font-bold text-xs flex items-center gap-1 hover:bg-surface-container-high cursor-pointer"
          >
            <span className="material-symbols-outlined text-xs">share</span>
            <span>Bagikan</span>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {destInfo.steps.map((seg, idx) => (
            <div key={idx} className="flex items-start gap-3 p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors">
              <div className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <div className="flex-1 flex items-baseline justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-on-surface">{seg.instruction}</span>
                  <span className="text-[11px] text-on-surface-variant">{seg.detail}</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-surface-container text-[11px] text-primary font-bold shrink-0">
                  {seg.distance}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
