from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class CandidateRouteInput(BaseModel):
    id: str = Field(..., description="Route ID e.g. 'routeA', 'routeB'")
    title: str = Field(..., description="Route title")
    distance_meters: float
    duration_minutes: float
    coordinates: List[List[float]] = Field(..., description="Leaflet [lat, lng] coordinates list")
    surface_types: Optional[List[str]] = Field(default_factory=list)

class RouteObstacleRef(BaseModel):
    id: str
    lat: float
    lng: float
    category: str
    severity: str
    clearance_cm: Optional[int] = None

class EvaluatedRouteItem(BaseModel):
    route_id: str
    safety_score: int = Field(..., ge=0, le=100)
    safety_label: str
    severity: str
    penalty_points: float
    is_recommended: bool
    rationale: str
    permeability_analysis: str

class RouteEvaluationRequest(BaseModel):
    profile: Optional[str] = "electric"
    origin_name: Optional[str] = "Titik Keberangkatan"
    destination_name: Optional[str] = "Tujuan"
    candidate_routes: List[CandidateRouteInput]
    active_obstacles: Optional[List[RouteObstacleRef]] = Field(default_factory=list)

class RouteEvaluationResponse(BaseModel):
    status: str = Field("success")
    engine: str = Field("Leluasa-Hybrid-Reasoning-Engine")
    recommended_route_id: str
    executive_summary: str
    evaluations: List[EvaluatedRouteItem]

