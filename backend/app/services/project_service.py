from typing import List
from ..schemas.project import ProjectSchema


MOCK_PROJECTS: List[ProjectSchema] = [
    ProjectSchema(
        id="proj-01",
        name="Coastal & Delta Maritime Monitoring",
        description="High-resolution vessel classification and estuarine plume monitoring across major trade ports.",
        analysisCount=14,
        lastUpdated="2026-09-18 10:44"
    ),
    ProjectSchema(
        id="proj-02",
        name="West Africa Mangrove & Estuary Watch",
        description="Land-cover classification and ecological shoreline monitoring with Sentinel-2 MSI.",
        analysisCount=8,
        lastUpdated="2026-09-18 10:15"
    ),
    ProjectSchema(
        id="proj-03",
        name="Urban Sprawl & Infrastructure Mapping",
        description="Automated built-up area segmentation and transport corridor extraction.",
        analysisCount=22,
        lastUpdated="2026-09-16 16:30"
    )
]


class ProjectService:
    def list_projects(self) -> List[ProjectSchema]:
        return MOCK_PROJECTS


project_service = ProjectService()
