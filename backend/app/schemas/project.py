from pydantic import BaseModel


class ProjectSchema(BaseModel):
    id: str
    name: str
    description: str
    analysisCount: int
    lastUpdated: str
