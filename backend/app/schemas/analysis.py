from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field
from .common import ModalityEnum, TaskTypeEnum, AnalysisStatusEnum
from .model import ModelInfoSchema


class AnalysisCreateResponse(BaseModel):
    analysis_id: str
    status: AnalysisStatusEnum = AnalysisStatusEnum.QUEUED


class ImageryCoordinates(BaseModel):
    lat: float
    lng: float
    crs: Optional[str] = "WGS 84 / EPSG:4326"


class ImageryMetadataSchema(BaseModel):
    filename: str
    width: int = 3840
    height: int = 3840
    format: str = "image/jpeg"
    fileSizeBytes: int = 0
    modality: ModalityEnum = ModalityEnum.OPTICAL
    satellite: Optional[str] = "Copernicus Sentinel-2"
    sensor: Optional[str] = "MSI Multispectral"
    acquisitionDate: Optional[str] = None
    resolutionMeters: Optional[float] = 10.0
    cloudCoveragePercent: Optional[float] = 5.0
    coordinates: Optional[ImageryCoordinates] = None


class AnalysisInputSchema(BaseModel):
    imageId: Optional[str] = None
    imageUrl: str
    metadata: ImageryMetadataSchema


class QuerySchema(BaseModel):
    text: str
    task: TaskTypeEnum


class DetectionSchema(BaseModel):
    id: str
    label: str
    confidence: Optional[float] = None
    bbox: List[float]
    metrics: Optional[Dict[str, Any]] = None


class SegmentSchema(BaseModel):
    id: str
    label: str
    color: str
    areaKm2: Optional[float] = None
    confidence: Optional[float] = None
    visible: Optional[bool] = True


class VisualizationLayerSchema(BaseModel):
    id: str
    type: str
    label: str
    badge: Optional[str] = None
    visible: bool = True
    opacity: int = 100
    imageUrl: Optional[str] = None
    data: Optional[Any] = None


class ExecutionTraceItemSchema(BaseModel):
    stage: str
    timestamp: str
    durationMs: int
    status: str = "completed"
    details: Optional[str] = None


class ExecutionTraceSchema(BaseModel):
    inputCount: int = 1
    task: str
    model: str
    status: AnalysisStatusEnum = AnalysisStatusEnum.COMPLETED
    runtimeSeconds: float
    confidenceNote: str = "Confidence is indicative and uncalibrated for demo VQA outputs."
    evidenceNote: str = "Observations derived through multimodal attention token alignment."
    stages: List[ExecutionTraceItemSchema] = []


class AnalysisMetricsSchema(BaseModel):
    runtimeMs: int
    confidenceScore: Optional[float] = None
    confidenceLabel: Optional[str] = "Not calibrated (Demo)"
    detectedVessels: Optional[int] = 0
    dockFootprintKm2: Optional[float] = None
    sedimentPlumeKm2: Optional[float] = None
    cloudOcclusionPercent: Optional[float] = 5.0
    ndwiIndex: Optional[float] = None


class AnalysisResultDataSchema(BaseModel):
    summary: str
    rawAnswer: Optional[str] = None
    findings: List[str] = []
    detections: List[DetectionSchema] = []
    segments: List[SegmentSchema] = []
    visualizations: List[VisualizationLayerSchema] = []
    geojson: Optional[Any] = None
    metrics: Optional[AnalysisMetricsSchema] = None


class AnalysisDetailResponse(BaseModel):
    id: str
    analysis_id: Optional[str] = None
    title: str
    status: AnalysisStatusEnum
    progress: Optional[int] = None
    stage: Optional[str] = None
    currentStage: Optional[str] = None
    enclaveCrs: Optional[str] = "EPSG:4326 (WGS 84)"
    query: QuerySchema
    input: AnalysisInputSchema
    model: ModelInfoSchema
    results: Optional[AnalysisResultDataSchema] = None
    trace: Optional[ExecutionTraceSchema] = None
    error: Optional[str] = None
    errorCode: Optional[str] = None
    createdAt: str
    updatedAt: str

    def model_post_init(self, __context: Any) -> None:
        if self.analysis_id is None:
            self.analysis_id = self.id
        if self.stage is None:
            self.stage = self.currentStage


class AnalysisStatusResponse(BaseModel):
    analysis_id: str
    status: AnalysisStatusEnum
    progress: Optional[int] = None
    stage: Optional[str] = None
    currentStage: Optional[str] = None
    error: Optional[str] = None
    errorCode: Optional[str] = None
