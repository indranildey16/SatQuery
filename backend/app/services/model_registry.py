from typing import List, Optional
from ..schemas.model import ModelInfoSchema
from ..schemas.common import ModalityEnum, TaskTypeEnum


REGISTERED_MODELS: List[ModelInfoSchema] = [
    ModelInfoSchema(
        id="qwen2.5-vl-3b",
        name="Qwen2.5-VL-3B-Instruct",
        version="2.5",
        modality=[ModalityEnum.OPTICAL, ModalityEnum.AUTO],
        tasks=[TaskTypeEnum.VQA, TaskTypeEnum.CAPTION, TaskTypeEnum.CAPTIONING, TaskTypeEnum.SCENE_UNDERSTANDING],
        status="available",
        environment="Colab",
        description="Vision-Language model running single-image VQA & scene captioning on Google Colab GPU.",
        isDemo=True
    ),
    ModelInfoSchema(
        id="deeplab-yolov8-fusion",
        name="DeepLabV3+ & S2-YOLOv8",
        version="Optical v2.4.1",
        modality=[ModalityEnum.OPTICAL],
        tasks=[TaskTypeEnum.DETECTION, TaskTypeEnum.SEGMENTATION],
        status="loading",
        environment="PyTorch Colab-Ready T4",
        description="Dual pipeline for marine infrastructure segmentation & high-resolution vessel bounding boxes.",
        isDemo=True
    ),
    ModelInfoSchema(
        id="sar-sentinel1-detector",
        name="Sentinel-1 C-Band SAR Feature Extractor",
        version="SAR v1.2",
        modality=[ModalityEnum.SAR],
        tasks=[TaskTypeEnum.DETECTION],
        status="unavailable",
        environment="Cloud Inference Server",
        description="Synthetic Aperture Radar amplitude & coherence detector for all-weather monitoring.",
        isDemo=True
    ),
    ModelInfoSchema(
        id="classical-change-baseline",
        name="Classical Change Detection Baseline",
        version="Baseline v1.0",
        modality=[ModalityEnum.OPTICAL, ModalityEnum.AUTO],
        tasks=[TaskTypeEnum.CHANGE_ANALYSIS],
        status="available",
        environment="FastAPI Computational Specialist",
        description="Deterministic pixel differencing, morphological filtering, and connected-component spatial change baseline.",
        isDemo=False
    ),
    ModelInfoSchema(
        id="satquery-ben14k-optical",
        name="SatQuery-BEN14K-Multispectral-ResNet18",
        version="1.0-ResNet18",
        modality=[ModalityEnum.OPTICAL, ModalityEnum.AUTO],
        tasks=[TaskTypeEnum.OPTICAL_LANDCOVER],
        status="available",
        environment="Local PyTorch (CPU/MPS)",
        description="10-band Sentinel-2 multispectral ResNet18 multi-label land-cover classifier (16 BigEarthNet classes).",
        isDemo=False
    ),
    ModelInfoSchema(
        id="satquery-sar-optical-fusion",
        name="SatQuery-BEN14K-SAR-Optical-Fusion",
        version="1.0-DualResNet18",
        modality=[ModalityEnum.OPTICAL, ModalityEnum.SAR, ModalityEnum.AUTO],
        tasks=[TaskTypeEnum.OPTICAL_SAR_LANDCOVER],
        status="available",
        environment="Local PyTorch (CPU/MPS)",
        description="Dual-encoder Optical (10-band S2) + SAR (2-band S1 VV/VH) ResNet18 fusion classifier (16 BigEarthNet classes).",
        isDemo=False
    )
]


class ModelRegistryService:
    def list_models(self) -> List[ModelInfoSchema]:
        return REGISTERED_MODELS

    def get_model_by_id(self, model_id: str) -> Optional[ModelInfoSchema]:
        for model in REGISTERED_MODELS:
            if model.id == model_id:
                return model
        return None

    def get_default_model(self, task: TaskTypeEnum) -> ModelInfoSchema:
        if task == TaskTypeEnum.OPTICAL_LANDCOVER:
            return REGISTERED_MODELS[4]
        elif task == TaskTypeEnum.OPTICAL_SAR_LANDCOVER:
            return REGISTERED_MODELS[5]
        elif task == TaskTypeEnum.CHANGE_ANALYSIS:
            return REGISTERED_MODELS[3]
        elif task in [TaskTypeEnum.VQA, TaskTypeEnum.CAPTION, TaskTypeEnum.CAPTIONING, TaskTypeEnum.SCENE_UNDERSTANDING]:
            return REGISTERED_MODELS[0]
        elif task in [TaskTypeEnum.DETECTION, TaskTypeEnum.SEGMENTATION]:
            return REGISTERED_MODELS[1]
        return REGISTERED_MODELS[0]



model_registry = ModelRegistryService()
