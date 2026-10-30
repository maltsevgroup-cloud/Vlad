import { useApp } from "@/lib/store";
import { DAYS, DAY_NAME } from "@/lib/types";
import { today, mondayOf, addDays, pdate } from "@/lib/dates";
import { finished, planDays } from "@/lib/logic";
import { streak, sickOn } from "@/lib/rewards";
import { Sheet, Btn } from "./ui";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

/** na een (deels) afgeronde training: je streak, en de week met wat al gedaan is */
export function StreakPop() {
  const { data: d, streakPop, setStreakPop, setCelebrate } = useApp();
  if (!d || !streakPop) return null;
  const st = streak(d, d.me), t = today(), mon = mondayOf(t), pd = planDays(d.plans[d.me]);
  const doneOn = (date: string) => Object.values(d.sessions).some(s => s.uid === d.me && s.date === date && s.finishedAt && finished(s));
  const wkDone = DAYS.filter((_, i) => doneOn(addDays(mon, i))).length;
  const sub = st.count > 1 && st.count >= st.best ? "Je langste reeks ooit. Zo doorgaan!"
    : st.best > st.count ? `Nog ${st.best - st.count} tot je record van ${st.best}.` : "Een goed begin. Doe je volgende training en je reeks groeit.";
  const close = () => { const b = streakPop; setStreakPop(null); if (b.length) setTimeout(() => setCelebrate(b), 200); };
  const bits = Array.from({ length: 26 }, (_, i) => ({ x: (i * 37) % 100, y: (i * 53) % 70, r: (i * 47) % 180, c: ["var(--plate-25)", "var(--plate-20)", "var(--plate-15)", "var(--plate-10)", "var(--accent)"][i % 5] }));
  return <Sheet open onClose={close} title={`${st.count} op rij`} sub="Training opgeslagen.">
    <div className="relative -mt-2 mb-3 h-[150px] rounded-[18px] overflow-hidden grid place-items-center" aria-hidden="true"
      style={{ backgroundImage: "linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)", backgroundSize: "22px 22px", maskImage: "radial-gradient(circle at 50% 50%, #000 35%, transparent 75%)", WebkitMaskImage: "radial-gradient(circle at 50% 50%, #000 35%, transparent 75%)" }}>
      {bits.map((b, i) => <i key={i} className="absolute w-[5px] h-[9px] rounded-[1px] confetti" style={{ left: `${b.x}%`, top: `${b.y + 8}%`, background: b.c, transform: `rotate(${b.r}deg)`, animationDelay: `${(i % 7) * 60}ms` }} />)}
      <span className="relative h-24 w-24 rounded-full bg-surface grid place-items-center shadow-[0_12px_30px_-10px_rgba(0,0,0,.35)] pop-in"><Flame size={44} strokeWidth={2.2} className="text-[var(--plate-15)]" fill="var(--plate-15)" /></span>
    </div>
    <p className="text-center text-[15px] text-mute -mt-1 mb-4">{sub}</p>
    <ol className="grid grid-cols-7 gap-1 mb-5" aria-label="Deze week">
      {DAYS.map((k, i) => { const date = addDays(mon, i), done = doneOn(date), plan = pd.includes(k), sick = sickOn(d, date), isT = date === t;
        return <li key={k} className="grid justify-items-center gap-1.5" aria-label={`${DAY_NAME[k]}: ${done ? "getraind" : sick ? "ziek gemeld" : plan ? (date < t ? "niet gedaan" : "gepland") : "rustdag"}`}>
          <span className="text-[12px] text-mute capitalize">{k}</span>
          {done ? <span className={cn("h-9 w-9 rounded-full bg-accent text-accent-ink grid place-items-center", isT && "pop-in")}><Flame size={17} fill="currentColor" /></span>
            : <span className={cn("h-9 w-9 rounded-full grid place-items-center text-[15px] font-semibold num", sick ? "bg-sunk text-mute" : plan ? "text-ink border-2 border-dashed border-line" : "text-mute")}>{pdate(date).getDate()}</span>}
        </li>; })}
    </ol>
    <p className="text-center text-[13px] text-mute mb-3">{wkDone} van {pd.length} trainingen deze week{st.best ? ` · beste reeks ${st.best}` : ""}</p>
    <Btn size="lg" className="w-full" onClick={close}>Verder</Btn>
  </Sheet>;
}
