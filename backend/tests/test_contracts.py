"""Fast, provider-independent API regression checks.

Run with: python -m unittest discover -s tests -p 'test_*.py'
"""

from datetime import datetime, timezone
import unittest

import numpy as np
from fastapi.testclient import TestClient
from pystac import Item

from app.api import routes
from app.main import app
from app.services.stac_service import SceneData


class FakeSentinelService:
    def __init__(self, valid: bool = True) -> None:
        self.valid = valid
        self.before = Item("before", None, None, datetime(2023, 3, 1, tzinfo=timezone.utc), {"eo:cloud_cover": 4.0})
        self.after = Item("after", None, None, datetime(2024, 3, 1, tzinfo=timezone.utc), {"eo:cloud_cover": 6.0})

    def fetch_scene_data(self, _aoi: dict, date_range: tuple[str, str], _cloud: float) -> SceneData:
        item = self.before if date_range[0].startswith("2023") else self.after
        red = np.full((8, 8), 1000, dtype=np.float32)
        green = np.full((8, 8), 1200, dtype=np.float32)
        nir = np.full((8, 8), 1800 if item is self.before else 2200, dtype=np.float32)
        mask = np.ones((8, 8), dtype=bool) if self.valid else np.zeros((8, 8), dtype=bool)
        return SceneData(item, red, green, nir, np.stack([red, green, red], axis=2), mask, None, item.properties["eo:cloud_cover"], item.datetime.isoformat())


PAYLOAD = {
    "aoi": {"type": "Polygon", "coordinates": [[[73.73, 18.58], [73.735, 18.58], [73.735, 18.585], [73.73, 18.585], [73.73, 18.58]]]},
    "before": {"start": "2023-01-01", "end": "2023-06-30"},
    "after": {"start": "2024-01-01", "end": "2024-06-30"},
    "max_cloud_cover": 30,
    "thresholds": {"vegetation": 0.18, "water": 0.12, "urban_brightness": 25},
}


class ApiContractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)
        self.original = routes.sentinel_service

    def tearDown(self) -> None:
        routes.sentinel_service = self.original

    def test_health_and_analysis_contract(self) -> None:
        routes.sentinel_service = FakeSentinelService()
        self.assertEqual(self.client.get("/health").status_code, 200)
        response = self.client.post("/analyze-area", json=PAYLOAD)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["metrics"]["valid_pixels"], 64)

    def test_insufficient_evidence_fails_closed(self) -> None:
        routes.sentinel_service = FakeSentinelService(valid=False)
        response = self.client.post("/analyze-area", json=PAYLOAD)
        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["detail"]["code"], "insufficient_evidence")

    def test_invalid_aoi_is_rejected(self) -> None:
        invalid = {**PAYLOAD, "aoi": {"type": "Point", "coordinates": [73.7, 18.5]}}
        self.assertEqual(self.client.post("/analyze-area", json=invalid).status_code, 422)
