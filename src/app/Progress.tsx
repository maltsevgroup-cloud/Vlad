import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { sessionsOf, doneSets, exById, e1rm, fmtKg, records, weekSessions, finished } from "@/lib/logic";
import { today, addDays, dshort, mondayOf, pdate, monthName } from "@/lib/dates";
import { Btn, Card, Seg, Stepper, Page } from "./ui";
import { LineChart, PairBars } from "./charts";
import { Trophy, Lock, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Progress({ initial = "kracht" }: { initial?: "kracht" | "gewicht" | "records" }) {
  const { data: d, update, toast, back, undoable } = useApp();
  const [view, setView] = useState<"kracht" | "gewicht" | "records">(initial);
  const [metric, setMetric] = useState<"e1rm" | "top">("e1rm");
  const exList = useMemo(() => { if (!d) return []; const c: Record<string, number> = {}; sessionsOf(d, d.me).forEach(s => s.items.forEach(il => { if (exById(d, il.exId).kind === "gewicht" && doneSets(il).length) c[il.exId] = (c[il.exId] || 0) + 1; })); return Object.entries(c).sort((a, b) => b[1] - a[1]).map(x => x[0]); }, [d]);
  const [ex, setEx] = useState<string>("");
  const [bwVal, setBwVal] = useState<number | null>(null);
  if (!d) return null;
  const exId = ex || exList[0], t = today();
  const pts = exId ? sessionsOf(d, d.me).flatMap(s => s.items.filter(il => il.exId === exId && doneSets(il).length).map(il => { const ds = doneSets(il);
    const top = ds.reduce((a, z) => z.w > a.w || (z.w === a.w && z.r > a.r) ? z : a, ds[0]), best = Math.max(...ds.map(z => e1rm(z.w, z.r)));
    return { x: dshort(s.date), y: metric === "e1rm" ? Math.round(best * 10) / 10 : top.w, label: `${dshort(s.date)} · zwaarste set ${fmtKg(top.w)} × ${top.r}`, sets: ds }; })) : [];
  const mon = mondayOf(t), weeks = Array.from({ length: 8 }, (_, i) => addDays(mon, (i - 7) * 7));
  const bwPts = Object.entries(d.bw).sort((a, b) => a[0] < b[0] ? -1 : 1).map(([k, v]) => ({ x: dshort(k), y: v, label: dshort(k) }));
  const lastBw = bwPts[bwPts.length - 1]?.y, bw30 = Object.entries(d.bw).filter(([k]) => k <= addDays(t, -28)).sort((a, b) => a[0] < b[0] ? 1 : -1)[0]?.[1];
  const days = new Set(sessionsOf(d, d.me).filter(finished).map(s => s.date)), ym = t.slice(0, 7), first = pdate(ym + "-01"), off = (first.getDay() + 6) % 7, nDays = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const mate = d.mate ? d.profiles[d.mate] : null;

  return <Page title="Voortgang" onBack={back}>
    <Seg value={view} onChange={setView} label="Weergave" options={[["kracht", "Kracht"], ["gewicht", "Lichaamsgewicht"], ["records", "Records"]]} />

    {view === "kracht" && <>
      <Card className="grid gap-3">
        <div className="flex items-center gap-2"><select id="prog-ex" aria-label="Oefening" className="grow min-w-0 h-11 rounded-[10px] bg-sunk px-3 font-semibold text-[16px] outline-none" value={exId} onChange={e => setEx(e.target.value)}>
          {exList.map(id => <option key={id} value={id}>{exById(d, id).name}</option>)}</select></div>
        <Seg value={metric} onChange={setMetric} label="Maatstaf" options={[["e1rm", "Geschat maximum"], ["top", "Zwaarste set"]]} />
        {pts.length > 1 && <div className="flex items-baseline gap-2"><b className="display text-[40px] leading-none num">{fmtKg(pts[pts.length - 1].y)}<span className="text-[18px] ml-1">kg</span></b>
          <span className={cn("text-[13px] font-semibold", pts[pts.length - 1].y >= pts[0].y ? "text-good" : "text-warn")}>{pts[pts.length - 1].y >= pts[0].y ? "+" : ""}{fmtKg(Math.round((pts[pts.length - 1].y - pts[0].y) * 10) / 10)} kg sinds {pts[0].x}</span></div>}
        <LineChart pts={pts} unit="kg" title={`${exById(d, exId || "").name} ${metric === "e1rm" ? "geschat maximum" : "zwaarste set"}`} />
        <p className="text-[12px] text-mute">{metric === "e1rm" ? "Geschat maximum voor 1 herhaling, berekend uit je beste set (formule van Epley). Een richtwaarde, geen test." : "Het zwaarste gewicht dat je die dag in een afgevinkte set deed."}</p>
      </Card>
      {mate && <Card><p className="label mb-2">Trainingen per week</p><PairBars weeks={weeks.map(w => dshort(w).split(" ")[0] + " " + dshort(w).split(" ")[1])} a={weeks.map(w => weekSessions(d, d.me, w).length)} b={weeks.map(w => weekSessions(d, mate.uid, w).length)} aName="Jij" bName={mate.name} /></Card>}
      <Card><p className="label mb-3">{monthName(first.getMonth())} {first.getFullYear()}</p>
        <div className="grid grid-cols-7 gap-1 text-center">{["ma", "di", "wo", "do", "vr", "za", "zo"].map(k => <span key={k} className="text-[12px] font-bold uppercase text-mute">{k}</span>)}
          {Array.from({ length: off }, (_, i) => <span key={"o" + i} />)}
          {Array.from({ length: nDays }, (_, i) => { const k = `${ym}-${String(i + 1).padStart(2, "0")}`, on = days.has(k); return <span key={k} className={cn("h-8 grid place-items-center rounded-[10px] text-[12px] num", on ? "bg-accent text-accent-ink font-bold" : "text-mute", k === t && !on && "ring-1 ring-[var(--ink)]")} aria-label={`${i + 1}: ${on ? "getraind" : "niet getraind"}`}>{i + 1}</span>; })}</div>
        <p className="text-[12px] text-mute mt-2">{[...days].filter(k => k.startsWith(ym)).length} trainingen deze maand</p></Card>
    </>}

    {view === "gewicht" && <>
      <Card className="grid gap-3"><div className="flex items-center gap-1.5 text-[12px] text-mute"><Lock size={13} />Alleen jij ziet je lichaamsgewicht.</div>
        <div className="flex items-baseline gap-2"><b className="display text-[40px] leading-none num">{lastBw ? fmtKg(lastBw) : "–"}<span className="text-[18px] ml-1">kg</span></b>
          {lastBw && bw30 && <span className="text-[13px] text-mute">{lastBw - bw30 <= 0 ? "" : "+"}{fmtKg(Math.round((lastBw - bw30) * 10) / 10)} kg in 4 weken</span>}</div>
        <LineChart pts={bwPts} unit="kg" goal={d.bwGoal} goalLabel={d.bwGoal ? `doel ${fmtKg(d.bwGoal)} kg` : undefined} title="Lichaamsgewicht" />
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end"><div><span className="label">Vandaag</span><Stepper id="bw-today" label="Gewicht vandaag" unit="kg" step={0.1} value={bwVal ?? d.bw[t] ?? lastBw ?? 75} onChange={setBwVal} /></div>
          <Btn onClick={() => { const v = bwVal ?? d.bw[t] ?? lastBw ?? 75; if (v < 30 || v > 300) { toast("Vul een gewicht tussen 30 en 300 kg in."); return; } update(x => { x.bw[t] = Math.round(v * 10) / 10; }); setBwVal(null); toast("Gewicht van vandaag bewaard."); }}>Bewaren</Btn></div>
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end"><div><span className="label">Doelgewicht</span><Stepper id="bw-goal" label="Doelgewicht" unit="kg" step={0.5} value={d.bwGoal ?? 0} onChange={v => update(x => { x.bwGoal = v || undefined; })} /></div><span /></div>
      </Card>
      <Card className="!p-0"><p className="label p-4 pb-1">Laatste metingen</p><ul>{Object.entries(d.bw).sort((a, b) => a[0] < b[0] ? 1 : -1).slice(0, 8).map(([k, v]) =>
        <li key={k} className="flex items-center px-4 py-2.5 border-t border-line text-[14px]"><span className="grow">{dshort(k)}</span><b className="num mr-2">{fmtKg(v)} kg</b>
          <button className="h-11 w-11 grid place-items-center text-mute" aria-label={`Meting van ${dshort(k)} wissen`} onClick={() => undoable(`Meting van ${dshort(k)} gewist.`, x => { delete x.bw[k]; })}><Trash2 size={15} /></button></li>)}</ul></Card>
    </>}

    {view === "records" && <Card className="!p-0"><ul>{records(d, d.me).map(r => <li key={r.exId} className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0">
      <span className="h-9 w-9 rounded-full bg-[var(--plate-15)] text-[#1a1a1a] grid place-items-center shrink-0"><Trophy size={16} /></span>
      <span className="grow min-w-0"><b className="block text-[14px] truncate">{exById(d, r.exId).name}</b><span className="text-[12px] text-mute">{dshort(r.date)} · geschat maximum {fmtKg(Math.round(r.e * 10) / 10)} kg</span></span>
      <b className="num text-[15px] shrink-0">{fmtKg(r.w)} × {r.r}</b></li>)}</ul></Card>}
  </Page>;
}
