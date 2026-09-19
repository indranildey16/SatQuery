# SatQuery AI — API Contract & Integration Guide

This document describes the FastAPI backend contract for SatQuery AI (`v2.4-ORBIT`), aligning the React frontend service layer with the Python backend inference orchestrator.

---

## 1. Overview & Architecture

SatQuery AI uses a strict architectural separation:

```
React / Vite Frontend (Port 5173)
        ↓  HTTP / REST
FastAPI Gateway (Port 8000)
        ↓
Analysis Service (Asynchronous Pipeline Stages)
        ↓
Inference Orchestrator
        ↓
Inference Adapter (MockInferenceAdapter today → ColabInferenceAdapter later)
        ↓
GPU Model (Qwen2.5-VL-3B-Instruct)
```

- **Base URL**: `http://localhost:8000`
- **Prefix**: `/api/v1`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **OpenAPI Schema**: `http://localhost:8000/openapi.json`

---

## 2. API Endpoints

### 2.1 System Health
`GET /health`

**Response (`200 OK`)**:
```json
{
  "status": "healthy",
  "version": "v2.4-ORBIT",
  "environment": "development",
  "inference_mode": "mock"
}
```

---

### 2.2 Models Registry
`GET /api/v1/models`

Returns registered machine learning vision-language models and analytical pipelines.

**Response (`200 OK`)**:
```json
[
  {
    "id": "qwen2.5-vl-3b",
    "name": "Qwen2.5-VL-3B-Instruct",
    "version": "2.5",
    "modality": ["optical", "auto"],
    "tasks": ["vqa", "captioning", "scene_understanding"],
    "status": "available",
    "environment": "google-colab",
    "description": "Demonstrated Vision-Language model running single-image VQA & scene understanding.",
    "isDemo": true
  },
  {
    "id": "deeplab-yolov8-fusion",
    "name": "DeepLabV3+ & S2-YOLOv8",
    "version": "Optical v2.4.1",
    "modality": ["optical"],
    "tasks": ["detection", "segmentation"],
    "status": "loading",
    "environment": "PyTorch Colab-Ready T4",
    "description": "Dual pipeline for marine infrastructure segmentation & high-resolution vessel bounding boxes.",
    "isDemo": true
  },
  {
    "id": "sar-sentinel1-detector",
    "name": "Sentinel-1 C-Band SAR Feature Extractor",
    "version": "SAR v1.2",
    "modality": ["sar"],
    "tasks": ["detection", "change_analysis"],
    "status": "unavailable",
    "environment": "Cloud Inference Server",
    "description": "Synthetic Aperture Radar amplitude & coherence detector for all-weather monitoring.",
    "isDemo": true
  }
]
```

---

### 2.3 User Projects
`GET /api/v1/projects`

Returns project workspaces and analysis counts.

**Response (`200 OK`)**:
```json
[
  {
    "id": "proj-01",
    "name": "Coastal & Delta Maritime Monitoring",
    "description": "High-resolution vessel classification and estuarine plume monitoring across major trade ports.",
    "analysisCount": 14,
    "lastUpdated": "2026-09-18 10:44"
  }
]
```

---

### 2.4 Create Analysis
`POST /api/v1/analyses`

Submits an imagery scene and analytical prompt. Accepts `multipart/form-data`.

**Form Parameters**:

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `image` | Binary File | **Yes** | — | Supported: `.jpg`, `.jpeg`, `.png`, `.tif`, `.tiff`, `.geotiff` (Max 25MB) |
| `query` | String | **Yes** (for VQA/captioning) | `""` | Natural-language analytical question (min 3 chars) |
| `modality` | String | No | `"auto"` | `optical`, `sar`, or `auto` |
| `task` | String | No | `"vqa"` | `vqa`, `captioning`, `detection`, `segmentation`, `scene_understanding`, `change_analysis` |
| `model_selection_mode` | String | No | `"auto"` | `auto` or `manual` |
| `model_id` | String | No | `null` | Target model ID (e.g. `qwen2.5-vl-3b`) |
| `project_id` | String | No | `null` | Associated project workspace ID |

**Response (`201 Created`)**:
```json
{
  "analysis_id": "ANL-2024-4821",
  "status": "queued"
}
```

---

### 2.5 Get Analysis (Polling & Results)
`GET /api/v1/analyses/{analysis_id}`

Retrieves the current state. When `status` is `queued` or `processing`, returns progress and active pipeline stage. When `status` is `completed`, returns the full analytical result payload.

#### A. While Processing (`status`: `queued` or `processing`):
```json
{
  "analysis_id": "ANL-2024-4821",
  "status": "processing",
  "progress": 60,
  "stage": "MODEL_SELECTION",
  "currentStage": "MODEL_SELECTION"
}
```

#### B. When Completed (`status`: `completed`):
```json
{
  "id": "ANL-2024-4821",
  "analysis_id": "ANL-2024-4821",
  "title": "What are the main land-cover types visible in this image?",
  "status": "completed",
  "progress": 100,
  "stage": "RESULT_READY",
  "currentStage": "RESULT_READY",
  "enclaveCrs": "EPSG:4326 (WGS 84)",
  "query": {
    "text": "What are the main land-cover types visible in this image?",
    "task": "vqa"
  },
  "input": {
    "imageId": "img-anl-2024-4821",
    "imageUrl": "/samples/guinea-bissau-sample.jpg",
    "metadata": {
      "filename": "Earth_from_Space_Guinea-Bissau.jpg",
      "width": 3840,
      "height": 3840,
      "format": "image/jpeg",
      "fileSizeBytes": 5104230,
      "modality": "optical",
      "satellite": "Copernicus Sentinel-2",
      "sensor": "MSI Multispectral",
      "acquisitionDate": "2026-09-18 16:05:20",
      "resolutionMeters": 10.0,
      "cloudCoveragePercent": 5.0,
      "coordinates": {
        "lat": 11.8037,
        "lng": -15.1804,
        "crs": "WGS 84 / EPSG:4326"
      }
    }
  },
  "model": {
    "id": "qwen2.5-vl-3b",
    "name": "Qwen2.5-VL-3B-Instruct",
    "version": "2.5",
    "modality": ["optical", "auto"],
    "tasks": ["vqa", "captioning", "scene_understanding"],
    "status": "available",
    "environment": "google-colab",
    "description": "Demonstrated Vision-Language model running single-image VQA & scene understanding.",
    "isDemo": true
  },
  "results": {
    "summary": "Optical imagery resolves multi-class land-cover: tidal mangrove forest, estuarine water channels, and agrarian vegetation.",
    "rawAnswer": "The main land-cover types visible in this image include:\n\n1. **Forested Areas**: The dark green regions indicate dense forest canopy and tidal mangrove complexes.\n2. **Water Bodies**: Major estuarine channels and ocean inlets, visible with distinct sediment-rich turbidity gradients.\n3. **Urban or Developed Areas**: Lighter reflectance patches along riverbanks, indicating rural settlements and infrastructure.\n4. **Dense Vegetation**: Inland vegetation and agricultural clearings displaying high vegetative index.\n\nThe exact boundaries and specific types of these land-cover types vary depending on the scale and resolution of the image.",
    "findings": [
      "Forested Areas: Dense mangrove and tidal forest canopies dominant along the delta coastline.",
      "Water Bodies: Extensive estuarine channels displaying distinct sediment gradients.",
      "Urban / Developed Patches: Settlement clusters and road clearings along waterways.",
      "Dense Vegetation: High chlorophyll spectral response throughout the inland drainage basin."
    ],
    "detections": [],
    "segments": [],
    "visualizations": [
      {
        "id": "layer-base",
        "type": "original",
        "label": "Base Optical (Scene)",
        "badge": "TRUECOLOR",
        "visible": true,
        "opacity": 100
      }
    ],
    "geojson": null,
    "metrics": {
      "runtimeMs": 2200,
      "confidenceScore": null,
      "confidenceLabel": "Not calibrated (Demo)",
      "detectedVessels": 0,
      "cloudOcclusionPercent": 5.0
    }
  },
  "trace": {
    "inputCount": 1,
    "task": "vqa",
    "model": "Qwen2.5-VL-3B-Instruct",
    "status": "completed",
    "runtimeSeconds": 2.2,
    "confidenceNote": "Confidence is uncalibrated for demo VQA outputs.",
    "evidenceNote": "Observations derived via vision-language spatial tokens.",
    "stages": [
      { "stage": "UPLOAD_RECEIVED", "timestamp": "16:05:18", "durationMs": 150, "status": "completed", "details": "Validating image payload and MIME format" },
      { "stage": "IMAGE_VALIDATION", "timestamp": "16:05:18", "durationMs": 200, "status": "completed", "details": "Checking dimensional resolution and spectral profile" },
      { "stage": "MODALITY_RESOLUTION", "timestamp": "16:05:18", "durationMs": 200, "status": "completed", "details": "Resolving sensor band alignment and CRS reference" },
      { "stage": "QUERY_INTERPRETATION", "timestamp": "16:05:19", "durationMs": 200, "status": "completed", "details": "Parsing natural-language query and task constraints" },
      { "stage": "MODEL_SELECTION", "timestamp": "16:05:19", "durationMs": 200, "status": "completed", "details": "Selected target model: Qwen2.5-VL-3B-Instruct" },
      { "stage": "MODEL_INFERENCE", "timestamp": "16:05:19", "durationMs": 400, "status": "completed", "details": "Inference executed using Qwen2.5-VL-3B-Instruct for vqa" },
      { "stage": "RESULT_PROCESSING", "timestamp": "16:05:20", "durationMs": 250, "status": "completed", "details": "Synthesizing findings and geospatial telemetry" },
      { "stage": "RESULT_READY", "timestamp": "16:05:20", "durationMs": 100, "status": "completed", "details": "Finalizing visualization layers" }
    ]
  },
  "createdAt": "2026-09-18 16:05:18",
  "updatedAt": "2026-09-18 16:05:20"
}
```

---

## 3. Structural Pipeline Stages

The backend progresses deterministically through 8 stages:

| Stage Name | Progress % | Simulated Latency | Description |
|---|---|---|---|
| `UPLOAD_RECEIVED` | 12% | ~150ms | Ingesting and verifying image format |
| `IMAGE_VALIDATION` | 24% | ~200ms | Checking spatial bounds & resolution |
| `MODALITY_RESOLUTION` | 36% | ~200ms | Spectral band identification & coordinate system |
| `QUERY_INTERPRETATION` | 48% | ~200ms | NLP tokenization of inquiry |
| `MODEL_SELECTION` | 60% | ~200ms | Routing to target model adapter |
| `MODEL_INFERENCE` | 78% | ~400ms | Vision-language attention inference |
| `RESULT_PROCESSING` | 90% | ~250ms | Formatting observations & confidence notes |
| `RESULT_READY` | 100% | ~100ms | Ready for visualization in viewer |

---

## 4. Error Responses

All errors return a structured JSON response:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description of error.",
    "details": null
  }
}
```

### Common Error Codes:
- `MISSING_IMAGE` (400): No image file provided in multipart body.
- `INVALID_IMAGE` (400): Unsupported file format (only JPEG, PNG, TIFF supported).
- `FILE_TOO_LARGE` (400): File exceeds max upload size (25MB).
- `MISSING_QUERY` (400): Query length is less than 3 characters for VQA.
- `UNSUPPORTED_MODALITY` (400): Invalid sensor modality string.
- `UNSUPPORTED_TASK` (400): Invalid analytical task string.
- `UNKNOWN_ANALYSIS` (404): Analysis ID does not exist in registry.
- `VALIDATION_ERROR` (422): FastAPI/Pydantic request syntax validation failure.
- `INTERNAL_SERVER_ERROR` (500): Unhandled server exception.

---

## 5. Curl Quick Testing

### 1. Health Check
```bash
curl http://localhost:8000/health
```

### 2. Submit Analysis
```bash
curl -X POST http://localhost:8000/api/v1/analyses \
  -F "image=@public/samples/guinea-bissau-sample.jpg" \
  -F "query=What are the main land-cover types visible in this image?" \
  -F "modality=optical" \
  -F "task=vqa"
```

### 3. Poll Analysis Status & Result
```bash
curl http://localhost:8000/api/v1/analyses/ANL-2024-XXXX
```

---

## 6. Frontend Integration & Dual-Mode Configuration (Stage 4)

SatQuery AI's React frontend connects seamlessly to the FastAPI backend while retaining a full mock fallback mode.

### Environment Configuration (`.env`)

```bash
# Connect to live FastAPI backend (default for Stage 4)
VITE_API_BASE_URL=http://localhost:8000
VITE_USE_MOCK_API=false

# Or switch to standalone frontend mock mode
# VITE_USE_MOCK_API=true
```

### Dual-Mode Architecture

1. **Live Backend Mode (`VITE_USE_MOCK_API=false`)**:
   - `analysisService.createAnalysis`: Constructs `multipart/form-data` with direct image file (or fetched sample blob) and submits to `POST /api/v1/analyses`.
   - `useAnalysisPolling`: Polls `GET /api/v1/analyses/{id}` at 750ms intervals.
   - `ProcessingView`: Shows live 8-stage execution trace as FastAPI advances through stages.
   - `AnalysisResultPage`: Displays completed result, verbatim model answer, structured findings, and trace telemetry.
   - `HistoryPage`: Displays persistent analysis registry directly from `GET /api/v1/analyses`.

2. **Standalone Mock Mode (`VITE_USE_MOCK_API=true`)**:
   - All operations are handled in-memory and persisted to browser `localStorage`.
   - Toggleable at runtime via the `API MOCK` switch in the application topbar.
   - Preserves offline development capability without requiring the Python backend.

---

## 7. Google Colab Inference Adapter (Stage 5A)

Stage 5A introduces `ColabInferenceAdapter`, enabling the FastAPI gateway to route multimodal requests to a remote GPU worker running `Qwen2.5-VL-3B-Instruct`.

### Operational Modes
- `INFERENCE_MODE=mock`: Uses `MockInferenceAdapter` (zero network calls, deterministic reference data).
- `INFERENCE_MODE=colab`: Uses `ColabInferenceAdapter` (dispatches multipart HTTP to remote Colab worker).

### Inference Health Check
`GET /health/inference`

**Response (`200 OK`)**:
```json
{
  "status": "healthy",
  "inference_mode": "mock",
  "adapter": "MockInferenceAdapter",
  "is_colab": false,
  "colab_configured": null,
  "remote_worker": {
    "configured": true,
    "reachable": true,
    "status": "healthy (mock adapter)"
  }
}
```

See [COLAB_INTEGRATION.md](./COLAB_INTEGRATION.md) for full server script templates and tunnel instructions.
