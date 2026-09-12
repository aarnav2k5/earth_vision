"use client";

import { BarChart, Bar, Cell, PieChart, Pie, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChangeMetrics } from "@/types/api";

const pieColors = ["#355f3b", "#7b9c5c", "#9fc37f"];

export function AnalyticsCharts({ metrics }: { metrics: ChangeMetrics | null }) {
  const distribution = metrics
    ? [
        { name: "Vegetation", value: metrics.vegetation_change },
        { name: "Urban", value: metrics.urban_change },
        { name: "Water", value: metrics.water_change },
      ]
    : [];

  const ndvi = metrics
    ? [
        { name: "Before", value: metrics.ndvi_before_mean },
        { name: "After", value: metrics.ndvi_after_mean },
      ]
    : [];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Land Use Change Distribution</CardTitle>
            <CardDescription>Relative share of detected vegetation, urban, and water change.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={65} outerRadius={110}>
                {distribution.map((entry, index) => (
                  <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>NDVI Comparison</CardTitle>
            <CardDescription>Average NDVI across the valid AOI pixels before and after the selected period.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ndvi}>
              <CartesianGrid vertical={false} stroke="#d5e2d1" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="#355f3b" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
