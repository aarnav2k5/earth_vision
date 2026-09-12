"use client";

import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function clampPosition(value: number) {
  if (!Number.isFinite(value)) {
    return 50;
  }
  return Math.min(100, Math.max(0, value));
}

export function SatelliteSplitView({
  beforeUrl,
  afterUrl,
}: {
  beforeUrl?: string | null;
  afterUrl?: string | null;
}) {
  const [splitPosition, setSplitPosition] = useState(50);

  if (!beforeUrl || !afterUrl) {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Overlay View</CardTitle>
            <CardDescription>Run an analysis from the map page to load before and after scene previews.</CardDescription>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="w-full">
          <CardTitle>Before / After Comparison</CardTitle>
          <CardDescription>Before image is layered on top of after image. Use the slider to compare both scenes.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative h-[460px] overflow-hidden rounded-[28px] border border-border bg-[#0f1720] select-none">
            <img src={afterUrl} alt="After satellite image" className="absolute inset-0 h-full w-full object-contain" draggable={false} />
            <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${splitPosition}%` }}>
              <img src={beforeUrl} alt="Before satellite image" className="h-full w-full object-contain" draggable={false} />
            </div>
            <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
              Before Top Layer
            </div>
            <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
              After Base
            </div>
            <div className="absolute inset-y-0 z-10 w-1 bg-white shadow" style={{ left: `${splitPosition}%` }} />
            <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
              Before Reveal {Math.round(splitPosition)}%
            </div>
          </div>
          <div className="rounded-[18px] border border-border bg-white/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Comparison Slider</p>
            <input
              type="range"
              min={0}
              max={100}
              value={splitPosition}
              onChange={(event) => setSplitPosition(clampPosition(event.target.valueAsNumber))}
              className="mt-3 w-full accent-primary"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
