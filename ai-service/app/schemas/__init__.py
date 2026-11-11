"""
Pydantic Schemas for Leluasa AI Service API
"""
from .vision import BoundingBox, DetectedObstacle, VisionDetectionRequest, VisionDetectionResponse
from .voice import VoiceChatRequest, VoiceChatResponse, ParsedNavigationIntent
from .route import CandidateRouteInput, RouteEvaluationRequest, RouteEvaluationResponse
from .weather import WeatherAssessmentRequest, WeatherAssessmentResponse, TractionAssessment

