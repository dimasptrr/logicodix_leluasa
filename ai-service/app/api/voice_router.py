"""
API Router for Voice Assistant (Gemini NLU + Fallback)
"""

from fastapi import APIRouter
from app.schemas.voice import VoiceChatRequest, VoiceChatResponse
from app.services.voice_assistant.voice_service import voice_service

router = APIRouter(prefix="/voice-assistant", tags=["Voice Assistant"])

@router.post("/chat", response_model=VoiceChatResponse)
async def chat_voice_assistant(request: VoiceChatRequest):
    """
    Handle natural language commands and questions from voice speech recognition.
    """
    return await voice_service.chat(request)

@router.post("/parse", response_model=VoiceChatResponse)
async def parse_voice_command(request: VoiceChatRequest):
    """
    Backward-compatible endpoint for parsing navigation commands into structured intents.
    """
    return await voice_service.chat(request)

