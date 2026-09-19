import pytest
import os
import tempfile
import httpx
from unittest.mock import patch

from app.adapters.mock_adapter import MockInferenceAdapter
from app.adapters.colab_adapter import ColabInferenceAdapter
from app.adapters.exceptions import (
    ColabUnavailableError,
    ColabTimeoutError,
    ColabAuthError,
    ColabInvalidResponseError,
    InferenceFailedError,
)
from app.services.inference_service import InferenceOrchestrator
from app.core.config import settings


def test_adapter_selection_mock(monkeypatch):
    monkeypatch.setattr(settings, "INFERENCE_MODE", "mock")
    orchestrator = InferenceOrchestrator()
    assert isinstance(orchestrator.adapter, MockInferenceAdapter)
    info = orchestrator.get_adapter_info()
    assert info["is_colab"] is False
    assert info["adapter"] == "MockInferenceAdapter"


def test_adapter_selection_colab(monkeypatch):
    monkeypatch.setattr(settings, "INFERENCE_MODE", "colab")
    monkeypatch.setattr(settings, "COLAB_INFERENCE_URL", "http://colab.satellite.test:8000")
    monkeypatch.setattr(settings, "COLAB_INFERENCE_TOKEN", "secret-test-token")
    orchestrator = InferenceOrchestrator()
    assert isinstance(orchestrator.adapter, ColabInferenceAdapter)
    info = orchestrator.get_adapter_info()
    assert info["is_colab"] is True
    assert info["adapter"] == "ColabInferenceAdapter"
    assert info["colab_url_configured"] is True


def test_colab_missing_url(temp_image):
    adapter = ColabInferenceAdapter(colab_url="", token="tok")
    with pytest.raises(ColabUnavailableError) as exc_info:
        import asyncio
        asyncio.run(adapter.run_vqa(temp_image, "What features are visible?"))
    assert exc_info.value.code == "COLAB_UNAVAILABLE"


@pytest.mark.asyncio
async def test_colab_vqa_success(temp_image):
    def mock_handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/infer"
        assert request.headers.get("X-SatQuery-Token") == "test-token-xyz"
        return httpx.Response(
            status_code=200,
            json={
                "answer": (
                    "The main land-cover types visible in this image include:\n\n"
                    "1. Forested Areas: Dense mangrove and tidal complexes along the delta.\n"
                    "2. Water Bodies: Estuarine channels carrying sediment plumes.\n"
                    "3. Urban Settlements: Minor infrastructure and rural dwellings."
                ),
                "model": "Qwen2.5-VL-3B-Instruct",
                "task": "single_image_vqa",
                "runtime_ms": 1640
            }
        )

    adapter = ColabInferenceAdapter(
        colab_url="http://mock-colab-service",
        token="test-token-xyz",
        timeout_seconds=30
    )

    with patch("httpx.AsyncClient", return_value=httpx.AsyncClient(transport=httpx.MockTransport(mock_handler))):
        result = await adapter.run_vqa(temp_image, "What land cover types are visible?")

    assert result.model_name == "Qwen2.5-VL-3B-Instruct"
    assert "Google Colab" in result.model_environment
    assert result.metrics["runtimeMs"] == 1640
    assert result.metrics["confidenceScore"] is None
    assert result.metrics["confidenceLabel"] == "Not calibrated (Colab VQA)"
    assert result.detections == []
    assert result.segments == []
    assert len(result.findings) >= 2
    assert "Forested Areas" in result.findings[0]
    assert len(result.summary) > 0


@pytest.mark.asyncio
async def test_colab_connection_error(temp_image):
    def mock_handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("Connection refused by remote host", request=request)

    adapter = ColabInferenceAdapter(
        colab_url="http://offline-colab-service",
        token="test-token"
    )

    with patch("httpx.AsyncClient", return_value=httpx.AsyncClient(transport=httpx.MockTransport(mock_handler))):
        with pytest.raises(ColabUnavailableError) as exc_info:
            await adapter.run_vqa(temp_image, "Query?")

    assert exc_info.value.code == "COLAB_UNAVAILABLE"


@pytest.mark.asyncio
async def test_colab_timeout_error(temp_image):
    def mock_handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("Inference execution timed out", request=request)

    adapter = ColabInferenceAdapter(
        colab_url="http://slow-colab-service",
        token="test-token"
    )

    with patch("httpx.AsyncClient", return_value=httpx.AsyncClient(transport=httpx.MockTransport(mock_handler))):
        with pytest.raises(ColabTimeoutError) as exc_info:
            await adapter.run_vqa(temp_image, "Query?")

    assert exc_info.value.code == "COLAB_TIMEOUT"


@pytest.mark.asyncio
async def test_colab_auth_failure(temp_image):
    def mock_handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status_code=401, text="Unauthorized: Invalid token")

    adapter = ColabInferenceAdapter(
        colab_url="http://auth-colab-service",
        token="wrong-token"
    )

    with patch("httpx.AsyncClient", return_value=httpx.AsyncClient(transport=httpx.MockTransport(mock_handler))):
        with pytest.raises(ColabAuthError) as exc_info:
            await adapter.run_vqa(temp_image, "Query?")

    assert exc_info.value.code == "COLAB_AUTH_FAILED"


@pytest.mark.asyncio
async def test_colab_malformed_json(temp_image):
    def mock_handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status_code=200, text="<html><body>502 Bad Gateway</body></html>")

    adapter = ColabInferenceAdapter(
        colab_url="http://bad-proxy-colab",
        token="test-token"
    )

    with patch("httpx.AsyncClient", return_value=httpx.AsyncClient(transport=httpx.MockTransport(mock_handler))):
        with pytest.raises(ColabInvalidResponseError) as exc_info:
            await adapter.run_vqa(temp_image, "Query?")

    assert exc_info.value.code == "COLAB_INVALID_RESPONSE"


@pytest.mark.asyncio
async def test_colab_missing_answer_field(temp_image):
    def mock_handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            status_code=200,
            json={"model": "Qwen2.5-VL-3B-Instruct", "task": "vqa", "runtime_ms": 500}
        )

    adapter = ColabInferenceAdapter(
        colab_url="http://incomplete-response-colab",
        token="test-token"
    )

    with patch("httpx.AsyncClient", return_value=httpx.AsyncClient(transport=httpx.MockTransport(mock_handler))):
        with pytest.raises(ColabInvalidResponseError) as exc_info:
            await adapter.run_vqa(temp_image, "Query?")

    assert exc_info.value.code == "COLAB_INVALID_RESPONSE"


def test_health_inference_endpoint(client):
    response = client.get("/health/inference")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "inference_mode" in data
    assert "adapter" in data
    assert "remote_worker" in data
    assert data["is_colab"] is False
    assert data["adapter"] == "MockInferenceAdapter"
