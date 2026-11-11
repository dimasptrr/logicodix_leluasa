"""
API Router for AI Route Recommendation
"""

from fastapi import APIRouter
from app.schemas.route import RouteEvaluationRequest, RouteEvaluationResponse
from app.services.route_recommendation.route_evaluator import route_evaluator_service

router = APIRouter(prefix="/route-recommendation", tags=["Route Recommendation"])

@router.post("/evaluate", response_model=RouteEvaluationResponse)
async def evaluate_routes(request: RouteEvaluationRequest):
    """
    Evaluate accessibility of candidate routes and provide rationale.
    """
    return await route_evaluator_service.evaluate(request)

