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

    @staticmethod
    def _ensure_actionable_format(answer: str, question: str) -> str:
        """Keep model responses decisive even when the provider ignores formatting."""
        normalized = answer.lower()
        has_decision_heading = any(marker in normalized for marker in ("conclusion:", "verdict:", "decision:"))
        has_explicit_decision = any(marker in normalized for marker in ("yes", "no", "conditional"))
        if has_decision_heading and has_explicit_decision:
            return answer.strip()
        question_is_decision = any(
            term in question.lower()
            for term in ("should i", "buy a house", "buy property", "profitable", "should we", "is it safe")
        )
        if question_is_decision:
            conclusion = "No — this satellite screening alone is not sufficient evidence to recommend that decision."
        else:
            conclusion = "The available satellite evidence supports targeted follow-up, not a definitive decision."
        return f"Conclusion: {conclusion}\n\nReasoning:\n{answer.strip()}"

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
- Always start with exactly one explicit decision line: `Conclusion: Yes`, `Conclusion: No`, or `Conclusion: Conditional`.
- If the user asks whether to buy a house, whether farming is profitable, or any other suitability/profitability question, do not answer with a vague refusal. Give `Conclusion: No — insufficient evidence to recommend this decision from satellite screening alone`, then explain the metric-based reasons and the additional evidence required.
- If the supplied metrics support a lower-risk interpretation, use `Conclusion: Conditional` and state the conditions that must be verified; never present it as approval, safety, legality, or guaranteed profitability.
- If the user asks about legality, causation, or professional advice, clearly say that this screening cannot establish it while still giving the most useful metric-based conclusion.
- Do not introduce new recommendations, facts, causes, or independent image interpretations.
- Do not introduce unrelated topics, trivia, politics, or facts outside the site analysis.
- If warnings are present, include the relevant limitation in one short sentence.
- Keep the response concise, practical, and grounded in the supplied values.

Preferred format:
- Conclusion: Yes / No / Conditional — one direct answer
- Reasoning: 2 to 4 bullet points tied to exact supplied metrics
- Recommendation: practical next checks based only on the supplied warnings and deterministic recommendations
- Limitation: one short sentence explaining what satellite screening cannot prove
""".strip()

        instructions = (
            "You are a careful geospatial land-use analyst. "
            "Answer only using the supplied metrics, recommendations, and warnings. "
            "Always provide a clearly labeled Conclusion, Reasoning, Recommendation, and Limitation. "
            "Never leave the user with an unqualified or unexplained answer. "
            "Never add unrelated information or make professional, legal, causal, safety, or profitability guarantees."
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
        return self._ensure_actionable_format(answer or "No AI insight was returned.", user_question)

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
