from fastapi import APIRouter
from .analyses import router as analyses_router
from .models import router as models_router
from .projects import router as projects_router

api_v1_router = APIRouter()
api_v1_router.include_router(analyses_router)
api_v1_router.include_router(models_router)
api_v1_router.include_router(projects_router)

__all__ = ["api_v1_router"]
