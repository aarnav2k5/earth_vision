import type { AnalysisProposal, AnalysisThresholds, DateRange } from "@/types/api";

function yearRange(year: number): DateRange {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export function createAnalysisProposal(
  prompt: string,
  defaults: { before: DateRange; after: DateRange; maxCloudCover: number; thresholds: AnalysisThresholds; thresholdsAcknowledged?: boolean }
): AnalysisProposal {
  const years = [...prompt.matchAll(/\b(19|20)\d{2}\b/g)].map((match) => Number(match[0]));
  const before = years[0] ? yearRange(years[0]) : defaults.before;
  const after = years[1] ? yearRange(years[1]) : defaults.after;
  const signals = ["NDVI vegetation", "NDWI water", "built-surface change"];

  return {
    prompt: prompt.trim(),
    summary: `Compare vegetation, water, and built-surface signals between ${before.start} and ${after.end}.`,
    signals,
    before,
    after,
    max_cloud_cover: defaults.maxCloudCover,
    thresholds: defaults.thresholds,
    thresholds_acknowledged: defaults.thresholdsAcknowledged ?? false,
  };
}
