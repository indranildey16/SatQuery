"""
SatQuery AI — Bi-Temporal Change Detection Service.
Implements a defensible, deterministic image-processing baseline:
- Image validation & safe resolution alignment
- Intensity differencing & thresholding
- Morphological cleanup (opening/closing)
- Connected-component region extraction & spatial metrics
- Binary change mask & overlay visualization generation
- Deterministic summary & explicit scientific limitation labeling
"""

import os
import io
import base64
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import cv2

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".geotiff"}


class ChangeAnalysisError(Exception):
    def __init__(self, code: str, message: str, details: Optional[Any] = None):
        self.code = code
        self.message = message
        self.details = details
        super().__init__(message)


class ChangeDetectionService:
    """
    Classical image-processing change detection baseline.
    Does not pretend to be a deep learning model or infer unverified semantic causes.
    """

    def validate_change_inputs(
        self,
        before_path: str,
        after_path: str
    ) -> Tuple[Tuple[int, int], Tuple[int, int]]:
        """
        Validates presence, readability, format, and dimensions of both images.
        Returns: ((w_before, h_before), (w_after, h_after))
        """
        if not before_path or not os.path.exists(before_path):
            raise ChangeAnalysisError("MISSING_BEFORE_IMAGE", "Before image file is missing or inaccessible.")
        if not after_path or not os.path.exists(after_path):
            raise ChangeAnalysisError("MISSING_AFTER_IMAGE", "After image file is missing or inaccessible.")

        ext_b = Path(before_path).suffix.lower()
        ext_a = Path(after_path).suffix.lower()
        if ext_b not in SUPPORTED_EXTENSIONS:
            raise ChangeAnalysisError("INVALID_IMAGE", f"Unsupported format '{ext_b}' for before image.")
        if ext_a not in SUPPORTED_EXTENSIONS:
            raise ChangeAnalysisError("INVALID_IMAGE", f"Unsupported format '{ext_a}' for after image.")

        try:
            with Image.open(before_path) as img_b:
                dims_b = (img_b.width, img_b.height)
                if img_b.width <= 0 or img_b.height <= 0:
                    raise ValueError("Zero dimensions")
        except Exception as e:
            raise ChangeAnalysisError("INVALID_IMAGE", f"Failed to read before image: {e}")

        try:
            with Image.open(after_path) as img_a:
                dims_a = (img_a.width, img_a.height)
                if img_a.width <= 0 or img_a.height <= 0:
                    raise ValueError("Zero dimensions")
        except Exception as e:
            raise ChangeAnalysisError("INVALID_IMAGE", f"Failed to read after image: {e}")

        return dims_b, dims_a

    def align_images(
        self,
        img_b: np.ndarray,
        img_a: np.ndarray
    ) -> Tuple[np.ndarray, np.ndarray, Dict[str, Any]]:
        """
        Aligns before and after images to a common working resolution.
        If dimensions already match, uses exact alignment.
        If dimensions differ, rescales after image to match before image.
        Returns: (aligned_b, aligned_a, alignment_telemetry)
        """
        h_b, w_b = img_b.shape[:2]
        h_a, w_a = img_a.shape[:2]

        telemetry: Dict[str, Any] = {
            "inputDimensionsBefore": [w_b, h_b],
            "inputDimensionsAfter": [w_a, h_a],
            "workingDimensions": [w_b, h_b],
            "method": "exact_dimension_match"
        }

        if (w_b, h_b) == (w_a, h_a):
            return img_b, img_a, telemetry

        # Incompatible dimensions: safe bilinear resampling to before dimensions
        try:
            aligned_a = cv2.resize(img_a, (w_b, h_b), interpolation=cv2.INTER_LINEAR)
            telemetry["method"] = "bilinear_dimension_resample"
            telemetry["resampled"] = True
            return img_b, aligned_a, telemetry
        except Exception as e:
            raise ChangeAnalysisError("CHANGE_ALIGNMENT_FAILED", f"Image alignment failed: {e}")

    def compute_change_mask(
        self,
        img_b: np.ndarray,
        img_a: np.ndarray,
        threshold: float = 35.0,
        min_area_pixels: int = 30
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Computes binary change mask from aligned RGB images.
        Pipeline:
        1. Intensity difference in RGB Euclidean space
        2. Absolute difference thresholding
        3. Morphological opening (remove isolated noise)
        4. Morphological closing (bridge small gaps)
        Returns: (binary_mask_uint8, diff_map_float)
        """
        # Ensure 3-channel RGB
        if len(img_b.shape) == 2:
            img_b = cv2.cvtColor(img_b, cv2.COLOR_GRAY2RGB)
        elif img_b.shape[2] == 4:
            img_b = cv2.cvtColor(img_b, cv2.COLOR_RGBA2RGB)

        if len(img_a.shape) == 2:
            img_a = cv2.cvtColor(img_a, cv2.COLOR_GRAY2RGB)
        elif img_a.shape[2] == 4:
            img_a = cv2.cvtColor(img_a, cv2.COLOR_RGBA2RGB)

        # 1. Compute Euclidean per-pixel color distance
        diff_float = np.linalg.norm(img_a.astype(np.float32) - img_b.astype(np.float32), axis=2)

        # 2. Binary thresholding
        raw_mask = (diff_float >= threshold).astype(np.uint8)

        # 3. Morphological cleanup
        kernel_open = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        kernel_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))

        opened = cv2.morphologyEx(raw_mask, cv2.MORPH_OPEN, kernel_open)
        cleaned_mask = cv2.morphologyEx(opened, cv2.MORPH_CLOSE, kernel_close)

        return cleaned_mask, diff_float

    def extract_changed_regions(
        self,
        binary_mask: np.ndarray,
        min_area_pixels: int = 30
    ) -> Tuple[List[Dict[str, Any]], np.ndarray]:
        """
        Extracts connected components for significant changed regions.
        Filters out components smaller than min_area_pixels.
        Returns: (sorted_regions_list, filtered_mask)
        """
        total_pixels = binary_mask.size
        h, w = binary_mask.shape[:2]

        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
            binary_mask, connectivity=8
        )

        regions: List[Dict[str, Any]] = []
        filtered_mask = np.zeros_like(binary_mask)

        # Label 0 is background
        valid_indices = []
        for i in range(1, num_labels):
            area = int(stats[i, cv2.CC_STAT_AREA])
            if area >= min_area_pixels:
                valid_indices.append((i, area))

        # Sort descending by area
        valid_indices.sort(key=lambda x: x[1], reverse=True)

        for rank, (label_id, area) in enumerate(valid_indices, start=1):
            xmin = int(stats[label_id, cv2.CC_STAT_LEFT])
            ymin = int(stats[label_id, cv2.CC_STAT_TOP])
            width = int(stats[label_id, cv2.CC_STAT_WIDTH])
            height = int(stats[label_id, cv2.CC_STAT_HEIGHT])
            xmax = xmin + width
            ymax = ymin + height

            cx = round(float(centroids[label_id][0]), 1)
            cy = round(float(centroids[label_id][1]), 1)
            rel_area = round((area / total_pixels) * 100.0, 3)

            # Mark in filtered mask
            filtered_mask[labels == label_id] = 1

            regions.append({
                "id": f"R-{rank:02d}",
                "pixelArea": area,
                "relativeAreaPercent": rel_area,
                "bbox": [ymin, xmin, ymax, xmax],  # [ymin, xmin, ymax, xmax]
                "bboxXywh": [xmin, ymin, width, height],
                "centroid": [cx, cy]
            })

        return regions, filtered_mask

    def compute_change_statistics(
        self,
        filtered_mask: np.ndarray,
        regions: List[Dict[str, Any]],
        threshold: float,
        min_area_pixels: int
    ) -> Dict[str, Any]:
        """
        Computes honest mathematical change statistics from actual pixel processing.
        """
        changed_pixel_count = int(np.sum(filtered_mask > 0))
        total_valid_pixel_count = int(filtered_mask.size)
        change_percentage = round(
            (changed_pixel_count / max(total_valid_pixel_count, 1)) * 100.0, 2
        )

        largest_area = regions[0]["pixelArea"] if regions else 0
        largest_bbox = regions[0]["bbox"] if regions else None

        return {
            "changedPixelCount": changed_pixel_count,
            "totalValidPixelCount": total_valid_pixel_count,
            "changePercentage": change_percentage,
            "changedRegionCount": len(regions),
            "largestRegionArea": largest_area,
            "largestRegionBbox": largest_bbox,
            "method": {
                "type": "pixel_difference_baseline",
                "threshold": threshold,
                "minAreaPixels": min_area_pixels,
                "metric": "Euclidean RGB Delta with Morphological Cleaning"
            }
        }

    def build_change_visualizations(
        self,
        img_after: np.ndarray,
        filtered_mask: np.ndarray,
        regions: List[Dict[str, Any]]
    ) -> Dict[str, str]:
        """
        Generates binary change mask and overlay visualization encoded as data URLs.
        """
        h, w = filtered_mask.shape[:2]

        # 1. Binary Mask visualization (High-contrast PNG: Orange on dark background)
        mask_rgb = np.zeros((h, w, 3), dtype=np.uint8)
        # Tint changed pixels bright orange (234, 88, 12)
        mask_rgb[filtered_mask > 0] = [234, 88, 12]
        
        mask_pil = Image.fromarray(mask_rgb)
        buf_mask = io.BytesIO()
        mask_pil.save(buf_mask, format="PNG")
        mask_data_url = "data:image/png;base64," + base64.b64encode(buf_mask.getvalue()).decode("utf-8")

        # 2. Overlay visualization: After image + 45% orange alpha mask + region bounding boxes
        overlay_rgb = img_after.copy()
        tint = np.array([234, 88, 12], dtype=np.float32)
        alpha = 0.45

        changed_idx = (filtered_mask > 0)
        overlay_rgb[changed_idx] = (
            overlay_rgb[changed_idx].astype(np.float32) * (1 - alpha) + tint * alpha
        ).astype(np.uint8)

        overlay_pil = Image.fromarray(overlay_rgb)
        draw = ImageDraw.Draw(overlay_pil)

        # Draw clean bounding boxes and region labels for significant regions (up to 15)
        for r in regions[:15]:
            ymin, xmin, ymax, xmax = r["bbox"]
            # Outline rectangle
            draw.rectangle([(xmin, ymin), (xmax, ymax)], outline=(255, 237, 213), width=2)
            # Label tag
            label_text = r["id"]
            draw.rectangle([(xmin, max(0, ymin - 14)), (xmin + 34, ymin)], fill=(194, 65, 12))
            draw.text((xmin + 4, max(0, ymin - 13)), label_text, fill=(255, 255, 255))

        buf_overlay = io.BytesIO()
        overlay_pil.save(buf_overlay, format="JPEG", quality=90)
        overlay_data_url = "data:image/jpeg;base64," + base64.b64encode(buf_overlay.getvalue()).decode("utf-8")

        return {
            "maskDataUrl": mask_data_url,
            "overlayDataUrl": overlay_data_url
        }

    def build_change_summary(self, stats: Dict[str, Any]) -> Tuple[str, List[str]]:
        """
        Builds concise deterministic summary without unverified semantic deductions.
        """
        region_count = stats["changedRegionCount"]
        pct = stats["changePercentage"]
        changed_px = stats["changedPixelCount"]
        total_px = stats["totalValidPixelCount"]
        largest_px = stats["largestRegionArea"]

        summary = (
            f"The baseline detected {region_count} spatially distinct changed regions, "
            f"covering approximately {pct}% of the analyzed image "
            f"({changed_px:,} changed pixels out of {total_px:,} total valid pixels). "
            f"The largest contiguous changed region encompasses {largest_px:,} pixels."
        )

        findings = [
            f"Detected {region_count} distinct changed spatial regions via pixel differencing.",
            f"Total changed surface footprint covers {pct}% ({changed_px:,} pixels) of working resolution.",
            f"Largest contiguous change zone measures {largest_px:,} pixels.",
            "Observation represents image-level spatial change without inferring unverified semantic causes."
        ]

        return summary, findings

    def run_change_detection(
        self,
        before_path: str,
        after_path: str,
        threshold: float = 35.0,
        min_area_pixels: int = 30
    ) -> Dict[str, Any]:
        """
        Full end-to-end change detection baseline workflow.
        """
        # Step 1 & 2: Input validation
        dims_b, dims_a = self.validate_change_inputs(before_path, after_path)

        # Load images
        with Image.open(before_path) as p_b:
            arr_b = np.array(p_b.convert("RGB"))
        with Image.open(after_path) as p_a:
            arr_a = np.array(p_a.convert("RGB"))

        # Step 3: Alignment
        aligned_b, aligned_a, alignment_info = self.align_images(arr_b, arr_a)

        # Step 4 & 5: Change estimation & cleanup
        cleaned_mask, diff_map = self.compute_change_mask(
            aligned_b, aligned_a, threshold=threshold, min_area_pixels=min_area_pixels
        )

        # Step 6: Region extraction
        regions, filtered_mask = self.extract_changed_regions(
            cleaned_mask, min_area_pixels=min_area_pixels
        )

        # Step 7: Change statistics
        stats = self.compute_change_statistics(
            filtered_mask, regions, threshold=threshold, min_area_pixels=min_area_pixels
        )

        # Step 8: Visualizations
        visualizations = self.build_change_visualizations(aligned_a, filtered_mask, regions)

        # Step 9: Summary
        summary, findings = self.build_change_summary(stats)

        return {
            "alignment": alignment_info,
            "statistics": stats,
            "regions": regions,
            "visualizations": visualizations,
            "summary": summary,
            "findings": findings
        }


change_detection_service = ChangeDetectionService()
