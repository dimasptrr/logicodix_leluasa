# LELUASA — System Architecture & Integration Blueprint

Dokumen arsitektur ini menjelaskan interaksi antarkomponen dalam platform navigasi aksesibilitas **LELUASA**, mencakup alur komunikasi antara Frontend (React), Backend (Node.js Express), Layanan AI (Python FastAPI), serta mesin routing OpenStreetMap / OpenRouteService.

---

## 1. Diagram Arsitektur Sistem (System Architecture)

```mermaid
flowchart TD
    subgraph CLIENT["Client Layer (React 19 + Vite + Tailwind)"]
        UI_DASH["Dashboard & Navigasi<br/>(Caca)"]
        UI_MAP["ExploreMap & PlanRoute<br/>(Leaflet)"]
        UI_REP["Pelaporan Rintangan<br/>(Erlinda)"]
        UI_VOICE["Voice Assistant Modal<br/>(Dimas)"]
        UI_SRV["Frontend API Service<br/>(client/src/services/api.js)"]
        
        UI_DASH --> UI_SRV
        UI_MAP --> UI_SRV
        UI_REP --> UI_SRV
        UI_VOICE --> UI_SRV
    end

    subgraph SERVER["Backend Layer (Node.js Express :5000) - Erlinda"]
        API_GW["Express Router & Middleware<br/>(Logger, Auth, Validation)"]
        MOD_OBS["Obstacles Module<br/>(CRUD & DPUPR Dispatch)"]
        MOD_REP["Reports & Impact Stats"]
        MOD_USER["User Mobility Profiles"]
        MOD_ROUT["Routing Module (Kaka)<br/>(GIS Graph & Spatial Cost Engine)"]
        INT_AI["AI Service HTTP Client<br/>(aiService.client.js)"]
        INT_WTH["Weather Service Client<br/>(Open-Meteo Integration)"]
        DB_REPO["Database Repository Layer<br/>(In-Memory / MongoDB / Prisma)"]

        API_GW --> MOD_OBS
        API_GW --> MOD_REP
        API_GW --> MOD_USER
        API_GW --> MOD_ROUT
        API_GW --> INT_WTH

        MOD_OBS --> DB_REPO
        MOD_REP --> DB_REPO
        MOD_USER --> DB_REPO
        MOD_ROUT --> DB_REPO
        
        MOD_OBS -.->|Image & Telemetry| INT_AI
        MOD_ROUT -.->|Candidate Routes & Obstacles| INT_AI
    end

    subgraph AI_SERVICE["AI & Machine Learning Service (Python FastAPI :8000) - Dimas"]
        FASTAPI["FastAPI Application Core"]
        AI_VIS["AI Vision Service<br/>(YOLO Obstacle Detection)"]
        AI_ROUT["AI Route Evaluator<br/>(Accessibility Multi-Criteria Cost)"]
        AI_VOICE["AI Voice NLU Assistant<br/>(Intent & Entity Extractor)"]
        AI_WTH["Weather Traction Analyzer<br/>(Friction Coefficient & Slip Hazard)"]

        FASTAPI --> AI_VIS
        FASTAPI --> AI_ROUT
        FASTAPI --> AI_VOICE
        FASTAPI --> AI_WTH
    end

    subgraph EXTERNAL["Layanan Eksternal & Pihak Ketiga"]
        OSM["OpenStreetMap Footways / Overpass"]
        ORS["OpenRouteService Pedestrian API"]
        OPEN_METEO["Open-Meteo Weather API"]
    end

    UI_SRV <==>|HTTP / REST JSON| API_GW
    INT_AI <==>|HTTP / REST JSON :8000| FASTAPI
    MOD_ROUT <==>|Pedestrian Geometry GeoJSON| ORS
    MOD_ROUT <==>|Footway Features| OSM
    INT_WTH <==>|Live Precipitation & Humidity| OPEN_METEO
```

---

## 2. Alur Komunikasi Antar-Layanan (Service Communication Flow)

### A. Frontend ➔ Backend ➔ AI Service
1. **Frontend (`client`)**: Pengguna berinteraksi melalui antarmuka web modern (dashboard, peta navigasi, atau modal suara). Semua request HTTP keluar diarahkan ke URL backend `/api/...` melalui `client/src/services/api.js`.
2. **Backend (`server`)**: Bertindak sebagai *orchestrator*, gerbang keamanan, dan pengelola data persistensi. Backend memvalidasi request, mengelola sesi, membaca/menulis ke database, dan meneruskan tugas inferensi komputasi berat ke `ai-service`.
3. **AI Service (`ai-service`)**: Berjalan secara terisolasi pada Python FastAPI di port `8000`. Layanan ini murni stateless dan fokus pada inferensi model Machine Learning (YOLO untuk penglihatan komputer, NLU berbasis aturan/transformer untuk suara, serta pemodelan gesekan trotoar).

---

## 3. Integrasi Mesin Routing & Propagasi Laporan Rintangan

Salah satu pilar terpenting dalam platform **LELUASA** adalah bagaimana rintangan fisik yang dilaporkan warga secara dinamis memengaruhi perhitungan rute kursi roda:

```mermaid
sequenceDiagram
    autonumber
    actor User as Komuter Kursi Roda
    participant Client as Frontend (ExploreMap/PlanRoute)
    participant Server as Backend (Routing & Obstacle Module)
    participant DB as Database (Obstacle Repository)
    participant AIService as AI Service (FastAPI)
    participant GIS as OpenRouteService / OSM

    Note over User, Client: 1. Pelaporan Rintangan Baru
    User->>Client: Unggah foto trotoar berlubang di Jl. Pemuda
    Client->>Server: POST /api/obstacles (Foto, GPS, Kategori)
    Server->>AIService: POST /api/v1/vision/detect (Foto)
    AIService-->>Server: Detected: "construction_pit", Impassable, Clearance: 0cm
    Server->>DB: Simpan Laporan (Status: active, Severity: impassable)
    Server-->>Client: 201 Created (ID: SUB-2026-0889)

    Note over User, Client: 2. Perencanaan Rute Ramah Kursi Roda
    User->>Client: Buka PlanRoute (Balai Pemuda -> RSUD Dr. Soetomo)
    Client->>Server: GET /api/routes/compare (Origin, Destination, Profile: electric)
    Server->>GIS: Ambil baseline geometri jaringan pedestrian OpenStreetMap
    GIS-->>Server: Polylines GeoJSON Kandidat Rute A & B
    Server->>DB: Query rintangan aktif di sekitar koridor rute (Buffer 30m)
    DB-->>Server: Rintangan SUB-2026-0889 ditemukan pada Rute A (jarak 4 meter)
    Server->>AIService: POST /api/v1/route-recommendation/evaluate (Kandidat Rute & Rintangan)
    AIService-->>Server: Rute A Penalti 500 (Score 38), Rute B Penalti 15 (Score 95, Direkomendasikan)
    Server-->>Client: Response Komparasi (Rute B direkomendasikan dengan garansi 0 rintangan)
    Client->>User: Visualisasi rute hijau aman di Leaflet Map
```

---

## 4. Standar Penalti Aksesibilitas Kursi Roda

Berbeda dengan navigasi pejalan kaki umum, mesin evaluasi Leluasa mengacu pada **Permen PUPR No. 14/2017 tentang Persyaratan Kemudahan Bangunan Gedung dan Lingkungan**:

1. **Jarak Bebas Bersih (*Clearance Width*)**:
   - $\ge 120\text{ cm}$: Ideal untuk berselisihan 2 kursi roda.
   - $80 - 119\text{ cm}$: Dapat dilewati 1 kursi roda standar.
   - $< 80\text{ cm}$: Diklasifikasikan sebagai *impassable* (penalti maksimal 500 poin).
2. **Kelandaian Rampa (*Ramp Slope*)**:
   - $\le 6\%$ ($1:16$): Sangat aman dan landai.
   - $6\% - 8\%$ ($1:12$): Batas maksimum rampa standar.
   - $> 8\%$: Berbahaya dan diberi penalti elevasi tinggi.
3. **Kondisi Permukaan Jalan (*Surface Friction Index*)**:
   - Permukaan keramik dekoratif saat hujan diidentifikasi memiliki risiko slip tinggi ($\text{COF} < 0.35$), sehingga dialihkan ke koridor berkanopi atau cor semen bertekstur.

