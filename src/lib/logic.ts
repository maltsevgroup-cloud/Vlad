import type { Data, Exercise, ItemLog, PlanItem, Session, SetLog, Plan, DayKey, Profile } from "./types";
import { DAYS } from "./types";
import { LIB } from "./exercises";
import { mondayOf, addDays, today, dayKeyOf } from "./dates";

export const exById = (d: Pick<Data, "custom">, id: string): Exercise =>
  LIB.find(e => e.id === id) || d.custom[id] || { id, name: "Oefening", group: "Core", kind: "gewicht", step: 2.5, equip: "Anders" };
export const roundTo = (x: number, step: number) => step > 0 ? Math.max(0, Math.round(x / step) * step) : Math.max(0, Math.round(x));
/** een set telt alleen als ze afgevinkt is én er minstens 1 herhaling (of seconde, minuut) is gedaan */
export const isDone = (s: SetLog) => s.done && s.r > 0;
export const doneSets = (il: ItemLog) => il.sets.filter(isDone);

export const sessionsOf = (d: Data, uid: string) =>
  Object.values(d.sessions).filter(s => s.uid === uid).sort((a, b) => a.date === b.date ? a.startedAt - b.startedAt : a.date < b.date ? -1 : 1);
export const finished = (s: Session) => s.items.some(i => doneSets(i).length > 0);

export interface Hist { date: string; log: ItemLog; sessionId: string }
export function history(d: Data, uid: string, exId: string, excludeSession?: string): Hist[] {
  const out: Hist[] = [];
  sessionsOf(d, uid).forEach(s => { if (s.id === excludeSession) return; s.items.forEach(il => { if (il.exId === exId && doneSets(il).length) out.push({ date: s.date, log: il, sessionId: s.id }); }); });
  return out.reverse();
}
const hitAll = (il: ItemLog, target: number, sets: number) => { const ds = doneSets(il); return ds.length >= sets && ds.every(s => s.r >= target); };
const topW = (il: ItemLog) => Math.max(0, ...doneSets(il).map(s => s.w));

export interface Suggestion { w: number; r: number; why: string; trend: "op" | "gelijk" | "neer" | "nieuw" }
export function suggest(d: Data, uid: string, it: PlanItem, excludeSession?: string): Suggestion {
  const ex = exById(d, it.exId), p = d.profiles[uid], h = history(d, uid, it.exId, excludeSession);
  if (!h.length) return { w: it.weight, r: it.target, why: ex.kind === "gewicht" ? (it.weight ? "Startgewicht uit je schema" : "Kies een gewicht waarmee je nog 2 à 3 herhalingen over hebt") : "Eerste keer", trend: "nieuw" };
  const last = h[0].log, hit = hitAll(last, it.target, it.sets);
  if (ex.kind === "cardio") return { w: last.sets[0]?.w || 0, r: it.target, why: "Zelfde als vorige keer", trend: "gelijk" };
  if (ex.kind === "tijd" || ex.kind === "lichaam") {
    const best = Math.max(...doneSets(last).map(s => s.r)), inc = ex.kind === "tijd" ? 5 : 1;
    if (hit && p?.prog === "op" && last.feel !== "zwaar") return { w: 0, r: Math.max(it.target, best) + inc, why: ex.kind === "tijd" ? "Alles gehaald: 5 seconden langer" : "Alles gehaald: één herhaling meer", trend: "op" };
    return { w: 0, r: hit ? Math.max(it.target, best) : it.target, why: hit ? "Zelfde als vorige keer" : "Nog niet alles gehaald, zelfde doel", trend: "gelijk" };
  }
  const w = topW(last);
  if (hit) {
    if (p?.prog !== "op") return { w, r: it.target, why: "Progressie staat op gelijk houden", trend: "gelijk" };
    if (last.feel === "zwaar") return { w, r: it.target, why: "Vorige keer zwaar: eerst nog eens hetzelfde", trend: "gelijk" };
    return { w: roundTo(w + ex.step, ex.step || 1), r: it.target, why: `Vorige keer alle sets gehaald: +${fmtKg(ex.step)} kg`, trend: "op" };
  }
  const prev = h[1]?.log;
  if (prev && !hitAll(prev, it.target, it.sets) && topW(prev) === w && w > 0) return { w: roundTo(w * 0.9, ex.step || 1), r: it.target, why: "Twee keer op rij niet gehaald: 10% lichter", trend: "neer" };
  return { w, r: it.target, why: "Nog niet alle herhalingen gehaald: zelfde gewicht", trend: "gelijk" };
}

export const e1rm = (w: number, r: number) => r <= 0 ? 0 : r === 1 ? w : w * (1 + r / 30);
export const fmtKg = (w: number) => (Math.round(w * 100) / 100).toString().replace(".", ",");
export const volume = (d: Data, s: Session) => s.items.reduce((a, il) => exById(d, il.exId).kind === "gewicht" ? a + doneSets(il).reduce((b, z) => b + z.w * z.r, 0) : a, 0);

/** schijven per kant voor stang-oefeningen (wedstrijdkleuren) */
export const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
export function platesPerSide(total: number, bar = 20) {
  let rest = Math.round(((total - bar) / 2) * 100) / 100; const out: number[] = [];
  if (rest <= 0) return { out, rest: 0 };
  for (const p of PLATES) while (rest >= p - 1e-9) { out.push(p); rest = Math.round((rest - p) * 100) / 100; }
  return { out, rest };
}

export interface PR { exId: string; w: number; r: number; e: number; date: string }
export function records(d: Data, uid: string): PR[] {
  const best: Record<string, PR> = {};
  sessionsOf(d, uid).forEach(s => s.items.forEach(il => { if (exById(d, il.exId).kind !== "gewicht") return; doneSets(il).forEach(z => { const e = e1rm(z.w, z.r); if (!best[il.exId] || e > best[il.exId].e + 1e-9) best[il.exId] = { exId: il.exId, w: z.w, r: z.r, e, date: s.date }; }); }));
  return Object.values(best).sort((a, b) => a.date < b.date ? 1 : -1);
}
/** nieuwe records in een sessie, tegenover alles daarvoor */
export function prsIn(d: Data, s: Session) {
  const out: { exId: string; w: number; r: number }[] = [];
  s.items.forEach(il => {
    if (exById(d, il.exId).kind !== "gewicht") return;
    const before = Math.max(0, ...history(d, s.uid, il.exId, s.id).filter(h => h.date <= s.date).flatMap(h => doneSets(h.log).map(z => e1rm(z.w, z.r))));
    const top = doneSets(il).reduce<SetLog | null>((a, z) => !a || e1rm(z.w, z.r) > e1rm(a.w, a.r) ? z : a, null);
    if (top && before > 0 && e1rm(top.w, top.r) > before + 1e-9) out.push({ exId: il.exId, w: top.w, r: top.r });
  });
  return out;
}
export const weekSessions = (d: Data, uid: string, monday = mondayOf(today())) => sessionsOf(d, uid).filter(s => finished(s) && s.date >= monday && s.date < addDays(monday, 7));
export function streakWeeks(d: Data, uid: string) {
  let n = 0, wk = mondayOf(today()); if (!weekSessions(d, uid, wk).length) wk = addDays(wk, -7);
  while (weekSessions(d, uid, wk).length) { n++; wk = addDays(wk, -7); } return n;
}
export const planDays = (plan: Plan | undefined) => DAYS.filter(k => plan?.[k]?.items.length);
export function nextTraining(d: Data, uid: string): { day: DayKey; date: string } | null {
  const pd = planDays(d.plans[uid]); if (!pd.length) return null;
  const t = today();
  for (let i = 0; i < 7; i++) { const date = addDays(t, i), k = dayKeyOf(date); if (!pd.includes(k)) continue;
    const done = sessionsOf(d, uid).some(s => s.date === date && s.finishedAt); if (!done) return { day: k, date }; }
  return { day: pd[0], date: addDays(t, 7) };
}
export const estMinutes = (d: Data, items: PlanItem[]) => Math.round(items.reduce((a, it) => { const k = exById(d, it.exId).kind; return a + (k === "cardio" ? it.target : it.sets * (k === "tijd" ? it.target / 60 + it.rest / 60 : 0.75 + it.rest / 60)); }, 0) / 5) * 5;

/* ---------- schema op maat ---------- */
type Tpl = [string, string[]][];
const GYM: Record<number, Tpl> = {
  2: [["Volledig lichaam A", ["squat", "bench", "bbrow", "dbpress", "legcurl", "plank"]], ["Volledig lichaam B", ["deadlift", "incdb", "latpull", "lunge", "facepull", "dbcurl"]]],
  3: [["Duwen en benen", ["squat", "bench", "dbpress", "legext", "pushdown", "plank"]], ["Trekken en billen", ["deadlift", "latpull", "seatrow", "hipthrust", "dbcurl", "legraise"]], ["Volledig lichaam", ["legpress", "incdb", "bbrow", "rdl", "latraise", "cablecrunch"]]],
  4: [["Bovenlichaam A", ["bench", "bbrow", "ohp", "latpull", "dbcurl", "pushdown"]], ["Onderlichaam A", ["squat", "rdl", "legpress", "legcurl", "calf", "plank"]], ["Bovenlichaam B", ["incdb", "seatrow", "dbpress", "facepull", "hammer", "ohext"]], ["Onderlichaam B", ["deadlift", "lunge", "legext", "hipthrust", "calf", "cablecrunch"]]],
};
const HOME: Tpl = [["Thuis A", ["lunge", "pushup", "dbpress", "dbcurl", "plank"]], ["Thuis B", ["rdl", "incdb", "latraise", "hammer", "sideplank"]], ["Thuis C", ["lunge", "pushup", "dbpress", "legraise", "plank"]]];
export function buildPlan(p: Pick<Profile, "goal" | "level" | "days" | "place">, focus?: string): Plan {
  const n = Math.min(4, Math.max(2, p.days.length)), tpl = p.place === "thuis" ? HOME : GYM[n] || GYM[3];
  const [sets, reps, rest] = ({ kracht: [p.level === "beg" ? 3 : 4, 5, 180], spier: [3, 10, 90], af: [3, 12, 60], fit: [3, 10, 75] } as const)[p.goal];
  const plan: Plan = {};
  p.days.forEach((k, i) => { const [title, ids] = tpl[i % tpl.length]; const list = focus && !ids.includes(focus) ? [...ids.slice(0, 3), focus, ...ids.slice(3)] : ids;
    plan[k] = { title, items: list.map((exId, j) => { const ex = exById({ custom: {} }, exId);
      const t = ex.kind === "tijd" ? 30 : ex.kind === "cardio" ? 15 : ex.kind === "lichaam" ? 8 : (["latraise", "dbcurl", "hammer", "legext", "legcurl", "calf", "facepull", "pushdown", "ohext", "cablecrunch"].includes(exId) ? Math.max(reps, 12) : reps);
      return { id: `p${i}${j}${exId}`, exId, sets: ex.kind === "cardio" ? 1 : sets, target: t, weight: 0, rest: ex.kind === "cardio" ? 0 : exId === "squat" || exId === "deadlift" ? Math.max(rest, 120) : rest }; }) }; });
  return plan;
}
