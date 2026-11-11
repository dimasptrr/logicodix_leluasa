# LELUASA Sidewalk Obstacle Dataset Guide

Dokumen ini menjelaskan spesifikasi dataset deteksi rintangan trotoar untuk mobilitas kursi roda (Permen PUPR No. 14/2017).

## 1. Format Dataset (YOLO Format)
Dataset menggunakan format standar Ultralytics YOLO:
```text
datasets/
├── images/
│   ├── train/
│   └── val/
└── labels/
    ├── train/
    └── val/
```

Setiap file `.txt` anotasi berisi baris dengan format koordinat dinormalisasi:
`<class_id> <x_center> <y_center> <width> <height>`

## 2. Kelas Rintangan (Classes)
| ID | Nama Kelas | Severity | Keterangan |
| :--- | :--- | :--- | :--- |
| 0 | `narrow_bollard` | Impassable | Bollard beton/pipa dengan celah $< 80\text{ cm}$ |
| 1 | `construction_pit` | Impassable | Galian saluran air/pipa/kabel terbuka |
| 2 | `broken_pavement` | Difficult | Paving amblas/rusak yang menjepit roda kastor |
| 3 | `stairs_no_ramp` | Impassable | Tangga/undakan tanpa rampa aksesibel |
| 4 | `steep_curb` | Caution | Transisi trotoar dengan kelandaian $> 8\%$ |
| 5 | `street_vendor` | Difficult | Lapak PKL/parkir liar memakan lajur trotoar |

## 3. Sumber Pre-trained Weights
Bobot model bawaan diletakkan di `app/models/weights/yolov8n.pt`.
Untuk pelatihan khusus koridor Surabaya, jalankan notebook di `notebooks/vision_training.ipynb`.

