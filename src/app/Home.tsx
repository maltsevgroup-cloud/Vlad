import { useState } from "react";
import { useApp } from "@/lib/store";
import { DAYS, DAY_NAME } from "@/lib/types";
import { today, mondayOf, addDays, pdate, dlong, dayKeyOf, hm } from "@/lib/dates";
import { nextTraining, suggest, exById, estMinutes, weekSessions, fmtKg, records, finished, planDays } from "@/lib/logic";
import { streak, badgeStates } from "@/lib/rewards";
import { BadgeRow, Medal, StreakSheet } from "./Badges";
import { DaySheet } from "./DaySheet";
import { shareOf } from "./Settings";
import { startSession } from "./actions";
import { Avatar, Btn, Card, Ring } from "./ui";
import { Logo } from "./Logo";
import { ArrowUpRight, ArrowDownRight, ArrowRight, Play, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Trend({ t }: { t: string }) {
  if (t === "op") return <ArrowUpRight size={15} className="text-good" aria-label="zwaarder" />;
  if (t === "neer") return <ArrowDownRight size={15} className="text-warn" aria-label="lichter" />;
  return <ArrowRight size={15} className="text-mute" aria-label="zelfde" />;
}

export function Home() {
  const { data: d, update, openWorkout, setTab, setPage } = useApp(); const [day, setDay] = useState<string | null>(null); const [stk, setStk] = useState(false);
  if (!d) return null;
  const me = d.profiles[d.me], mate = d.mate ? d.profiles[d.mate] : null, t = today(), mon = mondayOf(t);
  const nt = nextTraining(d, d.me), isToday = nt?.date === t, pd = nt ? d.plans[d.me]?.[nt.day] : undefined;
  const todaySid = nt ? `${d.me}_${t}_${nt.day}` : "", running = d.sessions[todaySid] && !d.sessions[todaySid].finishedAt;
  const doneToday = Object.values(d.sessions).find(s => s.uid === d.me && s.date === t && s.finishedAt && finished(s));
  const hr = new Date().getHours(), greet = hr < 6 ? "Goedenacht" : hr < 12 ? "Goedemorgen" : hr < 18 ? "Goedemiddag" : "Goedenavond";
  const wk = weekSessions(d, d.me), planned = planDays(d.plans[d.me]).length, st = streak(d, d.me), bs = badgeStates(d, d.me);
  const recMonth = records(d, d.me).filter(r => r.date.slice(0, 7) === t.slice(0, 7)), lastBw = Object.entries(d.bw).sort((a, b) => a[0] < b[0] ? 1 : -1), bw4 = lastBw.find(([k]) => k <= addDays(t, -28));
  const live = mate && shareOf(mate).live ? d.live[mate.uid] : undefined, lastMate = mate ? Object.values(d.sessions).filter(s => s.uid === mate.uid && s.finishedAt).sort((a, b) => b.finishedAt! - a.finishedAt!)[0] : undefined;
  const lastBadge = bs.filter(x => x.level).sort((a, b) => b.level - a.level)[0];
  const start = () => { if (!nt) return; let id = ""; update(x => { id = startSession(x, nt.day); }); setTimeout(() => openWorkout(id || todaySid), 0); };
  const Tile = ({ label, onClick, children, aria }: { label: string; onClick: () => void; children: React.ReactNode; aria: string }) =>
    <button onClick={onClick} aria-label={aria} className="text-left bg-surface rounded-[18px] p-3.5 min-h-[112px] flex flex-col gap-1.5 active:scale-[.985] transition"><span className="label">{label}</span>{children}</button>;

  return <div className="grid gap-3.5">
    <header className="flex items-center justify-between pt-2"><Logo small /><button onClick={() => setTab("profiel")} aria-label="Profiel" className="h-11 w-11 grid place-items-center -mr-1"><Avatar p={me} size={38} /></button></header>
    <div><p className="label">{DAY_NAME[dayKeyOf(t)]} {dlong(t)}</p><h1 className="display text-[30px] font-bold uppercase leading-[1] mt-1">{greet}, {me.name}</h1></div>

    <div className="grid grid-cols-7 gap-1.5" aria-label="Deze week, tik een dag aan">
      {DAYS.map((k, i) => { const date = addDays(mon, i), done = Object.values(d.sessions).some(s => s.uid === d.me && s.date === date && finished(s)), plan = !!d.plans[d.me]?.[k]?.items.length, isT = date === t;
        return <button key={k} onClick={() => setDay(date)} className={cn("rounded-[12px] py-2 grid justify-items-center gap-1 min-h-[64px] active:scale-95 transition", isT ? "bg-ink text-bg" : "bg-surface")} aria-label={`${DAY_NAME[k]} ${pdate(date).getDate()}: ${done ? "getraind" : plan ? "training gepland" : "rustdag"}`}>
          <span className={cn("text-[11px] font-bold uppercase", isT ? "opacity-70" : "text-mute")}>{k}</span>
          <span className="display text-[18px] font-bold num leading-none">{pdate(date).getDate()}</span>
          {done ? <Check size={12} strokeWidth={3.2} className={isT ? "text-bg" : "text-good"} aria-hidden="true" /> : <span className={cn("h-1.5 w-1.5 rounded-full my-[3px]", plan ? (isT ? "bg-bg" : "bg-mute") : "bg-transparent")} aria-hidden="true" />}</button>; })}
    </div>

    {doneToday && !running ? <Card className="!p-5"><p className="label">Vandaag</p><h2 className="display text-[30px] font-bold uppercase leading-none mt-1">{doneToday.title} <Check className="inline -mt-1 text-good" size={24} /></h2>
      <p className="text-mute text-[14px] mt-2">Klaar om {hm(doneToday.finishedAt!)}.{nt && !isToday ? ` Volgende: ${DAY_NAME[nt.day].toLowerCase()}.` : ""}</p>
      <Btn variant="soft" size="sm" className="mt-3" onClick={() => setDay(t)}>Bekijk training</Btn></Card>
    : nt && pd ? <Card className="!p-0 overflow-hidden">
      <div className="p-5 pb-4 bg-accent text-accent-ink relative overflow-hidden">
        <svg className="absolute -right-6 -top-4 opacity-[.13]" width="170" height="170" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="14" /><circle cx="50" cy="50" r="9" fill="currentColor" /></svg>
        <p className="text-[12px] font-bold uppercase tracking-[.09em] opacity-80">{isToday ? "Training van vandaag" : `Volgende training · ${DAY_NAME[nt.day]}`}</p>
        <h2 className="display text-[30px] font-bold uppercase leading-none mt-1.5">{pd.title}</h2>
        <p className="text-[13px] opacity-85 mt-1.5">{pd.items.length} oefeningen · ± {estMinutes(d, pd.items)} minuten</p>
      </div>
      <ul className="px-5 py-2">{pd.items.slice(0, 4).map(it => { const ex = exById(d, it.exId), s = suggest(d, d.me, it, running ? todaySid : undefined);
        return <li key={it.id} className="flex items-center gap-3 py-2.5 border-b border-line last:border-0"><span className="grow min-w-0 truncate text-[14px] font-medium">{ex.name}</span>
          <span className="num text-[14px] font-semibold whitespace-nowrap">{ex.kind === "gewicht" ? (s.w ? `${fmtKg(s.w)} kg × ${s.r}` : `${it.sets} × ${s.r}, gewicht kiezen`) : ex.kind === "tijd" ? `${it.sets} × ${s.r} sec` : ex.kind === "cardio" ? `${it.target} min` : `${it.sets} × ${s.r}`}</span><Trend t={s.trend} /></li>; })}
        {pd.items.length > 4 && <li className="text-[12px] text-mute py-2">en nog {pd.items.length - 4} {pd.items.length - 4 === 1 ? "oefening" : "oefeningen"}</li>}</ul>
      <div className="px-5 pb-5"><Btn size="lg" className="w-full" onClick={start}><Play size={18} fill="currentColor" />{running ? "Verder trainen" : isToday ? "Start training" : "Toch vandaag starten"}</Btn></div>
    </Card> : <Card><p className="text-mute">Je hebt nog geen trainingsdagen. Stel je schema in.</p><Btn className="mt-3" onClick={() => setTab("schema")}>Naar schema</Btn></Card>}

    <div className="grid grid-cols-2 gap-2.5">
      <Tile label="Streak" onClick={() => setStk(true)} aria={`Streak: ${st.count} trainingen op rij${st.paused ? ", gepauzeerd" : ""}`}>
        <span className="flex items-baseline gap-1.5"><b className={cn("display text-[40px] leading-none num", st.paused && "text-mute")}>{st.count}</b><span className="text-[13px] text-mute">op rij</span></span>
        <span className={cn("text-[12px]", st.atRisk ? "text-warn font-semibold" : "text-mute")}>{st.paused ? "Rustweek" : st.sick ? "Ziek gemeld, blijft staan" : st.atRisk ? "Train vandaag om hem te houden" : `Beste: ${st.best}`}</span></Tile>
      <Tile label="Deze week" onClick={() => setPage("voortgang")} aria={`Deze week ${wk.length} van ${planned} trainingen`}>
        <span className="flex items-center gap-2.5"><Ring value={planned ? wk.length / planned : 0} size={48} stroke={6}><span className="text-[12px] font-bold num">{wk.length}/{planned}</span></Ring><span className="text-[12px] text-mute leading-tight">{wk.length >= planned && planned ? "Week vol" : `nog ${Math.max(0, planned - wk.length)}`}</span></span></Tile>
      {mate ? <Tile label={mate.name} onClick={() => setTab("samen")} aria={`${mate.name}: ${live ? "traint nu" : "niet aan het trainen"}`}>
        {live ? <><span className="text-[13px] font-semibold flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--plate-10)] animate-pulse" />Traint nu</span><span className="text-[12px] text-mute truncate">{live.exName}</span>
          <span className="h-1.5 rounded-full bg-sunk overflow-hidden mt-auto"><span className="block h-full rounded-full bg-[var(--chart-mate)]" style={{ width: `${(live.setsDone / live.setsTotal) * 100}%` }} /></span></>
          : <><Avatar p={mate} size={32} /><span className="text-[12px] text-mute">{lastMate ? `Laatst ${lastMate.date === t ? "vandaag" : dlong(lastMate.date)}` : "Nog niet getraind"}</span></>}</Tile>
        : <Tile label="Samen" onClick={() => setTab("samen")} aria="Trainingsmaat uitnodigen"><span className="text-[14px] font-semibold">Maat uitnodigen</span><span className="text-[12px] text-mute">Train met z'n tweeën</span></Tile>}
      <Tile label="Gewicht" onClick={() => setPage("voortgang:gewicht")} aria="Lichaamsgewicht, alleen voor jou">
        {lastBw.length ? <><span className="flex items-baseline gap-1"><b className="display text-[30px] leading-none num">{fmtKg(lastBw[0][1])}</b><span className="text-[13px] text-mute">kg</span></span>
          <span className="text-[12px] text-mute">{bw4 ? `${lastBw[0][1] - bw4[1] > 0 ? "+" : ""}${fmtKg(Math.round((lastBw[0][1] - bw4[1]) * 10) / 10)} kg in 4 weken` : "Alleen voor jou"}</span></> : <span className="text-[13px] text-mute">Nog geen meting</span>}</Tile>
      <Tile label="Records" onClick={() => setPage("voortgang:records")} aria={`${recMonth.length} records deze maand`}>
        <span className="flex items-baseline gap-1.5"><b className="display text-[30px] leading-none num">{recMonth.length}</b><span className="text-[13px] text-mute">deze maand</span></span>
        {recMonth[0] && <span className="text-[12px] text-mute truncate">{exById(d, recMonth[0].exId).name} {fmtKg(recMonth[0].w)}×{recMonth[0].r}</span>}</Tile>
      <Tile label="Badges" onClick={() => setPage("badges")} aria={`Badges: ${bs.filter(x => x.level).length} van ${bs.length}`}>
        <span className="flex items-center gap-2">{lastBadge && <Medal s={lastBadge} size={40} />}<span><b className="display text-[26px] leading-none num">{bs.filter(x => x.level).length}</b><span className="text-[13px] text-mute">/{bs.length}</span></span></span></Tile>
    </div>

    <BadgeRow />
    <DaySheet date={day} onClose={() => setDay(null)} />
    <StreakSheet open={stk} onClose={() => setStk(false)} />
  </div>;
}
