"""
Unified Inference Schemas for SatQuery AI.
Supports single-image VQA, scene captioning, multispectral optical classification,
optical+SAR fusion classification, and bi-temporal change analysis.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class UnifiedInferenceResponse(BaseModel):
    task_type: str = Field(..., description="Task classification: vqa, caption, optical_landcover, optical_sar_landcover, bitemporal_change")
    answer: str = Field(..., description="Human-readable synthesis of model findings")
    model: str = Field(..., description="Model identifier or name used for inference")
    inputs: Dict[str, Any] = Field(default_factory=dict, description="Metadata describing inputs provided")
    predictions: List[str] = Field(default_factory=list, description="List of detected or classified land-cover categories")
    scores: Optional[Dict[str, float]] = Field(None, description="Class probabilities or confidence scores when produced by model")
    execution_trace: List[Dict[str, Any]] = Field(default_factory=list, description="Pipeline stage telemetry and timing breakdown")
    processing_time_ms: int = Field(..., description="Total wall-clock inference latency in milliseconds")
    warnings: List[str] = Field(default_factory=list, description="Advisories, warnings, or missing input notices")
    details: Optional[Dict[str, Any]] = Field(None, description="Detailed metrics, spatial masks, and region telemetry for change analysis")

