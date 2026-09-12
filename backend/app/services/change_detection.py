from __future__ import annotations

import cv2
import numpy as np

from app.models.schemas import ChangeMetrics


def _normalize_to_uint8(rgb: np.ndarray) -> np.ndarray:
    rgb = np.nan_to_num(rgb, nan=0.0, posinf=0.0, neginf=0.0)
    if rgb.dtype == np.uint8:
        return rgb
    rgb = rgb.astype(np.float32)
    # Sentinel-2 L2A reflectance is normally stored as integer values in the
    # 0..10000 range.  Keep a stable physical scale so the urban threshold is
    # meaningful across before/after images instead of scaling each image by
    # its own min/max and turning ordinary contrast into apparent change.
    scale = 10000.0 if float(np.nanmax(rgb)) > 1.5 else 1.0
    scaled = (rgb / scale * 255.0).clip(0, 255)
    return scaled.astype(np.uint8)


def detect_white_buildings(rgb_image: np.ndarray) -> np.ndarray:
    rgb_u8 = _normalize_to_uint8(rgb_image)
    hsv = cv2.cvtColor(rgb_u8, cv2.COLOR_RGB2HSV)
    lower = np.array([0, 0, 180], dtype=np.uint8)
    upper = np.array([180, 70, 255], dtype=np.uint8)
    return cv2.inRange(hsv, lower, upper) > 0


def compute_change_metrics(
    ndvi_before: np.ndarray,
    ndvi_after: np.ndarray,
    ndwi_before: np.ndarray,
    ndwi_after: np.ndarray,
    rgb_before: np.ndarray,
    rgb_after: np.ndarray,
    valid_mask: np.ndarray,
    vegetation_threshold: float = 0.18,
    water_threshold: float = 0.12,
    urban_brightness_threshold: float = 25.0,
    area_hectares: float | None = None,
) -> tuple[ChangeMetrics, dict[str, np.ndarray]]:
    ndvi_diff = np.nan_to_num(ndvi_after - ndvi_before, nan=0.0)
    ndwi_diff = np.nan_to_num(ndwi_after - ndwi_before, nan=0.0)

    veg_change_mask = (np.abs(ndvi_diff) >= vegetation_threshold) & valid_mask
    water_change_mask = (np.abs(ndwi_diff) >= water_threshold) & valid_mask

    rgb_before_f = _normalize_to_uint8(rgb_before).astype(np.float32)
    rgb_after_f = _normalize_to_uint8(rgb_after).astype(np.float32)
    brightness_before = rgb_before_f.mean(axis=2)
    brightness_after = rgb_after_f.mean(axis=2)
    brightness_delta = brightness_after - brightness_before

    white_before = detect_white_buildings(rgb_before)
    white_after = detect_white_buildings(rgb_after)
    urban_change_mask = (
        ((brightness_delta >= urban_brightness_threshold) | (white_after & ~white_before)) & valid_mask
    )

    combined_mask = veg_change_mask | water_change_mask | urban_change_mask
    valid_pixels = int(np.count_nonzero(valid_mask))

    def ratio(mask: np.ndarray) -> float:
        if valid_pixels == 0:
            return 0.0
        return float(np.count_nonzero(mask) / valid_pixels * 100.0)

    total_change = ratio(combined_mask)
    vegetation_change = ratio(veg_change_mask)
    water_change = ratio(water_change_mask)
    urban_change = ratio(urban_change_mask)
    change_intensity = float(np.mean(np.abs(ndvi_diff[valid_mask]))) if valid_pixels else 0.0

    metrics = ChangeMetrics(
        total_change=round(total_change, 2),
        vegetation_change=round(vegetation_change, 2),
        urban_change=round(urban_change, 2),
        water_change=round(water_change, 2),
        change_intensity=round(change_intensity, 4),
        valid_pixels=valid_pixels,
        ndvi_before_mean=round(float(np.mean(ndvi_before[valid_mask])) if valid_pixels else 0.0, 4),
        ndvi_after_mean=round(float(np.mean(ndvi_after[valid_mask])) if valid_pixels else 0.0, 4),
        ndwi_before_mean=round(float(np.mean(ndwi_before[valid_mask])) if valid_pixels else 0.0, 4),
        ndwi_after_mean=round(float(np.mean(ndwi_after[valid_mask])) if valid_pixels else 0.0, 4),
        ndvi_delta=round(float(np.mean(ndvi_after[valid_mask] - ndvi_before[valid_mask])) if valid_pixels else 0.0, 4),
        ndwi_delta=round(float(np.mean(ndwi_after[valid_mask] - ndwi_before[valid_mask])) if valid_pixels else 0.0, 4),
        valid_coverage_percent=0.0,
        area_hectares=round(area_hectares if area_hectares is not None else valid_pixels * 0.01, 2),
    )

    overlays = {
        "vegetation": np.where(veg_change_mask, np.abs(ndvi_diff), 0.0),
        "water": np.where(water_change_mask, np.abs(ndwi_diff), 0.0),
        "urban": np.where(urban_change_mask, brightness_delta.clip(min=0.0), 0.0),
    }
    return metrics, overlays
