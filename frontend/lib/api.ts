import type { AiInsightPayload, AnalyzeResponse, AreaRequest, FetchSentinelResponse } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The request timed out. Try a smaller AOI, wider date range, or lower cloud limit.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const fallback = `Request failed with status ${response.status}`;
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = (await response.json().catch(() => null)) as { detail?: unknown } | null;
      if (typeof body?.detail === "string") {
        throw new Error(body.detail);
      }
      if (body?.detail && typeof body.detail === "object" && "message" in body.detail && typeof body.detail.message === "string") {
        const detail = body.detail as { message: string; remediation?: unknown };
        throw new Error(`${detail.message} ${typeof detail.remediation === "string" ? detail.remediation : ""}`.trim());
      }
      if (Array.isArray(body?.detail)) {
        throw new Error(body.detail.map((item) => (typeof item === "string" ? item : JSON.stringify(item))).join("; "));
      }
    }

    const error = await response.text().catch(() => "");
    throw new Error(error || fallback);
  }
  return response.json() as Promise<T>;
}

export async function fetchSentinel(payload: AreaRequest) {
  const response = await request(`${API_URL}/fetch-sentinel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }, 60_000);
  return handleResponse<FetchSentinelResponse>(response);
}

export async function analyzeArea(payload: AreaRequest) {
  const response = await request(`${API_URL}/analyze-area`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }, 180_000);
  return handleResponse<AnalyzeResponse>(response);
}

export async function fetchAiInsights(payload: AiInsightPayload) {
  const response = await request(`${API_URL}/ai-insights`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }, 45_000);
  return handleResponse<{ answer: string }>(response);
}
