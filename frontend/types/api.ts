export type DateRange = {
  start: string;
  end: string;
};

export type GeoJsonGeometry = GeoJSON.Polygon | GeoJSON.MultiPolygon;

export type AreaRequest = {
  aoi: GeoJsonGeometry;
  before: DateRange;
  after: DateRange;
  max_cloud_cover: number;
  thresholds: AnalysisThresholds;
  thresholds_acknowledged: boolean;
};

export type AnalysisThresholds = {
  vegetation: number;
  water: number;
  urban_brightness: number;
};

export type ChangeMetrics = {
  total_change: number;
  vegetation_change: number;
  urban_change: number;
  water_change: number;
  change_intensity: number;
  valid_pixels: number;
  ndvi_before_mean: number;
  ndvi_after_mean: number;
  ndwi_before_mean: number;
  ndwi_after_mean: number;
  ndvi_delta: number;
  ndwi_delta: number;
  valid_coverage_percent: number;
  area_hectares: number;
  opencv_change_percent: number;
  opencv_change_regions: number;
};

export type AnalyzeResponse = {
  metrics: ChangeMetrics;
  before_scene_id: string;
  after_scene_id: string;
  before_acquired: string;
  after_acquired: string;
  before_cloud_cover: number;
  after_cloud_cover: number;
  warnings: string[];
  recommendations: string[];
  thresholds: AnalysisThresholds;
  processing_version: string;
  before_preview_url?: string | null;
  after_preview_url?: string | null;
  vegetation_change_mask: number[][];
  water_change_mask: number[][];
  urban_change_mask: number[][];
  opencv_change_mask: number[][];
  change_contours: number[][][];
};

export type FetchSentinelResponse = {
  before_scene_id: string;
  after_scene_id: string;
  before_preview_url?: string | null;
  after_preview_url?: string | null;
  before_acquired: string;
  after_acquired: string;
};

export type AiInsightPayload = {
  NDVI_mean: number;
  ndvi_before_mean: number;
  ndvi_after_mean: number;
  ndvi_delta: number;
  ndwi_before_mean: number;
  ndwi_after_mean: number;
  ndwi_delta: number;
  vegetation_change: number;
  urban_change: number;
  water_change: number;
  change_intensity: number;
  valid_coverage_percent: number;
  area_hectares: number;
  before_acquired: string;
  after_acquired: string;
  before_cloud_cover: number;
  after_cloud_cover: number;
  before_scene_id?: string;
  after_scene_id?: string;
  processing_version?: string;
  opencv_change_percent: number;
  opencv_change_regions: number;
  thresholds: AnalysisThresholds;
  question?: string;
  recommendations?: string[];
  warnings?: string[];
};

export type AnalysisProposal = {
  prompt: string;
  summary: string;
  signals: string[];
  before: DateRange;
  after: DateRange;
  max_cloud_cover: number;
  thresholds: AnalysisThresholds;
  thresholds_acknowledged?: boolean;
};

export type AnalysisManifest = {
  analysis_id: string;
  processing_version: string;
  created_at: string;
  proposal: AnalysisProposal;
  aoi: GeoJsonGeometry;
  before_scene_id: string;
  after_scene_id: string;
  before_acquired: string;
  after_acquired: string;
  before_cloud_cover: number;
  after_cloud_cover: number;
  metrics: ChangeMetrics;
  warnings: string[];
  recommendations: string[];
  thresholds: AnalysisThresholds;
  masks: {
    vegetation: number[][];
    water: number[][];
    urban: number[][];
    opencv: number[][];
  };
  change_contours: number[][][];
};
