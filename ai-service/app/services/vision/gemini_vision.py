"""
Gemini 1.5 Multimodal Vision Inspector for Wheelchair Sidewalk Accessibility
"""

import json
import base64
import time
import httpx
from typing import List, Optional, Tuple
from app.config import GEMINI_API_KEY, GEMINI_MODEL
from app.schemas.vision import BoundingBox, DetectedObstacle

GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

ACCESSIBILITY_SYSTEM_PROMPT = """
Anda adalah AI Inspektur Audit Aksesibilitas Trotoar Pejalan Kaki & Kursi Roda berstandar Permen PUPR No. 14/PRT/M/2017.
Tugas Anda:
1. Analisis gambar kondisi trotoar atau jalan ini.
2. Identifikasi rintangan yang menghambat pengguna kursi roda (contoh: bollard terlalu rapat, galian utilitas/pipa, undakan rampa pecah, tangga tanpa rampa, lubang amblas, PKL/parkir liar, ubin licin).
3. Untuk setiap rintangan, tentukan:
   - obstacle_class: kategori rintangan (narrow_bollard, construction_pit, broken_pavement, missing_ramp, steep_curb, street_vendor, vehicle_parking)
   - label_id: nama bahasa Indonesia (misal: "Bollard / Pembatas", "Galian / Proyek", "Paving Rusak", "Tangga Tanpa Rampa")
   - confidence: float 0.0 - 1.0
   - bbox: koordinat kotak rintangan dinormalisasi 0.0 - 1.0 {"x_min": float, "y_min": float, "x_max": float, "y_max": float}
   - severity: "impassable" (terblokir total / celah <80cm), "difficult" (sempit 80-100cm / paving bergelombang), "caution" (rampa curam >6%), atau "passable"
   - estimated_clearance_cm: perkiraan sisa lebar trotoar yang bisa dilalui kursi roda dalam cm (0 jika terblokir)
   - advisory: saran navigasi untuk pengguna kursi roda
4. Tentukan overall_assessment: ringkasan 1-2 kalimat mengenai kelayakan trotoar ini.

Kembalikan HANYA dalam format JSON valid berikut (tanpa markdown backtick tambahan):
{
  "overall_assessment": "Trotoar terblokir oleh ...",
  "obstacles": [
    {
      "id": "gemini-obs-1",
      "obstacle_class": "construction_pit",
      "label_id": "Galian / Proyek",
      "confidence": 0.95,
      "bbox": {"x_min": 0.2, "y_min": 0.3, "x_max": 0.8, "y_max": 0.9},
      "severity": "impassable",
      "estimated_clearance_cm": 0,
      "advisory": "Hindari lajur ini dan gunakan rute alternatif seberang jalan."
    }
  ]
}
"""

class GeminiVisionService:
    def __init__(self, api_key: str = GEMINI_API_KEY):
        self.api_key = api_key

    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip() != "your_gemini_api_key_here")

    async def inspect(self, image_base64: str) -> Tuple[Optional[List[DetectedObstacle]], Optional[str], float]:
        start_time = time.time()
        if not self.is_configured():
            return None, None, 0.0

        # Clean base64 string
        clean_b64 = image_base64
        mime_type = "image/jpeg"
        if "data:" in clean_b64 and ";base64," in clean_b64:
            header, clean_b64 = clean_b64.split(";base64,")
            if "png" in header:
                mime_type = "image/png"
            elif "webp" in header:
                mime_type = "image/webp"

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": ACCESSIBILITY_SYSTEM_PROMPT},
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": clean_b64
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.2
            }
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    f"{GEMINI_API_URL}?key={self.api_key}",
                    json=payload
                )

            if res.status_code != 200:
                print(f"[GeminiVision] Error HTTP {res.status_code}: {res.text[:150]}")
                return None, None, 0.0

            data = res.json()
            candidate_text = data["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(candidate_text)

            obstacles: List[DetectedObstacle] = []
            for item in parsed.get("obstacles", []):
                bbox_data = item.get("bbox", {})
                obstacles.append(
                    DetectedObstacle(
                        id=item.get("id", f"gemini-obs-{len(obstacles)+1}"),
                        obstacle_class=item.get("obstacle_class", "unknown_barrier"),
                        label_id=item.get("label_id", "Rintangan Trotoar"),
                        confidence=float(item.get("confidence", 0.90)),
                        bbox=BoundingBox(
                            x_min=float(bbox_data.get("x_min", 0.0)),
                            y_min=float(bbox_data.get("y_min", 0.0)),
                            x_max=float(bbox_data.get("x_max", 1.0)),
                            y_max=float(bbox_data.get("y_max", 1.0))
                        ),
                        severity=item.get("severity", "impassable"),
                        estimated_clearance_cm=item.get("estimated_clearance_cm", 0),
                        advisory=item.get("advisory", "Hati-hati saat melintasi jalur ini.")
                    )
                )

            elapsed_ms = round((time.time() - start_time) * 1000, 2)
            overall = parsed.get("overall_assessment", "Analisis rintangan selesai.")
            return obstacles, overall, elapsed_ms

        except Exception as e:
            print(f"[GeminiVision] Exception during visual audit: {e}")
            return None, None, 0.0

gemini_vision_service = GeminiVisionService()

