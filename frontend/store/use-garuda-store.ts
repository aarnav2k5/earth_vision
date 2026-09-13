import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type { AnalysisManifest, AnalysisThresholds, AnalyzeResponse, DateRange, FetchSentinelResponse, GeoJsonGeometry } from "@/types/api";

type GarudaState = {
  aoi: GeoJsonGeometry | null;
  prompt: string;
  searchLabel: string;
  before: DateRange;
  after: DateRange;
  cloudCover: number;
  thresholds: AnalysisThresholds;
  sentinel: FetchSentinelResponse | null;
  analysis: AnalyzeResponse | null;
  manifest: AnalysisManifest | null;
  loading: boolean;
  error: string | null;
  ndviOverlayEnabled: boolean;
  changeOverlayEnabled: boolean;
  setAoi: (aoi: GeoJsonGeometry | null) => void;
  setPrompt: (value: string) => void;
  setSearchLabel: (value: string) => void;
  setBefore: (value: DateRange) => void;
  setAfter: (value: DateRange) => void;
  setCloudCover: (value: number) => void;
  setThresholds: (value: AnalysisThresholds) => void;
  setSentinel: (value: FetchSentinelResponse | null) => void;
  setAnalysis: (value: AnalyzeResponse | null) => void;
  setManifest: (value: AnalysisManifest | null) => void;
  setLoading: (value: boolean) => void;
  setError: (value: string | null) => void;
  toggleNdviOverlay: () => void;
  toggleChangeOverlay: () => void;
};

const clearDerivedResults = {
  sentinel: null,
  analysis: null,
  manifest: null,
  error: null,
};

const currentYear = new Date().getFullYear();
const defaultBefore = { start: `${currentYear - 2}-01-01`, end: `${currentYear - 2}-12-31` };
const defaultAfter = { start: `${currentYear - 1}-01-01`, end: `${currentYear - 1}-12-31` };

export const useGarudaStore = create<GarudaState>()(
  persist(
    (set) => ({
      aoi: null,
      prompt: "",
      searchLabel: "Choose a place and draw an area of interest.",
      before: defaultBefore,
      after: defaultAfter,
      cloudCover: 20,
      thresholds: { vegetation: 0.18, water: 0.12, urban_brightness: 25 },
      sentinel: null,
      analysis: null,
      manifest: null,
      loading: false,
      error: null,
      ndviOverlayEnabled: true,
      changeOverlayEnabled: true,
      setAoi: (aoi) => set({ aoi, ...clearDerivedResults }),
      setPrompt: (prompt) => set({ prompt }),
      setSearchLabel: (searchLabel) => set({ searchLabel }),
      setBefore: (before) => set({ before, ...clearDerivedResults }),
      setAfter: (after) => set({ after, ...clearDerivedResults }),
      setCloudCover: (cloudCover) => set({ cloudCover, ...clearDerivedResults }),
      setThresholds: (thresholds) => set({ thresholds, ...clearDerivedResults }),
      setSentinel: (sentinel) => set({ sentinel }),
      setAnalysis: (analysis) => set({ analysis }),
      setManifest: (manifest) => set({ manifest }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      toggleNdviOverlay: () => set((state) => ({ ndviOverlayEnabled: !state.ndviOverlayEnabled })),
      toggleChangeOverlay: () => set((state) => ({ changeOverlayEnabled: !state.changeOverlayEnabled })),
    }),
    {
      name: "garuda-lens-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        aoi: state.aoi,
        prompt: state.prompt,
        searchLabel: state.searchLabel,
        before: state.before,
        after: state.after,
        cloudCover: state.cloudCover,
        thresholds: state.thresholds,
        sentinel: state.sentinel,
        analysis: state.analysis,
        manifest: state.manifest,
        ndviOverlayEnabled: state.ndviOverlayEnabled,
        changeOverlayEnabled: state.changeOverlayEnabled,
      }),
    }
  )
);
