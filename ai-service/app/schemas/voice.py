from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class ParsedNavigationIntent(BaseModel):
    intent: str = Field(..., description="NAVIGATE_TO | REPORT_OBSTACLE | CHECK_WEATHER | TOGGLE_ACCESSIBILITY | GENERAL_CHAT")
    confidence: float = Field(..., ge=0.0, le=1.0)
    entities: Dict[str, Any] = Field(default_factory=dict, description="Extracted parameters e.g. destination, profile")
    destination_name: Optional[str] = None
    suggested_tab: Optional[str] = None

class VoiceChatRequest(BaseModel):
    message: str = Field(..., description="Transcript or user message in Indonesian/English")
    session_id: Optional[str] = Field(None, description="Session tracking ID")
    current_tab: Optional[str] = Field("home", description="Current frontend view")
    user_mobility_profile: Optional[str] = Field("electric", description="'electric', 'manual', 'walker'")

class VoiceChatResponse(BaseModel):
    status: str = Field("success")
    model_source: str = Field("Gemini-1.5-Flash")
    input_text: str
    reply_text: str = Field(..., description="Speech response text to read out or display")
    parsed_intent: ParsedNavigationIntent
    suggested_route: Optional[Dict[str, Any]] = None

