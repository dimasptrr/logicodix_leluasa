import * as realApi from '../../../services/api.js';
import {
  mockObstacles,
  mockRouteComparison,
  mockWeather,
  mockStats,
  mockPlaces
} from '../mocks/mockData.js';

// In-memory cache for live interactive actions during offline demo
let inMemoryObstacles = [...mockObstacles];

// Global flag to track if fallback mock data has been activated
let isFallbackActive = false;
const listeners = new Set();

function notifyListeners() {
  listeners.forEach(fn => fn(isFallbackActive));
}

export function subscribeMockStatus(listener) {
  listeners.add(listener);
  listener(isFallbackActive);
  return () => listeners.delete(listener);
}

export function getIsFallbackActive() {
  return isFallbackActive;
}

function activateFallback() {
  if (!isFallbackActive) {
    isFallbackActive = true;
    notifyListeners();
  }
}

// const SUPABASE_REST_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL)
//   ? `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/laporan_leluasa`
//   : 'https://ifqkpxeydmznkwakzygn.supabase.co/rest/v1/laporan_leluasa';
// const SUPABASE_KEY = (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_SUPABASE_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY)) || '';

async function fetchFromSupabaseDirectly() {
  try {
    const res = await fetch(`${SUPABASE_REST_URL}?select=*&order=created_at.desc`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });
    if (!res.ok) return [];
    const rows = await res.json();
    return rows.map(r => ({
      id: String(r.id),
      title: r.obstacle_type || 'Rintangan Trotoar',
      name: r.obstacle_type || 'Rintangan Trotoar',
      location: `Titik GPS (${r.latitude?.toFixed(6)}, ${r.longitude?.toFixed(6)})`,
      location_text: `Titik GPS (${r.latitude?.toFixed(6)}, ${r.longitude?.toFixed(6)})`,
      category: r.obstacle_type,
      severity: r.severity || 'difficult',
      status: r.verification_status || 'active',
      lat: r.latitude,
      lng: r.longitude,
      latitude: r.latitude,
      longitude: r.longitude,
      coordinates: { lat: r.latitude, lng: r.longitude },
      clearance: r.gap_width === 'less_80' ? 65 : r.gap_width === '80_120' ? 95 : 120,
      clearance_cm: r.gap_width === 'less_80' ? 65 : r.gap_width === '80_120' ? 95 : 120,
      upvotes: 1,
      confirmedCount: 1,
      reported_at: r.created_at,
      created_at: r.created_at,
      reportedTime: r.created_at,
      notes: r.weather_condition || '',
      image_url: r.photo_url || 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=600',
      photo_url: r.photo_url
    }));
  } catch (e) {
    console.warn('[safeApi] Supabase direct fetch warning:', e.message);
    return [];
  }
}

export async function fetchObstacles(filters = {}) {
  try {
    const res = await realApi.fetchObstacles(filters);
    return res;
  } catch (err) {
    activateFallback();

    // Ambil laporan riil langsung dari database Supabase jika server lokal belum online
    let realSupabaseData = [];
    try {
      realSupabaseData = await fetchFromSupabaseDirectly();
    } catch (_) { }

    const existingIds = new Set(realSupabaseData.map(r => String(r.id)));
    const merged = [
      ...realSupabaseData,
      ...inMemoryObstacles.filter(o => !existingIds.has(String(o.id)))
    ];

    let data = [...merged];

    if (filters.severity && filters.severity !== 'all') {
      data = data.filter(obs => obs.severity === filters.severity);
    }
    if (filters.status && filters.status !== 'all') {
      data = data.filter(obs => obs.status === filters.status);
    }
    if (filters.category) {
      data = data.filter(obs => obs.category.toLowerCase().includes(filters.category.toLowerCase()));
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      data = data.filter(obs =>
        obs.title.toLowerCase().includes(q) ||
        obs.location.toLowerCase().includes(q)
      );
    }

    return {
      success: true,
      isMock: true,
      data
    };
  }
}

export async function fetchObstacleById(id) {
  try {
    const res = await realApi.fetchObstacleById(id);
    return res;
  } catch (err) {
    activateFallback();
    const found = inMemoryObstacles.find(o => o.id === id) || inMemoryObstacles[0];
    return {
      success: true,
      isMock: true,
      data: found
    };
  }
}

export async function createObstacle(obstacleData) {
  try {
    const res = await realApi.createObstacle(obstacleData);
    if (res?.data) {
      inMemoryObstacles.unshift(res.data);
    }
    return res;
  } catch (err) {
    // Jika server backend offline, simpan langsung ke Supabase
    try {
      const publicPhotoUrl = obstacleData.uploadedImage?.startsWith('data:')
        ? 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=600'
        : (obstacleData.uploadedImage || 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=600');

      const payload = {
        photo_url: publicPhotoUrl,
        latitude: Number(obstacleData.coordinates?.lat || obstacleData.lat),
        longitude: Number(obstacleData.coordinates?.lng || obstacleData.lng),
        obstacle_type: String(obstacleData.category || obstacleData.title).trim(),
        severity: obstacleData.severity === 'passable' ? 'caution' : obstacleData.severity,
        gap_width: String(!obstacleData.clearance ? 'less_80' : obstacleData.clearance < 80 ? 'less_80' : obstacleData.clearance <= 120 ? '80_120' : 'more_120'),
        verification_status: 'pending',
        weather_condition: obstacleData.notes ? String(obstacleData.notes).slice(0, 100) : 'Rintangan trotoar dilaporkan oleh warga.'
      };

      const resSup = await fetch(SUPABASE_REST_URL, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify(payload)
      });

      if (resSup.ok) {
        const createdRows = await resSup.json();
        const newObs = {
          id: String(createdRows[0]?.id || Date.now()),
          title: obstacleData.title,
          category: obstacleData.category,
          severity: obstacleData.severity,
          status: 'pending',
          lat: payload.latitude,
          lng: payload.longitude,
          notes: obstacleData.notes,
          photo_url: publicPhotoUrl,
          created_at: new Date().toISOString()
        };
        inMemoryObstacles.unshift(newObs);
        return { success: true, isMock: true, data: newObs };
      }
    } catch (e2) {
      console.warn('[safeApi] Direct Supabase insert fallback failed:', e2.message);
    }
    throw err;
  }
}

export async function upvoteObstacle(id) {
  try {
    const res = await realApi.upvoteObstacle(id);
    return res;
  } catch (err) {
    activateFallback();
    const index = inMemoryObstacles.findIndex(o => o.id === id);
    if (index !== -1) {
      const updated = {
        ...inMemoryObstacles[index],
        upvotes: (inMemoryObstacles[index].upvotes || 0) + 1,
        confirmedCount: (inMemoryObstacles[index].confirmedCount || 0) + 1
      };
      inMemoryObstacles[index] = updated;
      return {
        success: true,
        isMock: true,
        data: updated
      };
    }
    return {
      success: true,
      isMock: true,
      data: { id, upvotes: 2, confirmedCount: 2 }
    };
  }
}

export async function resolveObstacle(id) {
  try {
    const res = await realApi.resolveObstacle(id);
    return res;
  } catch (err) {
    activateFallback();
    const index = inMemoryObstacles.findIndex(o => o.id === id);
    if (index !== -1) {
      const updated = {
        ...inMemoryObstacles[index],
        status: 'resolved',
        severity: 'passable',
        clearanceLabel: 'Telah Ditangani'
      };
      inMemoryObstacles[index] = updated;
      return {
        success: true,
        isMock: true,
        data: updated
      };
    }
    return {
      success: true,
      isMock: true,
      data: { id, status: 'resolved' }
    };
  }
}

export async function dispatchDpupr(id) {
  try {
    const res = await realApi.dispatchDpupr(id);
    return res;
  } catch (err) {
    activateFallback();
    const ticketId = `DPUPR-SUB-${Math.floor(10000 + Math.random() * 90000)}`;
    const index = inMemoryObstacles.findIndex(o => o.id === id);
    if (index !== -1) {
      inMemoryObstacles[index] = {
        ...inMemoryObstacles[index],
        dpuprForwarded: true
      };
    }
    return {
      success: true,
      isMock: true,
      ticketId,
      message: `Dispatched to DPUPR Surabaya (Tiket #${ticketId})`
    };
  }
}

export async function fetchRouteComparison(params = {}) {
  try {
    const res = await realApi.fetchRouteComparison(params);
    return res;
  } catch (err) {
    activateFallback();
    return {
      success: true,
      isMock: true,
      data: mockRouteComparison
    };
  }
}

export async function planRoute(data) {
  try {
    const res = await realApi.planRoute(data);
    return res;
  } catch (err) {
    activateFallback();
    return {
      success: true,
      isMock: true,
      data: mockRouteComparison
    };
  }
}

export async function fetchWeather() {
  try {
    const res = await realApi.fetchWeather();
    return res;
  } catch (err) {
    activateFallback();
    return {
      success: true,
      isMock: true,
      data: mockWeather
    };
  }
}

export async function fetchStats() {
  try {
    const res = await realApi.fetchStats();
    return res;
  } catch (err) {
    activateFallback();
    return {
      success: true,
      isMock: true,
      data: {
        ...mockStats,
        obstaclesReported: inMemoryObstacles.length + 380
      }
    };
  }
}

export async function fetchPlaces(search = '') {
  try {
    const res = await realApi.fetchPlaces(search);
    return res;
  } catch (err) {
    activateFallback();
    const q = (search || '').toLowerCase();
    const filtered = q
      ? mockPlaces.filter(p => p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q))
      : mockPlaces;
    return {
      success: true,
      isMock: true,
      data: filtered
    };
  }
}

export async function geocodeSearch(query, lat = null, lng = null) {
  try {
    const res = await realApi.geocodeSearch(query, lat, lng);
    return res;
  } catch (err) {
    console.warn('Geocode API fallback:', err.message);
    return { status: 'success', data: [] };
  }
}

export async function reverseGeocode(lat, lng) {
  try {
    const res = await realApi.reverseGeocode(lat, lng);
    return res;
  } catch (err) {
    console.warn('Reverse geocode fallback:', err.message);
    return {
      status: 'success',
      data: {
        name: `Titik Pilihan Peta (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
        address: `Koordinat: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        lat,
        lng
      }
    };
  }
}

