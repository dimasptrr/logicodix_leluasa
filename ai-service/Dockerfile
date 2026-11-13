FROM python:3.10-slim

WORKDIR /app

# Install system libraries needed by OpenCV and YOLO
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Hugging Face Spaces default port is 7860
ENV AI_HOST=0.0.0.0
ENV AI_PORT=7860
ENV CORS_ORIGINS=*

EXPOSE 7860

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]

