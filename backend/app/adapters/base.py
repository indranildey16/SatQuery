from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from pydantic import BaseModel


class InferenceOutput(BaseModel):
    summary: str
    raw_answer: Optional[str] = None
    findings: list[str] = []
    detections: list[Dict[str, Any]] = []
    segments: list[Dict[str, Any]] = []
    visualizations: list[Dict[str, Any]] = []
    geojson: Optional[Any] = None
    metrics: Dict[str, Any] = {}
    model_name: str
    model_environment: str


class BaseInferenceAdapter(ABC):
    """
    Abstract contract for all Inference Adapters.
    Allows MockInferenceAdapter to be cleanly replaced by ColabInferenceAdapter
    without modifying API routes or services.
    """

    @abstractmethod
    async def run_vqa(self, image_path: str, query: str, options: Optional[Dict[str, Any]] = None) -> InferenceOutput:
        """Run single-image Vision-Question Answering."""
        pass

    @abstractmethod
    async def run_caption(self, image_path: str, options: Optional[Dict[str, Any]] = None) -> InferenceOutput:
        """Generate descriptive caption and scene summary."""
        pass

    @abstractmethod
    async def run_change(self, image_paths: list[str], options: Optional[Dict[str, Any]] = None) -> InferenceOutput:
        """Run change detection between multiple temporal acquisitions."""
        pass

    @abstractmethod
    async def run_fusion(self, optical_path: str, sar_path: str, options: Optional[Dict[str, Any]] = None) -> InferenceOutput:
        """Run optical and SAR synthetic aperture fusion."""
        pass
