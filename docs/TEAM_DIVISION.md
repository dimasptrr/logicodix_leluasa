# LELUASA — Team Division & Development Guide

Dokumen ini mengatur pembagian tugas, kepemilikan folder, file independen vs file bersama (*shared*), serta urutan pengembangan untuk tim pengembang proyek **LELUASA** (LOGICODIX 2026).

---

## 1. Matriks Kepemilikan & Tanggung Jawab

| Anggota Tim | Peran Utama | Folder Kepemilikan Utama | Scope Tanggung Jawab |
| :--- | :--- | :--- | :--- |
| **DIMAS** | **AI & Machine Learning Lead** | • `ai-service/`<br>• `client/src/features/ai/` | 1. **AI Vision**: Deteksi rintangan kursi roda via YOLO, bounding box, klasifikasi severity, estimasi clearance.<br>2. **AI Route Recommendation**: Evaluasi keamanan kandidat rute, penalti kelandaian & rintangan.<br>3. **AI Voice Assistant**: Speech-to-text, pemahaman perintah suara (*intent classification*), feedback suara.<br>4. **AI Weather Intelligence**: Analisis koefisien gesek ubin (*traction friction index*) & peringatan slip saat hujan. |
| **ERLINDA** | **Fullstack & Backend Lead** | • `server/`<br>• `client/src/features/reporting/` | 1. **Arsitektur Backend**: REST API Node.js/Express modular.<br>2. **Database & Data Layer**: Model data, skema, migrasi & seed rintangan Surabaya.<br>3. **Autentikasi & Pengguna**: Autentikasi JWT, manajemen profil mobilitas kursi roda.<br>4. **Pelaporan Rintangan**: CRUD laporan rintangan, verifikasi komunitas, integrasi disposisi DPUPR.<br>5. **Integrasi Antar-Layanan**: HTTP proxy dan jembatan ke `ai-service`. |
| **CACA** | **UI/UX & Frontend Lead** | • `client/src/features/dashboard/`<br>• `client/src/components/`<br>• `client/src/pages/` | 1. **Antarmuka Pengguna (UI)**: Dashboard, kartu status mobilitas, responsive drawer & navigasi.<br>2. **Aksesibilitas Frontend**: Mode kontras tinggi, navigasi ramah pembaca layar (screen reader), shortcut suara global ('V').<br>3. **Desain & Usabilitas**: Mempertahankan palet warna Material 3, Tailwind utility, dan micro-interaction yang nyaman bagi disabilitas motorik. |
| **KAKA** | **Routing Engine & GIS Lead** | • `client/src/features/routing/`<br>• `server/src/modules/routing/` | 1. **GIS Network Baseline**: Integrasi OpenStreetMap (OSM) dan OpenRouteService (ORS) pedestrian footways.<br>2. **Geometri Jaringan Riil**: Snapping GPS, kalkulasi jarak Haversine, konversi GeoJSON `[lng, lat]` ↔ Leaflet `[lat, lng]`.<br>3. **Cost Function Aksesibilitas**: Spatial buffer rintangan 30 meter, bobot penalti kelandaian rampa trotoar (Permen PUPR No. 14/2017).<br>4. **Komparasi Rute**: Perbandingan Rute Standar vs Rute AI Leluasa. |

---

## 2. File Independen vs File Bersama (Shared Files)

### A. File Independen (Bisa Diubah Kapan Saja Tanpa Koordinasi)
- **Dimas**: Seluruh isi `ai-service/` dan komponen `client/src/features/ai/`
- **Erlinda**: Seluruh isi `server/src/modules/obstacles/`, `server/src/modules/users/`, `server/src/modules/reports/`, `server/src/modules/authentication/`, dan `client/src/features/reporting/`
- **Caca**: Seluruh isi `client/src/features/dashboard/` dan styling spesifik komponen bersama
- **Kaka**: Seluruh isi `client/src/features/routing/` dan algoritma di `server/src/modules/routing/`

### B. File Bersama (Wajib Koordinasi Saat Mengubah)
1. **`docs/API_CONTRACT.md`**: Wajib disepakati bersama sebelum mengubah struktur payload request/response JSON.
2. **`client/src/services/api.js`**: Titik temu pemanggilan API dari frontend ke server.
3. **`server/src/app.js`**: Titik mounting semua modul rute backend oleh Erlinda.
4. **`client/src/App.jsx`**: Layout utama yang menghubungkan navigasi tab antarmuka.

---

## 3. Dependensi Integrasi Antar-Modul

```
[ DIMAS: ai-service (FastAPI :8000) ]
        ▲
        │ HTTP REST (AI Vision, Route Eval, Weather, Voice)
        ▼
[ ERLINDA: server (Express :5000) ] ◄──► [ KAKA: Routing Module (GIS Cost Engine) ]
        ▲
        │ HTTP REST (/api/obstacles, /api/routes, /api/weather, /api/stats)
        ▼
[ CACA: client (React 19 + Leaflet :3000) ]
```

1. **Reporting & AI Vision**:
   - Form pelaporan di `ReportObstacle.jsx` (Caca/Erlinda) mengirim foto rintangan ke `POST /api/obstacles`.
   - Backend `server` (Erlinda) memanggil `POST /api/v1/vision/detect` pada `ai-service` (Dimas) untuk mendapatkan bounding box dan kelas rintangan.
2. **Routing & Obstacle Evaluation**:
   - Halaman `PlanRoute.jsx` meminta perbandingan rute ke `GET /api/routes/compare`.
   - Modul routing (Kaka) mengambil geometri jaringan OSM/ORS, mengambil daftar rintangan aktif dari database (Erlinda), dan memanggil modul evaluasi aksesibilitas (Dimas) untuk menghasilkan skor keamanan (Safety Score).

---

## 4. Urutan Rekomendasi Pengembangan (Sprint Workflow)

1. **Sprint 1 — Dasar Modul & Kontrak (Hari 1)**:
   - Dimas menyiapkan environment Python (`ai-service`), definisi skema Pydantic sesuai `docs/API_CONTRACT.md`.
   - Erlinda menyiapkan server Express di `server/` dengan port `5000` dan route skeleton.
   - Kaka menyiapkan modul kalkulasi geometri GIS di `server/src/modules/routing/` dan `client/src/features/routing/`.
   - Caca merapikan navigasi dan reusable components di `client/`.

2. **Sprint 2 — Implementasi Fitur Inti (Hari 2-3)**:
   - Dimas melatih atau mengintegrasikan model YOLO untuk rintangan trotoar dan NLU suara.
   - Erlinda menyelesaikan CRUD rintangan dan sistem upvote komunitas.
   - Kaka mengintegrasikan footway OpenStreetMap dan cost function rampa trotoar.
   - Caca mengintegrasikan tampilan peta Leaflet dan kartu informasi rintangan.

3. **Sprint 3 — Integrasi Penuh & Uji Coba Lapangan (Hari 4)**:
   - Uji coba *end-to-end* alur pengguna dari pelaporan rintangan → deteksi AI → rute pengalihan kursi roda.
   - Verifikasi performa respons sistem dan responsivitas antarmuka di layar ponsel.

