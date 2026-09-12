import { Suspense } from "react";
import { MapWorkbench } from "@/components/map-workbench";

export default function MapViewPage() {
  return <Suspense fallback={<div className="min-h-[calc(100vh-72px)] bg-[#0b0e12]" />}><MapWorkbench /></Suspense>;
}
