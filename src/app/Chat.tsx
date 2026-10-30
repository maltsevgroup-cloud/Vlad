import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { hm, dshort } from "@/lib/dates";
import { sendMsg, CHEERS } from "./actions";
import { Avatar } from "./ui";
import { Send, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** het gesprek met je maat: bubbels, aanmoediging kiezen, eigen bericht */
export function ChatBody({ tall }: { tall?: boolean }) {
  const { data: d, update, typing } = useApp(); const [text, setText] = useState(""); const end = useRef<HTMLDivElement>(null);
  const n = d?.msgs.length ?? 0; useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [n, typing]);
  if (!d || !d.mate) return null; const mate = d.profiles[d.mate];
  const msgs = d.msgs.filter(m => (m.from === d.me && m.to === mate.uid) || (m.from === mate.uid && m.to === d.me)).slice(-60);
  const send = (t: string) => { if (!t.trim()) return; update(x => sendMsg(x, t)); setText(""); };
  const lastMine = [...msgs].reverse().find(m => m.from === d.me), seen = lastMine && msgs.some(m => m.from === mate.uid && m.at > lastMine.at);
  let lastDay = "";
  return <>
    <div className={cn("px-3 pb-2 overflow-y-auto grid gap-1 content-start", tall ? "grow min-h-0" : "max-h-[46vh]")} aria-live="polite">
      {msgs.map((m, i) => { const day = new Date(m.at).toDateString(), sep = day !== lastDay; lastDay = day; const mine = m.from === d.me, nextSame = msgs[i + 1] && msgs[i + 1].from === m.from && msgs[i + 1].at - m.at < 5 * 60000;
        return <div key={m.id} className="grid gap-1">{sep && <p className="text-center text-[11px] text-mute my-2">{day === new Date().toDateString() ? "Vandaag" : dshort(new Date(m.at).toISOString().slice(0, 10))}</p>}
          <div className={cn("flex items-end gap-1.5", mine ? "justify-end" : "justify-start")}>
            {!mine && <span className="w-7 shrink-0">{!nextSame && <Avatar p={mate} size={28} />}</span>}
            <div className={cn("max-w-[75%] rounded-[18px] px-3 py-2 text-[15px] leading-snug", mine ? "bg-accent text-accent-ink" : "bg-sunk", mine ? (nextSame ? "rounded-br-[6px]" : "rounded-br-[6px]") : "rounded-bl-[6px]")}>{m.text}<span className={cn("block text-[11px] mt-0.5 text-right", mine ? "opacity-75" : "text-mute")}>{hm(m.at)}</span></div></div>
          {mine && m === lastMine && <p className="justify-self-end text-[11px] text-mute pr-1">{seen ? `Gezien door ${mate.name}` : "Verstuurd"}</p>}</div>; })}
      {typing && <div className="flex items-end gap-1.5"><Avatar p={mate} size={28} /><span className="rounded-[18px] rounded-bl-[6px] bg-sunk px-3.5 py-3 flex gap-1" aria-label={`${mate.name} typt`}>{[0, 1, 2].map(k => <i key={k} className="h-2 w-2 rounded-full bg-[var(--mute)] animate-bounce" style={{ animationDelay: `${k * 120}ms` }} />)}</span></div>}
      <div ref={end} />
    </div>
    <details className="group border-t border-line shrink-0">
      <summary className="list-none cursor-pointer flex items-center justify-between px-4 h-11 text-[13px] font-semibold">Aanmoediging kiezen<ChevronDown size={16} className="text-mute transition group-open:rotate-180" /></summary>
      <div className="grid gap-1 px-3 pb-3">{CHEERS.map(c => <button key={c} className="text-left h-11 px-3 rounded-[10px] bg-sunk text-[14px] active:bg-accent-soft" onClick={e => { send(c); (e.currentTarget.closest("details") as HTMLDetailsElement).open = false; }}>{c}</button>)}</div>
    </details>
    <form className="flex gap-2 p-3 border-t border-line shrink-0" onSubmit={e => { e.preventDefault(); send(text); }}>
      <input id={tall ? "chat-pop-text" : "chat-text"} value={text} onChange={e => setText(e.target.value)} maxLength={200} placeholder="Typ een bericht" className="grow min-w-0 h-11 rounded-full bg-sunk px-4 text-[16px] outline-none focus:ring-2 focus:ring-[var(--accent)]" aria-label={`Bericht aan ${mate.name}`} enterKeyHint="send" />
      <button className="h-11 w-11 rounded-full bg-accent text-accent-ink grid place-items-center disabled:opacity-40" disabled={!text.trim()} aria-label="Versturen"><Send size={18} /></button></form>
  </>;
}

const POS_KEY = "gymmaat-nieuw.head";
/** zwevende chatknop zoals Messenger: foto van je maat, rood bolletje met het aantal ongelezen berichten,
    nieuw bericht verschijnt kort als ballon, verslepen naar links of rechts */
export function ChatHead({ bottom }: { bottom: number }) {
  const { data: d, unread, chatOpen, setChatOpen, typing, workout } = useApp();
  const [side, setSide] = useState<"l" | "r">(() => { try { return (JSON.parse(localStorage.getItem(POS_KEY) || "{}").side) || "r"; } catch { return "r"; } });
  const [dy, setDy] = useState<number>(() => { try { return JSON.parse(localStorage.getItem(POS_KEY) || "{}").dy || 0; } catch { return 0; } });
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null), [peek, setPeek] = useState<string | null>(null), [bump, setBump] = useState(false);
  const st = useRef<{ x: number; y: number; moved: boolean; dy0: number } | null>(null), prev = useRef(-1), born = useRef(Date.now()), pt = useRef<number | undefined>(undefined);
  useEffect(() => { // nieuw bericht: ballon + huppel + trillen
    if (!d) return; if (prev.current < 0 || Date.now() - born.current < 2500) { prev.current = unread; return; } // bij openen: alleen het getal, geen ballon
    if (unread > prev.current && !chatOpen) { const last = d.msgs.filter(m => m.from === d.mate).slice(-1)[0]; if (last) { setPeek(last.text); setBump(true); setTimeout(() => setBump(false), 600); try { navigator.vibrate?.([60, 40, 60]); } catch { /* geen trilfunctie */ } clearTimeout(pt.current); pt.current = window.setTimeout(() => setPeek(null), 5000); } }
    prev.current = unread; }, [unread, chatOpen, d]);
  if (!d || !d.mate) return null; const mate = d.profiles[d.mate], live = d.live[mate.uid];
  const save = (s: "l" | "r", y: number) => { try { localStorage.setItem(POS_KEY, JSON.stringify({ side: s, dy: y })); } catch { /* niet beschikbaar */ } };
  const H = typeof window !== "undefined" ? window.innerHeight : 800, maxUp = H - bottom - 160;
  const y = Math.max(-maxUp, Math.min(0, dy));
  const style: React.CSSProperties = drag ? { left: drag.x - 30, top: drag.y - 30, transition: "none" } : { [side === "r" ? "right" : "left"]: "max(12px, env(safe-area-inset-" + (side === "r" ? "right" : "left") + ", 0px))", bottom: `calc(${bottom - y}px + env(safe-area-inset-bottom, 0px))` };
  return <>
    {chatOpen && <ChatPopup onClose={() => setChatOpen(false)} />}
    {!chatOpen && <div className={cn("fixed z-[45] transition-[left,right,bottom,transform,opacity] duration-200", workout && "z-[45]")} style={style}>
      {peek && !drag && <button onClick={() => { setPeek(null); setChatOpen(true); }} className={cn("absolute bottom-1 w-[min(240px,62vw)] text-left rounded-[14px] bg-surface shadow-[var(--shadow-float,0_20px_40px_-12px_rgba(20,24,33,.35))] border border-line px-3 py-2 anim-sheet", side === "r" ? "right-[68px]" : "left-[68px]")} aria-label={`Nieuw bericht van ${mate.name}: ${peek}`}>
        <b className="block text-[12px]">{mate.name}</b><span className="text-[14px] line-clamp-2">{typing ? "typt…" : peek}</span></button>}
      <button aria-label={`Chat met ${mate.name}${unread ? `, ${unread} ongelezen ${unread === 1 ? "bericht" : "berichten"}` : ""}`}
        className={cn("relative h-[60px] w-[60px] rounded-full grid place-items-center shadow-[0_12px_28px_-10px_rgba(0,0,0,.55)] ring-[3px] ring-[var(--surface)] touch-none select-none", bump && "animate-[head-bump_.6s_ease]")}
        onPointerDown={e => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); st.current = { x: e.clientX, y: e.clientY, moved: false, dy0: y }; }}
        onPointerMove={e => { const s = st.current; if (!s) return; if (!s.moved && Math.hypot(e.clientX - s.x, e.clientY - s.y) < 8) return; s.moved = true; setDrag({ x: e.clientX, y: e.clientY }); setPeek(null); }}
        onPointerUp={e => { const s = st.current; st.current = null; if (!s) return; if (!s.moved) { setChatOpen(true); setPeek(null); return; }
          const ns = e.clientX < window.innerWidth / 2 ? "l" : "r", ny = s.dy0 - (e.clientY - s.y); setSide(ns); setDy(ny); save(ns, ny); setDrag(null); }}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setChatOpen(true); } }}>
        <Avatar p={mate} size={60} />
        {live && <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-[var(--plate-10)] ring-2 ring-[var(--surface)]" aria-hidden="true" />}
        {unread > 0 && <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#E5262B] text-white text-[12px] font-bold num grid place-items-center ring-2 ring-[var(--surface)]" aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}
      </button>
    </div>}
  </>;
}

/** chatvenster dat uit de knop opengaat */
function ChatPopup({ onClose }: { onClose: () => void }) {
  const { data: d } = useApp(); const box = useRef<HTMLDivElement>(null);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopImmediatePropagation(); onClose(); } }; window.addEventListener("keydown", k, true); setTimeout(() => (document.getElementById("chat-pop-text") as HTMLInputElement | null)?.focus({ preventScroll: true }), 50); return () => window.removeEventListener("keydown", k, true); }, [onClose]);
  if (!d || !d.mate) return null; const mate = d.profiles[d.mate], live = d.live[mate.uid];
  return <div className="fixed inset-0 z-[55] flex items-end justify-center" role="dialog" aria-modal="true" aria-label={`Chat met ${mate.name}`}>
    <div className="absolute inset-0 bg-black/40 anim-fade" onClick={onClose} />
    <div ref={box} className="relative w-full max-w-[480px] h-[min(78vh,640px)] bg-surface rounded-t-[22px] flex flex-col anim-sheet" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-line shrink-0">
        <span className="relative"><Avatar p={mate} size={40} />{live && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-[var(--plate-10)] ring-2 ring-[var(--surface)]" />}</span>
        <div className="grow min-w-0"><b className="block text-[16px]">{mate.name}</b><span className="text-[12px] text-mute truncate block">{live ? `Traint nu · ${live.exName}` : "Niet aan het trainen"}</span></div>
        <button onClick={onClose} className="h-11 w-11 grid place-items-center rounded-full bg-sunk" aria-label="Chat sluiten"><X size={18} /></button></div>
      <div className="flex flex-col grow min-h-0 pt-2"><ChatBody tall /></div>
    </div>
  </div>;
}
