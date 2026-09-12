"use client";

import { SatelliteSplitView } from "@/components/satellite-split-view";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGarudaStore } from "@/store/use-garuda-store";

export default function SatellitePage() {
  const sentinel = useGarudaStore((state) => state.sentinel);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Before Image</CardTitle>
              <CardDescription>Selected from the earlier analysis window using minimum cloud cover.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {sentinel?.before_preview_url ? (
              <div className="flex h-[360px] items-center justify-center rounded-[28px] border border-border bg-[#0f1720] p-3">
                <img src={sentinel.before_preview_url} alt="Before preview" className="h-full w-full object-contain" />
              </div>
            ) : (
              <p className="text-sm text-muted">No before image loaded yet.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>After Image</CardTitle>
              <CardDescription>Selected from the later analysis window using minimum cloud cover.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {sentinel?.after_preview_url ? (
              <div className="flex h-[360px] items-center justify-center rounded-[28px] border border-border bg-[#0f1720] p-3">
                <img src={sentinel.after_preview_url} alt="After preview" className="h-full w-full object-contain" />
              </div>
            ) : (
              <p className="text-sm text-muted">No after image loaded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
      <SatelliteSplitView beforeUrl={sentinel?.before_preview_url} afterUrl={sentinel?.after_preview_url} />
    </div>
  );
}
