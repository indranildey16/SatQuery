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
