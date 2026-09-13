"use client";

import { useState } from "react";

import { fetchAiInsights } from "@/lib/api";
import { useGarudaStore } from "@/store/use-garuda-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const quickQuestions = ["Should I buy a house here?", "Is farming profitable here?", "What is the environmental risk?"];

export function AiChatPanel() {
  const analysis = useGarudaStore((state) => state.analysis);
  const [question, setQuestion] = useState(quickQuestions[0]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!analysis) {
      setError("Run a land-use analysis first from the map page.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await fetchAiInsights({
        NDVI_mean: analysis.metrics.ndvi_after_mean,
        ndvi_before_mean: analysis.metrics.ndvi_before_mean,
        ndvi_after_mean: analysis.metrics.ndvi_after_mean,
        ndvi_delta: analysis.metrics.ndvi_delta,
        ndwi_before_mean: analysis.metrics.ndwi_before_mean,
        ndwi_after_mean: analysis.metrics.ndwi_after_mean,
        ndwi_delta: analysis.metrics.ndwi_delta,
        vegetation_change: analysis.metrics.vegetation_change,
        urban_change: analysis.metrics.urban_change,
        water_change: analysis.metrics.water_change,
        change_intensity: analysis.metrics.change_intensity,
        valid_coverage_percent: analysis.metrics.valid_coverage_percent,
        area_hectares: analysis.metrics.area_hectares,
        before_acquired: analysis.before_acquired,
        after_acquired: analysis.after_acquired,
        before_cloud_cover: analysis.before_cloud_cover,
        after_cloud_cover: analysis.after_cloud_cover,
        before_scene_id: analysis.before_scene_id,
        after_scene_id: analysis.after_scene_id,
        processing_version: analysis.processing_version,
        opencv_change_percent: analysis.metrics.opencv_change_percent,
        opencv_change_regions: analysis.metrics.opencv_change_regions,
        thresholds: analysis.thresholds,
        question,
        recommendations: analysis.recommendations,
        warnings: analysis.warnings,
      });
      setAnswer(result.answer);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Failed to fetch AI insights.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div>
          <CardTitle>Local Advisory Chat</CardTitle>
          <CardDescription>Ask planning and land-use questions based on the latest Earth Vision metrics.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {quickQuestions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setQuestion(item)}
              className="rounded-full border border-white/15 bg-[#172131] px-3 py-2 text-sm text-slate-100 hover:bg-[#233149]"
            >
              {item}
            </button>
          ))}
        </div>
        <Textarea value={question} onChange={(event) => setQuestion(event.target.value)} />
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Thinking..." : "Generate insight"}
        </Button>
        {analysis ? <details className="rounded-2xl border border-white/15 bg-[#121923] p-3 text-xs text-slate-200">
          <summary className="cursor-pointer font-medium text-white">What is sent to Groq?</summary>
          <p className="mt-2 leading-5 text-slate-300">Only this typed follow-up question and the latest server-generated analysis context are sent: scene IDs and processing version, before/after acquisition dates and cloud cover, before/after NDVI and NDWI means/deltas, vegetation/urban/water percentages, OpenCV image-difference coverage and region count, change intensity, valid AOI coverage, approximate area, thresholds, deterministic recommendations, and warnings. Raw image bytes, preview URLs, masks, and AOI geometry are not sent to the text model.</p>
        </details> : null}
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <div className="min-h-[240px] whitespace-pre-line rounded-[28px] border border-white/15 bg-[#121923] p-4 text-sm leading-7 text-slate-100">
          {answer || "Your AI assessment will appear here once a site has been analyzed."}
        </div>
      </CardContent>
    </Card>
  );
}
