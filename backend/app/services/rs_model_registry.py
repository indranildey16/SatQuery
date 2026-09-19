"""
Production-Safe Model Registry with Lazy Loading and In-Memory Caching for SatQuery AI.

Supported Models:
- optical_landcover: Multispectral Sentinel-2 ResNet-18 (10-band S2 input, 16 classes)
- optical_sar_landcover: Sentinel-2 + Sentinel-1 SAR Fusion ResNet-18 (10-band S2 + 2-band S1, 16 classes)
- bitemporal_change: Bi-temporal Change Detection (Modular adapter, delegates to baseline until checkpoint finishes training)
"""

import os
import json
from pathlib import Path
from typing import Dict, Any, Optional, List
import torch
import torch.nn as nn

from ..models.pytorch_models import MultispectralResNet18, SAROpticalFusionResNet18
from ..core.logging import logger

# Model artifact search paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
PRIMARY_MODELS_DIR = BASE_DIR / "models"
SECONDARY_WEIGHTS_DIR = BASE_DIR / "models" / "weights"
FALLBACK_OPTICAL_DIR = Path("/Users/indranildey/Downloads/Optical")
FALLBACK_SAR_DIR = Path("/Users/indranildey/Downloads/SAR")


def _find_file(filename: str, fallback_dirs: List[Path]) -> Optional[Path]:
    primary = PRIMARY_MODELS_DIR / filename
    if primary.exists():
        return primary
    secondary = SECONDARY_WEIGHTS_DIR / filename
    if secondary.exists():
        return secondary
    for d in fallback_dirs:
        candidate = d / filename
        if candidate.exists():
            return candidate
    return None



class RemoteSensingModelRegistry:
    def __init__(self):
        self._models: Dict[str, nn.Module] = {}
        self._class_mappings: Dict[str, List[str]] = {}
        self._metadata: Dict[str, Dict[str, Any]] = {}

    def get_classes(self, model_key: str) -> List[str]:
        if model_key in self._class_mappings:
            return self._class_mappings[model_key]

        if model_key == "optical_landcover":
            path = _find_file("satquery_ben14k_classes.json", [FALLBACK_OPTICAL_DIR])
        elif model_key == "optical_sar_landcover":
            path = _find_file("satquery_sar_optical_classes.json", [FALLBACK_SAR_DIR])
        else:
            path = None

        if path and path.exists():
            with open(path, "r") as f:
                classes = json.load(f)
                self._class_mappings[model_key] = classes
                return classes

        # Fallback default 16 BigEarthNet classes
        default_classes = [
            "Arable land", "Beaches, dunes, sands", "Broad-leaved forest",
            "Complex cultivation patterns", "Coniferous forest", "Industrial or commercial units",
            "Inland waters", "Inland wetlands",
            "Land principally occupied by agriculture, with significant areas of natural vegetation",
            "Mixed forest", "Moors, heathland and sclerophyllous vegetation",
            "Natural grassland and sparsely vegetated areas", "Pastures", "Permanent crops",
            "Transitional woodland, shrub", "Urban fabric"
        ]
        self._class_mappings[model_key] = default_classes
        return default_classes

    def get_model(self, model_key: str) -> Optional[nn.Module]:
        if model_key in self._models:
            return self._models[model_key]

        if model_key == "optical_landcover":
            ckpt_path = _find_file("satquery_ben14k_multispectral_resnet18.pt", [FALLBACK_OPTICAL_DIR])
            if not ckpt_path:
                raise FileNotFoundError("Model 1 optical checkpoint satquery_ben14k_multispectral_resnet18.pt not found.")

            logger.info("Lazy-loading Model 1 (Optical Landcover) from %s", ckpt_path)
            model = MultispectralResNet18(input_channels=10, num_classes=16)
            checkpoint = torch.load(ckpt_path, map_location="cpu")
            state_dict = checkpoint.get("state_dict", checkpoint)
            model.load_state_dict(state_dict)
            model.eval()
            self._models[model_key] = model
            self._metadata[model_key] = {
                "name": checkpoint.get("model_name", "SatQuery-BEN14K-Multispectral-ResNet18"),
                "image_size": checkpoint.get("image_size", 120),
                "best_val_macro_f1": checkpoint.get("best_val_macro_f1"),
                "test_micro_f1": checkpoint.get("test_micro_f1")
            }
            return model

        elif model_key == "optical_sar_landcover":
            ckpt_path = _find_file("satquery_sar_optical_fusion.pt", [FALLBACK_SAR_DIR])
            if not ckpt_path:
                raise FileNotFoundError("Model 2 SAR-Optical fusion checkpoint satquery_sar_optical_fusion.pt not found.")

            logger.info("Lazy-loading Model 2 (SAR+Optical Fusion) from %s", ckpt_path)
            model = SAROpticalFusionResNet18(optical_channels=10, sar_channels=2, num_classes=16)
            checkpoint = torch.load(ckpt_path, map_location="cpu")
            state_dict = checkpoint.get("state_dict", checkpoint)
            model.load_state_dict(state_dict)
            model.eval()
            self._models[model_key] = model
            self._metadata[model_key] = {
                "name": checkpoint.get("model_name", "SatQuery-BEN14K-SAR-Optical-Fusion"),
                "image_size": checkpoint.get("image_size", 120),
                "best_val_macro_f1": checkpoint.get("best_val_macro_f1"),
                "test_micro_f1": checkpoint.get("test_micro_f1")
            }
            return model

        elif model_key == "bitemporal_change":
            # Modular holder: check if trained bi-temporal checkpoint exists
            temporal_ckpt = _find_file("satquery_bitemporal_change.pt", [DEFAULT_WEIGHTS_DIR])
            if temporal_ckpt and temporal_ckpt.exists():
                logger.info("Discovered newly trained bi-temporal checkpoint at %s", temporal_ckpt)
                # Future: load trained temporal model architecture
                return None
            else:
                # Returns None to indicate modular fallback to classical change baseline
                return None

        return None

    def get_metadata(self, model_key: str) -> Dict[str, Any]:
        return self._metadata.get(model_key, {})


rs_model_registry = RemoteSensingModelRegistry()

MODEL_REGISTRY = {
    "optical_landcover": {
        "name": "SatQuery-BEN14K-Multispectral-ResNet18",
        "type": "classifier",
        "modality": "optical",
        "channels": 10,
        "input_size": 120,
        "get_model": lambda: rs_model_registry.get_model("optical_landcover"),
        "get_classes": lambda: rs_model_registry.get_classes("optical_landcover"),
        "description": "ResNet18 10-band Sentinel-2 multispectral multi-label land-cover classifier."
    },
    "optical_sar_landcover": {
        "name": "SatQuery-BEN14K-SAR-Optical-Fusion",
        "type": "classifier",
        "modality": "optical+sar",
        "channels": 12,
        "input_size": 120,
        "get_model": lambda: rs_model_registry.get_model("optical_sar_landcover"),
        "get_classes": lambda: rs_model_registry.get_classes("optical_sar_landcover"),
        "description": "Dual-encoder ResNet18 Optical (S2) + SAR (S1 VV/VH) multimodal land-cover classifier."
    },
    "bitemporal_change": {
        "name": "Bi-temporal Change Detection Engine",
        "type": "change_analysis",
        "modality": "optical",
        "get_model": lambda: rs_model_registry.get_model("bitemporal_change"),
        "description": "Modular bi-temporal change analysis engine (classical baseline / trained checkpoint adapter)."
    }
}
