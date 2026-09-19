import os
import tempfile
import pytest
from fastapi.testclient import TestClient
from app.core.config import settings
from app.main import app

@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(settings, "INFERENCE_MODE", "mock")
    from app.services.inference_service import inference_orchestrator
    inference_orchestrator.reload_adapter()
    with TestClient(app) as c:
        yield c
    inference_orchestrator.reload_adapter()

@pytest.fixture
def temp_image():
    """Create a temporary test image file."""
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
        f.write(b"\xff\xd8\xff\xe0" + b"\x00" * 200)
        temp_path = f.name
    yield temp_path
    if os.path.exists(temp_path):
        os.remove(temp_path)
