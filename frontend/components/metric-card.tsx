import { ArrowUpRight } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function MetricCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardDescription>{title}</CardDescription>
          <CardTitle className="mt-2 text-4xl">{value}</CardTitle>
        </div>
        <div className="rounded-full bg-secondary p-2 text-primary">
          <ArrowUpRight className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted">{description}</p>
      </CardContent>
    </Card>
  );
}
