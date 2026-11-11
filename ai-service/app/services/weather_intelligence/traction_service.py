"""
AI Weather & Sidewalk Pavement Traction Intelligence Service
"""

import httpx
from typing import Dict, Any, List
from app.config import GEMINI_API_KEY, GEMINI_MODEL
from app.schemas.weather import (
    WeatherAssessmentRequest,
    WeatherAssessmentResponse,
    TractionAssessment
)

GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

BASE_COEFFICIENTS = {
    "ceramic_tile": 0.60,
    "pavers": 0.75,
    "concrete": 0.82,
    "asphalt": 0.85
}

class WeatherTractionService:
    def __init__(self, api_key: str = GEMINI_API_KEY):
        self.api_key = api_key

    def calculate_traction(self, request: WeatherAssessmentRequest) -> WeatherAssessmentResponse:
        t = request.telemetry
        surface = t.surface_type or "ceramic_tile"
        base_cof = BASE_COEFFICIENTS.get(surface, 0.70)

        # Environmental modifiers
        friction = base_cof
        if t.precipitation_mm > 4.0 or t.weather_code >= 61:
            friction -= 0.35  # Heavy rain
        elif t.precipitation_mm > 0.0 or t.weather_code >= 51:
            friction -= 0.20  # Drizzle / light rain
        elif t.humidity_percent > 85.0:
            friction -= 0.10  # High dampness

        friction = max(0.15, min(0.95, round(friction, 2)))
        traction_pct = int(friction * 100)

        if friction < 0.35:
            risk = "critical"
            hazard = "Ubin keramik sangat licin basah dan berisiko selip ban total"
            speed_limit = 2.5
            advisory = "Peringatan kritis: Hindari rampa miring berubin keramik di Jl. Pemuda. Disarankan menunda perjalanan atau memilih rute beratap."
            guidelines = [
                "Turunkan kecepatan kursi roda listrik ke mode minimum (2.5 km/jam)",
                "Hindari pengereman mendadak di turunan rampa",
                "Gunakan koridor bertrotoar semen kasar"
            ]
        elif friction < 0.55:
            risk = "high_risk"
            hazard = "Trotoar basah licin dan potensi genangan air menutupi lubang"
            speed_limit = 4.0
            advisory = "Kondisi jalanan licin akibat hujan. Kurangi kecepatan saat berbelok dan pastikan traksi ban mencengkeram kuat."
            guidelines = [
                "Batasi kecepatan maksimal 4.0 km/jam",
                "Waspadai marka jalan putih dan ubin dekoratif",
                "Hindari genangan air yang tidak diketahui kedalamannya"
            ]
        elif friction < 0.70:
            risk = "caution"
            hazard = "Kelembapan tinggi, permukaan sedikit lembap"
            speed_limit = 5.0
            advisory = "Permukaan jalan cukup aman dengan kewaspadaan standar di zona transisi rampa trotoar."
            guidelines = [
                "Kecepatan normal (5 km/jam)",
                "Perhatikan pelintasan jalan yang ada ubin taktil"
            ]
        else:
            risk = "safe"
            hazard = "Permukaan kering dengan daya cengkeram optimal"
            speed_limit = 6.0
            advisory = "Kondisi trotoar kering dan sangat aman untuk mobilitas kursi roda mandiri."
            guidelines = [
                "Kondisi optimal di seluruh koridor Surabaya",
                "Tetap gunakan jalur ramah disabilitas"
            ]

        return WeatherAssessmentResponse(
            status="success",
            location=request.location or "Surabaya Pusat",
            assessment=TractionAssessment(
                friction_coefficient=friction,
                traction_percentage=traction_pct,
                risk_level=risk,
                primary_slip_hazard=hazard
            ),
            wheelchair_speed_limit_kmh=speed_limit,
            ai_travel_advisory=advisory,
            guidelines=guidelines
        )

weather_traction_service = WeatherTractionService()

