import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function sampleMask(mask: number[][], size = 24) {
  const rows = mask.length;
  const columns = mask[0]?.length ?? 0;
  if (!rows || !columns) return [];
  const stepY = Math.max(1, Math.floor(rows / size));
  const stepX = Math.max(1, Math.floor(columns / size));
  return Array.from({ length: Math.ceil(rows / stepY) }, (_, row) =>
    Array.from({ length: Math.ceil(columns / stepX) }, (_, column) => mask[Math.min(row * stepY, rows - 1)][Math.min(column * stepX, columns - 1)] > 0)
  );
}

export function SignalMaskPreview({ masks }: { masks: { name: string; values: number[][]; color: string }[] }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Signal masks</CardTitle>
          <CardDescription>Selected layers show where each heuristic detected a material change.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        {masks.map((mask) => {
          const sampled = sampleMask(mask.values);
          return (
            <div key={mask.name} className="rounded-2xl border border-border bg-[#0f1720] p-3">
              <p className="mb-3 text-sm font-medium text-white">{mask.name}</p>
              <div className="grid aspect-square gap-px" style={{ gridTemplateColumns: `repeat(${sampled[0]?.length ?? 1}, minmax(0, 1fr))` }}>
                {sampled.flatMap((row, rowIndex) => row.map((active, columnIndex) => <span key={`${rowIndex}-${columnIndex}`} style={{ backgroundColor: active ? mask.color : "#24313a" }} />))}
              </div>
              <p className="mt-2 text-xs text-slate-300">Colored pixels indicate detected change.</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
