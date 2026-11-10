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

export async function fetchObstacles(filters = {}) {
  try {
    const res = await realApi.fetchObstacles(filters);
    return res;
  } catch (err) {
    activateFallback();
    let data = [...inMemoryObstacles];

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
  return realApi.createObstacle(obstacleData);
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

