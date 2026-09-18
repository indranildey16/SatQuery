from typing import Dict, Any, Optional
from ..adapters.base import BaseInferenceAdapter, InferenceOutput
from ..adapters.mock_adapter import MockInferenceAdapter
from ..core.config import settings
from ..core.logging import logger


class InferenceOrchestrator:
    """
    Orchestrates dispatching inference requests to the configured adapter.
    Separates the API routes and services from raw model execution.
    """

    def __init__(self, adapter: Optional[BaseInferenceAdapter] = None):
        # In this stage, we initialize with MockInferenceAdapter
        # In a future stage, if settings.INFERENCE_MODE == "colab", we instantiate ColabInferenceAdapter
        self._adapter: BaseInferenceAdapter = adapter or MockInferenceAdapter()
        logger.info("Initialized InferenceOrchestrator with %s", self._adapter.__class__.__name__)

    async def execute_vqa(self, image_path: str, query: str, options: Optional[Dict[str, Any]] = None) -> InferenceOutput:
        return await self._adapter.run_vqa(image_path, query, options)

    async def execute_caption(self, image_path: str, options: Optional[Dict[str, Any]] = None) -> InferenceOutput:
        return await self._adapter.run_caption(image_path, options)

    async def execute_change(self, image_paths: list[str], options: Optional[Dict[str, Any]] = None) -> InferenceOutput:
        return await self._adapter.run_change(image_paths, options)

    async def execute_fusion(self, optical_path: str, sar_path: str, options: Optional[Dict[str, Any]] = None) -> InferenceOutput:
        return await self._adapter.run_fusion(optical_path, sar_path, options)


inference_orchestrator = InferenceOrchestrator()
