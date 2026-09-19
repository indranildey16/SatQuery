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
        tasks=[TaskTypeEnum.DETECTION, TaskTypeEnum.CHANGE_ANALYSIS],
        status="unavailable",
        environment="Cloud Inference Server",
        description="Synthetic Aperture Radar amplitude & coherence detector for all-weather monitoring.",
        isDemo=True
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
        if task in [TaskTypeEnum.VQA, TaskTypeEnum.CAPTIONING, TaskTypeEnum.SCENE_UNDERSTANDING]:
            return REGISTERED_MODELS[0]
        elif task in [TaskTypeEnum.DETECTION, TaskTypeEnum.SEGMENTATION]:
            return REGISTERED_MODELS[1]
        return REGISTERED_MODELS[0]


model_registry = ModelRegistryService()
