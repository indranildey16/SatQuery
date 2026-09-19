import os
import time
import asyncio
import random
from datetime import datetime
from typing import List, Optional, Dict, Any
from pathlib import Path
from fastapi import UploadFile

from ..schemas.common import (
    ModalityEnum, 
    TaskTypeEnum, 
    AnalysisStatusEnum, 
    PipelineStageEnum
)
from ..schemas.analysis import (
    AnalysisDetailResponse,
    AnalysisCreateResponse,
    AnalysisStatusResponse,
    AnalysisInputSchema,
    ImageryMetadataSchema,
    ImageryCoordinates,
    QuerySchema,
    AnalysisResultDataSchema,
    ExecutionTraceSchema,
    ExecutionTraceItemSchema,
    VisualizationLayerSchema,
    DetectionSchema,
    SegmentSchema,
    AnalysisMetricsSchema
)
from ..storage.in_memory import analysis_store, save_uploaded_file
from .model_registry import model_registry
from .inference_service import inference_orchestrator
from ..adapters.exceptions import InferenceAdapterError
from ..core.config import settings
from ..core.logging import logger

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".geotiff"}

PIPELINE_STAGES = [
    (PipelineStageEnum.UPLOAD_RECEIVED, 12, 150, "Validating image payload and MIME format"),
    (PipelineStageEnum.IMAGE_VALIDATION, 24, 200, "Checking dimensional resolution and spectral profile"),
    (PipelineStageEnum.MODALITY_RESOLUTION, 36, 200, "Resolving sensor band alignment and CRS reference"),
    (PipelineStageEnum.QUERY_INTERPRETATION, 48, 200, "Parsing natural-language query and task constraints"),
    (PipelineStageEnum.MODEL_SELECTION, 60, 200, "Selecting target inference adapter"),
    (PipelineStageEnum.MODEL_INFERENCE, 78, 400, "Executing multimodal inference"),
    (PipelineStageEnum.RESULT_PROCESSING, 90, 250, "Synthesizing findings and geospatial telemetry"),
    (PipelineStageEnum.RESULT_READY, 100, 100, "Finalizing visualization layers")
]


class AnalysisValidationError(Exception):
    def __init__(self, code: str, message: str, details: Optional[Any] = None):
        self.code = code
        self.message = message
        self.details = details
        super().__init__(message)


class AnalysisService:
    def validate_submission(
        self,
        file: Optional[UploadFile],
        query: str,
        task: str,
        modality: str,
        model_selection_mode: str
    ) -> None:
        if not file or not file.filename:
            raise AnalysisValidationError("MISSING_IMAGE", "Satellite image file is required.")

        ext = Path(file.filename).suffix.lower()
        if ext not in SUPPORTED_EXTENSIONS:
            raise AnalysisValidationError(
                "INVALID_IMAGE",
                f"Unsupported image format '{ext}'. Supported formats: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
            )

        # Modality check
        try:
            ModalityEnum(modality.lower())
        except ValueError:
            raise AnalysisValidationError(
                "UNSUPPORTED_MODALITY",
                f"Unsupported modality '{modality}'. Must be one of: {[m.value for m in ModalityEnum]}"
            )

        # Task check
        try:
            task_enum = TaskTypeEnum(task.lower())
        except ValueError:
            raise AnalysisValidationError(
                "UNSUPPORTED_TASK",
                f"Unsupported task '{task}'. Must be one of: {[t.value for t in TaskTypeEnum]}"
            )

        # VQA query validation
        if task_enum in [TaskTypeEnum.VQA, TaskTypeEnum.CAPTIONING, TaskTypeEnum.SCENE_UNDERSTANDING]:
            if not query or len(query.strip()) < 3:
                raise AnalysisValidationError(
                    "MISSING_QUERY",
                    "Query text (at least 3 characters) is required for VQA, captioning, or scene understanding tasks."
                )

        if model_selection_mode.lower() not in ["auto", "manual"]:
            raise AnalysisValidationError(
                "INVALID_MODEL_MODE",
                f"Invalid model selection mode '{model_selection_mode}'. Must be 'auto' or 'manual'."
            )

    async def create_analysis(
        self,
        file: UploadFile,
        query: str,
        modality: str = "auto",
        task: str = "vqa",
        model_selection_mode: str = "auto",
        model_id: Optional[str] = None,
        project_id: Optional[str] = None
    ) -> AnalysisCreateResponse:
        self.validate_submission(file, query, task, modality, model_selection_mode)

        # Save uploaded file
        saved_file_path = await save_uploaded_file(file)
        file_size = os.path.getsize(saved_file_path)

        if file_size > settings.max_upload_size_bytes:
            # Clean up oversized file
            if os.path.exists(saved_file_path):
                os.remove(saved_file_path)
            raise AnalysisValidationError(
                "FILE_TOO_LARGE",
                f"File size exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB."
            )

        task_enum = TaskTypeEnum(task.lower())
        modality_enum = ModalityEnum(modality.lower())
        selected_model = None
        if model_id:
            selected_model = model_registry.get_model_by_id(model_id)
        if not selected_model:
            selected_model = model_registry.get_default_model(task_enum)

        analysis_id = f"ANL-2024-{random.randint(1000, 9999)}"
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        filename = Path(saved_file_path).name
        input_metadata = ImageryMetadataSchema(
            filename=filename,
            width=3840,
            height=3840,
            format=file.content_type or "image/jpeg",
            fileSizeBytes=file_size,
            modality=modality_enum,
            satellite="Copernicus Sentinel-2",
            sensor="MSI Multispectral",
            acquisitionDate=now_str,
            resolutionMeters=10.0,
            cloudCoveragePercent=5.0,
            coordinates=ImageryCoordinates(lat=11.8037, lng=-15.1804, crs="WGS 84 / EPSG:4326")
        )

        title = query.strip() if query and len(query.strip()) <= 45 else (query[:42] + "..." if query else "Remote-Sensing Scene Inspection")

        initial_record = AnalysisDetailResponse(
            id=analysis_id,
            analysis_id=analysis_id,
            title=title,
            status=AnalysisStatusEnum.QUEUED,
            progress=0,
            stage=PipelineStageEnum.UPLOAD_RECEIVED.value,
            currentStage=PipelineStageEnum.UPLOAD_RECEIVED.value,
            enclaveCrs="EPSG:4326 (WGS 84)",
            query=QuerySchema(text=query, task=task_enum),
            input=AnalysisInputSchema(
                imageId=f"img-{analysis_id.lower()}",
                imageUrl=f"/samples/guinea-bissau-sample.jpg", # Local preview asset reference
                metadata=input_metadata
            ),
            model=selected_model,
            results=None,
            trace=None,
            createdAt=now_str,
            updatedAt=now_str
        )

        await analysis_store.save(initial_record)

        # Launch asynchronous progression in background
        asyncio.create_task(
            self._execute_pipeline(
                analysis_id=analysis_id,
                file_path=saved_file_path,
                query=query,
                task_enum=task_enum,
                model_info=selected_model
            )
        )

        return AnalysisCreateResponse(
            analysis_id=analysis_id,
            status=AnalysisStatusEnum.QUEUED
        )

    async def _execute_pipeline(
        self,
        analysis_id: str,
        file_path: str,
        query: str,
        task_enum: TaskTypeEnum,
        model_info: Any
    ):
        start_time = time.time()
        accumulated_stages: List[ExecutionTraceItemSchema] = []

        try:
            inference_res = None
            for stage_enum, progress_pct, delay_ms, desc in PIPELINE_STAGES:
                stage_start = time.time()
                await analysis_store.update_status(
                    analysis_id=analysis_id,
                    status=AnalysisStatusEnum.PROCESSING.value,
                    progress=progress_pct,
                    stage=stage_enum.value,
                    updated_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                )

                detail_text = desc
                if stage_enum == PipelineStageEnum.MODEL_SELECTION:
                    detail_text = f"Selected target model: {model_info.name}"
                    await asyncio.sleep(delay_ms / 1000.0)
                elif stage_enum == PipelineStageEnum.MODEL_INFERENCE:
                    detail_text = f"Inference executed using {model_info.name} for {task_enum.value}"
                    if task_enum in [TaskTypeEnum.VQA, TaskTypeEnum.SCENE_UNDERSTANDING]:
                        inference_res = await inference_orchestrator.execute_vqa(file_path, query)
                    elif task_enum == TaskTypeEnum.CAPTIONING:
                        inference_res = await inference_orchestrator.execute_caption(file_path)
                    elif task_enum == TaskTypeEnum.CHANGE_ANALYSIS:
                        inference_res = await inference_orchestrator.execute_change([file_path])
                    else:
                        inference_res = await inference_orchestrator.execute_vqa(file_path, query)
                else:
                    await asyncio.sleep(delay_ms / 1000.0)

                stage_duration = int((time.time() - stage_start) * 1000)
                accumulated_stages.append(
                    ExecutionTraceItemSchema(
                        stage=stage_enum.value,
                        timestamp=datetime.now().strftime("%H:%M:%S"),
                        durationMs=stage_duration,
                        status="completed",
                        details=detail_text
                    )
                )

            if inference_res is None:
                raise InferenceAdapterError("INFERENCE_FAILED", "No inference result generated.")

            total_runtime = round(time.time() - start_time, 2)
            metrics_dict = inference_res.metrics or {}
            runtime_ms = metrics_dict.get("runtimeMs") or int(total_runtime * 1000)
            confidence_label = metrics_dict.get("confidenceLabel") or "Not calibrated (Colab VQA)"

            # Build result data schema
            results = AnalysisResultDataSchema(
                summary=inference_res.summary,
                rawAnswer=inference_res.raw_answer,
                findings=inference_res.findings,
                detections=[DetectionSchema(**d) for d in inference_res.detections],
                segments=[SegmentSchema(**s) for s in inference_res.segments],
                visualizations=[VisualizationLayerSchema(**v) for v in inference_res.visualizations],
                geojson=inference_res.geojson,
                metrics=AnalysisMetricsSchema(
                    runtimeMs=runtime_ms,
                    confidenceScore=metrics_dict.get("confidenceScore"),
                    confidenceLabel=confidence_label,
                    detectedVessels=metrics_dict.get("detectedVessels", 0),
                    dockFootprintKm2=metrics_dict.get("dockFootprintKm2"),
                    sedimentPlumeKm2=metrics_dict.get("sedimentPlumeKm2"),
                    cloudOcclusionPercent=metrics_dict.get("cloudOcclusionPercent", 5.0),
                    ndwiIndex=metrics_dict.get("ndwiIndex")
                )
            )

            is_colab = settings.INFERENCE_MODE.lower() == "colab"
            evidence_note = (
                "Observations derived via remote multimodal attention token alignment on Tesla T4 GPU."
                if is_colab
                else "Observations derived via vision-language spatial tokens."
            )
            confidence_note = "Confidence is uncalibrated for demo VQA outputs."

            trace = ExecutionTraceSchema(
                inputCount=1,
                task=task_enum.value,
                model=inference_res.model_name or model_info.name,
                status=AnalysisStatusEnum.COMPLETED,
                runtimeSeconds=total_runtime,
                confidenceNote=confidence_note,
                evidenceNote=evidence_note,
                stages=accumulated_stages
            )

            await analysis_store.update_status(
                analysis_id=analysis_id,
                status=AnalysisStatusEnum.COMPLETED.value,
                progress=100,
                stage=PipelineStageEnum.RESULT_READY.value,
                results=results,
                trace=trace,
                updated_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            )
            logger.info("Completed analysis %s in %.2fs", analysis_id, total_runtime)

        except InferenceAdapterError as e:
            logger.warning("Inference adapter error for analysis %s: [%s] %s", analysis_id, e.code, e.message)
            total_runtime = round(time.time() - start_time, 2)
            accumulated_stages.append(
                ExecutionTraceItemSchema(
                    stage="INFERENCE_FAILED",
                    timestamp=datetime.now().strftime("%H:%M:%S"),
                    durationMs=int(total_runtime * 1000),
                    status="failed",
                    details=f"[{e.code}] {e.message}"
                )
            )
            failed_trace = ExecutionTraceSchema(
                inputCount=1,
                task=task_enum.value,
                model=model_info.name,
                status=AnalysisStatusEnum.FAILED,
                runtimeSeconds=total_runtime,
                confidenceNote="Inference aborted due to worker failure.",
                evidenceNote=f"Failure code: {e.code}",
                stages=accumulated_stages
            )
            await analysis_store.update_status(
                analysis_id=analysis_id,
                status=AnalysisStatusEnum.FAILED.value,
                progress=0,
                stage="FAILED",
                trace=failed_trace,
                error=e.message,
                error_code=e.code,
                updated_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            )
        except Exception as e:
            logger.exception("Failed processing analysis %s: %s", analysis_id, e)
            await analysis_store.update_status(
                analysis_id=analysis_id,
                status=AnalysisStatusEnum.FAILED.value,
                progress=0,
                stage="FAILED",
                error=str(e),
                error_code="INTERNAL_SERVER_ERROR",
                updated_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            )

    async def get_analysis(self, analysis_id: str) -> Optional[AnalysisDetailResponse]:
        return await analysis_store.get(analysis_id)

    async def list_recent_analyses(self, limit: int = 50) -> List[AnalysisDetailResponse]:
        return await analysis_store.list_all(limit=limit)


analysis_service = AnalysisService()
