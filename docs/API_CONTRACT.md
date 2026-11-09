# LELUASA — Module Integration Contracts

Dokumen ini mendefinisikan kontrak antarmuka integrasi (API Contracts) antar-layanan dan antar-modul agar **Dimas (AI)**, **Erlinda (Fullstack/Backend)**, **Caca (Frontend)**, dan **Kaka (Routing Engine)** dapat mengembangkan modul masing-masing secara independen dengan format request/response yang konsisten.

---

## Ringkasan Endpoint Antar-Layanan

| Modul | Endpoint | Protokol | Penyedia (Provider) | Konsumen (Consumer) |
| :--- | :--- | :--- | :--- | :--- |
| **A. AI Vision** | `POST /api/v1/vision/detect` | HTTP JSON / Multipart | Dimas (`ai-service`) | Erlinda (`server`) / Caca (`client`) |
| **B. AI Route Recommendation** | `POST /api/v1/route-recommendation/evaluate` | HTTP JSON | Dimas (`ai-service`) | Kaka (`server/routing`) |
| **C. AI Voice Assistant** | `POST /api/v1/voice-assistant/parse` | HTTP JSON | Dimas (`ai-service`) | Caca (`client`) / Erlinda (`server`) |
| **D. Weather Intelligence** | `POST /api/v1/weather-intelligence/analyze` | HTTP JSON | Dimas (`ai-service`) | Erlinda (`server`) / Caca (`client`) |
| **E. Routing Engine** | `GET /api/routes/compare`<br>`POST /api/routes/plan` | HTTP JSON | Kaka & Erlinda (`server`) | Caca (`client`) |
| **F. Obstacle Reporting** | `POST /api/obstacles`<br>`GET /api/obstacles` | HTTP JSON | Erlinda (`server`) | Caca (`client`) & Dimas (Vision) |

---

## A. AI Vision (Wheelchair Obstacle Detection)

Digunakan untuk mendeteksi rintangan aksesibilitas trotoar (bollard terlalu sempit, galian proyek, undakan tinggi, rampa rusak, tangga tanpa rampa) dari gambar yang diunggah pengguna.

- **Penyedia**: Dimas (`ai-service`)
- **Method & Path**: `POST /api/v1/vision/detect`
- **Content-Type**: `application/json` (atau `multipart/form-data`)

### Request JSON
```json
{
  "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "image_url": "https://storage.leluasa.id/reports/2026/img_098.jpg",
  "category_hint": "Bollard / Pembatas"
}
```

### Response JSON (200 OK)
```json
{
  "status": "success",
  "model_version": "YOLOv8s-Wheelchair-Obstacle-v1.0",
  "processing_time_ms": 118.4,
  "total_detected": 1,
  "obstacles": [
    {
      "obstacle_class": "narrow_bollard",
      "label_id": "Bollard / Pembatas",
      "confidence": 0.94,
      "bbox": {
        "x_min": 0.28,
        "y_min": 0.42,
        "x_max": 0.65,
        "y_max": 0.88
      },
      "severity": "impassable",
      "estimated_clearance_cm": 62,
      "recommendation": "Jarak bersih antar-bollard hanya 62 cm (kurang dari standar Permen PUPR 80 cm). Pengguna kursi roda disarankan memutar."
    }
  ],
  "warning": "Bahaya kritis: Trotoar terblokir total untuk kursi roda ukuran standar."
}
```

---

## B. AI Route Recommendation (Accessibility Route Evaluation)

Digunakan untuk mengevaluasi kandidat rute dari modul routing Kaka dengan memperhitungkan penalti rintangan aktif, kelandaian rampa, dan jenis permukaan jalan.

- **Penyedia**: Dimas (`ai-service`)
- **Konsumen**: Kaka (`server/src/modules/routing/`)
- **Method & Path**: `POST /api/v1/route-recommendation/evaluate`

### Request JSON
```json
{
  "profile": "electric",
  "user_mobility_profile": {
    "profile_type": "electric",
    "max_slope_percent": 6.0,
    "min_clearance_width_cm": 80,
    "avoid_slippery_tiles": true
  },
  "candidate_routes": [
    {
      "id": "route-standard",
      "title": "Rute Standar Pedestrian",
      "distance_meters": 1450,
      "coordinates": [
        [-7.26425, 112.74492],
        [-7.26558, 112.74838],
        [-7.26965, 112.75898]
      ]
    },
    {
      "id": "route-leluasa",
      "title": "Rute AI Leluasa",
      "distance_meters": 1680,
      "coordinates": [
        [-7.26425, 112.74492],
        [-7.26380, 112.74560],
        [-7.26965, 112.75898]
      ]
    }
  ],
  "known_obstacles": [
    {
      "id": "SUB-2026-0889",
      "coordinates": { "lat": -7.2655, "lng": 112.7482 },
      "category": "Galian / Proyek",
      "severity": "impassable",
      "clearance_cm": 0
    }
  ]
}
```

### Response JSON (200 OK)
```json
{
  "status": "success",
  "evaluator_engine": "Leluasa AI Multi-Criteria Accessibility Evaluator v1.0",
  "recommended_route_id": "route-leluasa",
  "recommendation_summary": "Rute 'route-leluasa' direkomendasikan dengan safety score 92/100, bebas dari galian pipa Jl. Pemuda dan 100% rampa landai <4%.",
  "evaluations": [
    {
      "route_id": "route-standard",
      "safety_score": 38,
      "safety_label": "Tinggi Risiko (Terblokir)",
      "severity": "impassable",
      "total_penalty": 500.0,
      "impassable_obstacles_count": 1,
      "is_recommended": false,
      "explanation": "Terdapat galian utilitas yang memaksa kursi roda turun ke aspal jalan raya berdampingan dengan kendaraan bermotor."
    },
    {
      "route_id": "route-leluasa",
      "safety_score": 92,
      "safety_label": "Sangat Aksesibel (Ramah Kursi Roda)",
      "severity": "passable",
      "total_penalty": 15.0,
      "impassable_obstacles_count": 0,
      "is_recommended": true,
      "explanation": "Trotoar berkanopi dengan lebar rata-rata 180 cm dan rampa landai bersertifikasi."
    }
  ]
}
```

---

## C. AI Voice Assistant (Speech NLU & Intent Parsing)

Digunakan untuk memproses input suara atau teks pengguna menjadi aksi dan entitas navigasi.

- **Penyedia**: Dimas (`ai-service`)
- **Konsumen**: Caca (`client/src/features/ai/voice-assistant/`)
- **Method & Path**: `POST /api/v1/voice-assistant/parse`

### Request JSON
```json
{
  "transcript": "Tolong carikan rute aman kursi roda ke RSUD Dr Soetomo",
  "session_id": "sess_883910",
  "current_tab": "home"
}
```

### Response JSON (200 OK)
```json
{
  "status": "success",
  "input_text": "Tolong carikan rute aman kursi roda ke RSUD Dr Soetomo",
  "result": {
    "intent": "NAVIGATE_TO",
    "confidence": 0.96,
    "entities": {
      "destination": "RSUD Dr Soetomo",
      "origin": "current_gps_location"
    },
    "spoken_feedback": "Menemukan rute paling landai dan bebas hambatan menuju RSUD Dr. Soetomo. Mengalihkan Anda ke peta rute.",
    "suggested_tab": "plan-route"
  }
}
```

---

## D. AI Weather Intelligence (Pavement Traction & Friction Analysis)

Digunakan untuk menganalisis bahaya slip permukaan ubin trotoar akibat hujan dan kelembapan tinggi.

- **Penyedia**: Dimas (`ai-service`)
- **Method & Path**: `POST /api/v1/weather-intelligence/analyze`

### Request JSON
```json
{
  "location_name": "Surabaya Pusat",
  "latitude": -7.2575,
  "longitude": 112.7521,
  "weather_data": {
    "temperature": 29.5,
    "humidity": 88.0,
    "precipitation_mm": 4.2,
    "weather_code": 61,
    "wind_speed_kmh": 14.0,
    "surface_material": "ceramic_tile"
  }
}
```

### Response JSON (200 OK)
```json
{
  "status": "success",
  "location": "Surabaya Pusat",
  "assessment": {
    "surface_friction_index": 0.38,
    "traction_risk_level": "high",
    "slip_probability_percent": 68,
    "primary_hazard": "Trotoar keramik basah sangat licin saat basah"
  },
  "wheelchair_travel_advisory": "Tingkat risiko tinggi untuk kursi roda. Hindari rampa miring dengan ubin keramik dekoratif di Jl. Pemuda.",
  "recommended_precautions": [
    "Kurangi kecepatan kursi roda listrik di bawah 4 km/jam",
    "Gunakan jalur bertrotoar cor beton kasar",
    "Waspadai genangan yang menutupi lubang saluran"
  ]
}
```

---

## E. Routing Engine (Pedestrian & Wheelchair Routing)

Digunakan untuk menghitung rute pedestrian riil berbasis jaringan jalan OpenStreetMap dan membandingkan rute standar vs rute Leluasa.

- **Penyedia**: Kaka & Erlinda (`server/src/modules/routing/`)
- **Konsumen**: Caca (`client/src/features/routing/` & `PlanRoute.jsx`)
- **Method & Path**: `GET /api/routes/compare` (Query params) atau `POST /api/routes/plan`

### Request (GET Query Parameters)
```text
GET /api/routes/compare?profile=electric&originLat=-7.2642&originLng=112.7449&destLat=-7.2696&destLng=112.7590
```

### Response JSON (200 OK)
```json
{
  "success": true,
  "data": {
    "origin": { "name": "Balai Pemuda", "lat": -7.2642, "lng": 112.7449 },
    "destination": { "name": "RSUD Dr. Soetomo", "lat": -7.2696, "lng": 112.7590 },
    "routingEngine": "OpenStreetMap Graph + Leluasa Spatial Cost Engine v4.2",
    "routeA": {
      "id": "route-standard",
      "title": "Rute Standar (Dasar Peta Navigasi Umum)",
      "distance": "1.45 km",
      "distanceMeters": 1450,
      "duration": "18 menit",
      "safetyScore": 38,
      "safetyLabel": "Tinggi Risiko (Banyak Rintangan)",
      "severity": "impassable",
      "isRecommended": false,
      "coordinates": [[-7.2642, 112.7449], [-7.2655, 112.7482], [-7.2696, 112.7590]],
      "notice": "Terdapat galian pipa dan trotoar terputus.",
      "impediments": [
        { "icon": "cancel", "text": "Galian Saluran Air di Jl. Pemuda" }
      ]
    },
    "routeB": {
      "id": "route-leluasa",
      "title": "Rute AI Leluasa (Paling Aksesibel)",
      "distance": "1.68 km",
      "distanceMeters": 1680,
      "duration": "22 menit",
      "safetyScore": 95,
      "safetyLabel": "Sangat Aksesibel (Ramah Kursi Roda)",
      "severity": "passable",
      "isRecommended": true,
      "coordinates": [[-7.2642, 112.7449], [-7.2638, 112.7456], [-7.2696, 112.7590]],
      "guarantees": [
        { "icon": "task_alt", "title": "0 Rintangan Terblokir" },
        { "icon": "ramp_right", "title": "100% Rampa Trotoar Tersedia" }
      ]
    }
  }
}
```

---

## F. Obstacle Reporting & Management

Digunakan untuk mencatat laporan rintangan trotoar dari warga, verifikasi komunitas (*upvotes*), serta disposisi ke dinas terkait (DPUPR).

- **Penyedia**: Erlinda (`server/src/modules/obstacles/`)
- **Konsumen**: Caca (`client/src/features/reporting/` & `ReportObstacle.jsx`)

### 1. Buat Laporan Baru (`POST /api/obstacles`)
#### Request JSON
```json
{
  "notes": "Bollard beton rapat menutup trotoar depan halte.",
  "locationText": "Jl. Tunjungan No. 88, Genteng, Surabaya",
  "coordinates": { "lat": -7.26042, "lng": 112.73831 },
  "locationAccuracyM": 12,
  "category": "Bollard / Pembatas",
  "severity": "impassable",
  "clearanceOption": "less_80",
  "clearance": 65,
  "forwardDpupr": true,
  "shareCommunity": true,
  "uploadedImage": "data:image/jpeg;base64,..."
}
```

The client resizes and re-encodes the selected image as JPEG before sending it, which removes embedded EXIF metadata. The API must validate the image and coordinates, upload the image to the private `obstacle-photos` bucket, and persist the resulting object path as `photo_path`; never store the data URL in the report row. Configure the API request-body limit to allow the compressed image (maximum 1.5 MiB) plus JSON overhead. Keep the Supabase service-role key server-side only.

#### Response JSON (201 Created)
```json
{
  "success": true,
  "message": "Obstacle report registered successfully",
  "data": {
    "id": "SUB-2026-0890",
    "title": "Bollard beton rapat menutup trotoar depan halte.",
    "location": "Jl. Tunjungan No. 88, Genteng, Surabaya",
    "coordinates": { "lat": -7.26042, "lng": 112.73831 },
    "category": "Bollard / Pembatas",
    "severity": "impassable",
    "status": "active",
    "clearance": 65,
    "clearanceLabel": "65 cm (Sempit)",
    "reportedTime": "Baru saja",
    "upvotes": 1,
    "confirmedCount": 1,
    "dpuprForwarded": true,
    "aiTelemetry": {
      "confidence": 92,
      "detectedBarrier": "Bollard / Pembatas"
    }
  }
}
```

### 2. Upvote & Konfirmasi Komunitas (`PATCH /api/obstacles/:id/upvote`)
#### Response JSON (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "SUB-2026-0890",
    "upvotes": 2,
    "confirmedCount": 2
  }
}
```
