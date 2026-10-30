import { useState } from "react";
import { useApp } from "@/lib/store";
import type { DayKey, PlanItem, Exercise } from "@/lib/types";
import { DAYS, DAY_NAME } from "@/lib/types";
import { LIB, GROUPS } from "@/lib/exercises";
import { exById, suggest, fmtKg, estMinutes, planDays, nextTraining } from "@/lib/logic";
import { Btn, Card, Sheet, Stepper, Field, inputCls } from "./ui";
import { Trend } from "./Home";
import { ArrowUp, ArrowDown, Trash2, Plus, Search, Pencil, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PlanView() {
  const { data: d, update, toast, undoable } = useApp();
  const days = d ? planDays(d.plans[d.me]) : [];
  const [day, setDay] = useState<DayKey>((d && nextTraining(d, d.me)?.day) || days[0] || "ma");
  const [editIt, setEditIt] = useState<PlanItem | null>(null);
  const [add, setAdd] = useState(false), [q, setQ] = useState(""), [grp, setGrp] = useState<string>("Alles");
  const [dayEdit, setDayEdit] = useState(false), [order, setOrder] = useState(false);
  if (!d) return null;
  const plan = d.plans[d.me] || {}, pd = plan[day];
  const mut = (fn: (items: PlanItem[]) => void) => update(x => { const p = (x.plans[x.me] ||= {}); const dd = (p[day] ||= { title: DAY_NAME[day], items: [] }); fn(dd.items); });
  const lib = ([...LIB, ...Object.values(d.custom)] as Exercise[]).filter(e => (grp === "Alles" || e.group === grp) && e.name.toLowerCase().includes(q.toLowerCase()));

  return <div className="grid gap-3.5">
    <header className="pt-3 flex items-end justify-between gap-2"><h1 className="display text-[34px] font-bold uppercase leading-none">Schema</h1><span className="flex gap-2"><Btn variant={order ? "primary" : "ghost"} size="sm" onClick={() => setOrder(!order)} aria-pressed={order}>{order ? "Klaar" : "Volgorde"}</Btn><Btn variant="ghost" size="sm" onClick={() => setDayEdit(true)}>Dagen</Btn></span></header>
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1" role="tablist">{DAYS.filter(k => plan[k]?.items.length || k === day).map(k =>
      <button key={k} role="tab" aria-selected={day === k} onClick={() => setDay(k)} className={cn("shrink-0 h-11 px-4 rounded-full text-[13px] font-semibold", day === k ? "bg-ink text-bg" : "bg-surface")}>{DAY_NAME[k]}</button>)}</div>
    {pd ? <Card className="!p-0">
      <div className="p-4 pb-2 flex items-center gap-2"><input id="day-title" aria-label="Naam van deze training" className="grow min-w-0 bg-transparent display text-[26px] font-bold uppercase outline-none focus:underline" value={pd.title} maxLength={40} onChange={e => update(x => { x.plans[x.me][day]!.title = e.target.value; })} /><Pencil size={15} className="text-mute shrink-0" /></div>
      <p className="px-4 text-[12px] text-mute">{pd.items.length} oefeningen · ± {estMinutes(d, pd.items)} min</p>
      <ul className="mt-2">{pd.items.map((it, i) => { const ex = exById(d, it.exId), s = suggest(d, d.me, it);
        return <li key={it.id} className="flex items-center gap-2 px-4 py-3 border-t border-line">
          <button className="grow min-w-0 text-left min-h-11 disabled:opacity-100" disabled={order} onClick={() => setEditIt(it)} aria-label={`${ex.name} aanpassen`}><b className="block text-[14px] truncate">{ex.name}</b>
            <span className="text-[12px] text-mute num flex items-center gap-1">{ex.kind === "cardio" ? `${it.target} min` : `${it.sets} × ${it.target}${ex.kind === "tijd" ? " sec" : ""}`}{ex.kind === "gewicht" && ` · volgende keer ${fmtKg(s.w)} kg`}{ex.kind !== "cardio" && <Trend t={s.trend} />}</span></button>
          {!order ? <ChevronRight size={16} className="text-mute shrink-0" aria-hidden="true" /> : <>          <button className="h-11 w-11 grid place-items-center rounded-full text-mute disabled:opacity-30" disabled={i === 0} aria-label={`${ex.name} omhoog`} onClick={() => mut(a => { [a[i - 1], a[i]] = [a[i], a[i - 1]]; })}><ArrowUp size={16} /></button>
          <button className="h-11 w-11 grid place-items-center rounded-full text-mute disabled:opacity-30" disabled={i === pd.items.length - 1} aria-label={`${ex.name} omlaag`} onClick={() => mut(a => { [a[i + 1], a[i]] = [a[i], a[i + 1]]; })}><ArrowDown size={16} /></button>
        </>}
        </li>; })}</ul>
      <div className="p-3 border-t border-line"><Btn variant="soft" className="w-full" onClick={() => setAdd(true)}><Plus size={16} />Oefening toevoegen</Btn></div>
    </Card> : <Card><p className="text-mute">Geen training op {DAY_NAME[day].toLowerCase()}.</p><Btn className="mt-3" onClick={() => update(x => { (x.plans[x.me] ||= {})[day] = { title: "Nieuwe training", items: [] }; const p = x.profiles[x.me]; if (!p.days.includes(day)) p.days = DAYS.filter(k => k === day || p.days.includes(k)); })}>Training op {DAY_NAME[day].toLowerCase()}</Btn></Card>}
    <p className="text-[12px] text-mute px-1">Het gewicht stelt de app zelf voor na elke training. Haal je alle sets, dan komt er de keer erna een stap bij; twee keer op rij niet gehaald geeft 10% minder.</p>

    <Sheet open={!!editIt} onClose={() => setEditIt(null)} title={editIt ? exById(d, editIt.exId).name : ""}>
      {editIt && (() => { const ex = exById(d, editIt.exId), cur = pd?.items.find(x => x.id === editIt.id) || editIt, set = (k: keyof PlanItem, v: number) => mut(a => { const t = a.find(x => x.id === editIt.id); if (t) (t as unknown as Record<string, number>)[k] = v; });
        return <div className="grid gap-3">
          {ex.kind !== "cardio" && <Field label="Sets"><Stepper id="pe-sets" label="Sets" value={cur.sets} step={1} min={1} onChange={v => set("sets", Math.min(10, v))} /></Field>}
          <Field label={ex.kind === "tijd" ? "Seconden per set" : ex.kind === "cardio" ? "Minuten" : "Herhalingen per set"}><Stepper id="pe-target" label="Doel" value={cur.target} step={ex.kind === "tijd" ? 5 : 1} min={1} onChange={v => set("target", v)} /></Field>
          {ex.kind === "gewicht" && <Field label="Startgewicht (alleen zonder eerdere trainingen)"><Stepper id="pe-w" label="Startgewicht" unit="kg" value={cur.weight} step={ex.step || 1} onChange={v => set("weight", v)} /></Field>}
          {ex.kind !== "cardio" && <Field label="Rust tussen sets (seconden)"><Stepper id="pe-rest" label="Rust" value={cur.rest} step={15} onChange={v => set("rest", v)} /></Field>}
          <Btn variant="danger" onClick={() => { const id = editIt.id; setEditIt(null); undoable(`${ex.name} uit het schema gehaald.`, x => { const it = x.plans[x.me]?.[day]?.items; const i = it ? it.findIndex(q => q.id === id) : -1; if (it && i >= 0) it.splice(i, 1); }); }}><Trash2 size={16} />Uit schema halen</Btn>
        </div>; })()}
    </Sheet>

    <Sheet open={add} onClose={() => setAdd(false)} title="Oefening toevoegen" sub={`Aan ${pd?.title || DAY_NAME[day]}`}>
      <div className="relative mb-2"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" /><input id="lib-q" className={inputCls + " pl-10"} placeholder="Zoeken" value={q} onChange={e => setQ(e.target.value)} /></div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2">{["Alles", ...GROUPS].map(g => <button key={g} onClick={() => setGrp(g)} aria-pressed={grp === g} className={cn("shrink-0 h-10 px-3.5 rounded-full text-[12px] font-semibold", grp === g ? "bg-ink text-bg" : "bg-sunk")}>{g}</button>)}</div>
      <ul className="grid">{lib.map(e => <li key={e.id}><button className="w-full flex items-center gap-3 py-3 border-b border-line text-left" onClick={() => {
        mut(a => a.push({ id: "p" + Date.now().toString(36) + e.id, exId: e.id, sets: e.kind === "cardio" ? 1 : 3, target: e.kind === "tijd" ? 30 : e.kind === "cardio" ? 10 : 10, weight: 0, rest: e.kind === "cardio" ? 0 : d.profiles[d.me].rest })); setAdd(false); toast(`${e.name} toegevoegd.`); }}>
        <span className="grow"><b className="block text-[14px]">{e.name}</b><span className="text-[12px] text-mute">{e.group} · {e.equip}</span></span><Plus size={18} className="text-accent" /></button></li>)}
        {!lib.length && <li className="text-mute text-[13px] py-6 text-center">Niets gevonden.</li>}</ul>
    </Sheet>

    <Sheet open={dayEdit} onClose={() => setDayEdit(false)} title="Trainingsdagen" sub="Een dag uitzetten bewaart de oefeningen niet; je trainingen blijven wel bewaard.">
      <div className="grid grid-cols-7 gap-1.5">{DAYS.map(k => { const on = !!plan[k]?.items.length; return <button key={k} aria-pressed={on} aria-label={DAY_NAME[k]} onClick={() => update(x => { const p = (x.plans[x.me] ||= {}), pr = x.profiles[x.me];
        if (on) { delete p[k]; pr.days = pr.days.filter(y => y !== k); } else { p[k] = { title: "Nieuwe training", items: [] }; pr.days = DAYS.filter(y => y === k || pr.days.includes(y)); setDay(k); } })}
        className={cn("h-14 rounded-[12px] display text-[18px] font-bold uppercase", on ? "bg-accent text-accent-ink" : "bg-sunk")}>{k}</button>; })}</div>
    </Sheet>
  </div>;
}
