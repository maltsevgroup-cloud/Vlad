import { useState } from "react";
import { useApp } from "@/lib/store";
import { badgeStates, LEVELS, streak, activePause, toggleSick, type BadgeState } from "@/lib/rewards";
import { DAY_NAME } from "@/lib/types";
import { addDays, dayKeyOf } from "@/lib/dates";
const nd2 = (dt: string) => dt === today() ? "vandaag" : DAY_NAME[dayKeyOf(dt)].toLowerCase();
import { today, dlong } from "@/lib/dates";
import { Flame, CalendarCheck, RotateCcw, TrendingUp, Trophy, Weight, Timer, Heart, Users, Send, Compass, Sun, Moon, Star, CheckCheck, Lock, Pause, Play } from "lucide-react";
import { Btn, Page, Sheet, Card } from "./ui";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Flame> = { flame: Flame, calendar: CalendarCheck, rotate: RotateCcw, up: TrendingUp, trophy: Trophy, weight: Weight, plates: Weight, timer: Timer, heart: Heart, users: Users, send: Send, compass: Compass, sun: Sun, moon: Moon, star: Star, check: CheckCheck };
const fmt = (n: number) => (Math.round(n * 10) / 10).toString().replace(".", ",");

/** medaille in de vorm van een schijf: de rand krijgt de kleur van het level */
export function Medal({ s, size = 64 }: { s: BadgeState; size?: number }) {
  const I = ICONS[s.b.icon] || Star, hidden = s.b.secret && s.level === 0, lv = s.level ? LEVELS[s.level - 1] : null;
  return <span className="relative inline-grid place-items-center shrink-0 rounded-full" style={{ width: size, height: size, background: lv ? lv.c : "var(--sunk)", boxShadow: lv ? "inset 0 0 0 3px rgba(0,0,0,.12)" : "none" }} aria-hidden="true">
    <span className="grid place-items-center rounded-full" style={{ width: size * .62, height: size * .62, background: lv ? "var(--surface)" : "var(--surface)", opacity: lv ? 1 : .9 }}>
      {hidden ? <span className="display font-bold text-mute" style={{ fontSize: size * .3 }}>?</span> : <I size={size * .3} strokeWidth={2.2} style={{ color: lv ? "var(--ink)" : "var(--mute)" }} />}
    </span>
    {lv && <span className="absolute -bottom-1 rounded-full px-1.5 text-[11px] font-bold num leading-[16px] bg-ink text-bg">{lv.n}</span>}
    {!lv && !hidden && <svg className="absolute inset-0 -rotate-90" width={size} height={size}><circle cx={size / 2} cy={size / 2} r={size / 2 - 2} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${Math.PI * (size - 4) * s.progress} 999`} /></svg>}
  </span>;
}
const label = (s: BadgeState) => s.b.secret && !s.level ? "Geheime badge" : s.b.stepNames && s.level ? s.b.stepNames[s.level - 1] : s.b.name;
const left = (s: BadgeState) => s.b.id === "schijven" ? `nog ${fmt(s.next! - s.v)} kg` : `nog ${s.b.unit(Math.round((s.next! - s.v) * 10) / 10)}`;
const sub = (s: BadgeState) => s.b.secret && !s.level ? "Nog niet ontdekt" : s.next === null ? "Hoogste level" : s.level ? `level ${LEVELS[s.level - 1].n} · ${left(s)}` : left(s);

export function BadgeSheet({ s, onClose }: { s: BadgeState | null; onClose: () => void }) {
  if (!s) return null; const hidden = s.b.secret && !s.level;
  return <Sheet open={!!s} onClose={onClose} title={label(s)} sub={hidden ? "Een geheime badge. Je ontdekt hem door te trainen." : s.b.how}>
    <div className="grid justify-items-center gap-3 pb-1"><Medal s={s} size={96} />
      {!hidden && <p className="text-[14px] text-center">Nu: <b className="num">{s.b.unit(Math.round(s.v * 10) / 10)}</b></p>}</div>
    {!hidden && <ol className="grid gap-2 mt-3" aria-label="Levels">{s.b.steps.map((st, i) => { const got = s.level > i;
      return <li key={i} className={cn("flex items-center gap-3 rounded-[12px] px-3 h-12", got ? "bg-sunk" : "border border-line")}>
        <span className="h-6 w-6 rounded-full shrink-0" style={{ background: got ? LEVELS[i].c : "var(--sunk)" }} aria-hidden="true" />
        <span className="grow text-[14px]"><b>Level {LEVELS[i].n}</b>{s.b.stepNames ? ` · ${s.b.stepNames[i]}` : ""}</span>
        <span className="text-[13px] text-mute num">{s.b.unit(st)}</span>{got ? <CheckCheck size={16} className="text-good" aria-label="behaald" /> : <Lock size={14} className="text-mute" aria-label="nog niet" />}</li>; })}</ol>}
  </Sheet>;
}

/** zijwaartse rij: eerst behaald (hoogste level eerst), dan bijna gehaald, dan geheim */
export function BadgeRow() {
  const { data: d, setPage } = useApp(); const [open, setOpen] = useState<BadgeState | null>(null);
  if (!d) return null;
  const st = badgeStates(d, d.me), near = st.filter(s => s.next !== null && !(s.b.secret && !s.level)).sort((a, b) => b.progress - a.progress).slice(0, 3);
  return <section aria-label="Badges">
    <div className="flex items-baseline justify-between mb-2"><h2 className="text-[15px] font-semibold">Badges bijna binnen</h2><button className="text-[13px] font-semibold text-accent h-11 -my-3" onClick={() => setPage("badges")}>Alle {st.filter(s => s.level).length}/{st.length}</button></div>
    <div className="grid grid-cols-3 gap-3">
      {near.map(s => <button key={s.b.id} onClick={() => setOpen(s)} className="grid justify-items-center content-start gap-1.5 text-center" aria-label={`${label(s)}, ${sub(s)}`}>
        <Medal s={s} size={60} /><span className="text-[12px] font-semibold leading-tight line-clamp-2">{label(s)}</span><span className="text-[11px] text-mute leading-tight">{sub(s)}</span></button>)}
    </div>
    <BadgeSheet s={open} onClose={() => setOpen(null)} />
  </section>;
}

export function BadgesPage() {
  const { data: d, back } = useApp(); const [open, setOpen] = useState<BadgeState | null>(null);
  if (!d) return null;
  const st = badgeStates(d, d.me), groups = [...new Set(st.map(s => s.b.group))];
  return <Page title="Badges" onBack={back}>
    <Card className="grid gap-2"><p className="text-[14px]"><b className="display text-[30px] num">{st.filter(s => s.level).length}</b> <span className="text-mute">van {st.length} badges · {st.reduce((a, s) => a + s.level, 0)} van {st.length * 4} levels</span></p>
      <div className="flex gap-2 items-center text-[12px] text-mute">{LEVELS.map(l => <span key={l.n} className="flex items-center gap-1"><i className="h-3 w-3 rounded-full" style={{ background: l.c }} />{l.n}</span>)}<span>de levels zijn schijven, van licht naar zwaar</span></div></Card>
    {groups.map(g => <Card key={g}><h2 className="label mb-3">{g}</h2><div className="grid grid-cols-3 gap-y-4 gap-x-2">{st.filter(s => s.b.group === g).map(s =>
      <button key={s.b.id} onClick={() => setOpen(s)} className="grid justify-items-center gap-1.5 text-center" aria-label={`${label(s)}, ${sub(s)}`}><Medal s={s} size={64} /><span className="text-[12px] font-semibold leading-tight">{label(s)}</span><span className="text-[11px] text-mute leading-tight">{sub(s)}</span></button>)}</div></Card>)}
    <BadgeSheet s={open} onClose={() => setOpen(null)} />
  </Page>;
}

/** uitleg + pauze voor de streak */
export function StreakSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: d, update, toast } = useApp(); if (!d) return null;
  const s = streak(d, d.me), p = activePause(d);
  return <Sheet open={open} onClose={onClose} title={`${s.count} op rij`} sub="Het aantal geplande trainingen dat je deed zonder er een over te slaan.">
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2 text-center"><div className="rounded-[14px] bg-sunk py-3"><b className="display text-[30px] num block leading-none">{s.count}</b><span className="text-[12px] text-mute">nu</span></div><div className="rounded-[14px] bg-sunk py-3"><b className="display text-[30px] num block leading-none">{s.best}</b><span className="text-[12px] text-mute">je beste</span></div></div>
      <ul className="text-[13px] grid gap-1.5 text-mute"><li>Een geplande training overslaan zet de teller op 0.</li><li>Vooruit trainen mag: een training die je vroeger in de week doet, telt voor haar geplande dag.</li><li>Ziek? Meld het voor die ene training. Ben je de volgende keer nog ziek, meld het dan opnieuw.</li><li>Een rustweek houdt je streak een week vast.</li></ul>
      {s.nextDate && !p && <Btn variant={s.sick ? "soft" : "line"} onClick={() => { const nd = s.nextDate!; update(x => toggleSick(x, nd)); toast(s.sick ? "Ziekmelding ingetrokken." : `Ziek gemeld voor ${nd === today() ? "vandaag" : DAY_NAME[dayKeyOf(nd)].toLowerCase()}. Beterschap.`); onClose(); }}>
        {s.sick ? `Toch niet ziek op ${nd2(s.nextDate)}` : `Ik ben ziek voor de training van ${nd2(s.nextDate)}`}</Btn>}
      {p ? <div className="rounded-[14px] bg-accent-soft p-3 grid gap-2"><p className="text-[14px]"><Pause size={14} className="inline -mt-0.5" /> Rustweek tot {dlong(p.to || today())}.</p>
          <Btn variant="line" onClick={() => { update(x => { const q = (x.pauses || []).find(y => y.reason === "rustweek" && y.from === p.from); if (q) q.to = addDays(today(), -1); }); toast("Rustweek gestopt."); onClose(); }}><Play size={16} />Rustweek stoppen</Btn></div>
        : <Btn variant="line" onClick={() => { update(x => { (x.pauses ||= []).push({ from: today(), to: addDays(today(), 6), reason: "rustweek" }); }); toast("Rustweek tot volgende week. Je streak blijft staan."); onClose(); }}>Rustweek nemen</Btn>}
      <p className="text-[12px] text-mute">Train niet als je ziek bent. Twijfel je, vraag raad aan je huisarts.</p>
    </div>
  </Sheet>;
}
