"""
Main Hugging Face Spaces Entrypoint for LELUASA AI Service
Mounts FastAPI app with an accessible Gradio dashboard
"""

import gradio as gr
from app.main import app as fastapi_app

# Simple, professional Gradio dashboard for HF Spaces
with gr.Blocks(title="LELUASA AI Service - LOGICODIX 2026") as demo:
    gr.Markdown(
        """
        # ♿ LELUASA AI Microservice
        **LOGICODIX 2026 Hackathon**
        
        Hybrid Accessibility AI Service (YOLOv8 Sidewalk Obstacle Detection & Multimodal Vision)
        
        - 🟢 **API Status**: Online & Ready
        - 📄 **API Documentation (Swagger UI)**: [/docs](/docs)
        - 🩺 **Health Check**: [/api/health](/api/health)
        - 🎯 **Vision Endpoint**: `/api/v1/vision/detect`
        - 🎙️ **Voice Assistant Endpoint**: `/api/v1/voice-assistant/chat`
        """
    )

# Mount Gradio onto the FastAPI app at root "/"
# All FastAPI endpoints (/api/v1/*, /docs, /api/health) remain fully functional!
app = gr.mount_gradio_app(fastapi_app, demo, path="/")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=7860, reload=True)

