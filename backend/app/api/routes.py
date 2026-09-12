from __future__ import annotations

import cv2
import numpy as np
import time
from fastapi import APIRouter, HTTPException, Query
import planetary_computer
from shapely.geometry import box, mapping

from app.models.schemas import (
    AiInsightInput,
    AiInsightResponse,
    AnalyzeAreaResponse,
    AreaRequest,
    ChangeMetrics,
    DateRange,
    FetchSentinelResponse,
)
from app.services.ai_service import GroqInsightService
from app.services.change_detection import compute_change_metrics
from app.services.indices import compute_ndvi, compute_ndwi
from app.services.stac_service import SentinelService


router = APIRouter()
sentinel_service = SentinelService()
ai_service = GroqInsightService()
PROCESSING_VERSION = "1.1.0"
MIN_VALID_COVERAGE = 70.0


class InsufficientEvidenceError(ValueError):
    def __init__(self, details: dict[str, object]) -> None:
        self.details = details
        super().__init__(str(details["message"]))


def _iso_date_range(date_range: DateRange) -> tuple[str, str]:
    return date_range.start.isoformat(), date_range.end.isoformat()


def _bbox_to_aoi(bbox: str) -> dict:
    try:
        values = [float(value.strip()) for value in bbox.split(",")]
    except ValueError as exc:
        raise ValueError("bbox must contain four numeric values: minx,miny,maxx,maxy.") from exc

    if len(values) != 4:
        raise ValueError("bbox must contain exactly four values: minx,miny,maxx,maxy.")

    minx, miny, maxx, maxy = values
    if minx >= maxx or miny >= maxy:
        raise ValueError("bbox minimum coordinates must be smaller than maximum coordinates.")
    if not (-180 <= minx <= 180 and -180 <= maxx <= 180 and -90 <= miny <= 90 and -90 <= maxy <= 90):
        raise ValueError("bbox coordinates must be valid WGS84 longitude/latitude values.")

    return mapping(box(minx, miny, maxx, maxy))


def _resize_band(band: np.ndarray, target_shape: tuple[int, int]) -> np.ndarray:
    if band.shape == target_shape:
        return band
    return cv2.resize(band, (target_shape[1], target_shape[0]), interpolation=cv2.INTER_LINEAR).astype(np.float32)


def _resize_mask(mask: np.ndarray, target_shape: tuple[int, int]) -> np.ndarray:
    if mask.shape == target_shape:
        return mask
    resized = cv2.resize(mask.astype(np.uint8), (target_shape[1], target_shape[0]), interpolation=cv2.INTER_NEAREST)
    return resized.astype(bool)


def _resize_rgb(rgb: np.ndarray, target_shape: tuple[int, int]) -> np.ndarray:
    if rgb.shape[:2] == target_shape:
        return rgb
    return cv2.resize(rgb, (target_shape[1], target_shape[0]), interpolation=cv2.INTER_LINEAR).astype(np.float32)


def _analyze(request: AreaRequest) -> AnalyzeAreaResponse:
    started_at = time.perf_counter()

    print("[Garuda Lens] analyze-area: fetching before scene")
    before_range = _iso_date_range(request.before)
    after_range = _iso_date_range(request.after)
    before_scene = sentinel_service.fetch_scene_data(
        request.aoi,
        before_range,
        request.max_cloud_cover,
    )
    print(f"[Garuda Lens] analyze-area: before scene ready in {time.perf_counter() - started_at:.2f}s")

    after_started_at = time.perf_counter()
    print("[Garuda Lens] analyze-area: fetching after scene")
    after_scene = sentinel_service.fetch_scene_data(
        request.aoi,
        after_range,
        request.max_cloud_cover,
    )
    print(f"[Garuda Lens] analyze-area: after scene ready in {time.perf_counter() - after_started_at:.2f}s")

    target_shape = before_scene.red.shape
    after_scene.red = _resize_band(after_scene.red, target_shape)
    after_scene.green = _resize_band(after_scene.green, target_shape)
    after_scene.nir = _resize_band(after_scene.nir, target_shape)
    after_scene.rgb = _resize_rgb(after_scene.rgb, target_shape)
    after_scene.valid_mask = _resize_mask(after_scene.valid_mask, target_shape)

    before_scene.rgb = _resize_rgb(before_scene.rgb, target_shape)
    before_scene.valid_mask = _resize_mask(before_scene.valid_mask, target_shape)

    metrics_started_at = time.perf_counter()
    print("[Garuda Lens] analyze-area: computing indices and change metrics")
    ndvi_before = compute_ndvi(before_scene.nir, before_scene.red)
    ndvi_after = compute_ndvi(after_scene.nir, after_scene.red)
    ndwi_before = compute_ndwi(before_scene.green, before_scene.nir)
    ndwi_after = compute_ndwi(after_scene.green, after_scene.nir)
    valid_mask = before_scene.valid_mask & after_scene.valid_mask
    before_valid_percent = float(before_scene.valid_mask.mean() * 100.0)
    after_valid_percent = float(after_scene.valid_mask.mean() * 100.0)
    shared_valid_percent = float(valid_mask.mean() * 100.0)
    if min(before_valid_percent, after_valid_percent, shared_valid_percent) < MIN_VALID_COVERAGE:
        raise InsufficientEvidenceError(
            {
                "code": "insufficient_evidence",
                "message": "Valid AOI coverage is below the 70% comparison threshold.",
                "before_coverage_percent": round(before_valid_percent, 2),
                "after_coverage_percent": round(after_valid_percent, 2),
                "shared_coverage_percent": round(shared_valid_percent, 2),
                "remediation": "Try a wider date range, lower-cloud scenes, or a smaller AOI.",
            }
        )

    metrics, overlays = compute_change_metrics(
        ndvi_before=ndvi_before,
        ndvi_after=ndvi_after,
        ndwi_before=ndwi_before,
        ndwi_after=ndwi_after,
        rgb_before=before_scene.rgb,
        rgb_after=after_scene.rgb,
        valid_mask=valid_mask,
        vegetation_threshold=request.thresholds.vegetation,
        water_threshold=request.thresholds.water,
        urban_brightness_threshold=request.thresholds.urban_brightness,
    )
    metrics.valid_coverage_percent = round(shared_valid_percent, 2)
    warnings: list[str] = []
    before_period = (request.before.start.month, request.before.start.day, request.before.end.month, request.before.end.day)
    after_period = (request.after.start.month, request.after.start.day, request.after.end.month, request.after.end.day)
    if before_period != after_period:
        warnings.append("The selected scenes were acquired in different calendar periods; seasonal effects may influence signals.")
    if before_scene.cloud_cover > 10 or after_scene.cloud_cover > 10:
        warnings.append("Cloud cover is above 10% in at least one selected scene; inspect the previews before interpreting signals.")
    threshold_sensitivity = (
        request.thresholds.vegetation < 0.05
        or request.thresholds.water < 0.05
        or request.thresholds.urban_brightness > 100
    )
    if threshold_sensitivity:
        warnings.append("These threshold overrides make the signal unusually sensitive; review the masks before drawing conclusions.")
    recommendations: list[str] = []
    if not threshold_sensitivity or request.thresholds_acknowledged:
        if metrics.vegetation_change >= 20 and metrics.ndvi_delta < 0:
            recommendations.append("Likely agricultural stress signal; investigate vegetation and water conditions on site.")
        if metrics.urban_change >= 10:
            recommendations.append("Potential Urban Expansion (heuristic signal); investigate built-surface change with higher-resolution imagery.")
        if metrics.water_change >= 10:
            recommendations.append("Water signal changed materially; investigate drainage, flooding, or seasonal water variation.")
    if not recommendations and not threshold_sensitivity:
        recommendations.append("No obvious satellite signal requiring investigation; validate this screening result with local evidence.")
    print(f"[Garuda Lens] analyze-area: metrics ready in {time.perf_counter() - metrics_started_at:.2f}s")
    print(f"[Garuda Lens] analyze-area: complete in {time.perf_counter() - started_at:.2f}s")

    return AnalyzeAreaResponse(
        metrics=metrics,
        before_scene_id=before_scene.item.id,
        after_scene_id=after_scene.item.id,
        before_acquired=before_scene.item.properties.get("datetime", ""),
        after_acquired=after_scene.item.properties.get("datetime", ""),
        before_cloud_cover=before_scene.cloud_cover,
        after_cloud_cover=after_scene.cloud_cover,
        warnings=warnings,
        recommendations=recommendations,
        thresholds=request.thresholds,
        processing_version=PROCESSING_VERSION,
        before_preview_url=before_scene.preview_url,
        after_preview_url=after_scene.preview_url,
        vegetation_change_mask=overlays["vegetation"].round(4).tolist(),
        water_change_mask=overlays["water"].round(4).tolist(),
        urban_change_mask=overlays["urban"].round(2).tolist(),
    )


@router.post("/fetch-sentinel", response_model=FetchSentinelResponse)
def fetch_sentinel(request: AreaRequest) -> FetchSentinelResponse:
    try:
        before_range = _iso_date_range(request.before)
        after_range = _iso_date_range(request.after)
        before_scene = sentinel_service.search_best_scene(
            request.aoi, before_range[0], before_range[1], request.max_cloud_cover
        )
        after_scene = sentinel_service.search_best_scene(
            request.aoi, after_range[0], after_range[1], request.max_cloud_cover
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unable to fetch Sentinel scenes: {exc}") from exc

    before_preview = before_scene.assets.get("rendered_preview") or before_scene.assets.get("visual")
    after_preview = after_scene.assets.get("rendered_preview") or after_scene.assets.get("visual")

    return FetchSentinelResponse(
        before_scene_id=before_scene.id,
        after_scene_id=after_scene.id,
        before_preview_url=planetary_computer.sign(before_preview.href) if before_preview else None,
        after_preview_url=planetary_computer.sign(after_preview.href) if after_preview else None,
        before_acquired=before_scene.properties.get("datetime", ""),
        after_acquired=after_scene.properties.get("datetime", ""),
    )


@router.post("/analyze-area", response_model=AnalyzeAreaResponse)
def analyze_area(request: AreaRequest) -> AnalyzeAreaResponse:
    try:
        return _analyze(request)
    except InsufficientEvidenceError as exc:
        raise HTTPException(status_code=422, detail=exc.details) from exc
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/ndvi")
def get_ndvi(
    bbox: str = Query(..., description="minx,miny,maxx,maxy"),
    from_date: str = Query(...),
    to_date: str = Query(...),
    max_cloud_cover: float = Query(20.0, ge=0.0, le=100.0),
) -> dict[str, float]:
    try:
        aoi = _bbox_to_aoi(bbox)
        date_range = _iso_date_range(DateRange(start=from_date, end=to_date))
        scene = sentinel_service.fetch_scene_data(aoi, date_range, max_cloud_cover)
        ndvi = compute_ndvi(scene.nir, scene.red)
        return {
            "ndvi_mean": round(float(ndvi[scene.valid_mask].mean()) if scene.valid_mask.any() else 0.0, 4),
            "valid_pixels": int(scene.valid_mask.sum()),
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/change", response_model=ChangeMetrics)
def get_change(
    bbox: str = Query(..., description="minx,miny,maxx,maxy"),
    before_start: str = Query(...),
    before_end: str = Query(...),
    after_start: str = Query(...),
    after_end: str = Query(...),
    max_cloud_cover: float = Query(20.0, ge=0.0, le=100.0),
) -> ChangeMetrics:
    try:
        aoi = _bbox_to_aoi(bbox)
        request = AreaRequest(
            aoi=aoi,
            before={"start": before_start, "end": before_end},
            after={"start": after_start, "end": after_end},
            max_cloud_cover=max_cloud_cover,
        )
        return _analyze(request).metrics
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/ai-insights", response_model=AiInsightResponse)
async def post_ai_insights(payload: AiInsightInput) -> AiInsightResponse:
    try:
        answer = await ai_service.generate_insight(payload)
        return AiInsightResponse(answer=answer)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
