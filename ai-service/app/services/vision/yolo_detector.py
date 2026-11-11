"""
Local YOLOv8 Computer Vision Detector for Sidewalk Obstacles
"""

import os
import io
import time
import base64
from typing import List, Dict, Any, Tuple
from PIL import Image
import numpy as np

try:
    from ultralytics import YOLO
    ULTRALYTICS_AVAILABLE = True
except ImportError:
    YOLO = None
    ULTRALYTICS_AVAILABLE = False
from app.config import YOLO_MODEL_PATH, CONFIDENCE_THRESHOLD, IOU_THRESHOLD
from app.schemas.vision import BoundingBox, DetectedObstacle

# Sidewalk accessibility severity mapping for common physical objects
SEVERITY_MAPPING = {
    "traffic light": ("difficult", 65, "Tiang rambu lalu lintas menyempitkan koridor trotoar"),
    "fire hydrant": ("difficult", 70, "Pipa hidran menutup jalur pemandu"),
    "stop sign": ("difficult", 75, "Tiang rambu membatasi ruang manuver"),
    "bench": ("caution", 80, "Bangku umum memakan sebagian lajur pejalan kaki"),
    "chair": ("caution", 80, "Kursi/meja PKL menjorok ke trotoar"),
    "car": ("impassable", 0, "Kendaraan parkir liar menutup trotoar total"),
    "motorcycle": ("impassable", 0, "Sepeda motor terparkir di trotoar"),
    "bicycle": ("difficult", 60, "Sepeda menghalangi lajur rampa"),
    "construction": ("impassable", 0, "Galian proyek utilitas terbuka berbahaya"),
    "pothole": ("difficult", 40, "Lubang/paving amblas berisiko menjepit roda kastor"),
    "bollard": ("impassable", 55, "Bollard terlalu rapat (<80cm)"),
    "stairs": ("impassable", 0, "Undakan tangga tanpa rampa aksesibel"),
}

class YOLODetectorService:
    def __init__(self, model_path: str = YOLO_MODEL_PATH):
        self.model_path = model_path
        self.model = None
        self._load_model()

    def _load_model(self):
        if not ULTRALYTICS_AVAILABLE:
            print("[YOLODetector] Info: Paket 'ultralytics' belum terpasang. Mode fallback aktif.")
            self.model = None
            return
        try:
            if os.path.exists(self.model_path):
                self.model = YOLO(self.model_path)
                print(f"[YOLODetector] Model loaded successfully: {self.model_path}")
            else:
                print(f"[YOLODetector] Model not found at {self.model_path}, downloading yolov8n.pt...")
                self.model = YOLO("yolov8n.pt")
        except Exception as e:
            print(f"[YOLODetector] Error loading YOLO model: {e}")
            self.model = None

    def decode_image(self, image_input: Any) -> Image.Image:
        """Decode image from bytes, base64 string, or PIL Image."""
        if isinstance(image_input, Image.Image):
            return image_input.convert("RGB")

        if isinstance(image_input, bytes):
            return Image.open(io.BytesIO(image_input)).convert("RGB")

        if isinstance(image_input, str):
            # Check for base64 data uri prefix
            if "base64," in image_input:
                image_input = image_input.split("base64,")[1]
            image_bytes = base64.b64decode(image_input)
            return Image.open(io.BytesIO(image_bytes)).convert("RGB")

        raise ValueError("Unsupported image input format")

    def detect(self, image_input: Any, conf: float = CONFIDENCE_THRESHOLD) -> Tuple[List[DetectedObstacle], float]:
        start_time = time.time()
        image = self.decode_image(image_input)
        img_w, img_h = image.size

        if self.model is None:
            self._load_model()

        if self.model is None:
            return [], 0.0

        # Run inference
        results = self.model.predict(
            source=image,
            conf=conf,
            iou=IOU_THRESHOLD,
            verbose=False
        )

        detected_obstacles: List[DetectedObstacle] = []
        detection_idx = 1

        for r in results:
            boxes = r.boxes
            for box in boxes:
                cls_id = int(box.cls[0].item())
                cls_name = self.model.names.get(cls_id, f"obj_{cls_id}").lower()
                confidence = float(box.conf[0].item())

                # Normalized coordinates [x_min, y_min, x_max, y_max]
                xyxy = box.xyxy[0].tolist()
                x_min = max(0.0, min(1.0, xyxy[0] / img_w))
                y_min = max(0.0, min(1.0, xyxy[1] / img_h))
                x_max = max(0.0, min(1.0, xyxy[2] / img_w))
                y_max = max(0.0, min(1.0, xyxy[3] / img_h))

                severity, clearance, default_advisory = SEVERITY_MAPPING.get(
                    cls_name,
                    ("difficult", 70, f"Rintangan {cls_name} terdeteksi di trotoar")
                )

                label_id = cls_name.capitalize()
                if "car" in cls_name or "motor" in cls_name:
                    label_id = "Parkir Liar di Trotoar"
                elif "bench" in cls_name or "chair" in cls_name:
                    label_id = "Objek Pembatas / PKL"
                elif "traffic" in cls_name or "sign" in cls_name:
                    label_id = "Tiang Rambu / Fasilitas Jalan"

                detected_obstacles.append(
                    DetectedObstacle(
                        id=f"yolo-obs-{detection_idx}",
                        obstacle_class=cls_name,
                        label_id=label_id,
                        confidence=round(confidence, 2),
                        bbox=BoundingBox(
                            x_min=round(x_min, 4),
                            y_min=round(y_min, 4),
                            x_max=round(x_max, 4),
                            y_max=round(y_max, 4)
                        ),
                        severity=severity,
                        estimated_clearance_cm=clearance,
                        advisory=default_advisory
                    )
                )
                detection_idx += 1

        elapsed_ms = round((time.time() - start_time) * 1000, 2)
        return detected_obstacles, elapsed_ms

yolo_service = YOLODetectorService()

