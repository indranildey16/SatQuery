from typing import List
from fastapi import APIRouter
from ...schemas.model import ModelInfoSchema
from ...services.model_registry import model_registry

router = APIRouter(prefix="/models", tags=["Models"])


@router.get("", response_model=List[ModelInfoSchema])
async def list_models():
    """
    List registered machine learning models, supported sensor modalities, and execution environments.
    """
    return model_registry.list_models()
