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
├── datasets/                          # Panduan format dataset YOLO
├── notebooks/
│   └── vision_training.ipynb          # Dokumentasi riset pelatihan YOLOv8
├── requirements.txt
├── .env.example
└── README.md
```

---

## 2. Cara Menjalankan Layanan (Quickstart)

### Langkah 1: Instalasi Dependensi
```bash
cd ai-service
pip install -r requirements.txt
```

### Langkah 2: Konfigurasi Environment
Salin `.env.example` ke `.env`:
```bash
cp .env.example .env
```
*(Opsional)* Masukkan `GEMINI_API_KEY` dari [Google AI Studio](https://aistudio.google.com/app/apikey) untuk mengaktifkan asisten suara dan audit multimodal trotoar. Jika tidak diisi, sistem tetap berfungsi 100% menggunakan model lokal YOLOv8 dan rule-based NLU offline.

### Langkah 3: Jalankan Server
```bash
python -m uvicorn app.main:app --reload --port 8000
```
Layanan akan aktif di `http://localhost:8000`.  
Dokumentasi interaktif Swagger UI dapat diakses di: **`http://localhost:8000/docs`**.

---

## 3. Dokumentasi Endpoint Utama

| Endpoint | Method | Deskripsi |
| :--- | :---: | :--- |
| `/api/health` | `GET` | Status kesehatan layanan dan status model |
| `/api/v1/vision/detect` | `POST` | Deteksi rintangan trotoar (Base64 / URL) |
| `/api/v1/vision/upload-detect` | `POST` | Deteksi rintangan via upload file langsung |
| `/api/v1/voice-assistant/chat` | `POST` | Asisten suara & NLU perintah navigasi |
| `/api/v1/route-recommendation/evaluate` | `POST` | Evaluasi penalti rute berbasis Permen PUPR No. 14/2017 |
| `/api/v1/weather-intelligence/analyze` | `POST` | Kalkulasi koefisien gesek ubin dan risiko slip |

