"use client";

import Link from "next/link";
import { ArrowUpRight, MapPinned, Send, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useGarudaStore } from "@/store/use-garuda-store";

const examples = [
  "Show NDVI vegetation changes in Mumbai from 2020 to 2024",
  "Analyze development in Super Corridor Indore from 2020 to 2024",
  "Detect urban expansion in Bangalore using satellite imagery",
  "Monitor forest cover changes in Delhi NCR region",
];

export default function HomePage() {
  const [prompt, setPrompt] = useState("");
  const setStoredPrompt = useGarudaStore((state) => state.setPrompt);
  const router = useRouter();
  return (
    <main className="garuda-frame relative flex min-h-screen items-center justify-center overflow-hidden px-5 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-40 noise" />
      <Link href="/map-view" className="absolute right-6 top-6 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[.04] text-slate-400 transition hover:text-white"><Sparkles className="h-4 w-4" /></Link>
      <section className="relative z-10 w-full max-w-[760px] text-center">
        <div className="mb-6 flex items-center justify-center gap-4"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-black shadow-[0_0_40px_rgba(96,165,250,.25)]"><Sparkles className="h-7 w-7" /></div><h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">Earth Vision</h1></div>
        <p className="mx-auto max-w-xl text-sm leading-6 text-slate-500">Analyze vegetation changes, deforestation, and urban development using satellite imagery and NDVI analysis.</p>
        <form className="mx-auto mt-12 flex max-w-[620px] items-center rounded-[22px] border border-white/10 bg-[#0e1116] p-2 shadow-2xl shadow-black/30" onSubmit={(event) => { event.preventDefault(); const value = prompt.trim(); if (value) { setStoredPrompt(value); router.push(`/map-view?prompt=${encodeURIComponent(value)}`); } }}><input value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Analyze a place or ask a satellite question..." className="min-w-0 flex-1 bg-transparent px-5 text-sm text-white outline-none placeholder:text-slate-600" /><button type="submit" className="flex h-11 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-medium text-black transition hover:bg-slate-200"><Send className="h-4 w-4" /> Analyze</button></form>
        <p className="mt-8 text-xs text-slate-600">Try these examples to get started:</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{examples.map((example) => <button key={example} onClick={() => setPrompt(example)} className="flex min-h-14 items-center gap-3 rounded-2xl border border-white/10 bg-white/[.025] px-5 text-left text-xs leading-5 text-slate-400 transition hover:border-blue-400/40 hover:bg-white/[.06] hover:text-slate-200"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />{example}<ArrowUpRight className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-600" /></button>)}</div>
        <div className="mt-12 flex justify-center gap-8 text-xs text-slate-600"><span className="inline-flex items-center gap-2"><MapPinned className="h-3.5 w-3.5" /> Sentinel-2 imagery</span><span>Public screening tool</span></div>
      </section>
    </main>
  );
}
