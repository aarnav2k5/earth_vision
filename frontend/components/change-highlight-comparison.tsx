"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Layers3 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Mask = { name: string; values: number[][]; color: string };

function drawContain(context: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const imageWidth = image.naturalWidth * scale;
  const imageHeight = image.naturalHeight * scale;
  const left = (width - imageWidth) / 2;
  const top = (height - imageHeight) / 2;
  context.drawImage(image, left, top, imageWidth, imageHeight);
  return { left, top, width: imageWidth, height: imageHeight };
}

export function ChangeHighlightComparison({ afterUrl, masks, contours }: { afterUrl: string; masks: Mask[]; contours: number[][][] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [highlightsEnabled, setHighlightsEnabled] = useState(true);
  const [activeSignals, setActiveSignals] = useState(() => new Set(masks.map((mask) => mask.name)));

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const image = new Image();
    const render = () => {
      if (cancelled || !image.complete || !image.naturalWidth) return;
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(bounds.width * pixelRatio));
      canvas.height = Math.max(1, Math.round(bounds.height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, bounds.width, bounds.height);
      context.fillStyle = "#0f1720";
      context.fillRect(0, 0, bounds.width, bounds.height);
      const imageBounds = drawContain(context, image, bounds.width, bounds.height);

      if (highlightsEnabled) {
        const rows = masks[0]?.values.length ?? 0;
        const columns = masks[0]?.values[0]?.length ?? 0;
        if (rows && columns) {
          const cellWidth = imageBounds.width / columns;
          const cellHeight = imageBounds.height / rows;
          masks.forEach((mask) => {
            if (!activeSignals.has(mask.name)) return;
            context.fillStyle = `${mask.color}99`;
            mask.values.forEach((row, rowIndex) => row.forEach((value, columnIndex) => {
              if (value > 0) context.fillRect(imageBounds.left + columnIndex * cellWidth, imageBounds.top + rowIndex * cellHeight, cellWidth + 0.4, cellHeight + 0.4);
            }));
          });
        }
        context.strokeStyle = "#fef08a";
        context.lineWidth = 2;
        contours.forEach((contour) => {
          if (!contour.length) return;
          context.beginPath();
          contour.forEach(([x, y], index) => {
            const screenX = imageBounds.left + x * imageBounds.width;
            const screenY = imageBounds.top + y * imageBounds.height;
            if (index === 0) context.moveTo(screenX, screenY); else context.lineTo(screenX, screenY);
          });
          context.closePath();
          context.stroke();
        });
      }
    };
    image.onload = render;
    image.src = afterUrl;
    window.addEventListener("resize", render);
    return () => { cancelled = true; window.removeEventListener("resize", render); };
  }, [afterUrl, masks, contours, highlightsEnabled, activeSignals]);

  const toggleSignal = (name: string) => setActiveSignals((current) => {
    const next = new Set(current);
    if (next.has(name)) next.delete(name); else next.add(name);
    return next;
  });

  return <Card>
    <CardHeader><div><CardTitle>Detected change highlights</CardTitle><CardDescription>OpenCV compares the aligned before and after scenes, then overlays detected pixels and yellow region contours on the after image. Toggle each signal to inspect the evidence.</CardDescription></div></CardHeader>
    <CardContent className="space-y-4">
      <div className="relative overflow-hidden rounded-[24px] border border-border bg-[#0f1720]"><canvas ref={canvasRef} className="block h-[460px] w-full" aria-label="After satellite image with OpenCV detected change highlights" /><span className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-foreground">After scene · highlighted changes</span></div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setHighlightsEnabled((enabled) => !enabled)} className="inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-3 py-2 text-xs text-foreground"><Layers3 className="h-3.5 w-3.5" /> {highlightsEnabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />} {highlightsEnabled ? "Hide highlights" : "Show highlights"}</button>
        {masks.map((mask) => <button key={mask.name} type="button" onClick={() => toggleSignal(mask.name)} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs ${activeSignals.has(mask.name) && highlightsEnabled ? "border-border bg-white text-foreground" : "border-border bg-transparent text-muted"}`}><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: mask.color }} />{mask.name}</button>)}
      </div>
    </CardContent>
  </Card>;
}
