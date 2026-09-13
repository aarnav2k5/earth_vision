from __future__ import annotations

import asyncio
import requests

from app.core.config import settings
from app.models.schemas import AiInsightInput


class GroqInsightService:
    def __init__(self) -> None:
        configured_key = settings.groq_api_key.strip()
        self.enabled = bool(configured_key and configured_key != "your_groq_api_key_here")
        self.api_key = configured_key

    async def generate_insight(self, payload: AiInsightInput) -> str:
        if not self.enabled:
            return "Groq API key is not configured. Add GROQ_API_KEY to backend/.env to enable AI insights."

        user_question = payload.question or "Provide a balanced site assessment."
        prompt = f"""
You are answering a site-specific land-use question for a user.

Use only these metrics as evidence:
- NDVI before mean: {payload.ndvi_before_mean}
- NDVI after mean: {payload.ndvi_after_mean}
- NDVI delta: {payload.ndvi_delta}
- NDWI before mean: {payload.ndwi_before_mean}
- NDWI after mean: {payload.ndwi_after_mean}
- NDWI delta: {payload.ndwi_delta}
- Latest NDVI mean: {payload.NDVI_mean}
- Vegetation change: {payload.vegetation_change}%
- Urban change: {payload.urban_change}%
- Water change: {payload.water_change}%
- Change intensity: {payload.change_intensity}
- Valid AOI coverage: {payload.valid_coverage_percent}%
- Approximate AOI area: {payload.area_hectares} hectares
- Before scene date: {payload.before_acquired}; cloud cover: {payload.before_cloud_cover}%
- After scene date: {payload.after_acquired}; cloud cover: {payload.after_cloud_cover}%
- Before scene ID: {payload.before_scene_id}
- After scene ID: {payload.after_scene_id}
- Processing version: {payload.processing_version}
- OpenCV image difference: {payload.opencv_change_percent}% of valid pixels across {payload.opencv_change_regions} detected regions
- Detection thresholds: vegetation {payload.thresholds.vegetation}, water {payload.thresholds.water}, urban brightness {payload.thresholds.urban_brightness}
- Deterministic recommendations: {payload.recommendations}
- Warnings: {payload.warnings}

User question:
{user_question}

Instructions:
- Explain only the supplied metrics, deterministic recommendations, and warnings.
- If the user asks for suitability, legality, profitability, causation, or professional advice, state that these cannot be determined from this screening analysis.
- Do not introduce new recommendations, facts, causes, or independent image interpretations.
- Do not introduce unrelated topics, trivia, politics, or facts outside the site analysis.
- If warnings are present, include the relevant limitation in one short sentence.
- Keep the response concise, practical, and grounded in the supplied values.

Preferred format:
- Verdict: one short answer
- Why: 2 to 4 bullet points tied to the metrics
- Caution: one short sentence
""".strip()

        instructions = (
            "You are a careful geospatial land-use analyst. "
            "Answer only using the supplied metrics, recommendations, and warnings. "
            "Never add unrelated information or make professional, legal, causal, or suitability claims."
        )

        if not self.api_key:
            return "Groq API key is not configured. Add GROQ_API_KEY to backend/.env to enable AI insights."

        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    self._request_groq,
                    instructions,
                    prompt,
                ),
                timeout=20.0,
            )
        except asyncio.TimeoutError:
            return "Groq request timed out. Check backend internet access and try again."
        except requests.exceptions.Timeout:
            return "Groq request timed out. Check backend internet access and try again."
        except requests.exceptions.HTTPError as exc:
            if exc.response is not None and exc.response.status_code in {401, 403}:
                return (
                    "Groq authentication failed. Check that GROQ_API_KEY in backend/.env is a valid Groq API key, "
                    "then restart the backend."
                )
            detail = exc.response.text[:300] if exc.response is not None else str(exc)
            return f"Groq request failed: {detail}"
        except requests.exceptions.RequestException as exc:
            return f"Groq request failed: {exc}"

        answer = response.get("choices", [{}])[0].get("message", {}).get("content")
        return (answer or "No AI insight was returned.").strip()

    def _request_groq(self, instructions: str, prompt: str) -> dict:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                # This avoids the hanging HTTP/2/proxy path used by the OpenAI client.
                "Connection": "close",
                "Expect": "",
            },
            json={
                "model": settings.groq_model,
                "messages": [
                    {"role": "system", "content": instructions},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.2,
                "reasoning_effort": "low",
                "max_tokens": 500,
            },
            timeout=(5.0, 15.0),
        )
        response.raise_for_status()
        return response.json()
