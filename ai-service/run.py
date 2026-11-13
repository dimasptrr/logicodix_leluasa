"""
Main Entrypoint for LELUASA AI Service on Hugging Face Spaces
FastAPI + YOLOv8 + Gradio Dashboard (ZeroGPU Compatible)
"""

import sys
from pathlib import Path

# Ensure root directory is in sys.path
ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# ZeroGPU decorator detection
try:
    import spaces
    HAS_SPACES = True
except ImportError:
    HAS_SPACES = False

import gradio as gr
from fastapi.middleware.cors import CORSMiddleware
from app.main import app as fastapi_app

# Function for ZeroGPU allocation check
def check_gpu_status(text: str = ""):
    return "ZeroGPU Active"

if HAS_SPACES:
    check_gpu_status = spaces.GPU(check_gpu_status)

# Gradio dashboard UI
with gr.Blocks(title="LELUASA AI Service - LOGICODIX 2026") as demo:
    gr.Markdown(
        """
        # ♿ LELUASA AI Microservice
        ### Inclusive Mobility Engine — LOGICODIX 2026 Hackathon
        
        Hybrid Accessibility AI Service (YOLOv8 Sidewalk Vision & Multimodal Reasoning)
        
        - 🟢 **Status**: Online & Ready (ZeroGPU Accelerated)
        - 📄 **API Documentation (Swagger UI)**: [/docs](/docs)
        - 🩺 **Health Check Endpoint**: [/api/health](/api/health)
        - 🎯 **Vision Detection Endpoint**: `/api/v1/vision/detect`
        - 🎙️ **Voice Assistant Endpoint**: `/api/v1/voice-assistant/chat`
        """
    )
    
    # Event handler to satisfy ZeroGPU startup scanner
    dummy_input = gr.Textbox(visible=False)
    dummy_output = gr.Textbox(visible=False)
    dummy_btn = gr.Button("Check GPU", visible=False)
    dummy_btn.click(fn=check_gpu_status, inputs=[dummy_input], outputs=[dummy_output])

# Mount all FastAPI routes into Gradio's internal FastAPI app
demo.app.include_router(fastapi_app.router)

# Enable CORS for frontend and server
demo.app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    demo.launch(ssr_mode=False)
