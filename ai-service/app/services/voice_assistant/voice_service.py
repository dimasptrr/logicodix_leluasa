"""
AI Voice Assistant & Conversational NLU Service (Gemini + Local Fallback)
"""

import re
import json
import httpx
from typing import Dict, Any, Tuple
from app.config import GEMINI_API_KEY, GEMINI_MODEL
from app.schemas.voice import VoiceChatRequest, VoiceChatResponse, ParsedNavigationIntent

GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

VOICE_NLU_SYSTEM_PROMPT = """
Anda adalah Leluasa AI Assistant, asisten cerdas navigasi aksesibel untuk penyandang disabilitas kursi roda (elektrik/manual) di Surabaya.
Tugas Anda:
1. Pahami pesan pengguna (bisa dalam Bahasa Indonesia santai atau formal).
2. Tentukan INTENT utama:
   - "NAVIGATE_TO": pengguna ingin rute atau panduan ke suatu tempat (contoh: "carikan jalan ke RSUD Soetomo", "pandu ke balai pemuda")
   - "REPORT_OBSTACLE": pengguna ingin lapor jalan rusak/galian (contoh: "ada lubang besar di sini", "lapor trotoar terblokir")
   - "CHECK_WEATHER": pengguna tanya cuaca atau kelicinan trotoar (contoh: "apakah jalanan licin?", "hujan gak di surabaya?")
   - "TOGGLE_ACCESSIBILITY": pengguna ingin ubah preferensi aksesibilitas
   - "GENERAL_CHAT": pertanyaan seputar aksesibilitas kursi roda atau panduan umum
3. Ekstrak entitas jika ada: destination_name, barrier_type, profile.
4. Buat respon lisan (reply_text) yang empatik, ringkas (maks 2-3 kalimat), ramah pembaca layar (screen reader), dan solutif.
5. Tentukan suggested_tab frontend: "plan-route" (jika NAVIGATE_TO), "report-obstacle" (jika REPORT_OBSTACLE), "weather-intelligence" (jika CHECK_WEATHER), atau "home".

Format output HANYA dalam JSON:
{
  "intent": "NAVIGATE_TO",
  "confidence": 0.95,
  "destination_name": "RSUD Dr. Soetomo",
  "suggested_tab": "plan-route",
  "reply_text": "Siap! Mencari rute teraman dan paling landai menuju RSUD Dr. Soetomo dengan jaminan 100% rampa trotoar."
}
"""

class VoiceAssistantService:
    def __init__(self, api_key: str = GEMINI_API_KEY):
        self.api_key = api_key

    def _fallback_nlu(self, text: str) -> ParsedNavigationIntent:
        """Regex-based rule engine fallback when offline."""
        lower = text.lower()
        if any(w in lower for w in ["rute", "jalan ke", "ke ", "menuju", "antar", "pandu", "tuntun"]):
            dest = text
            match = re.search(r"(?:ke|menuju|jalan ke)\s+([^,\.!?]+)", text, re.IGNORECASE)
            if match:
                dest = match.group(1).strip()
            return ParsedNavigationIntent(
                intent="NAVIGATE_TO",
                confidence=0.88,
                destination_name=dest,
                suggested_tab="plan-route"
            )
        elif any(w in lower for w in ["lapor", "rintangan", "rusak", "galian", "bollard", "terblokir", "lubang"]):
            return ParsedNavigationIntent(
                intent="REPORT_OBSTACLE",
                confidence=0.92,
                suggested_tab="report-obstacle"
            )
        elif any(w in lower for w in ["cuaca", "hujan", "licin", "traksi", "ban", "gerimis"]):
            return ParsedNavigationIntent(
                intent="CHECK_WEATHER",
                confidence=0.90,
                suggested_tab="weather-intelligence"
            )
        elif any(w in lower for w in ["kontras", "aksesibilitas", "suara", "rampa", "preferensi"]):
            return ParsedNavigationIntent(
                intent="TOGGLE_ACCESSIBILITY",
                confidence=0.85,
                suggested_tab="home"
            )
        return ParsedNavigationIntent(
            intent="GENERAL_CHAT",
            confidence=0.70,
            suggested_tab="home"
        )

    async def chat(self, request: VoiceChatRequest) -> VoiceChatResponse:
        user_msg = request.message.strip()

        # Try Gemini API first if configured
        if self.api_key and self.api_key != "your_gemini_api_key_here":
            try:
                payload = {
                    "contents": [
                        {
                            "parts": [
                                {"text": VOICE_NLU_SYSTEM_PROMPT},
                                {"text": f"Pesan Pengguna: '{user_msg}', Profil Pengguna: {request.user_mobility_profile}"}
                            ]
                        }
                    ],
                    "generationConfig": {
                        "response_mime_type": "application/json",
                        "temperature": 0.3
                    }
                }
                async with httpx.AsyncClient(timeout=8.0) as client:
                    res = await client.post(
                        f"{GEMINI_API_URL}?key={self.api_key}",
                        json=payload
                    )
                if res.status_code == 200:
                    data = res.json()
                    out_text = data["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = json.loads(out_text)

                    intent = ParsedNavigationIntent(
                        intent=parsed.get("intent", "GENERAL_CHAT"),
                        confidence=float(parsed.get("confidence", 0.95)),
                        destination_name=parsed.get("destination_name"),
                        suggested_tab=parsed.get("suggested_tab")
                    )

                    return VoiceChatResponse(
                        status="success",
                        model_source="Gemini-1.5-Flash",
                        input_text=user_msg,
                        reply_text=parsed.get("reply_text", "Saya siap membantu navigasi Anda."),
                        parsed_intent=intent
                    )
            except Exception as e:
                print(f"[VoiceService] Gemini fallback due to error: {e}")

        # Local Fallback
        fallback_intent = self._fallback_nlu(user_msg)
        if fallback_intent.intent == "NAVIGATE_TO":
            reply = f"Mencari rute aman ramah kursi roda menuju {fallback_intent.destination_name or 'tujuan Anda'}."
        elif fallback_intent.intent == "REPORT_OBSTACLE":
            reply = "Membuka formulir pelaporan rintangan. Silakan ambil foto trotoar untuk diverifikasi AI."
        elif fallback_intent.intent == "CHECK_WEATHER":
            reply = "Memeriksa telemetri cuaca dan risiko slip trotoar Surabaya untuk keamanan kursi roda Anda."
        elif fallback_intent.intent == "TOGGLE_ACCESSIBILITY":
            reply = "Membuka pengaturan preferensi aksesibilitas dan panduan suara."
        else:
            reply = "Halo! Saya Asisten Suara Leluasa. Anda bisa bertanya tentang rute aman, ubin pemandu, atau kondisi trotoar Surabaya."

        return VoiceChatResponse(
            status="success",
            model_source="Local-Rule-NLU (Offline Ready)",
            input_text=user_msg,
            reply_text=reply,
            parsed_intent=fallback_intent
        )

voice_service = VoiceAssistantService()

