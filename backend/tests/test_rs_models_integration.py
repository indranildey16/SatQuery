"""
Integration Tests for SatQuery AI Trained Remote-Sensing Models:
- Model 1: Multispectral Sentinel-2 ResNet18 (10-band optical land-cover classifier)
- Model 2: Sentinel-2 + Sentinel-1 SAR Fusion ResNet18 (10-band optical + 2-band SAR classifier)
- Modular Bi-temporal Change Detection
- Validation error handling for missing inputs
- Scientific honesty verification (ZERO fake bounding boxes, ZERO fake masks)
"""

import io
import pytest
from PIL import Image
from app.adapters.rs_inference_adapters import (
    run_landcover_optical,
    run_landcover_fusion,
    run_bitemporal_change,
    MissingInputError
)
from app.services.query_router import route_query


def create_test_image(color=(120, 180, 90), size=(200, 200)) -> io.BytesIO:
    buf = io.BytesIO()
    img = Image.new("RGB", size, color=color)
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf


def test_1_existing_vqa_still_works(client):
    """1. Existing VQA request still works and routes to Qwen VLM."""
    route = route_query("What is the prominent coastal feature visible along the shoreline?")
    assert route.task == "vqa"
    assert route.model == "qwen2.5-vl-3b"

    img_buf = create_test_image()
    response = client.post(
        "/api/v1/analyses/infer",
        files={"image": ("scene.jpg", img_buf.getvalue(), "image/jpeg")},
        data={"query": "What is the prominent coastal feature?", "task": "vqa"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["task_type"] == "vqa"
    assert "model" in data
    assert len(data["answer"]) > 5


def test_2_optical_landcover_model1_real_predictions(client):
    """2. Optical land-cover request loads Model 1 and returns real predictions and sigmoid scores."""
    # Test adapter directly
    res = run_landcover_optical("data/uploads/port.jpg")
    assert res["task_type"] == "optical_landcover"
    assert res["model"] == "SatQuery-BEN14K-Multispectral-ResNet18"
    assert len(res["predictions"]) > 0
    assert isinstance(res["scores"], dict)
    assert len(res["scores"]) == 16  # All 16 BigEarthNet classes scored
    for cls, score in res["scores"].items():
        assert 0.0 <= score <= 1.0  # Valid sigmoid probability

    # Test via API /infer endpoint
    img_buf = create_test_image((80, 160, 60))
    resp = client.post(
        "/api/v1/analyses/infer",
        files={"image": ("optical.jpg", img_buf.getvalue(), "image/jpeg")},
        data={"query": "Classify land cover in this scene", "task": "optical_landcover"}
    )
    assert resp.status_code == 200
    api_data = resp.json()
    assert api_data["task_type"] == "optical_landcover"
    assert api_data["model"] == "SatQuery-BEN14K-Multispectral-ResNet18"
    assert len(api_data["predictions"]) > 0
    assert api_data["scores"] is not None


def test_3_optical_sar_fusion_model2_real_predictions(client):
    """3. Optical + SAR request loads Model 2 and returns real multimodal predictions."""
    # Test adapter directly
    res = run_landcover_fusion("data/uploads/port.jpg", "data/uploads/port.jpg")
    assert res["task_type"] == "optical_sar_landcover"
    assert res["model"] == "SatQuery-BEN14K-SAR-Optical-Fusion"
    assert len(res["predictions"]) > 0
    assert len(res["scores"]) == 16
    for cls, score in res["scores"].items():
        assert 0.0 <= score <= 1.0

    # Test via API /infer endpoint
    opt_buf = create_test_image((70, 140, 50))
    sar_buf = create_test_image((128, 128, 128))
    resp = client.post(
        "/api/v1/analyses/infer",
        files={
            "image": ("optical.jpg", opt_buf.getvalue(), "image/jpeg"),
            "image_sar": ("sar.jpg", sar_buf.getvalue(), "image/jpeg")
        },
        data={"query": "Perform optical + SAR fusion classification", "task": "optical_sar_landcover"}
    )
    assert resp.status_code == 200
    api_data = resp.json()
    assert api_data["task_type"] == "optical_sar_landcover"
    assert api_data["model"] == "SatQuery-BEN14K-SAR-Optical-Fusion"
    assert "Optical" in api_data["answer"] and "SAR" in api_data["answer"]


def test_4_missing_sar_input_produces_clear_validation_response(client):
    """4. Missing SAR input produces a clear validation response with code MISSING_SAR_INPUT."""
    # Direct adapter call
    with pytest.raises(MissingInputError) as exc_info:
        run_landcover_fusion("data/uploads/port.jpg", None)
    assert exc_info.value.code == "MISSING_SAR_INPUT"

    # API call missing SAR image
    opt_buf = create_test_image()
    resp = client.post(
        "/api/v1/analyses/infer",
        files={"image": ("optical.jpg", opt_buf.getvalue(), "image/jpeg")},
        data={"query": "Perform optical + SAR fusion classification", "task": "optical_sar_landcover"}
    )
    assert resp.status_code == 400
    detail = resp.json()["error"]
    assert detail["code"] == "MISSING_SAR_INPUT"
    assert "SAR" in detail["message"]


def test_5_two_image_temporal_routed_toward_temporal_adapter(client):
    """5. Two-image temporal request is routed toward the temporal adapter."""
    route = route_query(
        query="What areas have changed between these two images?",
        has_bitemporal_inputs=True
    )
    assert route.task == "change_analysis"
    assert route.model == "classical-change-baseline"

    b_buf = create_test_image((100, 100, 100))
    a_buf = create_test_image((200, 100, 100))
    resp = client.post(
        "/api/v1/analyses/infer",
        files={
            "image_before": ("before.jpg", b_buf.getvalue(), "image/jpeg"),
            "image_after": ("after.jpg", a_buf.getvalue(), "image/jpeg")
        },
        data={"query": "What areas have changed between these two images?", "task": "bitemporal_change"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["task_type"] == "bitemporal_change"


def test_6_no_fake_spatial_localization_returned_by_classification_models(client):
    """6. Scientific honesty constraint: NO fake bounding boxes or fake segmentation masks for classifiers."""
    # Run optical landcover analysis through service
    img_buf = create_test_image()
    upload = client.post(
        "/api/v1/analyses",
        files={"image": ("optical.jpg", img_buf.getvalue(), "image/jpeg")},
        data={"query": "Classify land cover in this scene", "task": "optical_landcover"}
    )
    assert upload.status_code == 201
    analysis_id = upload.json()["analysis_id"]

    # Poll for completion
    import time
    for _ in range(30):
        res = client.get(f"/api/v1/analyses/{analysis_id}")
        assert res.status_code == 200
        res_json = res.json()
        if res_json.get("status") == "completed":
            break
        time.sleep(0.1)

    assert res_json.get("status") == "completed"
    results = res_json.get("results", {})

    # Strictly assert NO fake bounding boxes
    assert results.get("detections") == [] or results.get("detections") is None, "Classifiers must NOT return fake detections!"
    # Strictly assert NO fake segmentation
    assert results.get("segments") == [] or results.get("segments") is None, "Classifiers must NOT return fake segments!"

    # Verify findings contain honest class percentage strings
    findings = results.get("findings", [])
    assert len(findings) > 0
    assert any("confidence" in f.lower() or "notice" in f.lower() for f in findings)
