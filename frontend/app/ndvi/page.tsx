"use client";

import Link from "next/link";
import { Activity, BarChart3, Leaf, Waves } from "lucide-react";

import { WorkspaceChatRail } from "@/components/workspace-chat-rail";
import { useGarudaStore } from "@/store/use-garuda-store";

function Card({ label, value, color, icon: Icon }: { label: string; value: string; color: string; icon: typeof Leaf }) {
  return <div className="rounded-2xl border border-white/10 bg-[#101318] p-5"><div className="flex items-center justify-between text-xs text-slate-500"><span>{label}</span><Icon className="h-4 w-4" style={{ color }} /></div><p className="mt-3 text-2xl font-semibold" style={{ color }}>{value}</p></div>;
}

export default function NdviPage() {
  const analysis = useGarudaStore((state) => state.analysis);
  const metrics = analysis?.metrics;
  const before = metrics?.ndvi_before_mean;
  const after = metrics?.ndvi_after_mean;
  const scale = (value: number | undefined) => value === undefined ? 8 : Math.max(8, Math.min(100, (value + 1) * 50));

  return <div className="flex min-h-[calc(100vh-72px)] flex-col lg:flex-row"><WorkspaceChatRail /><section className="min-w-0 flex-1 overflow-auto bg-[#0b0e12] p-6 lg:p-8"><div className="flex items-center gap-2 text-xs text-emerald-400"><Leaf className="h-4 w-4" /> NDVI Analysis</div><h1 className="mt-2 text-2xl font-semibold">Vegetation health dashboard</h1><p className="mt-1 text-xs text-slate-600">Compare before/after NDVI values and inspect vegetation-related change signals.</p>{!metrics ? <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/[.03] p-6 text-sm text-slate-400">Run an analysis first to populate this dashboard. <Link href="/map-view" className="text-white underline">Open map</Link>.</div> : <><div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Card label="Mean NDVI before" value={before?.toFixed(4) ?? "—"} color="#94a3b8" icon={Leaf} /><Card label="Mean NDVI after" value={after?.toFixed(4) ?? "—"} color="#34d399" icon={Leaf} /><Card label="NDVI delta" value={`${metrics.ndvi_delta > 0 ? "+" : ""}${metrics.ndvi_delta.toFixed(4)}`} color={metrics.ndvi_delta >= 0 ? "#34d399" : "#f87171"} icon={Activity} /><Card label="Vegetation change" value={`${metrics.vegetation_change}%`} color="#22c55e" icon={BarChart3} /></div><div className="mt-4 grid gap-4 xl:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-[#101318] p-5"><h2 className="text-sm font-medium">NDVI values comparison</h2><p className="mt-1 text-xs text-slate-600">Mean values over valid AOI pixels.</p><div className="mt-8 flex h-64 items-end justify-center gap-12 border-b border-white/10"><div className="flex h-full w-20 items-end gap-2"><div className="w-1/2 rounded-t-lg bg-slate-500" style={{ height: `${scale(before)}%` }} /><div className="w-1/2 rounded-t-lg bg-emerald-400" style={{ height: `${scale(after)}%` }} /></div></div><div className="mt-3 flex justify-center gap-8 text-xs text-slate-500"><span>Before</span><span>After</span></div></div><div className="rounded-2xl border border-white/10 bg-[#101318] p-5"><div className="flex items-center gap-2 text-sm font-medium"><Waves className="h-4 w-4 text-cyan-400" /> Related signal context</div><div className="mt-6 space-y-4 text-sm text-slate-400"><p>Water signal change: <strong className="text-cyan-300">{metrics.water_change}%</strong></p><p>Valid AOI coverage: <strong className="text-white">{metrics.valid_coverage_percent}%</strong></p><p className="text-xs leading-5 text-slate-600">NDVI is a screening signal. Seasonal conditions, cloud contamination, and mixed pixels can affect interpretation.</p></div></div></div><div className="mt-4 rounded-2xl border border-white/10 bg-[#101318] p-5"><h2 className="text-sm font-medium">Analysis provenance</h2><p className="mt-3 text-xs text-slate-500">Before {analysis.before_acquired} · After {analysis.after_acquired} · Processing {analysis.processing_version}</p></div></>}</section></div>;
}
