import pytest
import io
import time

def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert data["inference_mode"] == "mock"


def test_list_models(client):
    response = client.get("/api/v1/models")
    assert response.status_code == 200
    models = response.json()
    assert len(models) >= 1
    # Check genuinely demonstrated model
    qwen = next((m for m in models if m["id"] == "qwen2.5-vl-3b"), None)
    assert qwen is not None
    assert qwen["name"] == "Qwen2.5-VL-3B-Instruct"
    assert "optical" in qwen["modality"]
    assert "vqa" in qwen["tasks"]


def test_list_projects(client):
    response = client.get("/api/v1/projects")
    assert response.status_code == 200
    projects = response.json()
    assert len(projects) >= 1
    assert "id" in projects[0]
    assert "name" in projects[0]


def test_create_analysis_success_and_progression(client):
    fake_img = io.BytesIO(b"\xff\xd8\xff\xe0" + b"\x00" * 200) # minimal JPEG signature
    files = {"image": ("test_scene.jpg", fake_img, "image/jpeg")}
    data = {
        "query": "What are the main land-cover types visible in this image?",
        "modality": "optical",
        "task": "vqa",
        "model_selection_mode": "auto"
    }

    response = client.post("/api/v1/analyses", files=files, data=data)
    assert response.status_code == 201
    res_data = response.json()
    assert "analysis_id" in res_data
    analysis_id = res_data["analysis_id"]
    assert res_data["status"] == "queued"

    # Immediately poll analysis
    poll_res = client.get(f"/api/v1/analyses/{analysis_id}")
    assert poll_res.status_code == 200
    poll_data = poll_res.json()
    assert poll_data["analysis_id"] == analysis_id
    assert poll_data["status"] in ["queued", "processing", "completed"]

    # Wait for mock pipeline progression to finish
    time.sleep(2.2)

    final_res = client.get(f"/api/v1/analyses/{analysis_id}")
    assert final_res.status_code == 200
    final_data = final_res.json()
    assert final_data["status"] == "completed"
    assert final_data["progress"] == 100
    assert "results" in final_data
    assert final_data["results"] is not None
    assert "rawAnswer" in final_data["results"]
    assert "Forested Areas" in final_data["results"]["rawAnswer"]
    assert final_data["results"]["detections"] == [] # Honest: no fake bboxes for VQA
    assert "trace" in final_data
    assert len(final_data["trace"]["stages"]) == 8


def test_invalid_image_format(client):
    fake_txt = io.BytesIO(b"not an image file")
    files = {"image": ("document.pdf", fake_txt, "application/pdf")}
    data = {"query": "Find the river delta", "task": "vqa"}

    response = client.post("/api/v1/analyses", files=files, data=data)
    assert response.status_code == 400
    error_obj = response.json()
    assert "error" in error_obj
    assert error_obj["error"]["code"] == "INVALID_IMAGE"


def test_missing_query_for_vqa(client):
    fake_img = io.BytesIO(b"\xff\xd8\xff\xe0" + b"\x00" * 50)
    files = {"image": ("scene.png", fake_img, "image/png")}
    data = {"query": "", "task": "vqa"}

    response = client.post("/api/v1/analyses", files=files, data=data)
    assert response.status_code == 400
    error_obj = response.json()
    assert "error" in error_obj
    assert error_obj["error"]["code"] == "MISSING_QUERY"


def test_unknown_analysis_id(client):
    response = client.get("/api/v1/analyses/ANL-NONEXISTENT-999")
    assert response.status_code == 404
    error_obj = response.json()
    assert "error" in error_obj
    assert error_obj["error"]["code"] == "UNKNOWN_ANALYSIS"


def test_unsupported_modality(client):
    fake_img = io.BytesIO(b"\xff\xd8\xff\xe0" + b"\x00" * 50)
    files = {"image": ("scene.jpg", fake_img, "image/jpeg")}
    data = {"query": "Analyze scene", "modality": "thermal-x", "task": "vqa"}

    response = client.post("/api/v1/analyses", files=files, data=data)
    assert response.status_code == 400
    error_obj = response.json()
    assert "error" in error_obj
    assert error_obj["error"]["code"] == "UNSUPPORTED_MODALITY"
