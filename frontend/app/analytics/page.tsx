"use client";

import { useState } from "react";
import { AlertTriangle, BarChart3, CalendarDays, Leaf, Satellite as SatelliteIcon, Sparkles, Waves } from "lucide-react";

import { AiChatPanel } from "@/components/ai-chat-panel";
import { AnalysisExports } from "@/components/analysis-exports";
import { SignalMaskPreview } from "@/components/signal-mask-preview";
import { SatelliteSplitView } from "@/components/satellite-split-view";
import { WorkspaceChatRail } from "@/components/workspace-chat-rail";
import { useGarudaStore } from "@/store/use-garuda-store";

type Tab = "overview" | "details" | "satellite" | "insights";

function Metric({ label, value, color, icon: Icon }: { label: string; value: string; color: string; icon: typeof Leaf }) {
  return <div className="rounded-2xl border border-white/10 bg-[#101318] p-5"><div className="flex items-center justify-between text-xs text-slate-500"><span>{label}</span><Icon className="h-4 w-4" style={{ color }} /></div><p className="mt-3 text-2xl font-semibold" style={{ color }}>{value}</p></div>;
}

function EmptyTab({ text }: { text: string }) {
  return <div className="rounded-2xl border border-white/10 bg-[#101318] p-8 text-sm text-slate-500">{text}</div>;
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const analysis = useGarudaStore((state) => state.analysis);
  const metrics = analysis?.metrics;
  const format = (value: number | undefined, sign = false) => value === undefined ? "—" : `${sign && value > 0 ? "+" : ""}${value}%`;
  const bars = metrics ? [
    { label: "Vegetation", value: Math.abs(metrics.vegetation_change), color: "bg-emerald-400" },
    { label: "Urban", value: Math.abs(metrics.urban_change), color: "bg-blue-400" },
    { label: "Water", value: Math.abs(metrics.water_change), color: "bg-cyan-400" },
  ] : [];
  const maxBar = Math.max(...bars.map((bar) => bar.value), 1);
  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "overview", label: "Overview" }, { id: "details", label: "Analysis Details" },
    { id: "satellite", label: "Satellite Data" }, { id: "insights", label: "Insights" },
  ];

  return <div className="flex min-h-[calc(100vh-72px)] flex-col lg:flex-row"><WorkspaceChatRail /><section className="min-w-0 flex-1 overflow-auto bg-[#0b0e12] p-5 lg:p-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-xs text-emerald-400"><Leaf className="h-4 w-4" /> NDVI Vegetation Analysis</div><h1 className="mt-2 text-2xl font-semibold">Change detection analytics</h1><p className="mt-1 text-xs text-slate-600">Satellite-powered analysis with grounded metrics and visible limitations.</p></div><div className="flex items-center gap-3 text-xs text-slate-500"><span className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-purple-400" /> AI Enhanced</span><span className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5" /> Before / After</span></div></div>
    <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-[#101318] p-1 text-xs text-slate-600 md:grid-cols-4" role="tablist" aria-label="Analytics sections">{tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`rounded-lg px-3 py-2 text-center transition ${activeTab === tab.id ? "bg-white text-black" : "hover:bg-white/10 hover:text-white"}`}>{tab.label}</button>)}</div>
    {!metrics ? <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/[.03] p-6 text-sm text-slate-400">No analysis is loaded yet. Draw an AOI and run an analysis from the map page.</div> : null}

    {activeTab === "overview" ? <>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Total Change" value={format(metrics?.total_change)} color="#f8fafc" icon={BarChart3} /><Metric label="Vegetation Change" value={format(metrics?.vegetation_change, true)} color="#34d399" icon={Leaf} /><Metric label="Urban Change" value={format(metrics?.urban_change)} color="#60a5fa" icon={BarChart3} /><Metric label="Water Change" value={format(metrics?.water_change)} color="#f87171" icon={Waves} /></div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-[#101318] p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-medium">Land Use Change Distribution</h2><p className="mt-1 text-xs text-slate-600">Absolute detected signal percentage from the current analysis.</p></div><BarChart3 className="h-4 w-4 text-emerald-400" /></div>{bars.length ? <div className="mt-7 flex h-52 items-end justify-around gap-6 border-b border-white/10 px-8">{bars.map((bar) => <div key={bar.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-xs text-slate-400">{bar.value}%</span><div className={`w-full max-w-16 rounded-t-lg ${bar.color}`} style={{ height: `${Math.max(6, bar.value / maxBar * 100)}%` }} /><span className="text-[10px] text-slate-600">{bar.label}</span></div>)}</div> : <div className="mt-7 grid h-52 place-items-center border-b border-white/10 text-xs text-slate-600">Run an analysis to populate this chart.</div>}</div><div className="rounded-2xl border border-white/10 bg-[#101318] p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-medium">NDVI Values Comparison</h2><p className="mt-1 text-xs text-slate-600">Mean readings across valid AOI pixels.</p></div><Leaf className="h-4 w-4 text-blue-400" /></div>{metrics ? <div className="mt-7 flex h-52 items-end justify-center gap-10 border-b border-white/10 px-8"><div className="flex h-full w-20 items-end gap-2"><div className="w-1/2 rounded-t bg-slate-500" style={{ height: `${Math.max(8, (metrics.ndvi_before_mean + 1) * 50)}%` }} /><div className="w-1/2 rounded-t bg-cyan-400" style={{ height: `${Math.max(8, (metrics.ndvi_after_mean + 1) * 50)}%` }} /></div></div> : <div className="mt-7 grid h-52 place-items-center border-b border-white/10 text-xs text-slate-600">Run an analysis to populate this chart.</div>}<div className="mt-3 flex justify-center gap-6 text-[10px] text-slate-600"><span>Before</span><span>After</span></div></div></div>
    </> : null}

    {activeTab === "details" ? <div className="mt-4 space-y-4">{metrics && analysis ? <><SignalMaskPreview masks={[{ name: "Vegetation", values: analysis.vegetation_change_mask, color: "#34d399" }, { name: "Water", values: analysis.water_change_mask, color: "#22d3ee" }, { name: "Built-surface", values: analysis.urban_change_mask, color: "#60a5fa" }]} /><div className="grid gap-4 lg:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-[#101318] p-5"><h2 className="text-sm font-medium">Detailed Change Statistics</h2><div className="mt-5 divide-y divide-white/10 text-xs"><div className="grid grid-cols-3 py-3 text-slate-600"><span>Change Type</span><span>Percentage</span><span>Valid Pixels</span></div>{[["Vegetation Change", format(metrics.vegetation_change)], ["Urban Change", format(metrics.urban_change)], ["Water Change", format(metrics.water_change)]].map(([name, value]) => <div key={name} className="grid grid-cols-3 py-3 text-slate-300"><span>{name}</span><span>{value}</span><span>{metrics.valid_pixels}</span></div>)}</div></div><div className="rounded-2xl border border-amber-400/20 bg-amber-400/[.03] p-5"><div className="flex items-center gap-2 text-sm font-medium"><AlertTriangle className="h-4 w-4 text-amber-400" /> Screening limitations</div><p className="mt-4 text-sm leading-6 text-slate-400">{analysis.warnings.length ? analysis.warnings.join(" ") : "Satellite signals are heuristic. Review scene quality, seasonality, masks, and local evidence before making decisions."}</p></div></div><AnalysisExports /></> : <EmptyTab text="Run an analysis to view detailed signal masks and statistics." />}</div> : null}

    {activeTab === "satellite" ? <div className="mt-4 space-y-4">{analysis ? <><div className="flex items-center gap-2 text-sm font-medium"><SatelliteIcon className="h-4 w-4 text-purple-300" /> Selected Sentinel-2 scenes</div><div className="flex flex-wrap gap-4 rounded-2xl border border-white/10 bg-[#101318] p-4 text-xs text-slate-400"><span>Before: {analysis.before_acquired}</span><span>After: {analysis.after_acquired}</span><span>Cloud: {analysis.before_cloud_cover}% / {analysis.after_cloud_cover}%</span></div><div className="grid gap-4 lg:grid-cols-2">{[["Before", analysis.before_preview_url], ["After", analysis.after_preview_url]].map(([label, url]) => <div key={label} className="overflow-hidden rounded-2xl border border-white/10 bg-[#101318]"><div className="border-b border-white/10 px-4 py-3 text-xs">{label} scene</div>{url ? <img src={url} alt={`${label} satellite preview`} className="h-64 w-full object-cover" /> : <div className="map-surface flex h-64 items-center justify-center text-xs text-slate-500">Preview unavailable</div>}</div>)}</div><SatelliteSplitView beforeUrl={analysis.before_preview_url} afterUrl={analysis.after_preview_url} /></> : <EmptyTab text="Run an analysis to load before and after satellite imagery." />}</div> : null}
    {activeTab === "insights" ? <div className="mt-4"><AiChatPanel /></div> : null}
  </section></div>;
}
