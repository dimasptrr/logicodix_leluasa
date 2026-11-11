"""
Configuration Loader for Leluasa AI Service
"""

import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env from ai-service or project root
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")

AI_HOST = os.getenv("AI_HOST", "0.0.0.0")
AI_PORT = int(os.getenv("AI_PORT", 8000))
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

# Default weights location
DEFAULT_YOLO_PATH = str(BASE_DIR / "app" / "models" / "weights" / "yolov8n.pt")
raw_yolo_path = os.getenv("YOLO_MODEL_PATH")
if raw_yolo_path:
    if os.path.exists(raw_yolo_path):
        YOLO_MODEL_PATH = raw_yolo_path
    elif (BASE_DIR / raw_yolo_path).exists():
        YOLO_MODEL_PATH = str(BASE_DIR / raw_yolo_path)
    else:
        YOLO_MODEL_PATH = raw_yolo_path
else:
    YOLO_MODEL_PATH = DEFAULT_YOLO_PATH
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", 0.30))
IOU_THRESHOLD = float(os.getenv("IOU_THRESHOLD", 0.45))

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:5000,http://localhost:5173"
    ).split(",")
]

