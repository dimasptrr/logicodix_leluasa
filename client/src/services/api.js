const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function fetchObstacles(filters = {}) {
  const query = new URLSearchParams();
  if (filters.severity && filters.severity !== 'all') query.append('severity', filters.severity);
  if (filters.status && filters.status !== 'all') query.append('status', filters.status);
  if (filters.category) query.append('category', filters.category);
  if (filters.search) query.append('search', filters.search);

  const res = await fetch(`${API_BASE}/obstacles?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch obstacles');
  return res.json();
}

export async function fetchObstacleById(id) {
  const res = await fetch(`${API_BASE}/obstacles/${id}`);
  if (!res.ok) throw new Error('Failed to fetch obstacle details');
  return res.json();
}

export async function createObstacle(obstacleData) {
  const res = await fetch(`${API_BASE}/obstacles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obstacleData)
  });
  const result = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(result?.message || result?.error || 'Laporan gagal disimpan ke server.');
  }
  return result;
}

export async function upvoteObstacle(id) {
  const res = await fetch(`${API_BASE}/obstacles/${id}/upvote`, {
    method: 'PATCH'
  });
  if (!res.ok) throw new Error('Failed to upvote obstacle');
  return res.json();
}

export async function resolveObstacle(id) {
  const res = await fetch(`${API_BASE}/obstacles/${id}/resolve`, {
    method: 'PATCH'
  });
  if (!res.ok) throw new Error('Failed to resolve obstacle');
  return res.json();
}

export async function dispatchDpupr(id) {
  const res = await fetch(`${API_BASE}/obstacles/${id}/dispatch-dpupr`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to dispatch to DPUPR');
  return res.json();
}

export async function fetchRouteComparison(params = {}) {
  const query = new URLSearchParams(params);
  const res = await fetch(`${API_BASE}/routes/compare?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch route comparison');
  return res.json();
}

export async function planRoute(data) {
  const res = await fetch(`${API_BASE}/routes/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to plan route');
  return res.json();
}

export async function fetchWeather() {
  const res = await fetch(`${API_BASE}/weather`);
  if (!res.ok) throw new Error('Failed to fetch weather');
  return res.json();
}

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function fetchPlaces(search = '') {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await fetch(`${API_BASE}/places${query}`);
  if (!res.ok) throw new Error('Failed to fetch places');
  return res.json();
}

export async function geocodeSearch(query, lat = null, lng = null) {
  const params = new URLSearchParams({ q: query });
  if (lat !== null && lng !== null) {
    params.append('lat', lat);
    params.append('lng', lng);
  }
  const res = await fetch(`${API_BASE}/routes/geocode?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to search locations');
  return res.json();
}

export async function reverseGeocode(lat, lng) {
  const params = new URLSearchParams({ lat, lng });
  const res = await fetch(`${API_BASE}/routes/reverse-geocode?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to reverse geocode');
  return res.json();
}
