import { useState } from "react";
import { useApp } from "@/lib/store";
import type { DayKey, Goal, Level, Profile, Data } from "@/lib/types";
import { DAYS, DAY_NAME } from "@/lib/types";
import { buildPlan, exById, estMinutes } from "@/lib/logic";
import { Btn, Field, inputCls, Card } from "./ui";
import { Logo } from "./Logo";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const GOALS: [Goal, string, string][] = [["spier", "Spieren opbouwen", "3 × 10, gemiddelde rust"], ["kracht", "Sterker worden", "Zwaarder, minder herhalingen, lange rust"], ["af", "Afvallen", "Meer herhalingen, korte rust"], ["fit", "Fit blijven", "Evenwichtig, zonder overdrijven"]];
const LEVELS: [Level, string, string][] = [["beg", "Beginner", "0 tot 1 jaar"], ["mid", "Gevorderd", "1 tot 3 jaar"], ["pro", "Ervaren", "meer dan 3 jaar"]];

export function Onboarding() {
  const { auth, startFresh, logout } = useApp();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(""), [goal, setGoal] = useState<Goal>("spier"), [level, setLevel] = useState<Level>("beg"), [days, setDays] = useState<DayKey[]>(["ma", "wo", "vr"]), [place, setPlace] = useState<"gym" | "thuis">("gym");
  const steps = ["Naam", "Doel", "Ervaring", "Dagen", "Plaats", "Schema"];
  const prof: Profile = { uid: auth!.uid, name: name.trim() || "Sporter", color: "blauw", goal, level, days, rest: goal === "kracht" ? 150 : goal === "af" ? 60 : 90, prog: "op", place, createdAt: Date.now() };
  const plan = buildPlan(prof);
  const finish = () => { const d: Data = { me: prof.uid, mate: null, profiles: { [prof.uid]: prof }, plans: { [prof.uid]: plan }, sessions: {}, bw: {}, msgs: [], live: {}, custom: {} }; startFresh(d); };
  const can = step !== 0 || name.trim().length > 0, can3 = step !== 3 || days.length >= 2;
  const Opt = ({ on, onClick, t, s }: { on: boolean; onClick: () => void; t: string; s?: string }) =>
    <button onClick={onClick} role="radio" aria-checked={on} className={cn("w-full text-left rounded-[14px] px-4 py-3.5 border-2 transition", on ? "border-accent bg-accent-soft" : "border-transparent bg-surface")}>
      <b className="block text-[15px]">{t}</b>{s && <span className="text-[13px] text-mute">{s}</span>}</button>;
  return <main className="min-h-full flex flex-col max-w-[480px] mx-auto gutter" style={{ paddingBlock: "20px" }}>
    <div className="flex items-center gap-3">
      <button onClick={() => step ? setStep(step - 1) : logout()} className="h-11 w-11 grid place-items-center rounded-full bg-surface" aria-label="Terug"><ChevronLeft size={20} /></button>
      <div className="grow flex gap-1" aria-label={`Stap ${step + 1} van ${steps.length}`}>{steps.map((_, i) => <span key={i} className={cn("h-1.5 grow rounded-full", i <= step ? "bg-accent" : "bg-line")} />)}</div>
      <Logo small />
    </div>
    <div className="mt-8 grow grid content-start gap-3">
      {step === 0 && <><h1 className="display text-[34px] font-bold uppercase leading-none">Hoe heet je?</h1><p className="text-mute">Zo ziet je trainingsmaat je in de app.</p>
        <Field label="Voornaam"><input id="ob-name" autoFocus className={inputCls} value={name} maxLength={24} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && name.trim() && setStep(1)} /></Field></>}
      {step === 1 && <><h1 className="display text-[34px] font-bold uppercase leading-none">Wat is je doel?</h1><div className="grid gap-2" role="radiogroup">{GOALS.map(([k, t, s]) => <Opt key={k} on={goal === k} onClick={() => setGoal(k)} t={t} s={s} />)}</div></>}
      {step === 2 && <><h1 className="display text-[34px] font-bold uppercase leading-none">Hoeveel ervaring?</h1><div className="grid gap-2" role="radiogroup">{LEVELS.map(([k, t, s]) => <Opt key={k} on={level === k} onClick={() => setLevel(k)} t={t} s={s} />)}</div></>}
      {step === 3 && <><h1 className="display text-[34px] font-bold uppercase leading-none">Op welke dagen train je?</h1><p className="text-mute">Kies 2 tot 4 dagen. Je kunt een training later altijd verplaatsen.</p>
        <div className="grid grid-cols-7 gap-1.5">{DAYS.map(k => { const on = days.includes(k); return <button key={k} aria-pressed={on} aria-label={DAY_NAME[k]} disabled={!on && days.length >= 4}
          onClick={() => setDays(on ? days.filter(x => x !== k) : DAYS.filter(x => x === k || days.includes(x)))} className={cn("h-14 rounded-[12px] display text-[18px] font-bold uppercase disabled:opacity-40", on ? "bg-accent text-accent-ink" : "bg-surface")}>{k}</button>; })}</div>
        {days.length < 2 && <p className="text-[13px] text-warn">Kies minstens 2 dagen.</p>}</>}
      {step === 4 && <><h1 className="display text-[34px] font-bold uppercase leading-none">Waar train je?</h1><div className="grid gap-2" role="radiogroup"><Opt on={place === "gym"} onClick={() => setPlace("gym")} t="In een sportschool" s="Stangen, toestellen, kabels" /><Opt on={place === "thuis"} onClick={() => setPlace("thuis")} t="Thuis" s="Dumbbells en je eigen gewicht" /></div></>}
      {step === 5 && <><h1 className="display text-[34px] font-bold uppercase leading-none">Je schema, {prof.name}</h1><p className="text-mute">Opgesteld uit je antwoorden. Gewichten vul je bij je eerste training in; daarna stelt de app ze zelf voor.</p>
        {days.map(k => { const pd = plan[k]!; return <Card key={k} className="!p-3.5"><div className="flex items-baseline justify-between"><b className="display text-[18px] uppercase">{DAY_NAME[k]} · {pd.title}</b><span className="text-[12px] text-mute">± {estMinutes({ custom: {} } as never, pd.items)} min</span></div>
          <p className="text-[13px] text-mute mt-1">{pd.items.map(i => exById({ custom: {} }, i.exId).name).join(" · ")}</p></Card>; })}</>}
    </div>
    <div className="pt-4"><Btn size="lg" className="w-full" disabled={!can || !can3} onClick={() => step < 5 ? setStep(step + 1) : finish()}>{step < 5 ? "Verder" : "Start met dit schema"}</Btn></div>
  </main>;
}
