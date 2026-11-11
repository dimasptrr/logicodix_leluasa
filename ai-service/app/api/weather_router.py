"""
API Router for AI Weather & Pavement Traction Intelligence
"""

from fastapi import APIRouter
from app.schemas.weather import WeatherAssessmentRequest, WeatherAssessmentResponse
from app.services.weather_intelligence.traction_service import weather_traction_service

router = APIRouter(prefix="/weather-intelligence", tags=["Weather Intelligence"])

@router.post("/analyze", response_model=WeatherAssessmentResponse)
async def analyze_weather_traction(request: WeatherAssessmentRequest):
    """
    Calculate pavement friction index and generate wheelchair travel guidelines.
    """
    return weather_traction_service.calculate_traction(request)

