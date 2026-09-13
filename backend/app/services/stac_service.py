from __future__ import annotations

from dataclasses import dataclass
import base64
import logging
from typing import Any
from urllib.parse import parse_qs, urlparse

from affine import Affine
import cv2
import numpy as np
from planetary_computer import sas
import rasterio
import requests
import time
from pystac import Item
from pyproj import Transformer
from rasterio.features import geometry_mask
from rasterio.enums import Resampling
from rasterio.windows import from_bounds
from shapely.geometry import shape, mapping
from shapely.ops import transform

from app.core.config import settings


_TOKEN_CACHE: dict[str, sas.SASToken] = {}
logger = logging.getLogger(__name__)


def _aoi_preview_data_url(rgb: np.ndarray) -> str:
    """Encode only the AOI-clipped RGB array for the browser preview."""
    values = np.nan_to_num(rgb, nan=0.0, posinf=0.0, neginf=0.0).astype(np.float32)
    scale = 10000.0 if (values.size and float(values.max()) > 1.5) else 1.0
    image = np.clip(values / scale * 255.0, 0, 255).astype(np.uint8)
    success, encoded = cv2.imencode(".jpg", cv2.cvtColor(image, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 88])
    if not success:
        raise ValueError("Unable to encode the AOI preview image.")
    return f"data:image/jpeg;base64,{base64.b64encode(encoded.tobytes()).decode('ascii')}"


def _sign_url_with_timeout(url: str) -> str:
    """Sign Planetary Computer blob URLs without the SDK's unbounded request."""
    parsed = urlparse(url.rstrip("/"))
    if not parsed.netloc.endswith(sas.BLOB_STORAGE_DOMAIN):
        return url
    if parsed.netloc == "ai4edatasetspublicassets.blob.core.windows.net":
        return url
    if set(parse_qs(parsed.query)) & {"st", "se", "sp"}:
        return url

    account, container = sas.parse_blob_url(parsed)
    token_url = f"{sas.Settings.get().sas_url}/{account}/{container}"
    token = _TOKEN_CACHE.get(token_url)
    if token is None or token.ttl() < 60:
        pc_settings = sas.Settings.get()
        response = requests.get(
            token_url,
            headers=(
                {"Ocp-Apim-Subscription-Key": pc_settings.subscription_key}
                if pc_settings.subscription_key
                else None
            ),
            timeout=(5.0, 20.0),
        )
        response.raise_for_status()
        token = sas.SASToken(**response.json())
        _TOKEN_CACHE[token_url] = token
    return token.sign(url).href


@dataclass
class SceneData:
    item: Item
    red: np.ndarray
    green: np.ndarray
    nir: np.ndarray
    rgb: np.ndarray
    valid_mask: np.ndarray
    preview_url: str | None
    cloud_cover: float
    acquired: str


class SentinelService:
    max_read_size = 256

    def __init__(self) -> None:
        # Remote catalog and asset access are performed per request with explicit
        # timeouts so local routes remain available when the provider is down.
        pass

    @staticmethod
    def _project_geometry(geometry: dict[str, Any], destination_crs: Any) -> dict[str, Any]:
        if destination_crs is None:
            return geometry
        transformer = Transformer.from_crs("EPSG:4326", destination_crs, always_xy=True)
        projected = transform(transformer.transform, shape(geometry))
        return mapping(projected)

    def search_best_scene(self, aoi: dict[str, Any], start_date: str, end_date: str, max_cloud_cover: float) -> Item:
        started_at = time.perf_counter()
        response = requests.post(
            f"{settings.planetary_computer_stac_url.rstrip('/')}/search",
            json={
                "collections": [settings.sentinel_collection],
                "intersects": aoi,
                "datetime": f"{start_date}/{end_date}",
                "query": {"eo:cloud_cover": {"lt": max_cloud_cover}},
                "limit": 100,
            },
            timeout=(5.0, 25.0),
        )
        response.raise_for_status()
        features = response.json().get("features", [])
        items = [Item.from_dict(feature) for feature in features]
        if not items:
            raise ValueError("No Sentinel-2 scenes found for the selected area and date range.")
        required_assets = {"B02", "B03", "B04", "B08"}
        items = [item for item in items if required_assets.issubset(item.assets)]
        if not items:
            raise ValueError("Sentinel scenes were found, but none contain the required analysis bands.")
        items.sort(
            key=lambda item: (
                float(item.properties.get("eo:cloud_cover", 100.0)),
                item.properties.get("datetime", ""),
            )
        )
        logger.info(
            "STAC search %s to %s: %s items, selected %s in %.2fs",
            start_date, end_date, len(items), items[0].id, time.perf_counter() - started_at,
        )
        return items[0]

    def _clip_asset(
        self,
        item: Item,
        asset_name: str,
        geometry: dict[str, Any],
        target_shape: tuple[int, int] | None = None,
    ) -> np.ndarray:
        href = _sign_url_with_timeout(item.assets[asset_name].href)
        with rasterio.Env(
            GDAL_HTTP_CONNECTTIMEOUT="10",
            GDAL_HTTP_TIMEOUT="30",
            GDAL_HTTP_MAX_RETRY="2",
            GDAL_HTTP_RETRY_DELAY="1",
            GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR",
            CPL_VSIL_CURL_USE_HEAD="NO",
            CPL_VSIL_CURL_NON_CACHED="YES",
        ):
            with rasterio.open(href) as src:
                projected_geometry = self._project_geometry(geometry, src.crs)
                projected_shape = shape(projected_geometry)
                minx, miny, maxx, maxy = projected_shape.bounds
                window = from_bounds(minx, miny, maxx, maxy, src.transform)
                window = window.round_offsets().round_lengths()

                native_height = max(1, int(window.height))
                native_width = max(1, int(window.width))
                if target_shape:
                    out_height, out_width = target_shape
                else:
                    scale = min(1.0, self.max_read_size / max(native_height, native_width))
                    out_height = max(1, int(native_height * scale))
                    out_width = max(1, int(native_width * scale))

                band = src.read(
                    1,
                    window=window,
                    out_shape=(out_height, out_width),
                    resampling=Resampling.bilinear,
                    masked=False,
                ).astype(np.float32)

                window_transform = src.window_transform(window)
                out_transform = window_transform * Affine.scale(window.width / out_width, window.height / out_height)
                inside_mask = geometry_mask(
                    [projected_geometry],
                    transform=out_transform,
                    invert=True,
                    out_shape=(out_height, out_width),
                )
                band = np.where(inside_mask, band, 0.0)
        return band.astype(np.float32)

    def _clip_rgb(self, item: Item, geometry: dict[str, Any], target_shape: tuple[int, int]) -> np.ndarray:
        red = self._clip_asset(item, "B04", geometry, target_shape)
        green = self._clip_asset(item, "B03", geometry, target_shape)
        blue = self._clip_asset(item, "B02", geometry, target_shape)
        return np.stack([red, green, blue], axis=2).astype(np.float32)

    def fetch_scene_data(self, aoi: dict[str, Any], date_range: tuple[str, str], max_cloud_cover: float) -> SceneData:
        started_at = time.perf_counter()
        item = self.search_best_scene(aoi, date_range[0], date_range[1], max_cloud_cover)

        red_started_at = time.perf_counter()
        red = self._clip_asset(item, "B04", aoi)
        logger.info("%s: red band in %.2fs", item.id, time.perf_counter() - red_started_at)

        green_started_at = time.perf_counter()
        green = self._clip_asset(item, "B03", aoi, red.shape)
        logger.info("%s: green band in %.2fs", item.id, time.perf_counter() - green_started_at)

        nir_started_at = time.perf_counter()
        nir = self._clip_asset(item, "B08", aoi, red.shape)
        logger.info("%s: nir band in %.2fs", item.id, time.perf_counter() - nir_started_at)

        rgb_started_at = time.perf_counter()
        rgb = self._clip_rgb(item, aoi, red.shape)
        logger.info("%s: rgb preview in %.2fs", item.id, time.perf_counter() - rgb_started_at)

        valid_mask = (red > 0) & (green > 0) & (nir > 0)
        logger.info("%s: scene fetch complete in %.2fs", item.id, time.perf_counter() - started_at)
        return SceneData(
            item=item,
            red=red,
            green=green,
            nir=nir,
            rgb=rgb,
            valid_mask=valid_mask,
            preview_url=_aoi_preview_data_url(rgb),
            cloud_cover=float(item.properties.get("eo:cloud_cover", 100.0)),
            acquired=item.properties.get("datetime", ""),
        )
