"""
PyTorch Neural Network Architectures for SatQuery AI.

MODEL 1:
- Multispectral optical Sentinel-2 ResNet18 classifier (10-band S2 input, 16 classes).

MODEL 2:
- Dual-encoder Optical (10-band) + SAR (2-band VV/VH) Fusion ResNet18 classifier (16 classes).
"""

import torch
import torch.nn as nn
import torchvision.models as models


class MultispectralResNet18(nn.Module):
    """
    Multispectral Sentinel-2 Land-Cover Classification Model.
    Architecture: ResNet-18 with 10 input channels and 16 output classes.
    """
    def __init__(self, input_channels: int = 10, num_classes: int = 16):
        super().__init__()
        # Standard ResNet-18
        backbone = models.resnet18()
        self.conv1 = nn.Conv2d(
            input_channels, 64, kernel_size=7, stride=2, padding=3, bias=False
        )
        self.bn1 = backbone.bn1
        self.relu = backbone.relu
        self.maxpool = backbone.maxpool
        self.layer1 = backbone.layer1
        self.layer2 = backbone.layer2
        self.layer3 = backbone.layer3
        self.layer4 = backbone.layer4
        self.avgpool = backbone.avgpool
        self.fc = nn.Linear(512, num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.conv1(x)
        x = self.bn1(x)
        x = self.relu(x)
        x = self.maxpool(x)

        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        x = self.layer4(x)

        x = self.avgpool(x)
        x = torch.flatten(x, 1)
        x = self.fc(x)
        return x


class SAROpticalFusionResNet18(nn.Module):
    """
    Multimodal Sentinel-2 Optical (10-band) + Sentinel-1 SAR (2-band VV/VH) Fusion Model.
    Architecture: Dual ResNet-18 feature extractors concatenated into a 512-dim bottleneck fusion head.
    """
    def __init__(
        self,
        optical_channels: int = 10,
        sar_channels: int = 2,
        num_classes: int = 16,
        dropout_p: float = 0.3
    ):
        super().__init__()
        # Optical encoder (10 channels -> 512-d representation)
        self.optical = models.resnet18()
        self.optical.conv1 = nn.Conv2d(
            optical_channels, 64, kernel_size=7, stride=2, padding=3, bias=False
        )
        self.optical.fc = nn.Identity()

        # SAR encoder (2 channels: VV, VH -> 512-d representation)
        self.sar = models.resnet18()
        self.sar.conv1 = nn.Conv2d(
            sar_channels, 64, kernel_size=7, stride=2, padding=3, bias=False
        )
        self.sar.fc = nn.Identity()

        # Fusion classification head (1024-d -> 512-d -> 16 classes)
        self.fusion = nn.Sequential(
            nn.Linear(1024, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout_p),
            nn.Linear(512, num_classes)
        )

    def forward(self, optical: torch.Tensor, sar: torch.Tensor) -> torch.Tensor:
        opt_feat = self.optical(optical)
        sar_feat = self.sar(sar)
        fused = torch.cat([opt_feat, sar_feat], dim=1)
        return self.fusion(fused)
