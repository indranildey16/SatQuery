from typing import List, Optional
from pydantic import BaseModel
from .common import ModalityEnum, TaskTypeEnum


class ModelInfoSchema(BaseModel):
    id: str
    name: str
    version: str
    modality: List[ModalityEnum]
    tasks: List[TaskTypeEnum]
    status: str
    environment: str
    description: str
    isDemo: Optional[bool] = False
