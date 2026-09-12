import Link from "next/link";
import { ArrowRight, Globe, Mountain, ScanSearch } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const highlights = [
  {
    title: "Geospatial Detection",
    description: "Sentinel-2 scene selection, AOI clipping, NDVI and NDWI analysis, and urban-change heuristics on open infrastructure.",
    icon: Globe,
  },
  {
    title: "Decision Dashboard",
    description: "Metrics, charts, and before/after imagery panels for land-use planners, agri analysts, and real-estate screening workflows.",
    icon: ScanSearch,
  },
  {
    title: "Environmental Context",
    description: "A lightweight advisory layer summarizes risk, development suitability, and ecological tradeoffs using the latest computed indicators.",
    icon: Mountain,
  },
];

export default function HomePage() {
  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.9fr]">
        <Card className="overflow-hidden bg-gradient-to-br from-[#fefdf7] via-[#eff5e8] to-[#d6e6ca]">
          <CardContent className="p-8">
            <p className="mb-4 max-w-max rounded-full border border-border bg-white/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] text-muted">
              Open-source satellite intelligence
            </p>
            <h2 className="max-w-3xl text-5xl font-semibold tracking-tight">Track land-use change with public Sentinel data, spatial analytics, and a clean operator console.</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
              Garuda Lens brings together open imagery, geospatial Python processing, and a responsive monitoring UI for site selection, environmental screening, and land-cover trend analysis.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/map-view">
                  Open map workflow
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/analytics">See analytics dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Platform flow</CardTitle>
              <CardDescription>Search a location, draw an AOI, compare two time windows, then inspect change outputs.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-muted">
            <p>1. Select a region and draw the polygon of interest on the map.</p>
            <p>2. Fetch the clearest Sentinel-2 scenes for the before and after date ranges.</p>
            <p>3. Run NDVI, NDWI, vegetation, urban, and water change analysis.</p>
            <p>4. Explore charts, imagery, and site suitability insights across the app.</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {highlights.map(({ title, description, icon: Icon }) => (
          <Card key={title}>
            <CardHeader>
              <div className="rounded-full bg-secondary p-3 text-primary">
                <Icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle>{title}</CardTitle>
              <CardDescription className="mt-3 leading-7">{description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
