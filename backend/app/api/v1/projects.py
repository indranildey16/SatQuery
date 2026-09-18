from typing import List
from fastapi import APIRouter
from ...schemas.project import ProjectSchema
from ...services.project_service import project_service

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get("", response_model=List[ProjectSchema])
async def list_projects():
    """
    List user geospatial intelligence project workspaces.
    """
    return project_service.list_projects()
