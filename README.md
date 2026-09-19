# SatQuery AI · Remote-Sensing Image Intelligence

SatQuery AI (`v2.4-ORBIT`) is a high-performance geospatial intelligence web application and API gateway designed for remote-sensing imagery analysis, Visual Question Answering (VQA), and scene interpretation.

---

## 1. System Architecture

```
React Frontend (Vite + Tailwind / TypeScript) [Port 5173]
        ↓  REST API (Multipart Image / JSON)
FastAPI Backend Gateway (Python 3.12) [Port 8000]
        ↓
Analysis Service (Asynchronous Pipeline Stages)
        ↓
Inference Orchestrator
        ↓
Inference Adapter:
  ├── MockInferenceAdapter (Deterministic local reference data)
  └── ColabInferenceAdapter (Live remote GPU inference bridge)
            ↓  Cloudflare / ngrok Tunnel (HTTPS + Token Auth)
      Google Colab Worker (Tesla T4 GPU)
            ↓
      Qwen/Qwen2.5-VL-3B-Instruct
```

---

## 2. Operation Modes

SatQuery AI supports two distinct execution configurations:

### Mode A: Local Mock Mode (Fully Offline)
- **Frontend**: `VITE_USE_MOCK_API=false` (calls local FastAPI) or `VITE_USE_MOCK_API=true` (client-side simulation).
- **Backend**: `INFERENCE_MODE=mock`.
- **Behavior**: Analyses execute deterministically in ~1.5s using reference Sentinel-2 and port assessment assets. Zero GPU or internet connection required.

### Mode B: Real GPU Inference via Google Colab
- **Frontend**: `VITE_USE_MOCK_API=false` (calls local FastAPI).
- **Backend**: `INFERENCE_MODE=colab`.
- **Behavior**: Imagery and queries are uploaded from React to the Mac FastAPI backend, forwarded securely across an authenticated tunnel to a remote Google Colab GPU instance running `Qwen/Qwen2.5-VL-3B-Instruct`, and returned as structured analytical findings.

---

## 3. Quickstart & Development

### 3.1 Backend Setup (FastAPI)
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit backend/.env with your settings

# Run automated tests
pytest tests -v

# Start backend server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend URLs:
- API Root: `http://localhost:8000`
- Interactive Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI Schema: `http://localhost:8000/openapi.json`
- Inference Health: `http://localhost:8000/health/inference`

### 3.2 Frontend Setup (React + Vite)
```bash
npm install
npm run build
npm run dev
```

Frontend URL: `http://localhost:5173`

---

## 4. Documentation
- [API Integration Guide](docs/API_INTEGRATION.md) — Detailed schema and REST endpoint contracts.
- [Google Colab Integration Guide](docs/COLAB_INTEGRATION.md) — Server receiver code and GPU worker deployment instructions.

---

## 5. Security & Privacy
- Sensitive tokens (`COLAB_INFERENCE_TOKEN`, `SATQUERY_TOKEN`) and tunnel URLs are kept strictly in backend environment files (`backend/.env`).
- Environment configuration files (`.env`) are excluded from Git via `.gitignore`.
- React frontend clients never communicate directly with the Colab tunnel or receive worker authentication credentials.
