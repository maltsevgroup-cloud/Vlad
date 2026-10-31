import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { DAYS, DAY_NAME } from "@/lib/types";
import { today, mondayOf, addDays, pdate, dlong, dayKeyOf, hm, mmss } from "@/lib/dates";
import { nextTraining, exById, estMinutes, weekSessions, finished, planDays } from "@/lib/logic";
import { streak } from "@/lib/rewards";
import { BadgeRow, StreakSheet } from "./Badges";
import { DaySheet } from "./DaySheet";
import { shareOf } from "./Settings";
import { startSession } from "./actions";
import { Avatar, Btn, Card } from "./ui";
import { Logo } from "./Logo";
import { ArrowUpRight, ArrowDownRight, ArrowRight, Play, Check, Flame, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Trend({ t }: { t: string }) {
  if (t === "op") return <ArrowUpRight size={15} className="text-good" aria-label="zwaarder" />;
  if (t === "neer") return <ArrowDownRight size={15} className="text-warn" aria-label="lichter" />;
  return <ArrowRight size={15} className="text-mute" aria-label="zelfde" />;
}

/** Noor in de kopregel: groen bolletje als ze traint (met oefeningen gedaan van het totaal, of een timer bij cardio), rood als niet */
function MateStatus() {
  const { data: d, setTab } = useApp(); const [, tick] = useState(0);
  const mate = d?.mate ? d.profiles[d.mate] : null, live = mate && shareOf(mate).live ? d!.live[mate.uid] : undefined, cardio = live?.exKind === "cardio";
  useEffect(() => { if (!cardio) return; const t = setInterval(() => tick(n => n + 1), 1000); return () => clearInterval(t); }, [cardio]);
  if (!mate) return null;
  return <button onClick={() => setTab("samen")} className="h-11 flex items-center gap-2 pl-1 pr-3 rounded-full bg-surface"
    aria-label={live ? `${mate.name} traint nu${cardio ? `, ${live.exName}` : `, oefening ${live.exIdx} van ${live.exTotal} gedaan`}` : `${mate.name} traint nu niet`}>
    <span className="relative"><Avatar p={mate} size={34} /><span className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-[var(--surface)]", live ? "bg-[var(--plate-10)]" : "bg-[var(--plate-25)]")} aria-hidden="true" /></span>
    {live ? <span className="display text-[18px] font-bold num leading-none">{cardio ? mmss((Date.now() - (live.exSince || live.updatedAt)) / 1000) : `${live.exIdx}/${live.exTotal}`}</span>
      : <span className="text-[13px] font-semibold text-mute">{mate.name}</span>}
  </button>;
}

export function Home() {
  const { data: d, update, openWorkout, setTab } = useApp(); const [day, setDay] = useState<string | null>(null); const [stk, setStk] = useState(false); const [list, setList] = useState(false);
  if (!d) return null;
  const me = d.profiles[d.me], t = today(), mon = mondayOf(t);
  const nt = nextTraining(d, d.me), isToday = nt?.date === t, pd = nt ? d.plans[d.me]?.[nt.day] : undefined;
  const todaySid = nt ? `${d.me}_${t}_${nt.day}` : "", running = d.sessions[todaySid] && !d.sessions[todaySid].finishedAt;
  const doneToday = Object.values(d.sessions).find(s => s.uid === d.me && s.date === t && s.finishedAt && finished(s));
  const hr = new Date().getHours(), greet = hr < 6 ? "Goedenacht" : hr < 12 ? "Goedemorgen" : hr < 18 ? "Goedemiddag" : "Goedenavond";
  const wk = weekSessions(d, d.me), planned = planDays(d.plans[d.me]).length, st = streak(d, d.me);
  const start = () => { if (!nt) return; let id = ""; update(x => { id = startSession(x, nt.day); }); setTimeout(() => openWorkout(id || todaySid), 0); };
  /* één zin die zegt wat er op het spel staat */
  const line = st.paused ? "Rustweek. Je reeks blijft gewoon staan." : st.sick ? "Ziek gemeld. Je reeks blijft staan, beterschap."
    : doneToday ? `Vandaag gedaan. ${wk.length >= planned && planned ? "Je week is vol." : `Nog ${Math.max(0, planned - wk.length)} deze week.`}`
    : st.atRisk ? "Train vandaag, anders begint je reeks opnieuw." : st.count === 0 ? "Start vandaag een nieuwe reeks."
    : st.count < st.best ? `Nog ${st.best - st.count} en je evenaart je beste reeks.` : "Dit is je beste reeks ooit. Ga zo door.";

  return <div className="grid gap-4">
    <header className="flex items-center justify-between gap-3 pt-2"><Logo small /><MateStatus /><button onClick={() => setTab("profiel")} aria-label="Profiel" className="h-11 w-11 grid place-items-center -mr-1"><Avatar p={me} size={38} /></button></header>
    <div><p className="text-[14px] font-medium text-mute">{DAY_NAME[dayKeyOf(t)]} {dlong(t)}</p><h1 className="display text-[30px] font-bold uppercase leading-[1] mt-1">{greet}, {me.name}</h1></div>

    <section aria-label="Streak" className="bg-surface rounded-[22px] p-4 pb-3">
      <button onClick={() => setStk(true)} className="w-full flex items-center gap-3 text-left" aria-label={`Streak: ${st.count} trainingen op rij${st.paused ? ", gepauzeerd" : ""}. ${line}`}>
        <span className={cn("h-20 w-20 rounded-full grid place-items-center shrink-0", st.count && !st.paused ? "bg-[color-mix(in_srgb,var(--plate-15)_22%,transparent)]" : "bg-sunk")} aria-hidden="true"><Flame size={44} strokeWidth={2.2} className={st.count && !st.paused ? "text-[var(--plate-15)]" : "text-mute"} fill="currentColor" /></span>
        <span className="grow min-w-0">
          <span className="flex items-center gap-1.5">
            <b className={cn("display text-[44px] font-bold leading-none num", (st.paused || !st.count) && "text-mute")}>{st.count}</b></span>
          <span className="block text-[14px] font-semibold -mt-0.5">{st.count === 1 ? "training op rij" : "trainingen op rij"}</span>
          <span className={cn("block text-[13px] mt-1 leading-snug", st.atRisk && !doneToday ? "text-warn font-semibold" : "text-mute")}>{line}</span>
        </span>
      </button>
      <div className="grid grid-cols-7 gap-1 mt-3 pt-3 border-t border-line" aria-label="Deze week, tik een dag aan">
        {DAYS.map((k, i) => { const date = addDays(mon, i), done = Object.values(d.sessions).some(s => s.uid === d.me && s.date === date && finished(s)), plan = !!d.plans[d.me]?.[k]?.items.length, isT = date === t;
          return <button key={k} onClick={() => setDay(date)} className={cn("rounded-[12px] py-1.5 grid justify-items-center gap-1 min-h-[56px] active:bg-sunk transition-colors", isT && "bg-sunk")} aria-label={`${DAY_NAME[k]} ${pdate(date).getDate()}: ${done ? "getraind" : plan ? "training gepland" : "rustdag"}`}>
            <span className={cn("text-[11px] font-bold uppercase", isT ? "text-ink" : "text-mute")}>{k}</span>
            {done ? <span className="h-7 w-7 rounded-full grid place-items-center bg-[var(--plate-15)] text-[#1a1a1a]"><Flame size={15} fill="currentColor" aria-hidden="true" /></span>
              : <span className={cn("h-7 w-7 rounded-full grid place-items-center", plan ? "border-2 border-dashed border-line" : "")} aria-hidden="true">{isT && plan && <span className="h-2 w-2 rounded-full bg-accent" />}</span>}</button>; })}
      </div>
    </section>

    {doneToday && !running ? <Card className="!p-5"><p className="text-[13px] font-semibold text-mute">Vandaag</p><h2 className="display text-[30px] font-bold uppercase leading-none mt-1">{doneToday.title} <Check className="inline -mt-1 text-good" size={24} /></h2>
      <p className="text-mute text-[14px] mt-2">Klaar om {hm(doneToday.finishedAt!)}.{nt && !isToday ? ` Volgende: ${DAY_NAME[nt.day].toLowerCase()}.` : ""}</p>
      <Btn variant="soft" size="sm" className="mt-3" onClick={() => setDay(t)}>Bekijk training</Btn></Card>
    : nt && pd ? <Card className="!p-0 overflow-hidden">
      <div className="p-5 pb-4 bg-accent text-accent-ink relative overflow-hidden">
        <svg className="absolute -right-6 -top-4 opacity-[.13]" width="170" height="170" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="14" /><circle cx="50" cy="50" r="9" fill="currentColor" /></svg>
        <p className="text-[13px] font-semibold opacity-85">{isToday ? "Training van vandaag" : `Volgende training: ${DAY_NAME[nt.day].toLowerCase()}`}</p>
        <h2 className="display text-[30px] font-bold uppercase leading-none mt-1.5">{pd.title}</h2>
        <p className="text-[13px] opacity-85 mt-1.5">Ongeveer {estMinutes(d, pd.items)} minuten</p>
      </div>
      <button onClick={() => setList(v => !v)} aria-expanded={list} className="w-full flex items-center justify-between px-5 h-12 text-[14px] font-semibold">
        {pd.items.length} oefeningen<ChevronDown size={18} className={cn("text-mute transition-transform", list && "rotate-180")} aria-hidden="true" /></button>
      {list && <ul className="px-5 pb-1 -mt-1">{pd.items.map(it => <li key={it.id} className="py-2.5 border-t border-line text-[14px]">{exById(d, it.exId).name}</li>)}</ul>}
      <div className="px-5 pb-5 pt-1"><Btn size="lg" className="w-full" onClick={start}><Play size={18} fill="currentColor" />{running ? "Verder trainen" : isToday ? "Start training" : "Toch vandaag starten"}</Btn></div>
    </Card> : <Card><p className="text-mute">Je hebt nog geen trainingsdagen. Stel je schema in.</p><Btn className="mt-3" onClick={() => setTab("schema")}>Naar schema</Btn></Card>}

    <BadgeRow />
    <DaySheet date={day} onClose={() => setDay(null)} />
    <StreakSheet open={stk} onClose={() => setStk(false)} />
  </div>;
}
