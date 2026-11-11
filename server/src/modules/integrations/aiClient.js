import { config } from '../../config/env.js';

const AI_BASE_URL = config.aiServiceUrl || 'http://localhost:8000';

async function callAiService(endpoint, body, timeoutMs = 7000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${AI_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`AI Service HTTP ${res.status}: ${errorText.slice(0, 150)}`);
    }

    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function detectObstacleVision(payload) {
  return await callAiService('/api/v1/vision/detect', payload);
}

export async function chatVoiceAssistant(payload) {
  return await callAiService('/api/v1/voice-assistant/chat', payload);
}

export async function evaluateRouteAccessibility(payload) {
  return await callAiService('/api/v1/route-recommendation/evaluate', payload);
}

export async function analyzeWeatherTraction(payload) {
  return await callAiService('/api/v1/weather-intelligence/analyze', payload);
}

