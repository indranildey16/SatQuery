# SatQuery AI — Google Colab Inference Integration Guide (Stage 5A)

This document provides the technical specification and setup instructions for connecting SatQuery AI's FastAPI backend to a GPU-accelerated Google Colab worker running **Qwen/Qwen2.5-VL-3B-Instruct**.

---

## 1. Architectural Overview

```
React Frontend (Port 5173)
        ↓ HTTP / multipart (No Colab tokens or URLs)
FastAPI Backend Gateway (Port 8000)
        ↓
InferenceOrchestrator
        ↓
ColabInferenceAdapter (Internal backend adapter)
        ↓ HTTPS / TLS (X-SatQuery-Token Header)
Public Tunnel (Cloudflare Tunnel / Ngrok)
        ↓
Google Colab Server (FastAPI on Colab Tesla T4 GPU)
        ↓
Qwen/Qwen2.5-VL-3B-Instruct (Single-Image VQA & Scene Understanding)
```

### Key Architectural Principles:
1. **Frontend Isolation**: The React frontend never communicates with Google Colab directly and never receives or stores Colab tokens or tunnel URLs.
2. **Hardware Protection**: Machine learning models and PyTorch GPU runtimes are NOT installed on the local macOS development machine.
3. **Dual-Mode Operation**: When `INFERENCE_MODE=mock`, SatQuery AI runs completely offline using deterministic reference outputs. When `INFERENCE_MODE=colab`, SatQuery AI routes requests to the Colab worker.
4. **Honest Outputs**: Uncalibrated VQA outputs are labeled honestly (`confidenceLabel: "Not calibrated (Colab VQA)"`, `confidenceScore: null`), and no bounding boxes or segmentations are fabricated.

---

## 2. Remote Worker API Contract

The Google Colab worker must expose the following HTTP endpoints:

### 2.1 Health Check
- **Method**: `GET /health`
- **Headers**: `X-SatQuery-Token: <token>` (optional for health)
- **Response (`200 OK`)**:
```json
{
  "status": "healthy",
  "model": "Qwen2.5-VL-3B-Instruct",
  "device": "cuda:0"
}
```

### 2.2 VQA Inference Endpoint
- **Method**: `POST /v1/infer`
- **Content-Type**: `multipart/form-data`
- **Headers**: `X-SatQuery-Token: <token>`
- **Form Fields**:
  - `image`: Binary image file (JPEG, PNG, or TIFF)
  - `question`: Natural language inquiry string
  - `task`: Target task type (`vqa` or `captioning`)

#### Expected Response (`200 OK`):
```json
{
  "answer": "The main land-cover types visible in this image include:\n1. Forested Areas: Dense mangrove and tidal canopy.\n2. Water Bodies: Estuarine channels.\n3. Dense Vegetation: Agricultural clearings.",
  "model": "Qwen2.5-VL-3B-Instruct",
  "task": "single_image_vqa",
  "runtime_ms": 1450
}
```

#### Error Response:
```json
{
  "error": "Detailed error explanation",
  "status_code": 400
}
```

---

## 3. Google Colab Server Script Template

Run this minimal FastAPI server inside your Google Colab notebook alongside Qwen2.5-VL:

```python
# Install dependencies in Colab:
# !pip install fastapi uvicorn pyngrok python-multipart torch torchvision transformers accelerate qwen-vl-utils

import torch
from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException, status
from transformers import Qwen2_5_VLForConditionalGeneration, AutoProcessor
from qwen_vl_utils import process_vision_info
from PIL import Image
import io
import time

COLAB_AUTH_TOKEN = "your-private-secure-token-here"

app = FastAPI(title="SatQuery Colab Inference Worker")

# Load model onto Tesla T4 GPU
print("Loading Qwen2.5-VL-3B-Instruct...")
model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
    "Qwen/Qwen2.5-VL-3B-Instruct",
    torch_dtype=torch.bfloat16,
    device_map="auto"
)
processor = AutoProcessor.from_pretrained("Qwen/Qwen2.5-VL-3B-Instruct")
print("Model loaded successfully.")

@app.get("/health")
def health(x_satquery_token: str = Header(None)):
    return {"status": "healthy", "model": "Qwen2.5-VL-3B-Instruct", "device": str(model.device)}

@app.post("/v1/infer")
async def infer(
    image: UploadFile = File(...),
    question: str = Form(...),
    task: str = Form("vqa"),
    x_satquery_token: str = Header(None)
):
    # Verify token
    if COLAB_AUTH_TOKEN and x_satquery_token != COLAB_AUTH_TOKEN:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    start_time = time.time()
    image_bytes = await image.read()
    pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "image", "image": pil_image},
                {"type": "text", "text": question}
            ]
        }
    ]

    text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    image_inputs, video_inputs = process_vision_info(messages)
    inputs = processor(
        text=[text],
        images=image_inputs,
        videos=video_inputs,
        padding=True,
        return_tensors="pt"
    ).to(model.device)

    generated_ids = model.generate(**inputs, max_new_tokens=256)
    generated_ids_trimmed = [
        out_ids[len(in_ids):] for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
    ]
    output_text = processor.batch_decode(
        generated_ids_trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False
    )[0]

    runtime_ms = int((time.time() - start_time) * 1000)

    return {
        "answer": output_text,
        "model": "Qwen2.5-VL-3B-Instruct",
        "task": task,
        "runtime_ms": runtime_ms
    }

# Expose via ngrok or cloudflared
# from pyngrok import ngrok
# public_url = ngrok.connect(8000).public_url
# print(f"Public Colab URL: {public_url}")
# import uvicorn
# uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

## 4. Backend Environment Configuration

In `backend/.env`:

```bash
# Set mode to colab when notebook is running
INFERENCE_MODE=colab

# Tunnel URL generated by ngrok or cloudflared
COLAB_INFERENCE_URL=https://your-tunnel-id.ngrok-free.app

# Private token matching COLAB_AUTH_TOKEN in the Colab notebook
COLAB_INFERENCE_TOKEN=your-private-secure-token-here

# Maximum seconds to wait for model inference (default: 120s)
TIMEOUT_SECONDS=120
```

---

## 5. Error Code Reference

When issues occur connecting to the Colab worker, SatQuery AI maps failures into structured domain error codes:

| Error Code | HTTP Status | Meaning | Recovery Action |
|---|---|---|---|
| `COLAB_UNAVAILABLE` | 503 / Failed | Colab tunnel offline, URL not configured, or connection refused | Check Colab notebook execution and verify tunnel URL |
| `COLAB_TIMEOUT` | 504 / Failed | Model execution exceeded `TIMEOUT_SECONDS` | Check GPU load on Colab; increase `TIMEOUT_SECONDS` |
| `COLAB_AUTH_FAILED` | 401 / Failed | Token rejected by Colab server | Ensure `COLAB_INFERENCE_TOKEN` matches notebook token |
| `COLAB_INVALID_RESPONSE` | 502 / Failed | Colab server returned malformed JSON or missing `answer` | Verify Colab server is running the expected FastAPI script |
| `INFERENCE_FAILED` | 500 / Failed | Model crashed (e.g. CUDA Out-Of-Memory) | Restart Colab notebook kernel to clear GPU VRAM |
