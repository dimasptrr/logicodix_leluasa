from typing import Optional, List
from pydantic import BaseModel, Field

class WeatherTelemetryInput(BaseModel):
    temperature_celsius: float
    humidity_percent: float
    precipitation_mm: float = 0.0
    weather_code: int = 0
    wind_speed_kmh: float = 10.0
    surface_type: Optional[str] = "ceramic_tile"

class TractionAssessment(BaseModel):
    friction_coefficient: float = Field(..., ge=0.0, le=1.0)
    traction_percentage: int = Field(..., ge=0, le=100)
    risk_level: str = Field(..., description="'safe', 'caution', 'high_risk', 'critical'")
    primary_slip_hazard: str

class WeatherAssessmentRequest(BaseModel):
    location: Optional[str] = "Surabaya Pusat"
    telemetry: WeatherTelemetryInput

class WeatherAssessmentResponse(BaseModel):
    status: str = Field("success")
    location: str
    assessment: TractionAssessment
    wheelchair_speed_limit_kmh: float
    ai_travel_advisory: str
    guidelines: List[str]

