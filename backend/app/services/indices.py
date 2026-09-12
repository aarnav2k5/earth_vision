from __future__ import annotations

import numpy as np


def safe_normalized_difference(numerator: np.ndarray, denominator: np.ndarray) -> np.ndarray:
    result = np.zeros_like(numerator, dtype=np.float32)
    valid = denominator != 0
    result[valid] = numerator[valid] / denominator[valid]
    result[~np.isfinite(result)] = 0.0
    return result


def compute_ndvi(nir_band: np.ndarray, red_band: np.ndarray) -> np.ndarray:
    numerator = nir_band.astype(np.float32) - red_band.astype(np.float32)
    denominator = nir_band.astype(np.float32) + red_band.astype(np.float32)
    return safe_normalized_difference(numerator, denominator)


def compute_ndwi(green_band: np.ndarray, nir_band: np.ndarray) -> np.ndarray:
    numerator = green_band.astype(np.float32) - nir_band.astype(np.float32)
    denominator = green_band.astype(np.float32) + nir_band.astype(np.float32)
    return safe_normalized_difference(numerator, denominator)
