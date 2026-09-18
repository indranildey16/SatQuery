# SatQuery AI — FastAPI Backend Gateway

Lightweight, testable FastAPI backend for the SatQuery AI Remote-Sensing Image Intelligence platform.
Implements asynchronous pipeline stage orchestration, model registry, in-memory analysis storage, and a mock inference adapter simulating `Qwen/Qwen2.5-VL-3B-Instruct`.

---

## 1. Prerequisites

- Python 3.11 or 3.12 installed on your system.

---

## 2. Setup & Execution

### Windows (PowerShell)

```powershell
# 1. Navigate to the backend directory
cd backend

# 2. Create virtual environment
python -m venv .venv

# 3. Activate virtual environment
.venv\Scripts\Activate.ps1

# 4. Install dependencies
pip install -r requirements.txt

# 5. Start the FastAPI server
uvicorn app.main:app --reload --port 8000
```

### macOS / Linux (bash/zsh)

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create virtual environment
python3.12 -m venv .venv

# 3. Activate virtual environment
source .venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Start the FastAPI server
uvicorn app.main:app --reload --port 8000
```

---

## 3. Verifying the Server

Once started, the backend is available at `http://localhost:8000`:
- **Health check**: `http://localhost:8000/health`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **OpenAPI JSON specification**: `http://localhost:8000/openapi.json`

---

## 4. Running Tests

Run the automated pytest test suite:

```bash
# In macOS/Linux:
PYTHONPATH=. .venv/bin/pytest -v tests

# In Windows (with venv activated):
pytest -v tests
```

---

## 5. Architectural Flow

```
HTTP POST /api/v1/analyses (multipart/form-data)
       ↓
Analysis Service (Input & MIME Validation)
       ↓
Asynchronous Pipeline Stages (UPLOAD_RECEIVED → RESULT_READY)
       ↓
Inference Orchestrator
       ↓
MockInferenceAdapter (Qwen2.5-VL reference outputs)
       ↓
In-Memory Store (Thread-safe Async Lock)
```
