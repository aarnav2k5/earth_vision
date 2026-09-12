"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGarudaStore } from "@/store/use-garuda-store";

function csvCell(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function AnalysisExports() {
  const manifest = useGarudaStore((state) => state.manifest);
  const [acknowledged, setAcknowledged] = useState(false);
  const [message, setMessage] = useState("");

  if (!manifest) {
    return null;
  }

  const downloadCsv = () => {
    const rows = [
      ["field", "value"],
      ["analysis_id", manifest.analysis_id],
      ["processing_version", manifest.processing_version],
      ["before_scene_id", manifest.before_scene_id],
      ["after_scene_id", manifest.after_scene_id],
      ["before_acquired", manifest.before_acquired],
      ["after_acquired", manifest.after_acquired],
      ["before_cloud_cover_percent", manifest.before_cloud_cover],
      ["after_cloud_cover_percent", manifest.after_cloud_cover],
      ["before_date_range", `${manifest.proposal.before.start} to ${manifest.proposal.before.end}`],
      ["after_date_range", `${manifest.proposal.after.start} to ${manifest.proposal.after.end}`],
      ["vegetation_change_percent", manifest.metrics.vegetation_change],
      ["urban_expansion_percent", manifest.metrics.urban_change],
      ["water_change_percent", manifest.metrics.water_change],
      ["total_change_percent", manifest.metrics.total_change],
      ["ndvi_delta", manifest.metrics.ndvi_delta],
      ["ndwi_delta", manifest.metrics.ndwi_delta],
      ["valid_coverage_percent", manifest.metrics.valid_coverage_percent],
      ["area_hectares", manifest.metrics.area_hectares],
      ["recommendations", manifest.recommendations.join(" | ")],
      ["warnings", manifest.warnings.join(" | ")],
    ];
    const blob = new Blob([rows.map((row) => row.map(csvCell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `earth-vision-${manifest.analysis_id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("CSV downloaded.");
  };

  const printPdf = () => {
    if (!acknowledged) {
      setMessage("Acknowledge the screening limitation before exporting a PDF.");
      return;
    }
    const report = window.open("", "_blank");
    if (!report) {
      setMessage("Allow pop-ups to generate the PDF print view.");
      return;
    }
    report.document.write(`<!doctype html><html><head><title>Earth Vision screening brief</title><style>body{font-family:Arial,sans-serif;max-width:850px;margin:40px auto;color:#102218;line-height:1.5}h1{color:#355f3b}table{border-collapse:collapse;width:100%;margin:16px 0}td,th{border:1px solid #cbd5c5;padding:8px;text-align:left}small{color:#53635a}.warning{background:#fff5d6;padding:12px;border-radius:8px}.recommendation{background:#eaf3e4;padding:12px;border-radius:8px;margin:8px 0}@media print{button{display:none}}</style></head><body><h1>Earth Vision screening brief</h1><p><strong>Analysis ID:</strong> ${escapeHtml(manifest.analysis_id)}<br><strong>Processing version:</strong> ${escapeHtml(manifest.processing_version)}</p><p>This is a satellite-derived screening aid, not professional, legal, environmental, agricultural, or development approval advice.</p><h2>Metric summary</h2><table><tr><th>Signal</th><th>Value</th></tr><tr><td>Total change</td><td>${manifest.metrics.total_change}%</td></tr><tr><td>Vegetation change</td><td>${manifest.metrics.vegetation_change}%</td></tr><tr><td>Urban Expansion heuristic signal</td><td>${manifest.metrics.urban_change}%</td></tr><tr><td>Water change</td><td>${manifest.metrics.water_change}%</td></tr><tr><td>Valid AOI coverage</td><td>${manifest.metrics.valid_coverage_percent}%</td></tr><tr><td>Approximate area</td><td>${manifest.metrics.area_hectares} hectares</td></tr></table><h2>Recommendations</h2>${manifest.recommendations.map((item) => `<div class="recommendation">${escapeHtml(item)}</div>`).join("")}<h2>Warnings</h2>${manifest.warnings.length ? manifest.warnings.map((item) => `<div class="warning">${escapeHtml(item)}</div>`).join("") : "<p>No additional warnings were recorded.</p>"}<h2>Technical appendix</h2><p>Before scene: ${escapeHtml(manifest.before_scene_id)} (${escapeHtml(manifest.before_acquired)}, ${manifest.before_cloud_cover}% cloud)<br>After scene: ${escapeHtml(manifest.after_scene_id)} (${escapeHtml(manifest.after_acquired)}, ${manifest.after_cloud_cover}% cloud)<br>Thresholds: vegetation ${manifest.thresholds.vegetation}, water ${manifest.thresholds.water}, urban brightness ${manifest.thresholds.urban_brightness}<br>Masks are retained in the analysis manifest for technical review.</p><button onclick="window.print()">Print or save as PDF</button></body></html>`);
    report.document.title = "Earth Vision screening brief";
    report.document.close();
    report.focus();
    setMessage("PDF print view opened.");
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Export analysis</CardTitle>
          <CardDescription>Download the traceable summary or print a public-friendly PDF brief.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={downloadCsv}>Download CSV</Button>
          <Button onClick={printPdf}>Export PDF</Button>
        </div>
        <label className="flex items-start gap-3 text-sm text-muted">
          <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1" />
          I understand this is a satellite screening aid and not professional, legal, environmental, agricultural, or development approval advice.
        </label>
        {message ? <p className="text-sm text-primary">{message}</p> : null}
      </CardContent>
    </Card>
  );
}
