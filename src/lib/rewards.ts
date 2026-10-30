/* Streak en badges. Alles wordt berekend uit de opgeslagen trainingen: niets apart bewaren, dus niets kan verloren gaan of uit sync raken. */
import type { Data, DayKey } from "./types";
import { DAYS } from "./types";
import { sessionsOf, finished, doneSets, exById, e1rm, records, planDays } from "./logic";
import { today, addDays, mondayOf, dayKeyOf, pdate } from "./dates";

const pausedOn = (d: Data, date: string) => (d.pauses || []).some(p => date >= p.from && (p.to === null || date <= p.to));
/** rustweek: loopt tot een vaste datum */
export const activePause = (d: Data) => (d.pauses || []).find(p => p.reason === "rustweek" && (p.to === null || p.to >= today())) || null;
/** ziek geldt telkens voor één geplande training; ben je bij de volgende nog ziek, dan meld je dat opnieuw */
export const sickOn = (d: Data, date: string) => (d.pauses || []).some(p => p.reason === "ziek" && p.from === date);
export function toggleSick(d: Data, date: string) { const l = d.pauses || (d.pauses = []); const i = l.findIndex(p => p.reason === "ziek" && p.from === date); if (i >= 0) l.splice(i, 1); else l.push({ from: date, to: date, reason: "ziek" }); }
/** training gedaan voor die geplande dag: telt ook als je ze vroeger in dezelfde week deed (via de middelste knop) */
const doneFor = (d: Data, uid: string, date: string, k: DayKey) => sessionsOf(d, uid).some(s => finished(s) && s.day === k && mondayOf(s.date) === mondayOf(date) && s.date <= addDays(date, 6));

export interface Streak { count: number; best: number; paused: boolean; atRisk: boolean; nextDate: string | null; sick: boolean }
/** geplande trainingen op rij. Gewoon overslaan breekt de reeks; een pauze (ziek, rustweek) houdt ze vast. */
export function streak(d: Data, uid: string): Streak {
  const pd = planDays(d.plans[uid]); if (!pd.length) return { count: 0, best: 0, paused: false, atRisk: false, nextDate: null, sick: false };
  const start = (d.profiles[uid]?.createdAt ? new Date(d.profiles[uid].createdAt) : pdate(addDays(today(), -120)));
  const first = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
  let run = 0, best = 0; const t = today();
  for (let date = first; date <= t; date = addDays(date, 1)) {
    const k = dayKeyOf(date); if (!pd.includes(k)) continue;
    const ok = doneFor(d, uid, date, k);
    if (ok) { run++; best = Math.max(best, run); continue; }
    if (date === t && !sickOn(d, date)) continue; // vandaag kan nog
    if (pausedOn(d, date)) continue;          // gepauzeerd: niet tellen, niet breken
    run = 0;
  }
  const paused = uid === d.me && !!activePause(d);
  let nextDate: string | null = null; for (let i = 0; i < 8; i++) { const dt = addDays(t, i), k = dayKeyOf(dt); if (pd.includes(k) && !doneFor(d, uid, dt, k)) { nextDate = dt; break; } }
  const sick = !!nextDate && sickOn(d, nextDate);
  return { count: run, best, paused, atRisk: !paused && !sick && nextDate === t && run > 0, nextDate, sick };
}

/* ---------- badges ---------- */
export type Level = 0 | 1 | 2 | 3 | 4;
export const LEVELS = [{ n: "10", c: "var(--plate-10)" }, { n: "15", c: "var(--plate-15)" }, { n: "20", c: "var(--plate-20)" }, { n: "25", c: "var(--plate-25)" }];
export interface BadgeDef { id: string; name: string; group: string; icon: string; secret?: boolean; steps: number[]; stepNames?: string[]; unit: (n: number) => string; how: string; value: (d: Data, uid: string) => number }
/** alleen afgeronde trainingen tellen voor badges: tijdens een training verdien je nog niets */
const fin = (d: Data, uid: string) => sessionsOf(d, uid).filter(s => !!s.finishedAt && finished(s));
const hourOf = (t: number) => new Date(t).getHours();
const ton = (kg: number) => kg >= 1000 ? `${(Math.round(kg / 100) / 10).toString().replace(".", ",")} ton` : `${Math.round(kg)} kg`;

export const BADGES: BadgeDef[] = [
  { id: "schema", name: "Op schema", group: "Discipline", icon: "flame", steps: [3, 10, 25, 50], unit: n => `${n} ${n === 1 ? "training" : "trainingen"} op rij`, how: "Doe je geplande trainingen zonder er een over te slaan. Ziek of rustweek breekt de reeks niet.", value: (d, u) => streak(d, u).best },
  { id: "volleweek", name: "Volle week", group: "Discipline", icon: "calendar", steps: [1, 4, 12, 26], unit: n => `${n} ${n === 1 ? "week" : "weken"} alles gedaan`, how: "Doe in één week al je geplande trainingen.", value: (d, u) => { const pd = planDays(d.plans[u]).length; if (!pd) return 0; const w: Record<string, number> = {}; fin(d, u).forEach(s => { const m = mondayOf(s.date); w[m] = (w[m] || 0) + 1; }); return Object.values(w).filter(n => n >= pd).length; } },
  { id: "comeback", name: "Comeback", group: "Discipline", icon: "rotate", steps: [1, 2, 4, 8], unit: n => `${n}× teruggekomen`, how: "Train opnieuw na minstens twee weken pauze. Opnieuw beginnen telt ook.", value: (d, u) => { const ds = [...new Set(fin(d, u).map(s => s.date))].sort(); let n = 0; for (let i = 1; i < ds.length; i++) if ((pdate(ds[i]).getTime() - pdate(ds[i - 1]).getTime()) / 864e5 >= 14) n++; return n; } },
  { id: "stap", name: "Stap erbij", group: "Sterker", icon: "up", steps: [10, 30, 75, 150], unit: n => `${n}× zwaarder`, how: "Elke keer dat je zwaarder gaat dan de vorige keer bij dezelfde oefening.", value: (d, u) => { let n = 0; const last: Record<string, number> = {}; fin(d, u).forEach(s => s.items.forEach(il => { if (exById(d, il.exId).kind !== "gewicht") return; const w = Math.max(0, ...doneSets(il).map(z => z.w)); if (!w) return; if (last[il.exId] !== undefined && w > last[il.exId]) n++; last[il.exId] = w; })); return n; } },
  { id: "records", name: "Recordjager", group: "Sterker", icon: "trophy", steps: [5, 25, 75, 150], unit: n => `${n} ${n === 1 ? "record" : "records"}`, how: "Verbeter je beste set (geschat maximum) bij een oefening.", value: (d, u) => { let n = 0; const best: Record<string, number> = {}; fin(d, u).forEach(s => s.items.forEach(il => { if (exById(d, il.exId).kind !== "gewicht") return; const e = Math.max(0, ...doneSets(il).map(z => e1rm(z.w, z.r))); if (!e) return; if (best[il.exId] !== undefined && e > best[il.exId] + 1e-9) n++; best[il.exId] = Math.max(best[il.exId] || 0, e); })); return n; } },
  { id: "schijven", name: "Schijven", group: "Sterker", icon: "plates", steps: [60, 100, 140, 180], stepNames: ["Eerste schijf", "Twee schijven", "Drie schijven", "Vier schijven"], unit: n => `${n} kg op de stang`, how: "Leg 1, 2, 3 of 4 schijven van 20 kg per kant op een stang van 20 kg: 60, 100, 140 of 180 kg in één afgevinkte set.", value: (d, u) => Math.max(0, ...fin(d, u).flatMap(s => s.items.filter(il => exById(d, il.exId).bar).flatMap(il => doneSets(il).map(z => z.w)))) },
  { id: "verzet", name: "Totaal verzet", group: "Sterker", icon: "weight", steps: [6000, 40000, 150000, 400000], stepNames: ["Een olifant", "Een vrachtwagen", "Een blauwe vinvis", "Een jumbojet"], unit: ton, how: "Alles wat je ooit tilde, opgeteld (gewicht × herhalingen). Ter vergelijking, afgerond: een grote olifant ± 6 ton, een volgeladen vrachtwagen ± 40 ton, een blauwe vinvis ± 150 ton, een volgetankte Boeing 747 bij het opstijgen ± 400 ton.", value: (d, u) => fin(d, u).reduce((a, s) => a + s.items.reduce((b, il) => exById(d, il.exId).kind === "gewicht" ? b + doneSets(il).reduce((c, z) => c + z.w * z.r, 0) : b, 0), 0) },
  { id: "plank", name: "Steady", group: "Uithouding", icon: "timer", steps: [60, 90, 120, 180], unit: n => `${n} sec in één set`, how: "Houd een plank of zijplank zo lang mogelijk vast in één set.", value: (d, u) => Math.max(0, ...fin(d, u).flatMap(s => s.items.filter(il => exById(d, il.exId).kind === "tijd").flatMap(il => doneSets(il).map(z => z.r)))) },
  { id: "cardio", name: "Uithouder", group: "Uithouding", icon: "heart", steps: [60, 300, 1000, 3000], unit: n => `${n} ${n === 1 ? "minuut" : "minuten"} cardio`, how: "Minuten op de loopband, fiets, roeitoestel of trappenklimmer, opgeteld.", value: (d, u) => fin(d, u).reduce((a, s) => a + s.items.filter(il => exById(d, il.exId).kind === "cardio").reduce((b, il) => b + doneSets(il).reduce((c, z) => c + z.r, 0), 0), 0) },
  { id: "duodag", name: "Duo-dag", group: "Samen", icon: "users", steps: [1, 5, 15, 40], unit: n => `${n} ${n === 1 ? "dag" : "dagen"} samen getraind`, how: "Train op dezelfde dag als je trainingsmaat.", value: (d, u) => { if (!d.mate) return 0; const m = new Set(fin(d, d.mate).map(s => s.date)); return new Set(fin(d, u).map(s => s.date).filter(x => m.has(x))).size; } },
  { id: "aanmoediger", name: "Aanmoediger", group: "Samen", icon: "send", steps: [5, 25, 100, 250], unit: n => `${n} ${n === 1 ? "bericht" : "berichten"}`, how: "Stuur je maat een aanmoediging of bericht.", value: (d, u) => d.msgs.filter(m => m.from === u).length },
  { id: "ontdekker", name: "Ontdekker", group: "Ontdekken", icon: "compass", steps: [5, 10, 20, 30], unit: n => `${n} ${n === 1 ? "oefening" : "oefeningen"}`, how: "Probeer verschillende oefeningen.", value: (d, u) => new Set(fin(d, u).flatMap(s => s.items.filter(il => doneSets(il).length).map(il => il.exId))).size },
  { id: "vroeg", name: "Vroege vogel", group: "Geheim", icon: "sun", secret: true, steps: [1, 5, 15, 30], unit: n => `${n}× voor 9 uur`, how: "Begin een training voor 9 uur 's ochtends.", value: (d, u) => fin(d, u).filter(s => hourOf(s.startedAt) < 9).length },
  { id: "laat", name: "Nachtuil", group: "Geheim", icon: "moon", secret: true, steps: [1, 5, 15, 30], unit: n => `${n}× na 20 uur`, how: "Begin een training na 20 uur 's avonds.", value: (d, u) => fin(d, u).filter(s => hourOf(s.startedAt) >= 20).length },
  { id: "topdag", name: "Topdag", group: "Geheim", icon: "star", secret: true, steps: [1, 5, 15, 30], unit: n => `${n} ${n === 1 ? "training" : "trainingen"} met een 5`, how: "Geef een training de score 5 bij het afronden.", value: (d, u) => fin(d, u).filter(s => s.rating === 5).length },
  { id: "allesaf", name: "Niets laten liggen", group: "Geheim", icon: "check", secret: true, steps: [1, 10, 25, 50], unit: n => `${n} ${n === 1 ? "training" : "trainingen"} helemaal af`, how: "Vink in een training elke set af, zonder er één over te slaan.", value: (d, u) => fin(d, u).filter(s => s.items.every(il => il.sets.length && il.sets.every(z => z.done && z.r > 0))).length },
];
export const levelOf = (b: BadgeDef, v: number): Level => (b.steps.filter(s => v >= s).length as Level);
export interface BadgeState { b: BadgeDef; v: number; level: Level; next: number | null; progress: number }
export function badgeStates(d: Data, uid: string): BadgeState[] {
  return BADGES.map(b => { const v = b.value(d, uid), level = levelOf(b, v), next = level < 4 ? b.steps[level] : null, prev = level ? b.steps[level - 1] : 0;
    return { b, v, level, next, progress: next === null ? 1 : Math.max(0, Math.min(1, (v - prev) / (next - prev))) }; });
}
export const DAYS_ALL = DAYS;
/** ontgrendelde levels die nieuw zijn tegenover een eerdere toestand */
export function newLevels(before: BadgeState[], after: BadgeState[]) { return after.filter(a => { const b = before.find(x => x.b.id === a.b.id); return b && a.level > b.level; }); }
void records;
