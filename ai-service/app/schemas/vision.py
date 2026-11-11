from typing import List, Optional
from pydantic import BaseModel, Field

class BoundingBox(BaseModel):
    x_min: float = Field(..., description="Normalized top-left X [0.0 - 1.0]")
    y_min: float = Field(..., description="Normalized top-left Y [0.0 - 1.0]")
    x_max: float = Field(..., description="Normalized bottom-right X [0.0 - 1.0]")
    y_max: float = Field(..., description="Normalized bottom-right Y [0.0 - 1.0]")

class DetectedObstacle(BaseModel):
    id: str = Field(..., description="Unique obstacle detection identifier")
    obstacle_class: str = Field(..., description="Classification category e.g. narrow_bollard, construction_pit, stairs, broken_pavement")
    label_id: str = Field(..., description="Indonesian label for UI e.g. 'Bollard / Pembatas'")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Detection confidence")
    bbox: BoundingBox
    severity: str = Field(..., description="'impassable', 'difficult', 'caution', or 'passable'")
    estimated_clearance_cm: Optional[int] = Field(None, description="Estimated passage width clearance in cm")
    advisory: Optional[str] = Field(None, description="Actionable advice for wheelchair users")

class VisionDetectionRequest(BaseModel):
    image_base64: Optional[str] = Field(None, description="Base64 encoded image string (JPEG/PNG/WebP)")
    image_url: Optional[str] = Field(None, description="Image URL")
    category_hint: Optional[str] = Field(None, description="User category hint")

class VisionDetectionResponse(BaseModel):
    status: str = Field("success", description="'success', 'warning', or 'error'")
    model_source: str = Field(..., description="'YOLOv8-Local' or 'Gemini-1.5-Multimodal' or 'Hybrid'")
    processing_time_ms: float
    total_detected: int
    obstacles: List[DetectedObstacle]
    overall_assessment: str
    warning: Optional[str] = None

