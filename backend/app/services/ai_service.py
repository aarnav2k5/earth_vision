from __future__ import annotations

import asyncio

from openai import OpenAI
from openai import AuthenticationError
from openai import OpenAIError

from app.core.config import settings
from app.models.schemas import AiInsightInput


class GroqInsightService:
    def __init__(self) -> None:
        self.client = (
            OpenAI(
                api_key=settings.groq_api_key,
                base_url="https://api.groq.com/openai/v1",
            )
            if settings.groq_api_key
            else None
        )

    async def generate_insight(self, payload: AiInsightInput) -> str:
        if not settings.groq_api_key:
            return "Groq API key is not configured. Add GROQ_API_KEY to backend/.env to enable AI insights."

        user_question = payload.question or "Provide a balanced site assessment."
        prompt = f"""
You are answering a site-specific land-use question for a user.

Use only these metrics as evidence:
- NDVI mean: {payload.NDVI_mean}
- Vegetation change: {payload.vegetation_change}%
- Urban change: {payload.urban_change}%
- Water change: {payload.water_change}%
- Change intensity: {payload.change_intensity}
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

        if self.client is None:
            return "Groq API key is not configured. Add GROQ_API_KEY to backend/.env to enable AI insights."

        try:
            response = await asyncio.to_thread(
                self.client.chat.completions.create,
                model=settings.groq_model,
                messages=[
                    {"role": "system", "content": instructions},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
            )
        except AuthenticationError:
            return (
                "Groq authentication failed. Check that GROQ_API_KEY in backend/.env is a valid Groq API key, "
                "then restart the backend."
            )
        except OpenAIError as exc:
            return f"Groq request failed: {exc}"

        answer = response.choices[0].message.content if response.choices else None
        return (answer or "No AI insight was returned.").strip()
