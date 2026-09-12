"use client";

import { ArrowLeft, Bot, Copy, Send, ThumbsDown, ThumbsUp, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export function WorkspaceChatRail({ compact = false }: { compact?: boolean }) {
  const [message, setMessage] = useState("analyze new building development near 'infosys pune'");
  const [feedback, setFeedback] = useState("");
  const router = useRouter();
  const submitMessage = () => {
    const value = message.trim();
    if (value) router.push(`/map-view?prompt=${encodeURIComponent(value)}`);
  };
  return (
    <aside className={`flex min-h-[calc(100vh-72px)] flex-col border-r border-white/10 bg-[#090b0e] ${compact ? "w-full" : "w-full lg:w-[39%]"}`}>
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-5"><div><h2 className="text-sm font-semibold">Earth Vision</h2><p className="mt-1 max-w-[280px] text-xs leading-4 text-slate-600">Ask questions about deforestation, urbanization, and climate change using satellite imagery</p></div><Link href="/" className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs font-medium text-slate-300"><ArrowLeft className="h-3.5 w-3.5" /> New Query</Link></div>
      <div className="flex-1 space-y-5 overflow-auto p-5"><div className="flex items-start gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-semibold text-black"><User className="h-3.5 w-3.5" /></span><div className="rounded-2xl bg-[#202226] px-4 py-3 text-sm text-slate-200">{message}</div></div><div className="flex items-start gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 text-slate-400"><Bot className="h-3.5 w-3.5" /></span><div className="max-w-[90%] rounded-2xl bg-[#17191d] px-4 py-3 text-sm leading-6 text-slate-400">Draw an area on the map, then confirm the analysis proposal to run satellite and NDVI processing.</div></div></div>
      <div className="border-t border-white/10 p-4"><div className="flex items-center rounded-2xl border border-white/10 bg-[#111317] p-2"><input value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submitMessage(); }} className="min-w-0 flex-1 bg-transparent px-3 text-xs text-slate-500 outline-none placeholder:text-slate-700" placeholder="Ask about satellite change detection..." /><button type="button" onClick={submitMessage} className="grid h-9 w-9 place-items-center rounded-xl bg-white text-black" aria-label="Open analysis workspace"><Send className="h-4 w-4" /></button></div><div className="mt-3 flex items-center gap-4 text-slate-700"><button type="button" aria-label="Copy query" title="Copy query" onClick={() => { void navigator.clipboard?.writeText(message); setFeedback("Copied"); }}><Copy className="h-3.5 w-3.5" /></button><button type="button" aria-label="Helpful" title="Helpful" onClick={() => setFeedback("Thanks for the feedback") }><ThumbsUp className="h-3.5 w-3.5" /></button><button type="button" aria-label="Not helpful" title="Not helpful" onClick={() => setFeedback("Feedback recorded") }><ThumbsDown className="h-3.5 w-3.5" /></button>{feedback ? <span className="text-[10px] text-slate-500">{feedback}</span> : null}</div></div>
    </aside>
  );
}
