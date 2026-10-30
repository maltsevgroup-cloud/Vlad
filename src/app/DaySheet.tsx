import { useApp } from "@/lib/store";
import { DAY_NAME } from "@/lib/types";
import { dayKeyOf, dlong, today, hm, mmss } from "@/lib/dates";
import { exById, suggest, doneSets, finished, fmtKg, volume, prsIn, estMinutes } from "@/lib/logic";
import { Sheet, Btn } from "./ui";
import { Trend } from "./Home";
import { startSession } from "./actions";
import { sickOn, toggleSick } from "@/lib/rewards";
import { Trophy, StickyNote, Moon } from "lucide-react";

/** wat er op een dag gebeurde of gepland staat */
export function DaySheet({ date, onClose }: { date: string | null; onClose: () => void }) {
  const { data: d, update, openWorkout } = useApp(); if (!d || !date) return null;
  const k = dayKeyOf(date), t = today(), past = date < t, isT = date === t;
  const done = Object.values(d.sessions).filter(s => s.uid === d.me && s.date === date && finished(s));
  const pd = d.plans[d.me]?.[k], title = `${DAY_NAME[k]} ${dlong(date)}`;
  return <Sheet open={!!date} onClose={onClose} title={title} sub={done.length ? undefined : pd ? (past ? "Gepland, niet gedaan" : isT ? "Vandaag gepland" : "Gepland") : "Rustdag"}>
    {done.map(s => { const prs = prsIn(d, s);
      return <div key={s.id} className="grid gap-3 mb-4">
        <div className="flex items-baseline justify-between"><b className="display text-[22px] uppercase">{s.title}</b><span className="text-[12px] text-mute num">{hm(s.startedAt)}{s.finishedAt ? ` · ${mmss((s.finishedAt - s.startedAt) / 1000)}` : ""}</span></div>
        <p className="text-[13px] text-mute num -mt-2">{s.items.reduce((a, i) => a + doneSets(i).length, 0)} sets · {fmtKg(Math.round(volume(d, s)))} kg{s.rating ? ` · gevoel ${s.rating}/5` : ""}</p>
        {prs.length > 0 && <p className="rounded-[12px] bg-good-soft text-good text-[13px] font-semibold p-2.5 flex gap-1.5 items-start"><Trophy size={15} className="mt-0.5 shrink-0" />{prs.map(p => `${exById(d, p.exId).name} ${fmtKg(p.w)} × ${p.r}`).join(", ")}</p>}
        <ul className="grid">{s.items.map(il => { const ex = exById(d, il.exId), ds = doneSets(il);
          return <li key={il.pid} className="py-2.5 border-t border-line first:border-0"><div className="flex justify-between gap-2"><b className="text-[14px]">{ex.name}</b>{il.feel && <span className="text-[12px] text-mute">{il.feel}</span>}</div>
            <p className="text-[13px] text-mute num">{ds.length ? ds.map(z => ex.kind === "gewicht" ? `${fmtKg(z.w)}×${z.r}` : `${z.r}${ex.kind === "tijd" ? "s" : " min"}`).join("  ·  ") : "niet gedaan"}</p>
            {il.note && <p className="text-[13px] mt-1 flex gap-1.5"><StickyNote size={14} className="mt-0.5 text-mute shrink-0" />{il.note}</p>}</li>; })}</ul>
        <Btn variant="ghost" onClick={() => { onClose(); openWorkout(s.id); }}>Training openen</Btn>
      </div>; })}
    {!done.length && pd && <div className="grid gap-3">
      <div className="flex items-baseline justify-between"><b className="display text-[22px] uppercase">{pd.title}</b><span className="text-[12px] text-mute">± {estMinutes(d, pd.items)} min</span></div>
      <ul className="grid">{pd.items.map(it => { const ex = exById(d, it.exId), s = suggest(d, d.me, it);
        return <li key={it.id} className="flex items-center gap-2 py-2.5 border-t border-line first:border-0"><span className="grow text-[14px]">{ex.name}</span>
          <span className="num text-[13px] font-semibold whitespace-nowrap">{ex.kind === "gewicht" ? (s.w ? `${fmtKg(s.w)} kg × ${s.r}` : `${it.sets} × ${s.r}`) : ex.kind === "tijd" ? `${it.sets} × ${s.r} sec` : ex.kind === "cardio" ? `${it.target} min` : `${it.sets} × ${s.r}`}</span>{ex.kind !== "cardio" && <Trend t={s.trend} />}</li>; })}</ul>
      {!past && <Btn variant={sickOn(d, date) ? "soft" : "line"} onClick={() => update(x => toggleSick(x, date))}>{sickOn(d, date) ? "Ziek gemeld · intrekken" : "Ik ben ziek voor deze training"}</Btn>}
      {past ? <p className="text-[13px] text-mute">{sickOn(d, date) ? "Ziek gemeld: telt niet mee voor je streak." : "Deze training is niet gedaan."}</p>
        : <Btn size="lg" onClick={() => { let id = ""; update(x => { id = startSession(x, k); }); onClose(); setTimeout(() => openWorkout(id), 0); }}>{isT ? "Start training" : "Vandaag al doen"}</Btn>}
    </div>}
    {!done.length && !pd && <p className="text-[14px] text-mute flex items-center gap-2 py-4"><Moon size={18} />Geen training gepland. Herstel hoort erbij.</p>}
  </Sheet>;
}
