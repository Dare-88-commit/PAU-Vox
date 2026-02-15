from pydantic import BaseModel


class ResolutionMetric(BaseModel):
    average_resolution_hours: float
    resolved_count: int


class AnalyticsResponse(BaseModel):
    total_feedback: int
    by_type: dict[str, int]
    by_status: dict[str, int]
    by_priority: dict[str, int]
    top_categories: dict[str, int]
    resolution: ResolutionMetric
