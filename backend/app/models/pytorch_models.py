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


class SiameseResNet18CD(nn.Module):
    """
    Siamese ResNet-18 Bi-Temporal Change Detection Network (LEVIR-CD+).
    Features dual-temporal shared ResNet18 encoder, multi-scale absolute feature differencing,
    and a top-down decoder with skip connections to output a single-channel binary change logit map.
    """
    def __init__(self):
        super().__init__()
        base = models.resnet18()
        self.encoder = nn.Module()
        self.encoder.conv1 = base.conv1
        self.encoder.bn1 = base.bn1
        self.encoder.relu = base.relu
        self.encoder.maxpool = base.maxpool
        self.encoder.layer1 = base.layer1
        self.encoder.layer2 = base.layer2
        self.encoder.layer3 = base.layer3
        self.encoder.layer4 = base.layer4

        self.decoder = nn.Module()
        self.decoder.block4 = nn.Sequential(
            nn.Conv2d(512, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True)
        )
        self.decoder.block3 = nn.Sequential(
            nn.Conv2d(512, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True)
        )
        self.decoder.block2 = nn.Sequential(
            nn.Conv2d(256, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True)
        )
        self.decoder.block1 = nn.Sequential(
            nn.Conv2d(128, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True)
        )
        self.decoder.final = nn.Sequential(
            nn.Conv2d(64, 32, kernel_size=3, padding=1),
            nn.ReLU(inplace=True),
            nn.Conv2d(32, 1, kernel_size=1)
        )

    def extract_features(self, x: torch.Tensor):
        x = self.encoder.conv1(x)
        x = self.encoder.bn1(x)
        x = self.encoder.relu(x)
        x = self.encoder.maxpool(x)
        f1 = self.encoder.layer1(x)
        f2 = self.encoder.layer2(f1)
        f3 = self.encoder.layer3(f2)
        f4 = self.encoder.layer4(f3)
        return f1, f2, f3, f4

    def forward(self, t1: torch.Tensor, t2: torch.Tensor) -> torch.Tensor:
        orig_h, orig_w = t1.shape[2:]
        t1_f1, t1_f2, t1_f3, t1_f4 = self.extract_features(t1)
        t2_f1, t2_f2, t2_f3, t2_f4 = self.extract_features(t2)

        d4 = torch.abs(t1_f4 - t2_f4)
        d3 = torch.abs(t1_f3 - t2_f3)
        d2 = torch.abs(t1_f2 - t2_f2)
        d1 = torch.abs(t1_f1 - t2_f1)

        x = self.decoder.block4(d4)
        x = nn.functional.interpolate(x, size=d3.shape[2:], mode="bilinear", align_corners=False)
        x = torch.cat([x, d3], dim=1)

        x = self.decoder.block3(x)
        x = nn.functional.interpolate(x, size=d2.shape[2:], mode="bilinear", align_corners=False)
        x = torch.cat([x, d2], dim=1)

        x = self.decoder.block2(x)
        x = nn.functional.interpolate(x, size=d1.shape[2:], mode="bilinear", align_corners=False)
        x = torch.cat([x, d1], dim=1)

        x = self.decoder.block1(x)
        x = self.decoder.final(x)
        x = nn.functional.interpolate(x, size=(orig_h, orig_w), mode="bilinear", align_corners=False)
        return x

