"""
Rule-Based Query Router for SatQuery AI.
Deterministically classifies analytical queries between Single-Image VQA
and Scene Captioning, honoring explicit task selections when provided.
"""

from typing import Optional
from pydantic import BaseModel, Field


class RouteResult(BaseModel):
    task: str = Field(..., description="Selected task: 'vqa' or 'caption'")
    reason: str = Field(..., description="Observable reason for routing decision")
    model: str = Field("qwen2.5-vl-3b", description="Routed model identifier")


class UnsupportedTaskError(Exception):
    def __init__(self, task: str):
        self.task = task
        super().__init__(f"Unsupported task '{task}'. Supported tasks: 'vqa', 'caption', 'change_analysis' (or 'auto').")


CAPTION_PHRASES = [
    "describe",
    "caption",
    "summarize scene",
    "summary of the scene",
    "summarize this scene",
    "what does the scene look like",
    "give me a summary",
    "scene description",
    "scene overview",
    "general description",
    "provide a summary"
]

VQA_PHRASES = [
    "is there",
    "are there",
    "how many",
    "what are",
    "what is",
    "what",
    "where is",
    "where are",
    "which",
    "identify",
    "detect",
    "does this",
    "can you see",
    "count"
]


CHANGE_PHRASES = [
    "change between",
    "changed between",
    "changes between",
    "what has changed",
    "what changed",
    "areas have changed",
    "areas changed",
    "regions changed",
    "difference between",
    "scene changed",
    "how much of the scene changed",
    "how much changed",
    "where are the largest changes",
    "show the major changed regions",
    "major changed regions",
    "change analysis"
]


SAR_FUSION_PHRASES = [
    "optical + sar",
    "optical and sar",
    "sar fusion",
    "radar fusion",
    "sentinel-1",
    "sentinel 1",
    "radar backscatter",
    "microwave",
    "vv and vh",
    "multimodal land cover",
    "multimodal classification",
    "sar classification"
]

EXPLICIT_CLASSIFY_PHRASES = [
    "classify land",
    "land cover classification",
    "land-cover classification",
    "landcover classification",
    "classify terrain",
    "multispectral classification",
    "ben14k",
    "bigearthnet",
    "classify scene",
    "predict classes",
    "class probabilities",
    "multi-label classification"
]


def route_query(
    query: str,
    modality: str = "auto",
    requested_task: Optional[str] = None,
    has_bitemporal_inputs: bool = False,
    has_sar_input: bool = False
) -> RouteResult:
    """
    Route an incoming remote-sensing query to the appropriate specialist capability.
    
    Deterministic Hierarchy:
    1. Explicit task selection (if non-empty / non-auto)
    2. Input signal presence (bi-temporal images -> change; SAR input -> fusion)
    3. Bi-temporal change inquiry
    4. Optical + SAR multimodal fusion query
    5. Explicit land-cover classification commands
    6. Scene captioning inquiry
    7. Question-oriented VQA inquiry (or ending with ?)
    8. General land-cover phrasing
    9. Default fallback to Qwen VLM
    """
    cleaned_task = (requested_task or "").strip().lower()

    # Explicit task selection check
    if cleaned_task and cleaned_task not in ["auto", "none", "null"]:
        if cleaned_task in ["vqa", "single_image_vqa", "question_answering"]:
            return RouteResult(
                task="vqa",
                reason="Explicit VQA task selected",
                model="qwen2.5-vl-3b"
            )
        elif cleaned_task in ["caption", "captioning", "scene_captioning", "scene_understanding"]:
            return RouteResult(
                task="caption",
                reason="Explicit captioning task selected",
                model="qwen2.5-vl-3b"
            )
        elif cleaned_task in ["change_analysis", "change_detection", "bitemporal_change"]:
            return RouteResult(
                task="change_analysis",
                reason="Explicit change analysis task selected",
                model="classical-change-baseline"
            )
        elif cleaned_task in ["optical_landcover", "landcover", "land_cover", "optical_classification"]:
            return RouteResult(
                task="optical_landcover",
                reason="Explicit optical multispectral land-cover classification task selected",
                model="satquery-ben14k-optical"
            )
        elif cleaned_task in ["optical_sar_landcover", "sar_landcover", "fusion", "multimodal_fusion"]:
            return RouteResult(
                task="optical_sar_landcover",
                reason="Explicit Optical + SAR multimodal fusion classification task selected",
                model="satquery-sar-optical-fusion"
            )
        else:
            raise UnsupportedTaskError(requested_task)

    # Input signal checks
    if has_bitemporal_inputs:
        return RouteResult(
            task="change_analysis",
            reason="Bi-temporal image pair provided",
            model="classical-change-baseline"
        )

    if has_sar_input:
        return RouteResult(
            task="optical_sar_landcover",
            reason="SAR imagery input provided alongside optical scene",
            model="satquery-sar-optical-fusion"
        )

    # Automatic deterministic routing based on query
    q_norm = " " + (query or "").lower().strip() + " "

    # 1. Check for bi-temporal change phrases
    for phrase in CHANGE_PHRASES:
        if phrase in q_norm:
            return RouteResult(
                task="change_analysis",
                reason="Bi-temporal change inquiry detected in query",
                model="classical-change-baseline"
            )

    # 2. Check for SAR fusion phrases
    for phrase in SAR_FUSION_PHRASES:
        if phrase in q_norm:
            return RouteResult(
                task="optical_sar_landcover",
                reason="Optical + SAR multimodal query detected",
                model="satquery-sar-optical-fusion"
            )

    # 3. Check for explicit classification phrases
    for phrase in EXPLICIT_CLASSIFY_PHRASES:
        if phrase in q_norm:
            return RouteResult(
                task="optical_landcover",
                reason="Land-cover classification inquiry detected",
                model="satquery-ben14k-optical"
            )

    # 4. Check for captioning markers
    for phrase in CAPTION_PHRASES:
        if phrase in q_norm:
            return RouteResult(
                task="caption",
                reason="Scene-description query detected",
                model="qwen2.5-vl-3b"
            )

    # 5. Check for question/VQA markers
    for phrase in VQA_PHRASES:
        if phrase in q_norm:
            return RouteResult(
                task="vqa",
                reason="Question-oriented query detected",
                model="qwen2.5-vl-3b"
            )

    # 6. Secondary punctuation check
    if query and query.strip().endswith("?"):
        return RouteResult(
            task="vqa",
            reason="Question-oriented query detected",
            model="qwen2.5-vl-3b"
        )

    # 7. Check for general land cover terms when not asked as a question
    if any(p in q_norm for p in [" land cover ", " land-cover ", " landcover ", " classify "]):
        return RouteResult(
            task="optical_landcover",
            reason="Land-cover terminology detected in non-interrogative query",
            model="satquery-ben14k-optical"
        )

    # Default fallback to Qwen VLM
    return RouteResult(
        task="vqa",
        reason="Defaulting to question-oriented VQA",
        model="qwen2.5-vl-3b"
    )


