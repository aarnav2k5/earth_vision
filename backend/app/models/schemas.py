from __future__ import annotations

from datetime import date
from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator
from pyproj import Geod
from shapely.geometry import shape


class AnalysisThresholds(BaseModel):
    vegetation: float = Field(default=0.18, ge=0.01, le=1.0)
    water: float = Field(default=0.12, ge=0.01, le=1.0)
    urban_brightness: float = Field(default=25.0, ge=1.0, le=255.0)


class DateRange(BaseModel):
    start: date
    end: date

    @model_validator(mode="after")
    def validate_order(self) -> "DateRange":
        if self.start > self.end:
            raise ValueError("Date range start must be earlier than or equal to end.")
        return self


class AreaRequest(BaseModel):
    aoi: dict[str, Any] = Field(..., description="GeoJSON polygon or multipolygon geometry.")
    before: DateRange
    after: DateRange
    max_cloud_cover: float = Field(default=20.0, ge=0.0, le=100.0)
    thresholds: AnalysisThresholds = Field(default_factory=AnalysisThresholds)
    thresholds_acknowledged: bool = False

    @field_validator("aoi")
    @classmethod
    def validate_aoi(cls, value: dict[str, Any]) -> dict[str, Any]:
        geometry_type = value.get("type")
        if geometry_type not in {"Polygon", "MultiPolygon"}:
            raise ValueError("AOI must be a GeoJSON Polygon or MultiPolygon geometry.")
        if not value.get("coordinates"):
            raise ValueError("AOI geometry must include coordinates.")
        try:
            geometry = shape(value)
        except (TypeError, ValueError) as exc:
            raise ValueError("AOI geometry coordinates are invalid.") from exc
        if geometry.is_empty or not geometry.is_valid:
            raise ValueError("AOI geometry must be a valid, non-empty Polygon or MultiPolygon.")
        minx, miny, maxx, maxy = geometry.bounds
        if maxx - minx > 180:
            raise ValueError("AOIs crossing the antimeridian are not supported.")
        if max(abs(miny), abs(maxy)) > 75:
            raise ValueError("Polar AOIs beyond 75 degrees latitude are not supported.")
        if geometry.area == 0:
            raise ValueError("AOI must cover a non-zero area.")
        area_square_meters, _ = Geod(ellps="WGS84").geometry_area_perimeter(geometry)
        if abs(area_square_meters) > 100_000_000:
            raise ValueError("AOI is too large; select an area no larger than 100 square kilometres.")
        return value


class FetchSentinelResponse(BaseModel):
    before_scene_id: str
    after_scene_id: str
    before_preview_url: str | None = None
    after_preview_url: str | None = None
    before_acquired: str
    after_acquired: str


class ChangeMetrics(BaseModel):
    total_change: float
    vegetation_change: float
    urban_change: float
    water_change: float
    change_intensity: float
    valid_pixels: int
    ndvi_before_mean: float
    ndvi_after_mean: float
    ndwi_before_mean: float
    ndwi_after_mean: float
    ndvi_delta: float
    ndwi_delta: float
    valid_coverage_percent: float
    area_hectares: float


class AnalyzeAreaResponse(BaseModel):
    metrics: ChangeMetrics
    before_scene_id: str
    after_scene_id: str
    before_acquired: str
    after_acquired: str
    before_cloud_cover: float
    after_cloud_cover: float
    warnings: list[str]
    recommendations: list[str]
    thresholds: AnalysisThresholds
    processing_version: str
    before_preview_url: str | None = None
    after_preview_url: str | None = None
    vegetation_change_mask: list[list[float]]
    water_change_mask: list[list[float]]
    urban_change_mask: list[list[float]]


class AiInsightInput(BaseModel):
    NDVI_mean: float
    ndvi_before_mean: float
    ndvi_after_mean: float
    ndvi_delta: float
    ndwi_before_mean: float
    ndwi_after_mean: float
    ndwi_delta: float
    vegetation_change: float
    urban_change: float
    water_change: float
    change_intensity: float
    valid_coverage_percent: float
    area_hectares: float
    before_acquired: str
    after_acquired: str
    before_cloud_cover: float
    after_cloud_cover: float
    thresholds: AnalysisThresholds
    question: str | None = None
    recommendations: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class AiInsightResponse(BaseModel):
    answer: str
