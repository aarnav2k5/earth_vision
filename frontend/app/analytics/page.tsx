"use client";

import Link from "next/link";

import { AnalyticsCharts } from "@/components/analytics-charts";
import { AnalysisExports } from "@/components/analysis-exports";
import { MetricCard } from "@/components/metric-card";
import { SignalMaskPreview } from "@/components/signal-mask-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent } from "@/lib/utils";
import { useGarudaStore } from "@/store/use-garuda-store";

export default function AnalyticsPage() {
  const analysis = useGarudaStore((state) => state.analysis);
  const manifest = useGarudaStore((state) => state.manifest);
  const metrics = analysis?.metrics ?? null;

  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>No Analysis Loaded</CardTitle>
            <CardDescription>
              Run an AOI analysis from the map workflow first. The latest metrics will stay available here after navigation.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/map-view">Go To Map View</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-4">
        <MetricCard
          title="Total Change"
          value={formatPercent(metrics?.total_change ?? 0)}
          description="Combined share of AOI pixels with material vegetation, urban, or water change."
        />
        <MetricCard
          title="Vegetation"
          value={formatPercent(metrics?.vegetation_change ?? 0)}
          description="Change derived from NDVI deltas across the selected time windows."
        />
        <MetricCard
          title="Urban Expansion"
          value={formatPercent(metrics?.urban_change ?? 0)}
          description="Heuristic bright built-surface change signal; not proof of buildings or urbanization."
        />
        <MetricCard
          title="Water"
          value={formatPercent(metrics?.water_change ?? 0)}
          description="Difference in surface water signature based on NDWI movement."
        />
      </div>
      <AnalyticsCharts metrics={metrics} />
      {analysis ? <SignalMaskPreview masks={[{ name: "Vegetation", values: analysis.vegetation_change_mask, color: "#9fc37f" }, { name: "Water", values: analysis.water_change_mask, color: "#4ea3d8" }, { name: "Urban Expansion", values: analysis.urban_change_mask, color: "#e6a84a" }]} /> : null}
      {manifest ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recommendations and warnings</CardTitle>
              <CardDescription>Deterministic screening outputs grounded in the selected scenes and thresholds.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {manifest.recommendations.map((recommendation) => <div key={recommendation} className="rounded-2xl bg-secondary/70 p-4 text-sm">{recommendation}</div>)}
            {manifest.warnings.map((warning) => <div key={warning} className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">{warning}</div>)}
            <details className="rounded-2xl border border-border p-4 text-sm">
              <summary className="cursor-pointer font-medium">Technical details</summary>
              <p className="mt-3 text-muted">Analysis {manifest.analysis_id} · Processing {manifest.processing_version} · Valid coverage {metrics.valid_coverage_percent}% · Approximate area {metrics.area_hectares} hectares · Thresholds: vegetation {manifest.thresholds.vegetation}, water {manifest.thresholds.water}, urban brightness {manifest.thresholds.urban_brightness}.</p>
            </details>
          </CardContent>
        </Card>
      ) : null}
      <AnalysisExports />
    </div>
  );
}
