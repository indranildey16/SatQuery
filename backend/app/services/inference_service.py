from typing import Dict, Any, Optional
from ..adapters.base import BaseInferenceAdapter, InferenceOutput
from ..adapters.mock_adapter import MockInferenceAdapter
from ..adapters.colab_adapter import ColabInferenceAdapter
from ..core.config import settings
from ..core.logging import logger


class InferenceOrchestrator:
    """
    Orchestrates dispatching inference requests to the configured adapter.
    Dynamically routes to MockInferenceAdapter or ColabInferenceAdapter based on configuration.
    """

    def __init__(self, adapter: Optional[BaseInferenceAdapter] = None):
        if adapter:
            self._adapter = adapter
        elif settings.INFERENCE_MODE.lower() == "colab":
            self._adapter = ColabInferenceAdapter(
                colab_url=settings.COLAB_INFERENCE_URL,
                token=settings.COLAB_INFERENCE_TOKEN,
                timeout_seconds=settings.TIMEOUT_SECONDS,
            )
        else:
            self._adapter = MockInferenceAdapter()
            
        logger.info("Initialized InferenceOrchestrator with %s (mode=%s)", self._adapter.__class__.__name__, settings.INFERENCE_MODE)

    @property
    def adapter(self) -> BaseInferenceAdapter:
        return self._adapter

    def get_adapter_info(self) -> Dict[str, Any]:
        is_colab = isinstance(self._adapter, ColabInferenceAdapter)
        return {
            "inference_mode": settings.INFERENCE_MODE,
            "adapter": self._adapter.__class__.__name__,
            "is_colab": is_colab,
            "colab_url_configured": bool(settings.COLAB_INFERENCE_URL) if is_colab else None,
            "timeout_seconds": settings.TIMEOUT_SECONDS
        }

    async def check_health(self) -> Dict[str, Any]:
        if isinstance(self._adapter, ColabInferenceAdapter):
            return await self._adapter.check_health()
        return {
            "configured": True,
            "reachable": True,
            "status": "healthy (mock adapter)"
        }

    async def execute_vqa(self, image_path: str, query: str, options: Optional[Dict[str, Any]] = None) -> InferenceOutput:
        return await self._adapter.run_vqa(image_path, query, options)

    async def execute_caption(self, image_path: str, options: Optional[Dict[str, Any]] = None) -> InferenceOutput:
        return await self._adapter.run_caption(image_path, options)

    async def execute_change(self, image_paths: list[str], options: Optional[Dict[str, Any]] = None) -> InferenceOutput:
        return await self._adapter.run_change(image_paths, options)

    async def execute_fusion(self, optical_path: str, sar_path: str, options: Optional[Dict[str, Any]] = None) -> InferenceOutput:
        return await self._adapter.run_fusion(optical_path, sar_path, options)


inference_orchestrator = InferenceOrchestrator()
