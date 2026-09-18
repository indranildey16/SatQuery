from typing import Optional, List, Union
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from ...schemas.analysis import (
    AnalysisCreateResponse, 
    AnalysisDetailResponse, 
    AnalysisStatusResponse
)
from ...schemas.common import AnalysisStatusEnum
from ...services.analysis_service import analysis_service, AnalysisValidationError

router = APIRouter(prefix="/analyses", tags=["Analyses"])


@router.post("", response_model=AnalysisCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_analysis(
    image: UploadFile = File(..., description="Satellite imagery file (JPEG, PNG, GeoTIFF)"),
    query: str = Form("", description="Natural language remote sensing question"),
    modality: str = Form("auto", description="Sensor modality (optical, sar, auto)"),
    task: str = Form("vqa", description="Target task type (vqa, captioning, detection, segmentation)"),
    model_selection_mode: str = Form("auto", description="Routing mode: auto or manual"),
    model_id: Optional[str] = Form(None, description="Optional target model identifier"),
    project_id: Optional[str] = Form(None, description="Optional associate project ID")
):
    """
    Submit a satellite scene and analytical query for multimodal remote-sensing analysis.
    Initiates asynchronous processing and returns a queued analysis ID.
    """
    try:
        return await analysis_service.create_analysis(
            file=image,
            query=query,
            modality=modality,
            task=task,
            model_selection_mode=model_selection_mode,
            model_id=model_id,
            project_id=project_id
        )
    except AnalysisValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": e.code, "message": e.message, "details": e.details}
        )


@router.get("/{analysis_id}", response_model=Union[AnalysisDetailResponse, AnalysisStatusResponse])
async def get_analysis(analysis_id: str):
    """
    Retrieve current status, progressive execution stages, or completed result for an analysis.
    """
    analysis = await analysis_service.get_analysis(analysis_id)
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "UNKNOWN_ANALYSIS", "message": f"Analysis '{analysis_id}' was not found in registry."}
        )

    # If still processing or queued, return status progression structure
    if analysis.status in [AnalysisStatusEnum.QUEUED, AnalysisStatusEnum.PROCESSING]:
        return AnalysisStatusResponse(
            analysis_id=analysis.id,
            status=analysis.status,
            progress=analysis.progress,
            stage=analysis.stage,
            currentStage=analysis.currentStage
        )

    # For completed or failed, return the full analysis result
    return analysis


@router.get("", response_model=List[AnalysisDetailResponse])
async def list_recent_analyses(limit: int = 50):
    """
    List historical remote-sensing analyses.
    """
    return await analysis_service.list_recent_analyses(limit=limit)
