import { useRef, useState, useEffect } from "react";
import { useApp, type Tab } from "@/lib/store";
import { nextTraining } from "@/lib/logic";
import { today } from "@/lib/dates";
import { startSession } from "./actions";
import { House, ClipboardList, Users, Settings as Cog, Dumbbell, LineChart, Award } from "lucide-react";
import { cn } from "@/lib/utils";

const ORDER: Tab[] = ["vandaag", "schema", "samen", "profiel"];
const NAME: Record<Tab, string> = { vandaag: "Home", schema: "Schema", samen: "Samen", profiel: "Instellingen" };

/** test: geen menubalk, alleen een lijn onderaan zoals op een iPhone.
    Veeg links of rechts over de lijn = volgende of vorige pagina. Tik of veeg omhoog = overzicht van alle pagina's. */
export function GestureBar() {
  const { data, tab, setTab, setPage, page, update, openWorkout, unread } = useApp();
  const [open, setOpen] = useState(false), [label, setLabel] = useState<string | null>(null), [dx, setDx] = useState(0);
  const st = useRef<{ x: number; y: number; t: number } | null>(null), lt = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(lt.current), []);
  if (!data) return null;
  const show = (t: string) => { setLabel(t); clearTimeout(lt.current); lt.current = window.setTimeout(() => setLabel(null), 900); };
  const go = (t: Tab) => { setPage(null); setTab(t); window.scrollTo(0, 0); show(NAME[t]); try { navigator.vibrate?.(8); } catch { /* geen trilfunctie */ } };
  const step = (dir: number) => { const i = ORDER.indexOf(tab), n = ORDER[(i + dir + ORDER.length) % ORDER.length]; go(n); };
  const train = () => { setOpen(false); const live = data.live[data.me]; if (live && data.sessions[live.sessionId] && !data.sessions[live.sessionId].finishedAt) { openWorkout(live.sessionId); return; }
    const nt = nextTraining(data, data.me); if (!nt) { go("schema"); return; } let id = ""; update(d => { id = startSession(d, nt.day); }); setTimeout(() => openWorkout(id || `${data.me}_${today()}_${nt.day}`), 0); };
  const nt = nextTraining(data, data.me), pd = nt ? data.plans[data.me]?.[nt.day] : undefined;
  const cards: { k: string; n: string; s?: string; I: typeof House; on: boolean; act: () => void; badge?: number }[] = [
    { k: "vandaag", n: "Home", I: House, on: tab === "vandaag" && !page, act: () => { setOpen(false); go("vandaag"); } },
    { k: "schema", n: "Schema", I: ClipboardList, on: tab === "schema" && !page, act: () => { setOpen(false); go("schema"); } },
    { k: "samen", n: "Samen", s: unread ? `${unread} nieuw` : undefined, I: Users, on: tab === "samen" && !page, act: () => { setOpen(false); go("samen"); }, badge: unread },
    { k: "voortgang", n: "Voortgang", I: LineChart, on: page === "voortgang", act: () => { setOpen(false); setPage("voortgang"); } },
    { k: "badges", n: "Badges", I: Award, on: page === "badges", act: () => { setOpen(false); setPage("badges"); } },
    { k: "profiel", n: "Instellingen", I: Cog, on: tab === "profiel" && !page, act: () => { setOpen(false); go("profiel"); } },
  ];
  return <>
    {label && <div className="fixed left-1/2 -translate-x-1/2 z-[44] rounded-full bg-ink text-bg px-4 h-9 grid place-items-center text-[14px] font-semibold anim-fade" style={{ bottom: "calc(44px + env(safe-area-inset-bottom, 0px))" }} aria-hidden="true">{label}</div>}
    <div className="fixed left-1/2 -translate-x-1/2 z-[38] w-[62%] max-w-[300px] h-[34px] grid place-items-center touch-none select-none" style={{ bottom: "calc(6px + env(safe-area-inset-bottom, 0px))" }}
      role="button" tabIndex={0} aria-label="Pagina's: tik voor overzicht, veeg links of rechts om te wisselen"
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(true); } if (e.key === "ArrowRight") step(1); if (e.key === "ArrowLeft") step(-1); }}
      onPointerDown={e => { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); st.current = { x: e.clientX, y: e.clientY, t: Date.now() }; }}
      onPointerMove={e => { if (st.current) setDx(Math.max(-40, Math.min(40, (e.clientX - st.current.x) / 3))); }}
      onPointerUp={e => { const s = st.current; st.current = null; setDx(0); if (!s) return; const x = e.clientX - s.x, y = e.clientY - s.y;
        if (Math.abs(x) > 50 && Math.abs(x) > Math.abs(y)) step(x < 0 ? 1 : -1); else if (y < -30 || (Math.abs(x) < 10 && Math.abs(y) < 10)) setOpen(true); }}
      onPointerCancel={() => { st.current = null; setDx(0); }}>
      <span className="block h-[5px] w-[134px] rounded-full bg-ink transition-transform shadow-[0_0_0_1.5px_var(--bg)]" style={{ transform: `translateX(${dx}px)`, opacity: .85 }} />
      {unread > 0 && <span className="absolute right-[calc(50%-82px)] top-[12px] h-2.5 w-2.5 rounded-full bg-[#E5262B]" aria-hidden="true" />}
    </div>
    {open && <div className="fixed inset-0 z-[58] flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Pagina's">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] anim-fade" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-[480px] gutter anim-sheet" style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}>
        <button onClick={train} className="w-full mb-2.5 rounded-[18px] bg-accent text-accent-ink p-4 flex items-center gap-3 text-left active:scale-[.99] transition">
          <span className="h-12 w-12 rounded-full grid place-items-center shrink-0" style={{ background: "color-mix(in srgb, var(--accent-ink) 15%, transparent)" }} data-x=""><Dumbbell size={24} /></span>
          <span className="grow min-w-0"><b className="block text-[17px]">{data.live[data.me] ? "Training verderzetten" : "Start training"}</b><span className="text-[13px] opacity-85 truncate block">{pd ? pd.title : "Geen training gepland"}</span></span></button>
        <div className="grid grid-cols-3 gap-2.5">{cards.map(c => <button key={c.k} onClick={c.act} aria-current={c.on ? "page" : undefined}
          className={cn("relative rounded-[18px] bg-surface p-3 h-[96px] flex flex-col justify-between text-left active:scale-[.97] transition", c.on && "ring-2 ring-[var(--accent)]")}>
          <c.I size={22} className={c.on ? "text-accent" : "text-ink"} /><span><b className="block text-[14px]">{c.n}</b>{c.s && <span className="text-[12px] text-mute">{c.s}</span>}</span>
          {c.badge ? <span className="absolute top-2.5 right-2.5 min-w-[20px] h-5 px-1.5 rounded-full bg-[#E5262B] text-white text-[11px] font-bold grid place-items-center">{c.badge}</span> : null}</button>)}</div>
        <button onClick={() => setOpen(false)} className="mx-auto mt-3 block h-[5px] w-[134px] rounded-full bg-white/70" aria-label="Sluiten" />
      </div>
    </div>}
  </>;
}
