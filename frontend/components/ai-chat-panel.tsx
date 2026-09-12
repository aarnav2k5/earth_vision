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
        vegetation_change: analysis.metrics.vegetation_change,
        urban_change: analysis.metrics.urban_change,
        water_change: analysis.metrics.water_change,
        change_intensity: analysis.metrics.change_intensity,
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
              className="rounded-full border border-border bg-white/70 px-3 py-1 text-sm text-foreground hover:bg-white"
            >
              {item}
            </button>
          ))}
        </div>
        <Textarea value={question} onChange={(event) => setQuestion(event.target.value)} />
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Thinking..." : "Generate insight"}
        </Button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="min-h-[240px] whitespace-pre-line rounded-[28px] border border-border bg-white/75 p-4 text-sm leading-7 text-foreground">
          {answer || "Your AI assessment will appear here once a site has been analyzed."}
        </div>
      </CardContent>
    </Card>
  );
}
