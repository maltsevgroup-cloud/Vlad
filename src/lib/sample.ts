/* Voorbeeldgegevens: een duo (Sam en Noor) met 8 weken trainingen. Alles is verzonnen en zo gemarkeerd in de app. */
import type { Data, Plan, Session, DayKey, ItemLog, Profile } from "./types";
import { DAYS } from "./types";
import { today, addDays, dayKeyOf } from "./dates";
import { suggest, exById } from "./logic";

function rng(seed: number) { return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }
const item = (exId: string, sets: number, target: number, weight: number, rest: number) => ({ id: "p" + exId, exId, sets, target, weight, rest });

export const DEMO_ME = "u-sam", DEMO_MATE = "u-noor";

export function makeSample(): Data {
  const t = today(), tk = DAYS.indexOf(dayKeyOf(t));
  const kd = (o: number) => DAYS[(tk + o) % 7];
  const samDays = [kd(0), kd(2), kd(4)] as DayKey[], noorDays = [kd(0), kd(3), kd(5)] as DayKey[];
  const ord = (a: DayKey[]) => [...a].sort((x, y) => DAYS.indexOf(x) - DAYS.indexOf(y));
  const profiles: Record<string, Profile> = {
    [DEMO_ME]: { uid: DEMO_ME, name: "Sam", color: "blauw", goal: "spier", level: "mid", days: ord(samDays), rest: 90, prog: "op", place: "gym", createdAt: Date.now() - 70 * 864e5 },
    [DEMO_MATE]: { uid: DEMO_MATE, name: "Noor", color: "rood", goal: "fit", level: "beg", days: ord(noorDays), rest: 75, prog: "op", place: "gym", createdAt: Date.now() - 66 * 864e5, share: { live: true, trainingen: true, streak: true, badges: true, records: false, schema: true } },
  };
  const sam: Plan = {
    [samDays[0]]: { title: "Duwen en benen", items: [item("squat", 4, 8, 70, 150), item("bench", 4, 8, 55, 120), item("dbpress", 3, 10, 16, 90), item("legext", 3, 12, 40, 75), item("pushdown", 3, 12, 25, 60), item("plank", 3, 45, 0, 45)] },
    [samDays[1]]: { title: "Trekken en billen", items: [item("deadlift", 3, 6, 90, 180), item("latpull", 4, 10, 50, 90), item("seatrow", 3, 10, 45, 90), item("hipthrust", 3, 10, 70, 90), item("dbcurl", 3, 12, 12, 60)] },
    [samDays[2]]: { title: "Volledig lichaam", items: [item("tread", 1, 10, 0, 0), item("legpress", 3, 12, 120, 90), item("incdb", 3, 10, 22, 90), item("bbrow", 3, 10, 50, 90), item("latraise", 3, 15, 7, 60), item("legraise", 3, 10, 0, 60)] },
  };
  const noor: Plan = {
    [noorDays[0]]: { title: "Benen en billen", items: [item("tread", 1, 12, 0, 0), item("hipthrust", 3, 12, 40, 75), item("legpress", 3, 12, 60, 75), item("abduct", 3, 15, 30, 60), item("plank", 3, 30, 0, 45)] },
    [noorDays[1]]: { title: "Bovenlichaam", items: [item("latpull", 3, 12, 25, 75), item("incdb", 3, 12, 8, 75), item("seatrow", 3, 12, 25, 75), item("latraise", 3, 15, 4, 60), item("pushdown", 3, 12, 15, 60)] },
    [noorDays[2]]: { title: "Volledig lichaam", items: [item("bike", 1, 15, 0, 0), item("rdl", 3, 10, 30, 90), item("lunge", 3, 10, 6, 75), item("kickback", 3, 12, 10, 60), item("legraise", 3, 8, 0, 60)] },
  };
  const d: Data = { me: DEMO_ME, mate: DEMO_MATE, profiles, plans: { [DEMO_ME]: sam, [DEMO_MATE]: noor }, sessions: {}, bw: {}, bwGoal: 80, msgs: [], live: {}, custom: {} };
  // trainingen genereren met dezelfde regels als de app, zodat de suggesties kloppen
  const R = rng(20261029);
  for (let back = 56; back >= 1; back--) {
    const date = addDays(t, -back), k = dayKeyOf(date);
    for (const uid of [DEMO_ME, DEMO_MATE]) {
      const day = d.plans[uid][k]; if (!day || R() < 0.1) continue;
      const startedAt = new Date(date + "T18:05:00").getTime() + Math.round(R() * 40) * 60000; let clock = startedAt;
      const sid = `${uid}_${date}_${k}`, s: Session = { id: sid, uid, date, day: k, title: day.title, startedAt, items: [] };
      day.items.forEach(it => {
        const ex = exById(d, it.exId), sg = suggest(d, uid, it), hit = R() < 0.78;
        const il: ItemLog = { pid: it.id, exId: it.exId, target: it.target, sets: [] };
        for (let i = 0; i < it.sets; i++) { clock += (it.rest + 45) * 1000;
          const short = !hit && i >= it.sets - 1 - Math.floor(R() * 2);
          const r = ex.kind === "cardio" ? it.target : Math.max(1, sg.r - (short ? 1 + Math.floor(R() * 3) : 0));
          il.sets.push({ w: ex.kind === "cardio" ? (uid === DEMO_ME ? 10.5 : 6.5) : sg.w, r, done: true, at: clock }); }
        if (ex.kind === "cardio") { il.speed = uid === DEMO_ME ? 10.5 : 6.5; il.incline = uid === DEMO_ME ? 1 : 4; }
        if (R() < 0.22) il.feel = hit ? (R() < 0.5 ? "licht" : "goed") : "zwaar";
        s.items.push(il);
      });
      if (uid === DEMO_ME && back < 20 && R() < 0.3) s.items[1].note = "Rek tussen de sets kort houden.";
      s.finishedAt = clock + 120000; s.rating = 3 + Math.floor(R() * 3); d.sessions[sid] = s;
    }
  }
  // lichaamsgewicht van Sam: licht dalend
  let w = 84.6; for (let back = 56; back >= 0; back -= 2 + Math.floor(R() * 2)) { w += -0.12 + (R() - 0.55) * 0.5; d.bw[addDays(t, -back)] = Math.round(w * 10) / 10; }
  // Noor traint nu
  const nd = d.plans[DEMO_MATE][kd(0)]!, now = Date.now();
  d.live[DEMO_MATE] = { uid: DEMO_MATE, sessionId: `${DEMO_MATE}_${t}_${kd(0)}`, title: nd.title, exName: exById(d, nd.items[2].exId).name, exIdx: 2, exTotal: nd.items.length, setsDone: 5, setsTotal: nd.items.reduce((a, i) => a + i.sets, 0), startedAt: now - 26 * 60000, updatedAt: now - 90000 };
  d.msgs = [
    { id: "m1", from: DEMO_MATE, to: DEMO_ME, text: "Morgen om 18u in de gym?", at: now - 2 * 864e5 - 3 * 36e5 },
    { id: "m2", from: DEMO_ME, to: DEMO_MATE, text: "Top, ik ben er.", at: now - 2 * 864e5 - 2.9 * 36e5 },
    { id: "m3", from: DEMO_ME, to: DEMO_MATE, text: "Sterk gedaan vandaag!", at: now - 1 * 864e5 - 5 * 36e5 },
    { id: "m4", from: DEMO_MATE, to: DEMO_ME, text: "Ben al begonnen, kom je ook?", at: now - 20 * 60000 },
  ];
  return d;
}
