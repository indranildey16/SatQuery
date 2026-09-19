from enum import Enum
from typing import Optional, Any
from pydantic import BaseModel, Field


class ModalityEnum(str, Enum):
    OPTICAL = "optical"
    SAR = "sar"
    AUTO = "auto"


class TaskTypeEnum(str, Enum):
    AUTO = "auto"
    VQA = "vqa"
    CAPTION = "caption"
    CAPTIONING = "captioning"
    DETECTION = "detection"
    SEGMENTATION = "segmentation"
    SCENE_UNDERSTANDING = "scene_understanding"
    CHANGE_ANALYSIS = "change_analysis"
    OPTICAL_LANDCOVER = "optical_landcover"
    OPTICAL_SAR_LANDCOVER = "optical_sar_landcover"
    CUSTOM = "custom"


class AnalysisStatusEnum(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class PipelineStageEnum(str, Enum):
    INPUT_RECEIVED = "INPUT_RECEIVED"
    UPLOAD_RECEIVED = "UPLOAD_RECEIVED"
    IMAGE_VALIDATED = "IMAGE_VALIDATED"
    IMAGE_VALIDATION = "IMAGE_VALIDATION"
    IMAGE_ALIGNMENT = "IMAGE_ALIGNMENT"
    MODALITY_RESOLUTION = "MODALITY_RESOLUTION"
    QUERY_ROUTING = "QUERY_ROUTING"
    QUERY_INTERPRETATION = "QUERY_INTERPRETATION"
    MODEL_SELECTION = "MODEL_SELECTION"
    CHANGE_ESTIMATION = "CHANGE_ESTIMATION"
    MASK_PROCESSING = "MASK_PROCESSING"
    REGION_EXTRACTION = "REGION_EXTRACTION"
    VISUALIZATION_GENERATION = "VISUALIZATION_GENERATION"
    COLAB_INFERENCE = "COLAB_INFERENCE"
    MODEL_INFERENCE = "MODEL_INFERENCE"
    RESULT_NORMALIZATION = "RESULT_NORMALIZATION"
    RESULT_PROCESSING = "RESULT_PROCESSING"
    RESULT_READY = "RESULT_READY"


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Any] = None


class ErrorResponse(BaseModel):
    error: ErrorDetail
