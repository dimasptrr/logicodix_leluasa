"""
Leluasa AI Service - Main FastAPI Application
Author: Dimas (AI Lead) - LOGICODIX 2026
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.config import AI_HOST, AI_PORT, ENVIRONMENT, CORS_ORIGINS
from app.api.vision_router import router as vision_router
from app.api.voice_router import router as voice_router
from app.api.route_router import router as route_router
from app.api.weather_router import router as weather_router
from app.services.vision.gemini_vision import gemini_vision_service
from app.services.vision.yolo_detector import yolo_service

app = FastAPI(
    title="LELUASA AI Service",
    description="Hybrid AI Service (YOLOv8 Local Vision + Google Gemini Multimodal Reasoning) for Accessible Wheelchair Navigation",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers under /api/v1
app.include_router(vision_router, prefix="/api/v1")
app.include_router(voice_router, prefix="/api/v1")
app.include_router(route_router, prefix="/api/v1")
app.include_router(weather_router, prefix="/api/v1")

@app.get("/")
@app.get("/health")
@app.get("/api/health")
async def health_check():
    return {
        "status": "online",
        "service": "leluasa-ai-service",
        "competition": "LOGICODIX 2026",
        "architecture": "Hybrid (YOLOv8 + Gemini 1.5 Flash)",
        "models": {
            "yolo_loaded": yolo_service.model is not None,
            "gemini_configured": gemini_vision_service.is_configured()
        }
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host=AI_HOST, port=AI_PORT, reload=True)

