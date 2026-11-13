---
title: Leluasa AI Service
emoji: ♿
colorFrom: blue
colorTo: indigo
sdk: gradio
app_file: run.py
pinned: false
license: mit
---

# LELUASA AI Service — Inclusive Mobility Engine

Layanan AI untuk platform navigasi aksesibilitas trotoar kursi roda **LELUASA** (LOGICODIX 2026).  
Menggunakan arsitektur **HYBRID**:
* **Computer Vision Lokal**: YOLOv8 untuk inferensi deteksi fisik rintangan trotoar (bollard sempit, lubang galian, tangga, paving rusak).
* **Multimodal Reasoning & NLU**: Google Gemini 1.5 Flash untuk percakapan suara asisten navigasi, audit kontekstual trotoar, dan analisis traksi cuaca mikro.

---

## 1. Struktur Modul

```text
ai-service/
├── app/
│   ├── api/
│   │   ├── vision_router.py           # POST /api/v1/vision/detect
│   │   ├── voice_router.py            # POST /api/v1/voice-assistant/chat
│   │   ├── route_router.py            # POST /api/v1/route-recommendation/evaluate
│   │   └── weather_router.py          # POST /api/v1/weather-intelligence/analyze
│   ├── models/
│   │   └── weights/
│   │       └── yolov8n.pt             # Bobot pre-trained YOLOv8
│   ├── schemas/                       # Pydantic Request & Response Models
│   ├── services/
│   │   ├── vision/                    # YOLO & Gemini Multimodal
│   │   ├── voice_assistant/           # Conversational Voice NLU
│   │   ├── route_recommendation/      # Multi-criteria Accessibility Evaluation
│   │   └── weather_intelligence/      # Pavement Friction & Slip Analysis
│   ├── config.py                      # Environment Loader
│   └── main.py                        # FastAPI Core App
```
