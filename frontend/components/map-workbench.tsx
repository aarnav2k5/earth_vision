"use client";

import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ComponentType, type ReactNode, type Ref } from "react";
import type { FeatureGroup as LeafletFeatureGroup, Layer as LeafletLayer } from "leaflet";
import { AreaChart, Crosshair, Layers, LoaderCircle, Search } from "lucide-react";

import { WorkspaceChatRail } from "@/components/workspace-chat-rail";
import { analyzeArea } from "@/lib/api";
import { createAnalysisProposal } from "@/lib/analysis-proposal";
import { useGarudaStore } from "@/store/use-garuda-store";
import type { AnalysisProposal, AnalysisThresholds, DateRange, GeoJsonGeometry } from "@/types/api";

type MapContainerProps = { center: [number, number]; zoom: number; style?: CSSProperties; children?: ReactNode };
type DrawLayer = LeafletLayer & { toGeoJSON: () => { geometry: GeoJsonGeometry } };
type EditControlProps = { position?: string; onCreated?: (event: { layer: DrawLayer }) => void; onEdited?: (event: { layers: { eachLayer: (callback: (layer: DrawLayer) => void) => void } }) => void; onDeleted?: () => void; draw?: Record<string, unknown>; edit?: Record<string, unknown> };
type FeatureGroupProps = { children?: ReactNode; ref?: Ref<LeafletFeatureGroup> };
type MapViewportProps = { center: [number, number]; zoom: number };

const MapContainer = dynamic<MapContainerProps>(async () => (await import("react-leaflet")).MapContainer as ComponentType<MapContainerProps>, { ssr: false });
const TileLayer = dynamic(async () => (await import("react-leaflet")).TileLayer, { ssr: false });
const FeatureGroup = dynamic<FeatureGroupProps>(async () => (await import("react-leaflet")).FeatureGroup as ComponentType<FeatureGroupProps>, { ssr: false });
const EditControl = dynamic<EditControlProps>(async () => { await import("leaflet-draw"); const mod = await import("react-leaflet-draw"); return mod.EditControl as ComponentType<EditControlProps>; }, { ssr: false });
const MapViewport = dynamic<MapViewportProps>(async () => {
  const { useMap } = await import("react-leaflet");
  const Viewport = ({ center, zoom }: MapViewportProps) => {
    const map = useMap();
    useEffect(() => { map.setView(center, zoom); }, [center, map, zoom]);
    return null;
  };
  return Viewport;
}, { ssr: false });

const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629];

function extractLocationQuery(prompt: string) {
  const cleaned = prompt.replace(/[“”]/g, '"').trim();
  const match = cleaned.match(/\b(?:near|in|at|around)\s+["']?(.+?)["']?(?=\s+(?:from|between)\s+\d{4}|\s+(?:using|with|for)\b|$)/i);
  return match?.[1]?.replace(/[.,!?]+$/, "").trim() || "";
}

function dateRangeLabel(range: DateRange) {
  return `${range.start} → ${range.end}`;
}

function validDateRange(range: DateRange) {
  return Boolean(range.start && range.end && range.start <= range.end);
}

export function MapWorkbench() {
  const searchParams = useSearchParams();
  const {
    aoi, prompt: storedPrompt, before, after, cloudCover, thresholds, loading, error, analysis, searchLabel,
    setAoi, setBefore, setAfter, setCloudCover, setThresholds, setAnalysis, setManifest, setPrompt: setStoredPrompt,
    setSentinel, setLoading, setError, setSearchLabel,
  } = useGarudaStore();
  const [prompt, setPrompt] = useState(() => searchParams.get("prompt") ?? storedPrompt ?? "");
  const [proposal, setProposal] = useState<AnalysisProposal | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [thresholdsAcknowledged, setThresholdsAcknowledged] = useState(false);
  const [query, setQuery] = useState("");
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const featureGroupRef = useRef<LeafletFeatureGroup | null>(null);
  const activeLayerRef = useRef<DrawLayer | null>(null);
  const thresholdSensitive = thresholds.vegetation < 0.05 || thresholds.water < 0.05 || thresholds.urban_brightness > 100;
  const clearProposal = () => { setProposal(null); setConfirmed(false); setThresholdsAcknowledged(false); setError(null); };
  const updateBefore = (value: DateRange) => { setBefore(value); clearProposal(); };
  const updateAfter = (value: DateRange) => { setAfter(value); clearProposal(); };
  const updateThresholds = (value: AnalysisThresholds) => { setThresholds(value); clearProposal(); };

  const buildProposal = () => createAnalysisProposal(prompt, {
    before, after, maxCloudCover: cloudCover, thresholds, thresholdsAcknowledged,
  });

  const validateInputs = () => {
    if (!validDateRange(before) || !validDateRange(after)) {
      const message = "Each date window must have a start date on or before its end date.";
      setError(message);
      return false;
    }
    if (!Number.isFinite(cloudCover) || cloudCover < 0 || cloudCover > 100) {
      setError("Maximum cloud cover must be between 0 and 100 percent.");
      return false;
    }
    return true;
  };

  const payload = useMemo(() => {
    if (!aoi || !proposal) return null;
    return {
      aoi,
      before: proposal.before,
      after: proposal.after,
      max_cloud_cover: proposal.max_cloud_cover,
      thresholds: proposal.thresholds,
      thresholds_acknowledged: thresholdsAcknowledged,
    };
  }, [aoi, proposal, thresholdsAcknowledged]);

  useEffect(() => {
    const location = extractLocationQuery(prompt);
    if (!location) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    void fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(location)}`, { headers: { "Accept-Language": "en" }, signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<Array<{ lat: string; lon: string; display_name: string }>> : [])
      .then((results) => {
        if (!results[0]) return;
        setMapCenter([Number(results[0].lat), Number(results[0].lon)]);
        setSearchLabel(results[0].display_name);
        setQuery(location);
      })
      .catch(() => undefined)
      .finally(() => window.clearTimeout(timeout));
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [prompt, setSearchLabel]);

  const searchLocation = async () => {
    if (!query.trim()) return;
    setSearching(true); setSearchError("");
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 10000);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query.trim())}`, { headers: { "Accept-Language": "en" }, signal: controller.signal });
      window.clearTimeout(timeout);
      if (!response.ok) throw new Error("Location search failed.");
      const results = (await response.json()) as Array<{ lat: string; lon: string; display_name: string }>;
      if (!results[0]) throw new Error("No matching location found.");
      setMapCenter([Number(results[0].lat), Number(results[0].lon)]);
      setSearchLabel(results[0].display_name);
    } catch (requestError) {
      setSearchError(requestError instanceof Error ? requestError.message : "Location search failed.");
    } finally { setSearching(false); }
  };

  const run = async (proposalToRun = proposal, confirmedOverride = false) => {
    if (!payload || !proposalToRun || (!confirmed && !confirmedOverride)) {
      setError("Draw an AOI and confirm the analysis proposal first.");
      return;
    }
    setLoading(true); setError(null);
    try {
      const result = await analyzeArea(payload);
      setAnalysis(result);
      setSentinel({
        before_scene_id: result.before_scene_id,
        after_scene_id: result.after_scene_id,
        before_preview_url: result.before_preview_url,
        after_preview_url: result.after_preview_url,
        before_acquired: result.before_acquired,
        after_acquired: result.after_acquired,
      });
      setManifest({
        analysis_id: crypto.randomUUID(), processing_version: result.processing_version, created_at: new Date().toISOString(),
        proposal: { ...proposalToRun, thresholds_acknowledged: thresholdsAcknowledged }, aoi: payload.aoi,
        before_scene_id: result.before_scene_id, after_scene_id: result.after_scene_id,
        before_acquired: result.before_acquired, after_acquired: result.after_acquired,
        before_cloud_cover: result.before_cloud_cover, after_cloud_cover: result.after_cloud_cover,
        metrics: result.metrics, warnings: result.warnings, recommendations: result.recommendations,
        thresholds: result.thresholds,
        masks: { vegetation: result.vegetation_change_mask, water: result.water_change_mask, urban: result.urban_change_mask },
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Analysis failed.");
    } finally { setLoading(false); }
  };

  const prepare = () => { if (!validateInputs()) return; setProposal(buildProposal()); setConfirmed(false); setError(null); };
  const handleAoiCreated = (event: { layer: DrawLayer }) => {
    if (activeLayerRef.current && featureGroupRef.current) {
      featureGroupRef.current.removeLayer(activeLayerRef.current);
    }
    activeLayerRef.current = event.layer;
    setAoi(event.layer.toGeoJSON().geometry);
    if (!validateInputs()) { setProposal(null); setConfirmed(false); return; }
    setProposal(buildProposal());
    setConfirmed(false);
    setError(null);
  };
  const handleAoiEdited = (event: { layers: { eachLayer: (callback: (layer: DrawLayer) => void) => void } }) => {
    event.layers.eachLayer((layer) => {
      activeLayerRef.current = layer;
      setAoi(layer.toGeoJSON().geometry);
    });
    clearProposal();
  };
  const confirmProposal = () => { setConfirmed(true); void run(proposal, true); };
  const handleAoiDeleted = () => {
    activeLayerRef.current = null;
    clearArea();
  };
  const clearArea = () => { featureGroupRef.current?.clearLayers(); activeLayerRef.current = null; setAoi(null); setProposal(null); setConfirmed(false); setThresholdsAcknowledged(false); setError(null); };
  const handlePrimaryAction = () => {
    if (!aoi) setError("Draw a polygon on the map first.");
    else if (!proposal) prepare();
    else if (!confirmed && (!thresholdSensitive || thresholdsAcknowledged)) confirmProposal();
  };

  return (
    <div className="flex min-h-[calc(100vh-72px)] flex-col lg:flex-row">
      <WorkspaceChatRail key={prompt} initialMessage={prompt} />
      <section className="relative min-w-0 flex-1 bg-[#0b0e12] p-4 lg:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-xs uppercase tracking-[.2em] text-slate-600">Interactive mapping</p><h1 className="mt-1 text-xl font-semibold">Satellite change detection map</h1></div>
          <div className="flex items-center gap-3 text-xs text-slate-500"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Live analytics</span><span>{aoi ? "1 area loaded" : "Draw an area to begin"}</span></div>
        </div>

        <div className="map-workbench relative h-[calc(100vh-160px)] min-h-[620px] overflow-hidden rounded-3xl border border-white/10 bg-[#15222d] shadow-2xl">
          <MapContainer center={mapCenter} zoom={5} style={{ height: "100%", width: "100%" }}>
            <MapViewport center={mapCenter} zoom={mapCenter[0] === 20.5937 && mapCenter[1] === 78.9629 ? 5 : 12} />
            <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <FeatureGroup ref={featureGroupRef}><EditControl position="topright" onCreated={handleAoiCreated} onEdited={handleAoiEdited} onDeleted={handleAoiDeleted} draw={{ rectangle: false, circle: false, circlemarker: false, marker: false, polyline: false, polygon: { allowIntersection: false, showArea: true, shapeOptions: { color: "#60a5fa", weight: 2 } } }} edit={{ edit: true, remove: true }} /></FeatureGroup>
          </MapContainer>
          <div className="pointer-events-none absolute left-4 top-4 z-[500] flex flex-wrap gap-2"><span className="rounded-xl border border-white/10 bg-black/70 px-3 py-2 text-xs text-slate-300"><Layers className="mr-2 inline h-3.5 w-3.5" /> Satellite map</span><span className="rounded-xl border border-white/10 bg-black/70 px-3 py-2 text-xs text-slate-300"><Crosshair className="mr-2 inline h-3.5 w-3.5" /> {aoi ? "AOI selected" : "Use polygon tool to select AOI"}</span></div>
          <div className="absolute bottom-4 left-4 right-4 z-[500] flex flex-wrap items-end justify-between gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/75 p-3 backdrop-blur-xl"><p className="mb-2 text-[10px] uppercase tracking-widest text-slate-500">Search location</p><div className="flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void searchLocation(); }} placeholder="Search a place" className="w-44 bg-transparent text-xs text-white outline-none placeholder:text-slate-600" aria-label="Search a place" /><button type="button" onClick={() => void searchLocation()} disabled={searching || !query.trim()} className="rounded-lg bg-white px-3 py-2 text-xs text-black disabled:cursor-not-allowed disabled:opacity-40" aria-label="Search location">{searching ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}</button></div>{searchLabel && searchLabel !== "Choose a place and draw an area of interest." ? <p className="mt-2 max-w-60 truncate text-[10px] text-emerald-300">{searchLabel}</p> : null}{searchError ? <p className="mt-2 max-w-52 text-[10px] text-red-300">{searchError}</p> : null}</div>
            <div className="flex items-center gap-2"><button type="button" onClick={clearArea} disabled={!aoi && !analysis} className="rounded-xl border border-white/10 bg-black/80 px-4 py-3 text-xs text-slate-200 disabled:cursor-not-allowed disabled:opacity-40">Clear area</button><span className="rounded-xl border border-blue-300/30 bg-blue-950/70 px-3 py-3 text-xs text-blue-100">{aoi ? "Review the proposal below" : "Draw a polygon to begin"}</span></div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-[#101318] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] uppercase tracking-widest text-slate-600">Analysis proposal</p><p className="mt-1 text-xs text-slate-500">Review the analysis window and thresholds before remote-sensing requests run.</p></div><span className="text-xs text-slate-500">{proposal ? "Ready for confirmation" : "Draw a polygon to generate"}</span></div>
          <input value={prompt} onChange={(event) => { const value = event.target.value; setPrompt(value); setStoredPrompt(value); clearProposal(); }} placeholder="Describe the place and change you want to analyze" className="mt-3 w-full bg-transparent text-sm text-slate-300 outline-none placeholder:text-slate-700" aria-label="Analysis question" />
          <p className="mt-2 text-xs text-slate-400">{proposal ? proposal.summary : "The proposal will include vegetation, water, and built-surface change signals."}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-xs text-slate-500">Before start<input type="date" value={before.start} onChange={(event) => updateBefore({ ...before, start: event.target.value })} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/20 px-2 py-2 text-slate-200" /></label>
            <label className="text-xs text-slate-500">Before end<input type="date" value={before.end} onChange={(event) => updateBefore({ ...before, end: event.target.value })} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/20 px-2 py-2 text-slate-200" /></label>
            <label className="text-xs text-slate-500">After start<input type="date" value={after.start} onChange={(event) => updateAfter({ ...after, start: event.target.value })} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/20 px-2 py-2 text-slate-200" /></label>
            <label className="text-xs text-slate-500">After end<input type="date" value={after.end} onChange={(event) => updateAfter({ ...after, end: event.target.value })} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/20 px-2 py-2 text-slate-200" /></label>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <label className="text-xs text-slate-500">Max cloud cover (%)<input type="number" min="0" max="100" step="1" value={cloudCover} onChange={(event) => { setCloudCover(Number(event.target.value)); clearProposal(); }} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/20 px-2 py-2 text-slate-200" /></label>
            <label className="text-xs text-slate-500">Vegetation threshold<input type="number" min="0.01" max="1" step="0.01" value={thresholds.vegetation} onChange={(event) => updateThresholds({ ...thresholds, vegetation: Number(event.target.value) })} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/20 px-2 py-2 text-slate-200" /></label>
            <label className="text-xs text-slate-500">Water threshold<input type="number" min="0.01" max="1" step="0.01" value={thresholds.water} onChange={(event) => updateThresholds({ ...thresholds, water: Number(event.target.value) })} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/20 px-2 py-2 text-slate-200" /></label>
            <label className="text-xs text-slate-500">Urban brightness threshold<input type="number" min="1" max="255" step="1" value={thresholds.urban_brightness} onChange={(event) => updateThresholds({ ...thresholds, urban_brightness: Number(event.target.value) })} className="mt-1 block w-full rounded-lg border border-white/10 bg-black/20 px-2 py-2 text-slate-200" /></label>
          </div>
          {thresholdSensitive ? <label className="mt-3 flex items-start gap-2 text-xs text-amber-200"><input type="checkbox" checked={thresholdsAcknowledged} onChange={(event) => setThresholdsAcknowledged(event.target.checked)} className="mt-0.5" />I understand these sensitive threshold overrides may broaden or narrow detected signals and require mask review.</label> : null}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-slate-600">{proposal ? `Before ${dateRangeLabel(proposal.before)} · After ${dateRangeLabel(proposal.after)} · Cloud ≤ ${proposal.max_cloud_cover}%` : "No remote request runs until this proposal is confirmed."}</span><button type="button" onClick={handlePrimaryAction} disabled={loading || confirmed || (thresholdSensitive && !thresholdsAcknowledged)} className="rounded-xl bg-white px-4 py-3 text-xs font-medium text-black disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Processing…" : proposal ? (confirmed ? "Analysis running / complete" : "Confirm & run analysis") : "Prepare proposal"}</button></div>
        </div>

        {error ? <p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-xs text-red-300">{error}</p> : null}
        {loading ? <p className="mt-3 rounded-xl border border-blue-400/20 bg-blue-400/5 p-3 text-xs text-blue-200">Searching Sentinel scenes and computing NDVI/change metrics. This can take up to a minute.</p> : null}
        {analysis ? <div className="mt-4 flex items-center gap-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-xs text-emerald-300"><AreaChart className="h-5 w-5" /> Latest analysis loaded — {analysis.metrics.total_change}% total change detected. <a href="/analytics" className="underline">Open analytics</a></div> : null}
      </section>
    </div>
  );
}
