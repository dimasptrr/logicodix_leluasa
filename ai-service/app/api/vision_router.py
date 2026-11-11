"""
API Router for Vision Detection (YOLOv8 + Gemini Multimodal Hybrid)
"""

import time
import base64
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional

from app.schemas.vision import VisionDetectionRequest, VisionDetectionResponse, DetectedObstacle
from app.services.vision.yolo_detector import yolo_service
from app.services.vision.gemini_vision import gemini_vision_service

router = APIRouter(prefix="/vision", tags=["Vision Detection"])

@router.post("/detect", response_model=VisionDetectionResponse)
async def detect_obstacles(payload: VisionDetectionRequest):
    """
    Detect wheelchair accessibility obstacles from image base64 or URL.
    Uses Hybrid Pipeline: Local YOLOv8 + Gemini Multimodal Inspector.
    """
    start_time = time.time()
    img_b64 = payload.image_base64

    if not img_b64 and not payload.image_url:
        raise HTTPException(status_code=400, detail="image_base64 atau image_url wajib disediakan")

    # 1. First run local YOLOv8 detection
    yolo_obstacles = []
    yolo_ms = 0.0
    try:
        yolo_obstacles, yolo_ms = yolo_service.detect(img_b64 or payload.image_url)
    except Exception as e:
        print(f"[VisionRouter] YOLO detection error: {e}")

    # 2. If Gemini is configured, run Gemini multimodal audit
    gemini_obstacles = None
    gemini_assessment = None
    gemini_ms = 0.0

    if gemini_vision_service.is_configured() and img_b64:
        gemini_obstacles, gemini_assessment, gemini_ms = await gemini_vision_service.inspect(img_b64)

    # 3. Combine into hybrid result
    combined_obstacles = []
    model_source = "YOLOv8-Local"

    if gemini_obstacles and len(gemini_obstacles) > 0:
        # Gemini provides rich contextual sidewalk obstacles
        combined_obstacles = gemini_obstacles
        model_source = "Gemini-1.5-Multimodal + YOLOv8-Verified"
        overall = gemini_assessment or "Audit rintangan trotoar selesai."
    elif len(yolo_obstacles) > 0:
        combined_obstacles = yolo_obstacles
        overall = f"Terdeteksi {len(yolo_obstacles)} objek penghambat ruang gerak di trotoar."
    else:
        overall = "Tidak terdeteksi rintangan kritis mayor. Trotoar tampak dapat dilalui."

    impassable_count = sum(1 for o in combined_obstacles if o.severity == "impassable")
    warning_text = None
    if impassable_count > 0:
        warning_text = (
            f"Bahaya kritis: Terdeteksi {impassable_count} rintangan yang memblokir trotoar total. "
            "Pengguna kursi roda disarankan memutar ke lajur alternatif."
        )

    total_time_ms = round((time.time() - start_time) * 1000, 2)

    return VisionDetectionResponse(
        status="success",
        model_source=model_source,
        processing_time_ms=total_time_ms,
        total_detected=len(combined_obstacles),
        obstacles=combined_obstacles,
        overall_assessment=overall,
        warning=warning_text
    )

@router.post("/upload-detect", response_model=VisionDetectionResponse)
async def upload_detect_obstacle(
    file: UploadFile = File(...),
    category_hint: Optional[str] = Form(None)
):
    """
    Direct file upload endpoint for multipart form submissions.
    """
    contents = await file.read()
    b64_str = base64.b64encode(contents).decode("utf-8")
    mime = file.content_type or "image/jpeg"
    data_uri = f"data:{mime};base64,{b64_str}"

    return await detect_obstacles(
        VisionDetectionRequest(
            image_base64=data_uri,
            category_hint=category_hint
        )
    )

