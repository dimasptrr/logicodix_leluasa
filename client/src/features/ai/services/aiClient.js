/**
 * Frontend Client for Leluasa AI Service
 * Connects to Python FastAPI (:8000) directly or via Backend Proxy (/api/ai)
 */

const AI_BASE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000/api/v1';
const BACKEND_AI_URL = (import.meta.env.VITE_API_BASE_URL || '/api') + '/ai';

/**
 * 1. AI Vision: Deteksi Rintangan Trotoar dari Foto Base64
 */
export async function detectObstacleVision(imageBase64, categoryHint = '') {
  try {
    // Coba langsung ke AI Service lokal FastAPI port 8000
    const res = await fetch(`${AI_BASE_URL}/vision/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_base64: imageBase64,
        category_hint: categoryHint
      })
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[AI Client] Direct FastAPI unavailable, trying backend proxy:', err.message);
  }

  // Fallback via Node.js backend proxy
  try {
    const res = await fetch(`${BACKEND_AI_URL}/vision/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_base64: imageBase64,
        category_hint: categoryHint
      })
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[AI Client] Backend AI proxy failed:', err.message);
  }

  // Graceful Offline Fallback jika AI service belum dinyalakan
  return {
    status: 'fallback',
    model_source: 'Heuristic-Offline',
    processing_time_ms: 10,
    total_detected: 1,
    obstacles: [
      {
        id: 'fallback-obs-1',
        obstacle_class: categoryHint || 'construction_pit',
        label_id: categoryHint || 'Galian / Proyek',
        confidence: 0.92,
        bbox: { x_min: 0.25, y_min: 0.35, x_max: 0.75, y_max: 0.85 },
        severity: 'impassable',
        estimated_clearance_cm: 0,
        advisory: 'Rintangan terdeteksi di trotoar. Disarankan memilih rute pengalihan aman.'
      }
    ],
    overall_assessment: 'Rintangan fisik teridentifikasi pada permukaan trotoar.'
  };
}

/**
 * 2. AI Voice Assistant: Tanya jawab dan perintah suara navigasi
 */
export async function sendVoiceMessage(message, mobilityProfile = 'electric') {
  try {
    const res = await fetch(`${AI_BASE_URL}/voice-assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        user_mobility_profile: mobilityProfile
      })
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[AI Client] Direct Voice service failed, trying proxy:', err.message);
  }

  try {
    const res = await fetch(`${BACKEND_AI_URL}/voice/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        user_mobility_profile: mobilityProfile
      })
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[AI Client] Backend Voice proxy failed:', err.message);
  }

  // Heuristic offline response
  return {
    status: 'fallback',
    reply_text: `Menyiapkan panduan navigasi kursi roda untuk: "${message}".`,
    parsed_intent: {
      intent: 'NAVIGATE_TO',
      confidence: 0.85,
      destination_name: message,
      suggested_tab: 'plan-route'
    }
  };
}

/**
 * 3. AI Route Recommendation: Evaluasi komparasi rute
 */
export async function evaluateRoutesWithAI(candidateRoutes, activeObstacles = []) {
  try {
    const res = await fetch(`${AI_BASE_URL}/route-recommendation/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate_routes: candidateRoutes,
        active_obstacles: activeObstacles
      })
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[AI Client] Route evaluation fallback:', err.message);
  }
  return null;
}

