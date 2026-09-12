from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from affine import Affine
import cv2
import numpy as np
import planetary_computer
import rasterio
import time
from pystac import Item
from pystac_client import Client
from pyproj import Transformer
from rasterio.features import geometry_mask
from rasterio.enums import Resampling
from rasterio.windows import from_bounds
from shapely.geometry import shape, mapping
from shapely.ops import transform

from app.core.config import settings


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
        # Do not contact the remote STAC catalog while importing the API.  This
        # keeps local routes such as /health and /docs available when the data
        # provider is temporarily unavailable, and lets request handling return
        # a useful upstream-service error instead.
        self._client: Client | None = None

    @property
    def client(self) -> Client:
        if self._client is None:
            self._client = Client.open(
                settings.planetary_computer_stac_url,
                modifier=planetary_computer.sign_inplace,
            )
        return self._client

    @staticmethod
    def _project_geometry(geometry: dict[str, Any], destination_crs: Any) -> dict[str, Any]:
        if destination_crs is None:
            return geometry
        transformer = Transformer.from_crs("EPSG:4326", destination_crs, always_xy=True)
        projected = transform(transformer.transform, shape(geometry))
        return mapping(projected)

    def search_best_scene(self, aoi: dict[str, Any], start_date: str, end_date: str, max_cloud_cover: float) -> Item:
        started_at = time.perf_counter()
        search = self.client.search(
            collections=[settings.sentinel_collection],
            intersects=aoi,
            datetime=f"{start_date}/{end_date}",
            query={"eo:cloud_cover": {"lt": max_cloud_cover}},
        )
        items = list(search.items())
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
        print(
            f"[Garuda Lens] STAC search {start_date} to {end_date}: "
            f"{len(items)} items, selected {items[0].id} in {time.perf_counter() - started_at:.2f}s"
        )
        return items[0]

    def _clip_asset(
        self,
        item: Item,
        asset_name: str,
        geometry: dict[str, Any],
        target_shape: tuple[int, int] | None = None,
    ) -> np.ndarray:
        href = planetary_computer.sign(item.assets[asset_name].href)
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
        print(f"[Garuda Lens] {item.id}: red band in {time.perf_counter() - red_started_at:.2f}s")

        green_started_at = time.perf_counter()
        green = self._clip_asset(item, "B03", aoi, red.shape)
        print(f"[Garuda Lens] {item.id}: green band in {time.perf_counter() - green_started_at:.2f}s")

        nir_started_at = time.perf_counter()
        nir = self._clip_asset(item, "B08", aoi, red.shape)
        print(f"[Garuda Lens] {item.id}: nir band in {time.perf_counter() - nir_started_at:.2f}s")

        rgb_started_at = time.perf_counter()
        rgb = self._clip_rgb(item, aoi, red.shape)
        print(f"[Garuda Lens] {item.id}: rgb preview in {time.perf_counter() - rgb_started_at:.2f}s")

        valid_mask = (red > 0) & (green > 0) & (nir > 0)
        preview_asset = item.assets.get("rendered_preview") or item.assets.get("visual")
        print(f"[Garuda Lens] {item.id}: scene fetch complete in {time.perf_counter() - started_at:.2f}s")
        return SceneData(
            item=item,
            red=red,
            green=green,
            nir=nir,
            rgb=rgb,
            valid_mask=valid_mask,
            preview_url=planetary_computer.sign(preview_asset.href) if preview_asset else None,
            cloud_cover=float(item.properties.get("eo:cloud_cover", 100.0)),
            acquired=item.properties.get("datetime", ""),
        )
