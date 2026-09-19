import os
import shutil
import asyncio
from typing import Dict, List, Optional, Any
from pathlib import Path
from fastapi import UploadFile

from ..schemas.analysis import AnalysisDetailResponse
from ..core.config import settings


class InMemoryAnalysisStore:
    """
    Thread-safe in-memory store for active and completed analyses.
    Can easily be swapped for a database repository (e.g. Postgres) later.
    """

    def __init__(self):
        self._store: Dict[str, AnalysisDetailResponse] = {}
        self._lock = asyncio.Lock()

    async def get(self, analysis_id: str) -> Optional[AnalysisDetailResponse]:
        async with self._lock:
            item = self._store.get(analysis_id)
            if item:
                return item.model_copy(deep=True)
            return None

    async def save(self, analysis: AnalysisDetailResponse) -> None:
        async with self._lock:
            self._store[analysis.id] = analysis.model_copy(deep=True)

    async def list_all(self, limit: int = 50) -> List[AnalysisDetailResponse]:
        async with self._lock:
            items = list(self._store.values())
            # Return newest first
            items.reverse()
            return [i.model_copy(deep=True) for i in items[:limit]]

    async def update_status(
        self,
        analysis_id: str,
        status: str,
        progress: int,
        stage: str,
        results: Optional[Any] = None,
        trace: Optional[Any] = None,
        error: Optional[str] = None,
        error_code: Optional[str] = None,
        updated_at: Optional[str] = None
    ) -> Optional[AnalysisDetailResponse]:
        async with self._lock:
            if analysis_id not in self._store:
                return None
            item = self._store[analysis_id]
            from ..schemas.common import AnalysisStatusEnum
            item.status = AnalysisStatusEnum(status) if isinstance(status, str) else status
            item.progress = progress
            item.stage = stage
            item.currentStage = stage
            if results is not None:
                item.results = results
            if trace is not None:
                item.trace = trace
            if error is not None:
                item.error = error
            if error_code is not None:
                item.errorCode = error_code
            if updated_at is not None:
                item.updatedAt = updated_at
            return item.model_copy(deep=True)


async def save_uploaded_file(file: UploadFile, dest_dir: Optional[str] = None) -> str:
    """Save an incoming multipart upload file to local disk."""
    target_dir = Path(dest_dir or settings.UPLOAD_DIR)
    target_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = target_dir / file.filename
    # Handle duplicates by appending unique suffix if needed
    counter = 1
    stem = Path(file.filename).stem
    suffix = Path(file.filename).suffix
    while file_path.exists():
        file_path = target_dir / f"{stem}_{counter}{suffix}"
        counter += 1

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return str(file_path)


analysis_store = InMemoryAnalysisStore()
