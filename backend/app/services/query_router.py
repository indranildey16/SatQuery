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


def route_query(
    query: str,
    modality: str = "auto",
    requested_task: Optional[str] = None,
    has_bitemporal_inputs: bool = False
) -> RouteResult:
    """
    Route an incoming remote-sensing query to the appropriate specialist capability.
    
    Rules:
    - If requested_task is explicitly provided (and not auto/empty), respect it.
    - If requested_task is automatic or omitted, evaluate deterministic linguistic markers.
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
        else:
            raise UnsupportedTaskError(requested_task)

    # If bi-temporal inputs provided or change task signaled
    if has_bitemporal_inputs:
        return RouteResult(
            task="change_analysis",
            reason="Bi-temporal image pair provided",
            model="classical-change-baseline"
        )

    # Automatic deterministic routing based on query
    q_norm = " " + (query or "").lower().strip() + " "

    # Check for change phrases first
    for phrase in CHANGE_PHRASES:
        if phrase in q_norm:
            return RouteResult(
                task="change_analysis",
                reason="Bi-temporal change inquiry detected in query",
                model="classical-change-baseline"
            )

    # Check for captioning markers
    for phrase in CAPTION_PHRASES:
        if phrase in q_norm:
            return RouteResult(
                task="caption",
                reason="Scene-description query detected",
                model="qwen2.5-vl-3b"
            )

    # Check for question/VQA markers
    for phrase in VQA_PHRASES:
        if phrase in q_norm:
            return RouteResult(
                task="vqa",
                reason="Question-oriented query detected",
                model="qwen2.5-vl-3b"
            )

    # Secondary punctuation check
    if query and query.strip().endswith("?"):
        return RouteResult(
            task="vqa",
            reason="Question-oriented query detected",
            model="qwen2.5-vl-3b"
        )

    # Default fallback
    return RouteResult(
        task="vqa",
        reason="Defaulting to question-oriented VQA",
        model="qwen2.5-vl-3b"
    )
