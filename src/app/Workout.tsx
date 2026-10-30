import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import type { Feel, ItemLog, Session } from "@/lib/types";
import { exById, suggest, history, doneSets, isDone, fmtKg, volume, prsIn, finished } from "@/lib/logic";
import { mmss, dshort } from "@/lib/dates";
import { syncLive } from "./actions";
import { useSwipeBack } from "./swipe";
import { badgeStates, newLevels } from "@/lib/rewards";
import { Btn, Ring, Sheet, Stepper, PlateBar } from "./ui";
import { Trend } from "./Home";
import { ChevronDown, ChevronLeft, Check, Plus, Minus, Timer, StickyNote, Trophy, X } from "lucide-react";
import { cn } from "@/lib/utils";

let actx: AudioContext | null = null;
let PREF = { sound: true, vibrate: true };
const beep = () => { try { if (PREF.vibrate) navigator.vibrate?.([120, 80, 120]); if (!actx || !PREF.sound) return; const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = 880; g.gain.setValueAtTime(.18, actx.currentTime); g.gain.exponentialRampToValueAtTime(.001, actx.currentTime + .5); o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + .5); } catch { /* geen geluid */ } };
const unlock = () => { try { actx = actx || new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); actx.resume(); } catch { /* idem */ } };

export function Workout({ sid }: { sid: string }) {
  const { data: d, update, openWorkout, toast, setCelebrate, setStreakPop } = useApp();
  useSwipeBack(() => openWorkout(null));
  const s = d?.sessions[sid];
  const [now, setNow] = useState(Date.now());
  const [open, setOpen] = useState<string | null>(null);
  const [rest, setRest] = useState<{ end: number; total: number } | null>(null);
  const [hold, setHold] = useState<{ pid: string; i: number; end: number; total: number } | null>(null);
  const [ask, setAsk] = useState<string | null>(null);
  const [finish, setFinish] = useState(false);
  const [rating, setRating] = useState(4);
  const [notes, setNotes] = useState<Record<string, boolean>>({});
  const firedRest = useRef(false);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, []);
  useEffect(() => { if (rest && now >= rest.end && !firedRest.current) { firedRest.current = true; beep(); setTimeout(() => setRest(null), 1200); } }, [now, rest]);
  useEffect(() => { if (hold && now >= hold.end) { const h = hold; setHold(null); beep(); edit(x => { const z = x.items.find(i => i.pid === h.pid)?.sets[h.i]; if (z) { z.done = true; z.r = Math.max(z.r, Math.round(h.total / (exById(d!, x.items.find(i => i.pid === h.pid)!.exId).kind === "cardio" ? 60 : 1))); z.at = Date.now(); } }); afterSet(h.pid); } }, [now]); // eslint-disable-line
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape" && !document.querySelector("[aria-modal=true]")) openWorkout(null); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [openWorkout]);
  const head = useRef<HTMLHeadingElement>(null); useEffect(() => { head.current?.focus(); }, []);
  const active = useMemo(() => s?.items.find(i => i.sets.some(z => !z.done))?.pid ?? null, [s]);
  useEffect(() => { if (open === null && active) setOpen(active); }, [active]); // eslint-disable-line
  if (!d || !s) return null;
  const prof = d.profiles[s.uid]; PREF = { sound: prof.sound !== false, vibrate: prof.vibrate !== false }; const plan = d.plans[s.uid]?.[s.day], ro = !!s.finishedAt;
  const edit = (fn: (x: Session) => void) => update(x => { const ss = x.sessions[sid]; if (ss) { fn(ss); syncLive(x, sid); } });
  const total = s.items.reduce((a, i) => a + i.sets.length, 0), done = s.items.reduce((a, i) => a + i.sets.filter(isDone).length, 0);
  const elapsed = Math.floor(((s.finishedAt || now) - s.startedAt) / 1000);

  function afterSet(pid: string) {
    const x = d!.sessions[sid], il = x?.items.find(i => i.pid === pid); if (!x || !il) return;
    const left = il.sets.filter(z => !z.done).length;
    if (left <= 1) { setAsk(pid); const nxt = x.items.find(i => i.pid !== pid && i.sets.some(z => !z.done)); if (nxt) setOpen(nxt.pid); }
    const r = plan?.items.find(p => p.id === pid)?.rest ?? prof.rest;
    if (r > 0 && (left > 1 || x.items.some(i => i.pid !== pid && i.sets.some(z => !z.done)))) { firedRest.current = false; setRest({ end: Date.now() + r * 1000, total: r }); }
  }
  const toggle = (pid: string, i: number) => { unlock(); const z = s.items.find(x => x.pid === pid)!.sets[i]; const was = z.done;
    edit(x => { const q = x.items.find(y => y.pid === pid)!.sets[i]; q.done = !q.done; q.at = Date.now(); });
    if (!was) { try { if (PREF.vibrate) navigator.vibrate?.(12); } catch { /* geen trilfunctie */ } if (z.r === 0) toast("Set met 0 herhalingen telt niet als uitgevoerd."); afterSet(pid); } };
  const setVal = (pid: string, i: number, k: "w" | "r", v: number) => edit(x => { const il = x.items.find(y => y.pid === pid)!, old = il.sets[i][k]; il.sets[i][k] = v; for (let j = i + 1; j < il.sets.length; j++) if (!il.sets[j].done && il.sets[j][k] === old) il.sets[j][k] = v; });

  const summary = () => { const prs = prsIn(d, s); return { prs, vol: volume(d, s) }; };
  const doFinish = () => { const before = badgeStates(d, d.me), after = structuredClone(d); after.sessions[sid].finishedAt = Date.now(); after.sessions[sid].rating = rating;
    const fresh = newLevels(before, badgeStates(after, d.me)).map(x => x.b.id);
    edit(x => { x.finishedAt = Date.now(); x.rating = rating; }); setFinish(false); setRest(null); openWorkout(null);
    // streak-venster alleen als er minstens één set echt gedaan is (deels of helemaal); daarna eventueel nieuwe badges
    if (finished(s)) setTimeout(() => setStreakPop(fresh), 250); else if (fresh.length) setTimeout(() => setCelebrate(fresh), 250); else toast(`${s.title} opgeslagen.`); };

  return <div className="fixed inset-0 z-40 bg-bg overflow-y-auto" role="dialog" aria-modal="false" aria-label={`Training ${s.title}`}>
    <div className="max-w-[480px] mx-auto gutter pb-40">
      <header className="sticky z-10 bg-bg flex items-center gap-3 py-3" style={{ top: "env(safe-area-inset-top, 0px)" }}>
        <button onClick={() => openWorkout(null)} className="h-11 w-11 grid place-items-center rounded-full bg-surface" aria-label="Terug naar overzicht"><ChevronLeft size={20} /></button>
        <div className="grow min-w-0"><h1 ref={head} tabIndex={-1} className="display text-[22px] font-bold uppercase leading-none truncate outline-none">{s.title}</h1>
          <p className="text-[12px] text-mute num mt-0.5">{ro ? `Afgerond · ${dshort(s.date)}` : <>Bezig · {mmss(elapsed)}</>}</p></div>
        <Ring value={total ? done / total : 0} size={44}><span className="text-[11px] font-bold num">{done}/{total}</span></Ring>
        <span className="absolute left-0 right-0 -bottom-px h-[3px] bg-sunk rounded-full overflow-hidden" aria-hidden="true"><span className="block h-full bg-accent transition-all duration-300" style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></span>
      </header>

      <div className="grid gap-2.5 mt-1">
        {s.items.map((il, idx) => { const ex = exById(d, il.exId), pi = plan?.items.find(p => p.id === il.pid), sg = pi ? suggest(d, s.uid, pi, sid) : null;
          const prev = history(d, s.uid, il.exId, sid)[0], isOpen = open === il.pid, ds = doneSets(il).length, all = il.sets.every(z => z.done);
          const unitR = ex.kind === "tijd" ? "sec" : ex.kind === "cardio" ? "min" : "herh", timed = ex.kind === "tijd" || ex.kind === "cardio";
          const cols = ex.kind === "gewicht" ? "grid-cols-[18px_1.25fr_1fr_44px]" : timed ? "grid-cols-[20px_1fr_44px_44px]" : "grid-cols-[20px_1fr_44px]";
          return <section key={il.pid} className={cn("rounded-[18px] bg-surface transition", active === il.pid && !ro && "ring-2 ring-[var(--accent)]")}>
            <button className="w-full flex items-center gap-3 p-4 text-left" onClick={() => setOpen(isOpen ? null : il.pid)} aria-expanded={isOpen}>
              <span className={cn("h-9 w-9 rounded-full grid place-items-center shrink-0 display font-bold text-[18px]", all && ds ? "bg-good text-good-ink" : "bg-sunk text-mute")}>{all && ds ? <Check size={18} /> : idx + 1}</span>
              <span className="grow min-w-0"><b className="block text-[15px] truncate">{ex.name}</b>
                <span className="text-[12px] text-mute num">{ds}/{il.sets.length} sets{ex.kind === "gewicht" && il.sets[0] ? ` · ${fmtKg(il.sets[0].w)} kg` : ""}{il.feel ? ` · ${il.feel}` : ""}</span></span>
              <ChevronDown size={18} className={cn("text-mute transition", isOpen && "rotate-180")} />
            </button>
            {isOpen && <div className="px-4 pb-4 grid gap-3">
              {sg && <p className="text-[13px] flex items-center gap-1.5 -mt-1"><Trend t={sg.trend} /><span>{sg.why}</span></p>}
              {prev && <p className="text-[12px] text-mute -mt-1.5">Vorige keer ({dshort(prev.date)}): {doneSets(prev.log).map(z => ex.kind === "gewicht" ? `${fmtKg(z.w)}×${z.r}` : `${z.r}`).join(", ")}{ex.kind === "tijd" ? " sec" : ex.kind === "cardio" ? " min" : ""}</p>}
              {ex.kind === "gewicht" && ex.bar && <PlateBar total={il.sets.find(z => !z.done)?.w ?? il.sets[0]?.w ?? 0} bar={ex.bar} />}
              {ex.kind === "cardio" && <div className="grid grid-cols-2 gap-2">
                <div><span className="label">Snelheid km/u</span><Stepper id={`sp-${il.pid}`} label="Snelheid" value={il.speed ?? 8} step={0.5} onChange={v => edit(x => { x.items.find(y => y.pid === il.pid)!.speed = v; })} /></div>
                <div><span className="label">Helling %</span><Stepper id={`inc-${il.pid}`} label="Helling" value={il.incline ?? 1} step={1} onChange={v => edit(x => { x.items.find(y => y.pid === il.pid)!.incline = v; })} /></div></div>}
              <div className="grid gap-2">
                <div className={cn("grid items-center gap-1.5 label", cols)}><span>Set</span>{ex.kind === "gewicht" && <span className="text-center">kg</span>}<span className="text-center">{unitR}</span>{timed && <span />}<span /></div>
                {il.sets.map((z, i) => { const holding = hold?.pid === il.pid && hold.i === i;
                  return <div key={i} className={cn("grid items-center gap-1.5 rounded-[12px] transition", cols, z.done && (z.r > 0 ? "opacity-70" : "opacity-50"))}>
                    <span className="display font-bold text-[18px] text-mute text-center num">{i + 1}</span>
                    {ex.kind === "gewicht" && <Stepper compact id={`w-${il.pid}-${i}`} label={`Set ${i + 1} gewicht in kg`} value={z.w} step={ex.step || 1} onChange={v => setVal(il.pid, i, "w", v)} />}
                    {holding ? <div className="h-11 rounded-[12px] bg-accent text-accent-ink flex items-center justify-between px-3"><span className="display text-[22px] font-bold num">{mmss((hold.end - now) / 1000)}</span><button onClick={() => setHold(null)} className="text-[12px] font-semibold underline">Stop</button></div>
                      : <Stepper compact id={`r-${il.pid}-${i}`} label={`Set ${i + 1} ${unitR}`} value={z.r} step={ex.kind === "tijd" ? 5 : 1} onChange={v => setVal(il.pid, i, "r", v)} />}
                    {timed && <button disabled={z.done || holding} className="h-12 w-11 rounded-[12px] bg-accent-soft text-accent grid place-items-center disabled:opacity-35" aria-label={`Start timer set ${i + 1}`} onClick={() => { unlock(); const sec = ex.kind === "cardio" ? z.r * 60 : z.r; setHold({ pid: il.pid, i, end: Date.now() + sec * 1000, total: sec }); }}><Timer size={19} /></button>}
                    {<button onClick={() => toggle(il.pid, i)} disabled={holding} className={cn("h-12 w-11 rounded-[12px] grid place-items-center transition", z.done ? (z.r > 0 ? "bg-good text-good-ink" : "bg-sunk text-mute") : "bg-sunk text-mute")} aria-pressed={z.done} aria-label={`Set ${i + 1} ${z.done ? "ongedaan maken" : "afvinken"}`}>{z.done && z.r === 0 ? <X size={19} /> : <Check size={20} strokeWidth={2.6} />}</button>}
                  </div>; })}
                {timed && <p className="text-[12px] text-mute">Start de klok, dan vinkt de set vanzelf af als de tijd om is. Zonder klok: pas de tijd aan en vink zelf af.</p>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {ex.kind !== "cardio" && <><Btn variant="ghost" size="sm" onClick={() => edit(x => { const y = x.items.find(q => q.pid === il.pid)!, l = y.sets[y.sets.length - 1]; y.sets.push({ w: l?.w ?? 0, r: l?.r ?? y.target, done: false }); })}><Plus size={15} />Set</Btn>
                  <Btn variant="ghost" size="sm" disabled={il.sets.length <= 1 || il.sets[il.sets.length - 1].done} onClick={() => edit(x => { x.items.find(q => q.pid === il.pid)!.sets.pop(); })}><Minus size={15} />Set</Btn></>}
                <Btn variant="ghost" size="sm" onClick={() => setNotes(n => ({ ...n, [il.pid]: !n[il.pid] }))}><StickyNote size={15} />{il.note ? "Notitie" : "Notitie toevoegen"}</Btn>
              </div>
              {(notes[il.pid] || il.note) && <textarea id={`note-${il.pid}`} className="w-full rounded-[12px] bg-sunk p-3 text-[16px] outline-none focus:ring-2 focus:ring-[var(--accent)]" rows={2} maxLength={240} placeholder="Bv. ander toestel, stoel op stand 4" value={il.note || ""} onChange={e => edit(x => { x.items.find(q => q.pid === il.pid)!.note = e.target.value; })} />}
            </div>}
          </section>; })}
      </div>

      {!ro ? <div className="mt-5 grid gap-2"><Btn size="lg" variant={done === total ? "primary" : "line"} onClick={() => setFinish(true)}>{done === total ? "Training afronden" : "Training afronden zonder alles"}</Btn>
        {done < total && <p className="text-[12px] text-mute text-center">Niet afgevinkte sets tellen niet mee voor je voortgang.</p>}</div>
        : <Btn size="lg" variant="ghost" className="w-full mt-5" onClick={() => openWorkout(null)}>Sluiten</Btn>}
    </div>

    {rest && <div className="fixed left-0 right-0 bottom-0 z-40 flex justify-center pointer-events-none" style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
      <div className="pointer-events-auto w-[calc(100%-24px)] max-w-[456px] rounded-[18px] bg-ink text-bg p-3.5 shadow-2xl anim-sheet" role="timer" aria-live="polite">
        <div className="flex items-center gap-3"><div className="grow"><p className="text-[12px] font-bold uppercase tracking-[.09em] opacity-70">{now >= rest.end ? "Rust voorbij" : "Rust"}</p><b className="display text-[34px] leading-none num">{mmss((rest.end - now) / 1000)}</b></div>
          <button className="h-11 px-3 rounded-[10px] bg-white/10 text-[13px] font-semibold" onClick={() => setRest(r => r && { ...r, end: Math.max(Date.now(), r.end - 15000) })}>−15</button>
          <button className="h-11 px-3 rounded-[10px] bg-white/10 text-[13px] font-semibold" onClick={() => setRest(r => r && { end: r.end + 15000, total: r.total + 15 })}>+15</button>
          <button className="h-11 px-3 rounded-[10px] bg-bg text-ink text-[13px] font-semibold" onClick={() => setRest(null)}>Verder</button></div>
        <div className="h-1.5 rounded-full bg-white/15 mt-3 overflow-hidden"><div className="h-full bg-[var(--plate-15)] rounded-full" style={{ width: `${Math.max(0, Math.min(100, ((rest.end - now) / (rest.total * 1000)) * 100))}%` }} /></div>
      </div></div>}

    <Sheet open={!!ask} onClose={() => setAsk(null)} title="Hoe ging het?" sub={ask ? exById(d, s.items.find(i => i.pid === ask)!.exId).name + ". Sluiten met het kruisje bewaart niets." : ""}>
      {rest && <p className="mb-3 rounded-[12px] bg-ink text-bg px-3 py-2 text-[13px] flex justify-between" role="timer"><span>Rust loopt</span><b className="num">{mmss((rest.end - now) / 1000)}</b></p>}
      <div className="grid grid-cols-3 gap-2">{([["licht", "Licht", "Kon meer"], ["goed", "Goed", "Precies goed"], ["zwaar", "Zwaar", "Op het randje"]] as [Feel, string, string][]).map(([k, n, sub]) =>
        <button key={k} className="rounded-[14px] bg-sunk py-4 grid gap-0.5 active:bg-accent-soft" onClick={() => { const pid = ask!; edit(x => { const il: ItemLog | undefined = x.items.find(i => i.pid === pid); if (il) il.feel = k; }); setAsk(null); }}>
          <b className="display text-[22px] uppercase">{n}</b><span className="text-[11px] text-mute">{sub}</span></button>)}</div>
      <p className="text-[12px] text-mute mt-3">Zwaar betekent: volgende keer nog niet zwaarder, ook al haalde je alle sets.</p>
    </Sheet>

    <Sheet open={finish} onClose={() => setFinish(false)} title="Training afronden">
      {(() => { const { prs, vol } = summary(); return <div className="grid gap-4">
        <div className="grid grid-cols-3 gap-2 text-center">{[["Tijd", mmss(elapsed)], ["Sets", `${done}/${total}`], ["Volume", `${fmtKg(Math.round(vol))} kg`]].map(([k, v]) => <div key={k} className="rounded-[14px] bg-sunk py-3"><b className="display text-[26px] num block leading-none">{v}</b><span className="text-[11px] text-mute">{k}</span></div>)}</div>
        {prs.length > 0 && <div className="rounded-[14px] bg-good-soft p-3"><p className="flex items-center gap-1.5 font-semibold text-good"><Trophy size={16} />Nieuw record{prs.length > 1 ? "s" : ""}</p>
          <ul className="text-[13px] mt-1">{prs.map(p => <li key={p.exId}>{exById(d, p.exId).name}: {fmtKg(p.w)} kg × {p.r}</li>)}</ul></div>}
        <div><p className="label mb-2">Hoe voelde de training?</p><div className="grid grid-cols-5 gap-1.5">{[1, 2, 3, 4, 5].map(n => <button key={n} onClick={() => setRating(n)} aria-pressed={rating === n} className={cn("h-12 rounded-[12px] display text-[22px] font-bold", rating === n ? "bg-accent text-accent-ink" : "bg-sunk")}>{n}</button>)}</div>
          <div className="flex justify-between text-[11px] text-mute mt-1"><span>zwaar</span><span>top</span></div></div>
        <Btn size="lg" onClick={doFinish}>Opslaan</Btn>
      </div>; })()}
    </Sheet>
  </div>;
}
