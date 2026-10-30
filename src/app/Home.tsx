import { useState } from "react";
import { useApp } from "@/lib/store";
import { DAYS, DAY_NAME } from "@/lib/types";
import { today, mondayOf, addDays, pdate, dlong, dayKeyOf, hm } from "@/lib/dates";
import { nextTraining, suggest, exById, estMinutes, weekSessions, fmtKg, records, finished, planDays } from "@/lib/logic";
import { streak } from "@/lib/rewards";
import { BadgeRow, StreakSheet } from "./Badges";
import { DaySheet } from "./DaySheet";
import { shareOf } from "./Settings";
import { startSession } from "./actions";
import { Avatar, Btn, Card } from "./ui";
import { Logo } from "./Logo";
import { ArrowUpRight, ArrowDownRight, ArrowRight, Play, Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Trend({ t }: { t: string }) {
  if (t === "op") return <ArrowUpRight size={15} className="text-good" aria-label="zwaarder" />;
  if (t === "neer") return <ArrowDownRight size={15} className="text-warn" aria-label="lichter" />;
  return <ArrowRight size={15} className="text-mute" aria-label="zelfde" />;
}

/* overzicht als regels in een logboek: naam links, getal rechts, hele regel aantikbaar */
const Row = ({ label, onClick, aria, sub, warn, lead, value }: { label: string; onClick: () => void; aria: string; sub?: React.ReactNode; warn?: boolean; lead?: React.ReactNode; value?: React.ReactNode }) =>
    <button onClick={onClick} aria-label={aria} className="w-full min-h-[68px] flex items-center gap-3 py-3 text-left border-t border-line active:bg-sunk transition-colors">
      {lead}<span className="grow min-w-0"><span className="label block !text-[15px] !font-semibold !normal-case !tracking-normal !text-ink">{label}</span>
        {sub && <span className={cn("block text-[13px] truncate", warn ? "text-warn font-semibold" : "text-mute")}>{sub}</span>}</span>
      {value}<ChevronRight size={18} className="text-mute shrink-0 -mr-1" aria-hidden="true" /></button>;
const Big = ({ children, unit, mute }: { children: React.ReactNode; unit?: string; mute?: boolean }) =>
    <span className="flex items-baseline gap-1 shrink-0"><b className={cn("display text-[32px] font-bold leading-none num", mute && "text-mute")}>{children}</b>{unit && <span className="text-[13px] text-mute">{unit}</span>}</span>;

export function Home() {
  const { data: d, update, openWorkout, setTab, setPage } = useApp(); const [day, setDay] = useState<string | null>(null); const [stk, setStk] = useState(false);
  if (!d) return null;
  const me = d.profiles[d.me], mate = d.mate ? d.profiles[d.mate] : null, t = today(), mon = mondayOf(t);
  const nt = nextTraining(d, d.me), isToday = nt?.date === t, pd = nt ? d.plans[d.me]?.[nt.day] : undefined;
  const todaySid = nt ? `${d.me}_${t}_${nt.day}` : "", running = d.sessions[todaySid] && !d.sessions[todaySid].finishedAt;
  const doneToday = Object.values(d.sessions).find(s => s.uid === d.me && s.date === t && s.finishedAt && finished(s));
  const hr = new Date().getHours(), greet = hr < 6 ? "Goedenacht" : hr < 12 ? "Goedemorgen" : hr < 18 ? "Goedemiddag" : "Goedenavond";
  const wk = weekSessions(d, d.me), planned = planDays(d.plans[d.me]).length, st = streak(d, d.me);
  const recMonth = records(d, d.me).filter(r => r.date.slice(0, 7) === t.slice(0, 7)), lastBw = Object.entries(d.bw).sort((a, b) => a[0] < b[0] ? 1 : -1), bw4 = lastBw.find(([k]) => k <= addDays(t, -28));
  const live = mate && shareOf(mate).live ? d.live[mate.uid] : undefined, lastMate = mate ? Object.values(d.sessions).filter(s => s.uid === mate.uid && s.finishedAt).sort((a, b) => b.finishedAt! - a.finishedAt!)[0] : undefined;
    const start = () => { if (!nt) return; let id = ""; update(x => { id = startSession(x, nt.day); }); setTimeout(() => openWorkout(id || todaySid), 0); };
  return <div className="grid gap-3.5">
    <header className="flex items-center justify-between pt-2"><Logo small /><button onClick={() => setTab("profiel")} aria-label="Profiel" className="h-11 w-11 grid place-items-center -mr-1"><Avatar p={me} size={38} /></button></header>
    <div><p className="text-[14px] font-medium text-mute">{DAY_NAME[dayKeyOf(t)]} {dlong(t)}</p><h1 className="display text-[30px] font-bold uppercase leading-[1] mt-1">{greet}, {me.name}</h1></div>

    <div className="grid grid-cols-7 gap-1.5" aria-label="Deze week, tik een dag aan">
      {DAYS.map((k, i) => { const date = addDays(mon, i), done = Object.values(d.sessions).some(s => s.uid === d.me && s.date === date && finished(s)), plan = !!d.plans[d.me]?.[k]?.items.length, isT = date === t;
        return <button key={k} onClick={() => setDay(date)} className={cn("rounded-full py-2 grid justify-items-center gap-1 min-h-[64px] active:bg-sunk transition-colors", isT && "bg-ink text-bg active:bg-ink")} aria-label={`${DAY_NAME[k]} ${pdate(date).getDate()}: ${done ? "getraind" : plan ? "training gepland" : "rustdag"}`}>
          <span className={cn("text-[12px] font-semibold", isT ? "opacity-75" : "text-mute")}>{k}</span>
          <span className="display text-[18px] font-bold num leading-none">{pdate(date).getDate()}</span>
          {done ? <Check size={12} strokeWidth={3.2} className={isT ? "text-bg" : "text-good"} aria-hidden="true" /> : <span className={cn("h-1.5 w-1.5 rounded-full my-[3px]", plan ? (isT ? "bg-bg" : "bg-mute") : "bg-transparent")} aria-hidden="true" />}</button>; })}
    </div>

    {doneToday && !running ? <Card className="!p-5"><p className="text-[13px] font-semibold text-mute">Vandaag</p><h2 className="display text-[30px] font-bold uppercase leading-none mt-1">{doneToday.title} <Check className="inline -mt-1 text-good" size={24} /></h2>
      <p className="text-mute text-[14px] mt-2">Klaar om {hm(doneToday.finishedAt!)}.{nt && !isToday ? ` Volgende: ${DAY_NAME[nt.day].toLowerCase()}.` : ""}</p>
      <Btn variant="soft" size="sm" className="mt-3" onClick={() => setDay(t)}>Bekijk training</Btn></Card>
    : nt && pd ? <Card className="!p-0 overflow-hidden">
      <div className="p-5 pb-4 bg-accent text-accent-ink relative overflow-hidden">
        <svg className="absolute -right-6 -top-4 opacity-[.13]" width="170" height="170" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="14" /><circle cx="50" cy="50" r="9" fill="currentColor" /></svg>
        <p className="text-[13px] font-semibold opacity-85">{isToday ? "Training van vandaag" : `Volgende training: ${DAY_NAME[nt.day].toLowerCase()}`}</p>
        <h2 className="display text-[30px] font-bold uppercase leading-none mt-1.5">{pd.title}</h2>
        <p className="text-[13px] opacity-85 mt-1.5">{pd.items.length} oefeningen, ongeveer {estMinutes(d, pd.items)} minuten</p>
      </div>
      <ul className="px-5 py-2">{pd.items.slice(0, 4).map(it => { const ex = exById(d, it.exId), s = suggest(d, d.me, it, running ? todaySid : undefined);
        return <li key={it.id} className="flex items-center gap-3 py-3 border-b border-line last:border-0"><span className="grow min-w-0 text-[15px] font-medium leading-snug">{ex.name}</span>
          <span className="display num text-[21px] font-bold leading-none whitespace-nowrap">{ex.kind === "gewicht" ? (s.w ? `${fmtKg(s.w)} kg × ${s.r}` : `${it.sets} × ${s.r}, gewicht kiezen`) : ex.kind === "tijd" ? `${it.sets} × ${s.r} sec` : ex.kind === "cardio" ? `${it.target} min` : `${it.sets} × ${s.r}`}</span><Trend t={s.trend} /></li>; })}
        {pd.items.length > 4 && <li className="text-[13px] text-mute py-2.5">en nog {pd.items.length - 4} {pd.items.length - 4 === 1 ? "oefening" : "oefeningen"}</li>}</ul>
      <div className="px-5 pb-5"><Btn size="lg" className="w-full" onClick={start}><Play size={18} fill="currentColor" />{running ? "Verder trainen" : isToday ? "Start training" : "Toch vandaag starten"}</Btn></div>
    </Card> : <Card><p className="text-mute">Je hebt nog geen trainingsdagen. Stel je schema in.</p><Btn className="mt-3" onClick={() => setTab("schema")}>Naar schema</Btn></Card>}

    <section aria-label="Overzicht" className="border-b border-line mt-1">
      <Row label="Streak" onClick={() => setStk(true)} aria={`Streak: ${st.count} trainingen op rij${st.paused ? ", gepauzeerd" : ""}`} warn={st.atRisk && !st.paused && !st.sick}
        sub={st.paused ? "Rustweek" : st.sick ? "Ziek gemeld, blijft staan" : st.atRisk ? "Train vandaag om hem te houden" : `Trainingen op rij, beste ${st.best}`} value={<Big mute={st.paused}>{st.count}</Big>} />
      <Row label="Deze week" onClick={() => setPage("voortgang")} aria={`Deze week ${wk.length} van ${planned} trainingen`}
        sub={wk.length >= planned && planned ? "Week vol" : `Nog ${Math.max(0, planned - wk.length)} ${planned - wk.length === 1 ? "training" : "trainingen"}`} value={<Big unit={`van ${planned}`}>{wk.length}</Big>} />
      {mate ? <Row label={mate.name} onClick={() => setTab("samen")} aria={`${mate.name}: ${live ? "traint nu" : "niet aan het trainen"}`} lead={<Avatar p={mate} size={36} />}
        sub={live ? `Traint nu: ${live.exName}` : lastMate ? `Laatst getraind ${lastMate.date === t ? "vandaag" : dlong(lastMate.date)}` : "Nog niet getraind"}
        value={live ? <span className="h-1.5 w-14 rounded-full bg-sunk overflow-hidden shrink-0"><span className="block h-full rounded-full bg-[var(--chart-mate)]" style={{ width: `${(live.setsDone / live.setsTotal) * 100}%` }} /></span> : undefined} />
        : <Row label="Samen" onClick={() => setTab("samen")} aria="Trainingsmaat uitnodigen" sub="Nodig een trainingsmaat uit" />}
      <Row label="Gewicht" onClick={() => setPage("voortgang:gewicht")} aria="Lichaamsgewicht, alleen voor jou"
        sub={lastBw.length && bw4 ? `${lastBw[0][1] - bw4[1] > 0 ? "+" : ""}${fmtKg(Math.round((lastBw[0][1] - bw4[1]) * 10) / 10)} kg in 4 weken, alleen voor jou` : lastBw.length ? "Alleen voor jou" : "Nog geen meting"}
        value={lastBw.length ? <Big unit="kg">{fmtKg(lastBw[0][1])}</Big> : undefined} />
      <Row label="Records" onClick={() => setPage("voortgang:records")} aria={`${recMonth.length} records deze maand`}
        sub={recMonth[0] ? `Deze maand, laatste: ${exById(d, recMonth[0].exId).name} ${fmtKg(recMonth[0].w)} kg × ${recMonth[0].r}` : "Nog geen deze maand"} value={<Big>{recMonth.length}</Big>} />
    </section>

    <BadgeRow />
    <DaySheet date={day} onClose={() => setDay(null)} />
    <StreakSheet open={stk} onClose={() => setStk(false)} />
  </div>;
}
