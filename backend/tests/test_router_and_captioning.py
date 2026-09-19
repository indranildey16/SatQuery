import pytest
import io
import httpx
from unittest.mock import patch

from app.services.query_router import (
    route_query, 
    RouteResult, 
    UnsupportedTaskError
)
from app.adapters.mock_adapter import MockInferenceAdapter
from app.adapters.colab_adapter import ColabInferenceAdapter


def test_vqa_routing_queries():
    queries = [
        "What are the main land-cover types visible in this image?",
        "Is there a visible water body?",
        "Are there built-up areas?",
        "How many cargo vessels are docked?",
        "Where is the coastline?",
        "Identify all maritime port docks."
    ]
    for q in queries:
        result = route_query(q)
        assert isinstance(result, RouteResult)
        assert result.task == "vqa"
        assert result.model == "qwen2.5-vl-3b"
        assert "Question-oriented" in result.reason or "VQA" in result.reason


def test_caption_routing_queries():
    queries = [
        "Describe this scene.",
        "Give me a concise summary of the scene.",
        "Provide a summary of the landscape.",
        "Caption this satellite scene.",
        "What does the scene look like?"
    ]
    for q in queries:
        result = route_query(q)
        assert isinstance(result, RouteResult)
        assert result.task == "caption"
        assert result.model == "qwen2.5-vl-3b"
        assert "Scene-description" in result.reason


def test_explicit_task_selection():
    # Explicit VQA on descriptive query
    vqa_res = route_query("Describe the landscape.", requested_task="vqa")
    assert vqa_res.task == "vqa"
    assert "Explicit VQA" in vqa_res.reason

    # Explicit Caption on interrogative query
    caption_res = route_query("What is the port depth?", requested_task="caption")
    assert caption_res.task == "caption"
    assert "Explicit captioning" in caption_res.reason

    # Explicit Caption on captioning alias
    caption_alias = route_query("Analyze port", requested_task="scene_captioning")
    assert caption_alias.task == "caption"


def test_automatic_routing():
    # Auto task flag
    res1 = route_query("What features exist here?", requested_task="auto")
    assert res1.task == "vqa"

    res2 = route_query("Summarize this scene in detail.", requested_task="auto")
    assert res2.task == "caption"


def test_unsupported_task():
    with pytest.raises(UnsupportedTaskError):
        route_query("Analyze scene", requested_task="non_existent_task_123")


def test_router_output_schema():
    res = route_query("Describe this scene.")
    data = res.model_dump()
    assert "task" in data
    assert "reason" in data
    assert "model" in data
    assert data["task"] in ["vqa", "caption"]


@pytest.mark.asyncio
async def test_mock_adapter_vqa(temp_image):
    adapter = MockInferenceAdapter()
    res = await adapter.run_vqa(temp_image, "What are the land-cover types?")
    assert res.summary is not None
    assert len(res.findings) > 0
    assert res.detections == []
    assert res.segments == []
    assert res.metrics.get("confidenceLabel") == "Not calibrated (Demo)"


@pytest.mark.asyncio
async def test_mock_adapter_caption(temp_image):
    adapter = MockInferenceAdapter()
    res = await adapter.run_caption(temp_image)
    assert res.summary is not None
    assert "scene" in res.summary.lower() or "copernicus" in res.summary.lower()
    assert len(res.findings) > 0
    assert res.detections == []


@pytest.mark.asyncio
async def test_colab_adapter_vqa_mocked(temp_image):
    def mock_handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            status_code=200,
            json={
                "answer": "1. Forested Area\n2. Water Body",
                "model": "Qwen/Qwen2.5-VL-3B-Instruct",
                "task": "single_image_vqa",
                "runtime_ms": 1500
            }
        )

    adapter = ColabInferenceAdapter(
        colab_url="http://fake-colab-service",
        token="test-token"
    )

    with patch("httpx.AsyncClient", return_value=httpx.AsyncClient(transport=httpx.MockTransport(mock_handler))):
        res = await adapter.run_vqa(temp_image, "What is visible?")

    assert "Forested Area" in res.raw_answer
    assert res.metrics["confidenceLabel"] == "Not calibrated (Colab VQA)"
    assert res.detections == []


@pytest.mark.asyncio
async def test_colab_adapter_caption_mocked(temp_image):
    def mock_handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            status_code=200,
            json={
                "answer": "This scene displays an expansive estuary bordered by mangrove forests.",
                "model": "Qwen/Qwen2.5-VL-3B-Instruct",
                "task": "scene_captioning",
                "runtime_ms": 1800
            }
        )

    adapter = ColabInferenceAdapter(
        colab_url="http://fake-colab-service",
        token="test-token"
    )

    with patch("httpx.AsyncClient", return_value=httpx.AsyncClient(transport=httpx.MockTransport(mock_handler))):
        res = await adapter.run_caption(temp_image)

    assert "estuary" in res.raw_answer
    assert res.metrics["confidenceLabel"] == "Not calibrated (Colab Captioning)"
    assert res.detections == []
